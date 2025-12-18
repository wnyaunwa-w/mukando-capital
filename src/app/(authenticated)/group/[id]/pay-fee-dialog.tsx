"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle2, MessageCircle } from "lucide-react"; 
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
  const paymentInstructions = "Innbucks: 077 123 4567 (Mukando Admin)";

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
                if (snap.exists() && snap.data().platformFeeCents) {
                    setCurrentFeeCents(snap.data().platformFeeCents);
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

  const handleSubmit = async () => {
    if (!refNumber || !user) return;
    setLoading(true);
    const db = getFirestore(getFirebaseApp());

    try {
      // 1. Create the Fee Request (For Admin Records)
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

      // 2. Update Member Status to "Pending" (So they see a different UI)
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
      
      // 4. Switch to Success View
      setIsSuccess(true);

    } catch (error: any) {
      console.error(error);
      toast({ variant: "destructive", title: "Error", description: "Could not submit payment. Check permissions." });
    } finally {
      setLoading(false);
    }
  };

  const handleWhatsApp = () => {
    const message = `Hi Admin, I have just paid the Platform Fee of ${formatCurrency(currentFeeCents)} (Ref: ${refNumber}) for Group: ${groupId}. Please approve my access.`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
    
    // Close after clicking
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        
        {/* VIEW 1: PAYMENT FORM */}
        {!isSuccess && (
          <>
            <DialogHeader>
              <DialogTitle className="text-[#122932]">Pay Platform Subscription Fee</DialogTitle>
              <DialogDescription>
                 To activate your membership, please pay the monthly fee.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="p-4 bg-slate-50 rounded-md border border-slate-100 flex justify-between items-center">
                <span className="text-sm font-medium text-slate-500">Amount Due:</span>
                {fetchingFee ? (
                    <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                ) : (
                    <span className="text-xl font-bold text-[#2C514C]">{formatCurrency(currentFeeCents)}</span>
                )}
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
                onClick={handleSubmit} 
                disabled={!refNumber || loading || fetchingFee}
                className="bg-[#2C514C] hover:bg-[#25423e]"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                Submit Payment
              </Button>
            </DialogFooter>
          </>
        )}

        {/* VIEW 2: SUCCESS & NOTIFY */}
        {isSuccess && (
          <>
            <div className="py-6 flex flex-col items-center text-center space-y-4">
              <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mb-2">
                <CheckCircle2 className="h-10 w-10 text-[#2C514C]" />
              </div>
              <DialogTitle className="text-2xl text-[#2C514C]">Payment Submitted!</DialogTitle>
              <p className="text-slate-500 max-w-xs">
                Your request is pending. Notify the admin to speed up your approval.
              </p>
            </div>

            <DialogFooter className="flex-col space-y-2 sm:space-y-0">
               <Button 
                onClick={handleWhatsApp} 
                className="w-full bg-[#25D366] hover:bg-[#1ebd59] text-white font-bold h-12 text-lg"
              >
                <MessageCircle className="h-5 w-5 mr-2" />
                Notify Admin via WhatsApp
              </Button>
              <Button variant="ghost" onClick={() => onOpenChange(false)} className="w-full mt-2">
                Close
              </Button>
            </DialogFooter>
          </>
        )}

      </DialogContent>
    </Dialog>
  );
}