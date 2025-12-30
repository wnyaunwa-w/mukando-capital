"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle2, MessageCircle, Sparkles } from "lucide-react"; 
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  serverTimestamp, 
  doc, 
  getDoc, 
  updateDoc 
} from "firebase/firestore";
import { getFirebaseApp } from "@/lib/firebase/client";
import { useAuth } from "@/components/auth-provider";
import { logActivity } from "@/lib/services/audit-service";

interface PayFeeDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
}

export function PayFeeDialog({ isOpen, onOpenChange, groupId }: PayFeeDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [fetchingFee, setFetchingFee] = useState(true);
  const [refNumber, setRefNumber] = useState("");
  const [isSuccess, setIsSuccess] = useState(false); 
  
  // Dynamic Fee State
  const [currentFeeCents, setCurrentFeeCents] = useState(100); 

  // --- ⚠️ UPDATE THIS WITH YOUR REAL ACCOUNT DETAILS ---
  const paymentInstructions = "Innbucks: 078 456 7174 (Mukando Admin)";

  // 1. Fetch the real fee when dialog opens
  useEffect(() => {
    if (isOpen) {
        // Reset state on open
        setIsSuccess(false);
        setRefNumber("");
        
        const fetchFee = async () => {
            setFetchingFee(true);
            const db = getFirestore(getFirebaseApp());
            try {
                const settingsRef = doc(db, "settings", "global");
                const snap = await getDoc(settingsRef);
                if (snap.exists()) {
                    // Check undefined to respect 0
                    const fee = snap.data().platformFeeCents;
                    setCurrentFeeCents(fee !== undefined ? fee : 100);
                }
            } catch (e) {
                console.error("Could not fetch fee", e);
            } finally {
                setFetchingFee(false);
            }
        };
        fetchFee();
    }
  }, [isOpen]);

  // ✅ LOGIC: Handle Free Activation (Instant)
  const handleFreeActivation = async () => {
      if (!user) return;
      setLoading(true);
      const db = getFirestore(getFirebaseApp());

      try {
          // 1. Activate Member Directly (Skip Admin Approval)
          const memberRef = doc(db, "groups", groupId, "members", user.uid);
          
          // Set expiry to 30 days from now
          const nextMonth = new Date();
          nextMonth.setDate(nextMonth.getDate() + 30);

          await updateDoc(memberRef, {
            subscriptionStatus: "active", // Instant Access
            subscriptionEndsAt: nextMonth.toISOString(),
            updatedAt: serverTimestamp()
          });

          // 2. Log it
          await logActivity({
            groupId: groupId,
            action: "FEE_PAID", // ✅ CHANGED: Use existing type to fix TS Error
            description: `Activated free membership.`,
            performedBy: { uid: user.uid, displayName: user.displayName || "Member" }
          });

          toast({ title: "Activated!", description: "Your group access is now active." });
          onOpenChange(false); // Close immediately

      } catch (error) {
          console.error(error);
          toast({ variant: "destructive", title: "Error", description: "Could not activate." });
      } finally {
          setLoading(false);
      }
  };

  const handlePaidSubmit = async () => {
    if (!refNumber || !user) return;
    setLoading(true);
    const db = getFirestore(getFirebaseApp());

    try {
      // 1. Create the Fee Request
      await addDoc(collection(db, "fee_requests"), {
        userId: user.uid,
        userDisplayName: user.displayName || "Member",
        userEmail: user.email,
        groupId: groupId,
        amountCents: currentFeeCents,
        refNumber: refNumber,
        status: "pending",
        createdAt: serverTimestamp(),
        type: "platform_fee"
      });

      // 2. Update Member Status to "Pending"
      const memberRef = doc(db, "groups", groupId, "members", user.uid);
      await updateDoc(memberRef, {
        subscriptionStatus: "pending_approval",
        lastPaymentRef: refNumber,
        updatedAt: serverTimestamp()
      });

      // 3. Log it
      await logActivity({
        groupId: groupId,
        action: "FEE_PAID",
        description: `Submitted platform fee of ${formatCurrency(currentFeeCents)} (Ref: ${refNumber})`,
        performedBy: { uid: user.uid, displayName: user.displayName || "Member" }
      });

      toast({ title: "Submitted", description: "Payment recorded. Waiting for approval." });
      setIsSuccess(true);

    } catch (error: any) {
      console.error(error);
      toast({ variant: "destructive", title: "Error", description: "Could not submit payment." });
    } finally {
      setLoading(false);
    }
  };

  const handleWhatsApp = () => {
    const SUPER_ADMIN_PHONE = "263784567174"; 
    const message = `Hi Admin, I have just paid the Platform Fee of ${formatCurrency(currentFeeCents)} (Ref: ${refNumber}) for Group: ${groupId}. Please approve my access.`;
    window.open(`https://wa.me/${SUPER_ADMIN_PHONE}?text=${encodeURIComponent(message)}`, '_blank');
    onOpenChange(false);
  };

  const isFree = currentFeeCents === 0;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        
        {/* LOADING STATE */}
        {fetchingFee ? (
            <div className="py-10 flex justify-center"><Loader2 className="animate-spin text-slate-400" /></div>
        ) : (
            <>
                {/* --- SCENARIO A: FREE ACTIVATION --- */}
                {isFree ? (
                    <>
                        <DialogHeader>
                            <DialogTitle className="text-[#122932] flex items-center gap-2">
                                <Sparkles className="w-5 h-5 text-amber-500" /> Free Access
                            </DialogTitle>
                            <DialogDescription>
                                The platform fee is currently waived for this group.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="py-6 flex flex-col items-center justify-center text-center space-y-3 bg-green-50 rounded-lg border border-green-100">
                            <div className="bg-white p-3 rounded-full shadow-sm">
                                <CheckCircle2 className="w-8 h-8 text-green-600" />
                            </div>
                            <div className="text-green-800 font-medium">No Payment Required</div>
                            <div className="text-sm text-green-600">Activate your membership instantly.</div>
                        </div>

                        <DialogFooter>
                            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                            <Button 
                                onClick={handleFreeActivation} 
                                disabled={loading}
                                className="bg-[#2C514C] hover:bg-[#25423e]"
                            >
                                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : "Confirm Activation"}
                            </Button>
                        </DialogFooter>
                    </>
                ) : (
                    /* --- SCENARIO B: PAID ACTIVATION --- */
                    !isSuccess ? (
                        <>
                            <DialogHeader>
                                <DialogTitle className="text-[#122932]">Pay Subscription Fee</DialogTitle>
                                <DialogDescription>To activate your membership, please pay the monthly fee.</DialogDescription>
                            </DialogHeader>

                            <div className="space-y-4 py-4">
                                <div className="p-4 bg-slate-50 rounded-md border border-slate-100 flex justify-between items-center">
                                    <span className="text-sm font-medium text-slate-500">Amount Due:</span>
                                    <span className="text-xl font-bold text-[#2C514C]">{formatCurrency(currentFeeCents)}</span>
                                </div>

                                <div className="p-3 bg-blue-50/50 rounded-md border border-blue-100">
                                    <p className="text-xs font-medium text-blue-600 mb-1">Send to:</p>
                                    <p className="text-sm font-bold text-slate-800">{paymentInstructions}</p>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="ref">Innbucks Transaction Reference</Label>
                                    <Input 
                                        id="ref" 
                                        placeholder="e.g., INB987654321" 
                                        value={refNumber}
                                        onChange={(e) => setRefNumber(e.target.value)}
                                        className="tracking-widest"
                                    />
                                </div>
                            </div>

                            <DialogFooter>
                                <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                                <Button 
                                    onClick={handlePaidSubmit} 
                                    disabled={!refNumber || loading}
                                    className="bg-[#2C514C] hover:bg-[#25423e]"
                                >
                                    {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                                    Submit Payment
                                </Button>
                            </DialogFooter>
                        </>
                    ) : (
                        /* --- SUCCESS VIEW (FOR PAID) --- */
                        <>
                            <div className="py-6 flex flex-col items-center text-center space-y-4">
                                <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mb-2">
                                    <CheckCircle2 className="h-10 w-10 text-[#2C514C]" />
                                </div>
                                <DialogTitle className="text-2xl text-[#2C514C]">Payment Submitted!</DialogTitle>
                                <p className="text-slate-500 max-w-xs">Your request is pending. Notify the admin to speed up your approval.</p>
                            </div>

                            <DialogFooter className="flex-col space-y-2 sm:space-y-0">
                                <Button onClick={handleWhatsApp} className="w-full bg-[#25D366] hover:bg-[#1ebd59] text-white font-bold h-12 text-lg">
                                    <MessageCircle className="h-5 w-5 mr-2" /> Notify Admin via WhatsApp
                                </Button>
                                <Button variant="ghost" onClick={() => onOpenChange(false)} className="w-full mt-2">Close</Button>
                            </DialogFooter>
                        </>
                    )
                )}
            </>
        )}
      </DialogContent>
    </Dialog>
  );
}