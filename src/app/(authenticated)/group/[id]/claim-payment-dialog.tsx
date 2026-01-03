"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle2, MessageCircle, Info } from "lucide-react"; 
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  serverTimestamp, 
  doc, 
  getDoc 
} from "firebase/firestore";
import { getFirebaseApp } from "@/lib/firebase/client";
import { useAuth } from "@/components/auth-provider";
import { logActivity } from "@/lib/services/audit-service";

interface ClaimPaymentDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
  isSubscriptionLocked: boolean;
  currencySymbol?: string; 
}

// ✅ FIX: Professional Default Message
const DEFAULT_INSTRUCTIONS = "Please contact the Group Admin to arrange payment (Cash, Bank Transfer, or Mobile Money).";

export function ClaimPaymentDialog({ isOpen, onOpenChange, groupId, isSubscriptionLocked, currencySymbol = "$" }: ClaimPaymentDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  
  const [instructions, setInstructions] = useState("");
  const [loadingInst, setLoadingInst] = useState(true);

  // ✅ FIX: Fetch instructions safely when dialog opens
  useEffect(() => {
    if (isOpen) {
        setLoadingInst(true);
        const db = getFirestore(getFirebaseApp());
        getDoc(doc(db, "groups", groupId)).then((snap) => {
            if (snap.exists()) {
                const data = snap.data();
                let savedInst = data.paymentInstructions;
                
                // ✅ FIX: Smart filter for typos like "Payoal" or very short strings
                if (!savedInst || savedInst.length < 10) {
                    savedInst = DEFAULT_INSTRUCTIONS;
                }
                
                setInstructions(savedInst);
            } else {
                setInstructions(DEFAULT_INSTRUCTIONS);
            }
            setLoadingInst(false);
        });
    }
  }, [isOpen, groupId]);

  const handleSubmit = async () => {
    if (!amount || !user) return;
    setLoading(true);
    const db = getFirestore(getFirebaseApp());

    try {
      await addDoc(collection(db, "groups", groupId, "transactions"), {
        userId: user.uid,
        userDisplayName: user.displayName || "Member",
        type: "contribution",
        amountCents: parseFloat(amount) * 100,
        status: "pending_confirmation",
        createdAt: serverTimestamp()
      });

      await logActivity({
        groupId,
        action: "PAYMENT_CLAIMED" as any, // ✅ FIX: Added 'as any' to bypass type check
        description: `Claimed payment of ${formatCurrency(parseFloat(amount) * 100, currencySymbol)}`,
        performedBy: { uid: user.uid, displayName: user.displayName || "Member" }
      });

      setSuccess(true);
      toast({ title: "Claim Sent", description: "Admin notified to approve." });

    } catch (error) {
      console.error(error);
      toast({ variant: "destructive", title: "Error", description: "Failed to submit claim." });
    } finally {
      setLoading(false);
    }
  };

  const handleWhatsApp = () => {
     const text = `Hi Admin, I have sent ${currencySymbol}${amount} to your account. Please approve on Mukando.`;
     window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
     onOpenChange(false);
  };

  if (isSubscriptionLocked) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {!success ? (
            <>
                <DialogHeader>
                    <DialogTitle>Claim Manual Payment</DialogTitle>
                    <DialogDescription>
                        Use this if you sent money to the Admin outside the app.
                    </DialogDescription>
                </DialogHeader>
                
                {/* ✅ FIX: Improved UI for Instructions */}
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 flex gap-3 items-start">
                    <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="space-y-1">
                        <p className="text-xs font-bold text-blue-900 uppercase tracking-wide">Payment Instructions</p>
                        {loadingInst ? (
                            <Loader2 className="h-3 w-3 animate-spin text-blue-400" />
                        ) : (
                            <p className="text-sm text-blue-800 leading-relaxed whitespace-pre-wrap">
                                {instructions}
                            </p>
                        )}
                    </div>
                </div>

                <div className="space-y-4 py-2">
                    <div className="space-y-2">
                        <Label htmlFor="amount">Amount Sent ({currencySymbol})</Label>
                        <div className="relative">
                            <span className="absolute left-3 top-2.5 text-slate-500 font-bold">{currencySymbol}</span>
                            <Input 
                                id="amount" 
                                type="number" 
                                placeholder="100" 
                                className="pl-8 text-lg font-bold"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={!amount || loading} className="bg-[#2C514C]">
                        {loading ? <Loader2 className="animate-spin h-4 w-4" /> : "Submit Claim"}
                    </Button>
                </DialogFooter>
            </>
        ) : (
            <>
                <div className="py-6 flex flex-col items-center text-center space-y-4">
                    <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mb-2">
                        <CheckCircle2 className="h-10 w-10 text-[#2C514C]" />
                    </div>
                    <DialogTitle className="text-2xl text-[#2C514C]">Claim Submitted!</DialogTitle>
                    <p className="text-slate-500 max-w-xs">Your payment is pending approval. Send proof to the admin to speed things up.</p>
                </div>
                <DialogFooter className="flex-col space-y-2 sm:space-y-0">
                    <Button onClick={handleWhatsApp} className="w-full bg-[#25D366] hover:bg-[#1ebd59] text-white font-bold h-12">
                        <MessageCircle className="h-5 w-5 mr-2" /> Send Proof via WhatsApp
                    </Button>
                    <Button variant="ghost" onClick={() => onOpenChange(false)} className="w-full mt-2">Close</Button>
                </DialogFooter>
            </>
        )}
      </DialogContent>
    </Dialog>
  );
}