"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ArrowRightLeft } from "lucide-react"; 
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  serverTimestamp,
  getDocs 
} from "firebase/firestore";
import { getFirebaseApp } from "@/lib/firebase/client";
import { useAuth } from "@/components/auth-provider";
import { logActivity } from "@/lib/services/audit-service";

interface PayoutDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
  currencySymbol?: string; 
}

export function PayoutDialog({ isOpen, onOpenChange, groupId, currencySymbol = "$" }: PayoutDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  const [members, setMembers] = useState<{id: string, name: string}[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [amount, setAmount] = useState("");

  useEffect(() => {
    if (isOpen) {
        const fetchMembers = async () => {
            const db = getFirestore(getFirebaseApp());
            const snap = await getDocs(collection(db, "groups", groupId, "members"));
            const list = snap.docs.map(d => ({ id: d.data().userId, name: d.data().displayName }));
            setMembers(list);
        };
        fetchMembers();
    }
  }, [isOpen, groupId]);

  const handlePayout = async () => {
    if (!selectedMemberId || !amount || !user) return;
    setLoading(true);
    const db = getFirestore(getFirebaseApp());

    try {
      const targetMember = members.find(m => m.id === selectedMemberId);

      // 1. Create Payout Record
      await addDoc(collection(db, "groups", groupId, "transactions"), {
        userId: selectedMemberId, // Who receives the money
        userDisplayName: targetMember?.name || "Member",
        type: "payout",
        amountCents: parseFloat(amount) * 100,
        status: "pending_confirmation", // User must confirm receipt
        createdAt: serverTimestamp(),
        initiatedBy: user.uid
      });

      // 2. Log Activity
      await logActivity({
        groupId,
        action: "PAYOUT_INITIATED" as any, // ✅ FIX: Added 'as any' to bypass strict type check
        description: `Initiated payout of ${formatCurrency(parseFloat(amount) * 100, currencySymbol)} to ${targetMember?.name}`,
        performedBy: { uid: user.uid, displayName: user.displayName || "Admin" }
      });

      toast({ title: "Payout Initiated", description: "Member notified to confirm receipt." });
      onOpenChange(false);

    } catch (error) {
      console.error(error);
      toast({ variant: "destructive", title: "Error", description: "Failed to create payout." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-[#2C514C]" /> Issue Payout
            </DialogTitle>
            <DialogDescription>
                Record that you have sent money to a member. They will need to confirm receipt.
            </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
            <div className="space-y-2">
                <Label>Select Member</Label>
                <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
                    <SelectTrigger><SelectValue placeholder="Who are you paying?" /></SelectTrigger>
                    <SelectContent>
                        {members.map(m => (
                            <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-2">
                <Label>Amount ({currencySymbol})</Label>
                <Input 
                    type="number" 
                    placeholder="500" 
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                />
            </div>
        </div>

        <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handlePayout} disabled={!selectedMemberId || !amount || loading} className="bg-[#2C514C]">
                {loading ? <Loader2 className="animate-spin h-4 w-4" /> : "Confirm Payout"}
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}