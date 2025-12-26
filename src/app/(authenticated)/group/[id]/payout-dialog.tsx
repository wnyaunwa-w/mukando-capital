'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from '@/hooks/use-toast';
import { Loader2, DollarSign } from 'lucide-react';
import { getFirebaseApp } from '@/lib/firebase/client';
import { getFirestore, collection, addDoc, serverTimestamp, getDocs, query } from 'firebase/firestore';

interface MemberOption {
  id: string;
  name: string;
}

export function PayoutDialog({
  isOpen,
  onOpenChange,
  groupId,
}: {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  groupId: string;
}) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState<MemberOption[]>([]);
  
  // Form State
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [amount, setAmount] = useState('');
  const [reference, setReference] = useState('');

  // Fetch members when dialog opens
  useEffect(() => {
    if (isOpen) {
      const fetchMembers = async () => {
        const db = getFirestore(getFirebaseApp());
        const q = query(collection(db, 'groups', groupId, 'members'));
        const snapshot = await getDocs(q);
        const memberList = snapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().displayName || doc.data().name || 'Unknown Member'
        }));
        setMembers(memberList);
      };
      fetchMembers();
    }
  }, [isOpen, groupId]);

  const handlePayout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMemberId || !amount) return;

    setLoading(true);
    try {
      const db = getFirestore(getFirebaseApp());
      const selectedMember = members.find(m => m.id === selectedMemberId);

      // Create Payout Transaction (Status: Pending Member Approval)
      await addDoc(collection(db, 'groups', groupId, 'transactions'), {
        type: 'payout',
        amountCents: parseFloat(amount) * 100, // Store as cents
        description: reference || 'Group Payout',
        userId: selectedMemberId, // Who is getting paid
        userDisplayName: selectedMember?.name,
        status: 'pending_confirmation', // Waiting for member to accept
        createdAt: serverTimestamp(),
        createdBy: 'admin' 
      });

      toast({ 
        title: "Payout Initiated", 
        description: `Waiting for ${selectedMember?.name} to confirm receipt.` 
      });
      
      onOpenChange(false);
      setAmount('');
      setReference('');
      setSelectedMemberId('');

    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: "Failed to record payout.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-white text-slate-900">
        <DialogHeader>
          <DialogTitle className="text-[#122932]">Record Payout</DialogTitle>
          <DialogDescription>
            Record a payment sent to a member. They will need to confirm receipt on their dashboard.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handlePayout} className="space-y-4 py-4">
          
          <div className="space-y-2">
            <Label>Select Member</Label>
            <Select onValueChange={setSelectedMemberId} value={selectedMemberId}>
              <SelectTrigger>
                <SelectValue placeholder="Who are you paying?" />
              </SelectTrigger>
              <SelectContent>
                {members.map(m => (
                  <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Amount ($)</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <Input 
                type="number" 
                value={amount} 
                onChange={(e) => setAmount(e.target.value)}
                className="pl-9" 
                placeholder="0.00" 
                step="0.01"
                min="0"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Reference Note</Label>
            <Input 
              value={reference} 
              onChange={(e) => setReference(e.target.value)}
              placeholder="e.g. End of year payout" 
            />
          </div>

          <DialogFooter>
            <Button type="submit" className="bg-[#122932] text-white hover:bg-[#1a3b47]" disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Record Payout"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}