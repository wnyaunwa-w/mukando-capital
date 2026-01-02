"use client";

import { useState } from "react";
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
  currencySymbol?: string; // ✅ FIX: Added this prop
}

export function ClaimPaymentDialog({ isOpen, onOpenChange, groupId, isSubscriptionLocked, currencySymbol = "$" }: ClaimPaymentDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  
  const [instructions, setInstructions] = useState("Contact Admin for details.");

  if (isOpen && instructions === "Contact Admin for details.") {
      const db = getFirestore(getFirebaseApp());
      getDoc(doc(db, "groups", groupId)).then((snap) => {
          if (snap.exists() && snap.data().paymentInstructions) {
              setInstructions(snap.data().paymentInstructions);
          }
      });
  }

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
        action: "PAYMENT_CLAIMED", 
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
                        Use this if you sent money to the Admin (Cash, Bank, Mobile Money).
                    </DialogDescription>
                </DialogHeader>
                
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-100 space-y-2 mb-2">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Payment Instructions</p>
                    <p className="text-sm text-slate-700 whitespace-pre-wrap">{instructions}</p>
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