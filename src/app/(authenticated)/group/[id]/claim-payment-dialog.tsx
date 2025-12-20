"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle2, MessageCircle } from "lucide-react"; 
import { useToast } from "@/hooks/use-toast";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  serverTimestamp,
  query,
  where,
  getDocs,
  getDoc,
  doc
} from "firebase/firestore";
import { getFirebaseApp } from "@/lib/firebase/client";
import { useAuth } from "@/components/auth-provider";
import { logActivity } from "@/lib/services/audit-service";

interface ClaimPaymentDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
  isSubscriptionLocked: boolean; 
}

export function ClaimPaymentDialog({ isOpen, onOpenChange, groupId }: ClaimPaymentDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [adminPhone, setAdminPhone] = useState<string | null>(null); // Store dynamic admin phone
  
  const [formData, setFormData] = useState({
    amount: "",
    refNumber: ""
  });

  const db = getFirestore(getFirebaseApp());

  // --- NEW: FETCH ADMIN PHONE NUMBER AUTOMATICALLY ---
  useEffect(() => {
    const fetchAdminNumber = async () => {
        if (!groupId) return;
        try {
            // 1. Find the Admin's User ID in this group
            const membersRef = collection(db, "groups", groupId, "members");
            const q = query(membersRef, where("role", "==", "admin"));
            const snapshot = await getDocs(q);

            if (!snapshot.empty) {
                const adminId = snapshot.docs[0].id; // Member ID is the User ID

                // 2. Fetch the Admin's Profile to get the phone number
                const userDoc = await getDoc(doc(db, "users", adminId));
                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    if (userData.phoneNumber) {
                        setAdminPhone(userData.phoneNumber);
                    }
                }
            }
        } catch (error) {
            console.error("Error fetching admin phone:", error);
        }
    };

    if (isOpen) {
        fetchAdminNumber();
    }
  }, [isOpen, groupId, db]);

  const handleSubmit = async () => {
    if (!user || !formData.amount || !formData.refNumber) return;

    setLoading(true);

    try {
      const amountCents = parseFloat(formData.amount) * 100;

      // 1. Create the Transaction Record
      const txnRef = await addDoc(collection(db, "groups", groupId, "transactions"), {
        userId: user.uid,
        userDisplayName: user.displayName || "Member",
        userEmail: user.email,
        type: "contribution",
        amountCents: amountCents,
        description: `Manual Contribution (Ref: ${formData.refNumber})`,
        status: "pending", 
        createdAt: serverTimestamp(),
        referenceNumber: formData.refNumber
      });

      // 2. Log Activity
      await logActivity({
        groupId: groupId,
        action: "PAYMENT_CLAIMED",
        description: `Claimed contribution of $${formData.amount} (Ref: ${formData.refNumber})`,
        performedBy: { uid: user.uid, displayName: user.displayName || "Member" },
        metadata: { txnId: txnRef.id, amount: amountCents }
      });

      // 3. SWITCH TO SUCCESS SCREEN
      setIsSuccess(true);
      toast({ title: "Saved", description: "Claim recorded successfully." });

    } catch (error: any) {
      console.error(error);
      toast({ variant: "destructive", title: "Error", description: "Failed to submit claim." });
      setLoading(false); 
    }
  };

  const handleWhatsApp = () => {
    // 1. Create the message
    const message = `Hi Admin, I have just made a contribution of $${formData.amount} (Ref: ${formData.refNumber}). Please verify and approve on Mukando.`;
    
    // 2. Format the URL based on whether we found a phone number
    let whatsappUrl = "";

    if (adminPhone) {
        // Clean number (remove non-digits)
        let cleanNumber = adminPhone.replace(/[^\d]/g, '');
        // Handle Zimbabwe '07' -> '2637'
        if (cleanNumber.startsWith('07')) {
            cleanNumber = '263' + cleanNumber.substring(1);
        }
        // Direct to specific chat
        whatsappUrl = `https://wa.me/${cleanNumber}?text=${encodeURIComponent(message)}`;
    } else {
        // Fallback: Opens WhatsApp contact picker
        whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    }

    window.open(whatsappUrl, '_blank');
    
    // Close dialog after opening WhatsApp
    handleClose();
  };

  const handleClose = () => {
    setIsSuccess(false);
    setFormData({ amount: "", refNumber: "" });
    setLoading(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if(!open) handleClose(); }}>
      <DialogContent className="sm:max-w-md">
        
        {/* VIEW 1: FORM INPUT */}
        {!isSuccess && (
          <>
            <DialogHeader>
              <DialogTitle>Make a Contribution</DialogTitle>
              <DialogDescription>
                Step 1: Send funds to the admin.<br/>
                Step 2: Record the reference below.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="p-4 bg-slate-50 rounded-md border border-slate-100">
                <p className="text-sm font-medium text-slate-500 mb-1">Payment Instructions:</p>
                {adminPhone ? (
                     <p className="text-md font-bold text-slate-800">
                        Admin Phone: {adminPhone} <span className="text-xs font-normal text-slate-500">(Innbucks/EcoCash)</span>
                     </p>
                ) : (
                    <p className="text-md font-bold text-slate-800">Contact Admin for payment details</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Amount (USD)</Label>
                <Input 
                  id="amount" 
                  type="number"
                  placeholder="e.g., 100" 
                  value={formData.amount}
                  onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ref">Transaction Reference</Label>
                <Input 
                  id="ref" 
                  placeholder="e.g., ECO-123456789" 
                  value={formData.refNumber}
                  onChange={(e) => setFormData(prev => ({ ...prev, refNumber: e.target.value }))}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button 
                onClick={handleSubmit} 
                disabled={!formData.amount || !formData.refNumber || loading}
                className="bg-green-700 hover:bg-green-800"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                Submit Claim
              </Button>
            </DialogFooter>
          </>
        )}

        {/* VIEW 2: SUCCESS & NOTIFY */}
        {isSuccess && (
          <>
            <div className="py-6 flex flex-col items-center text-center space-y-4">
              <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mb-2">
                <CheckCircle2 className="h-10 w-10 text-green-600" />
              </div>
              <DialogTitle className="text-2xl text-green-700">Claim Recorded!</DialogTitle>
              <p className="text-slate-500 max-w-xs">
                Your payment is pending approval. Notify the admin now to speed up the process.
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
              <Button variant="ghost" onClick={handleClose} className="w-full mt-2">
                Skip & Close
              </Button>
            </DialogFooter>
          </>
        )}

      </DialogContent>
    </Dialog>
  );
}