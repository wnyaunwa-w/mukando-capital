
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { Group } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { getFirestore, doc, writeBatch, serverTimestamp, collection, FieldValue, increment } from 'firebase/firestore';
import { getFirebaseApp } from '@/lib/firebase/client';
import { Loader2 } from 'lucide-react';
import { errorEmitter } from '@/lib/firebase/error-emitter';
import { FirestorePermissionError } from '@/lib/firebase/errors';


export function TransactionForms({ group }: { group: Group }) {
  const [depositMemberId, setDepositMemberId] = useState('');
  const [depositAmount, setDepositAmount] = useState('');
  const [depositDescription, setDepositDescription] = useState('');
  
  const [payoutMemberId, setPayoutMemberId] = useState('');
  const [payoutAmount, setPayoutAmount] = useState('');
  const [payoutDescription, setPayoutDescription] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    const amountCents = Math.round(parseFloat(depositAmount) * 100);

    try {
        if (!depositMemberId || isNaN(amountCents) || amountCents <= 0) {
            throw new Error("Invalid member or amount for deposit.");
        }

        const app = getFirebaseApp();
        const db = getFirestore(app);
        const batch = writeBatch(db);

        const groupRef = doc(db, 'groups', group.id);
        const memberRef = doc(db, 'groups', group.id, 'members', depositMemberId);
        const transactionRef = doc(collection(db, 'groups', group.id, 'transactions'));
        
        // Update balances
        batch.update(groupRef, { currentBalanceCents: increment(amountCents) });
        batch.update(memberRef, { balanceCents: increment(amountCents) });

        const transactionData = {
            type: 'contribution',
            amountCents,
            date: serverTimestamp(),
            memberId: depositMemberId,
            description: depositDescription || 'Manual deposit by admin',
        };

        batch.set(transactionRef, transactionData);

        batch.commit()
            .catch(async (serverError) => {
                 const permissionError = new FirestorePermissionError({
                    path: group.id,
                    operation: 'update',
                    requestResourceData: transactionData,
                });
                errorEmitter.emit('permission-error', permissionError);
            });
        
        toast({ title: "Deposit Recorded", description: "The contribution has been added." });
        setDepositMemberId('');
        setDepositAmount('');
        setDepositDescription('');

    } catch (error: any) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
        setIsLoading(false);
    }
  };
  
   const handlePayout = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const amountCents = Math.round(parseFloat(payoutAmount) * 100);

     try {
        if (!payoutMemberId || isNaN(amountCents) || amountCents <= 0) {
            throw new Error("Invalid member or amount for payout.");
        }
        
        const memberBalance = group.members.find(m => m.id === payoutMemberId)?.balanceCents || 0;
        if (amountCents > group.currentBalanceCents) {
            throw new Error("Payout amount exceeds the group's total balance.");
        }
        if(amountCents > memberBalance) {
            throw new Error("Payout amount exceeds the member's available balance.");
        }

        const app = getFirebaseApp();
        const db = getFirestore(app);
        const batch = writeBatch(db);

        const groupRef = doc(db, 'groups', group.id);
        const memberRef = doc(db, 'groups', group.id, 'members', payoutMemberId);
        const transactionRef = doc(collection(db, 'groups', group.id, 'transactions'));
        
        batch.update(groupRef, { currentBalanceCents: increment(-amountCents) });
        batch.update(memberRef, { balanceCents: increment(-amountCents) });

        const transactionData = {
            type: 'payout',
            amountCents,
            date: serverTimestamp(),
            memberId: payoutMemberId,
            description: payoutDescription || 'Manual payout by admin',
        };
        batch.set(transactionRef, transactionData);

        batch.commit()
         .catch(async (serverError) => {
                 const permissionError = new FirestorePermissionError({
                    path: group.id,
                    operation: 'update',
                    requestResourceData: transactionData,
                });
                errorEmitter.emit('permission-error', permissionError);
            });

        toast({ title: "Payout Recorded", description: "The payout has been completed." });
        setPayoutMemberId('');
        setPayoutAmount('');
        setPayoutDescription('');

    } catch (error: any) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Manual Transactions</CardTitle>
        <CardDescription>
          Manually record a cash contribution for a member or issue a payout from the group fund.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="deposit">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="deposit">Record Contribution</TabsTrigger>
            <TabsTrigger value="payout">Record Payout</TabsTrigger>
          </TabsList>
          <TabsContent value="deposit">
            <form onSubmit={handleDeposit} className="space-y-4 pt-4">
              <div className="grid gap-2">
                <Label>Member</Label>
                <Select value={depositMemberId} onValueChange={setDepositMemberId} required>
                  <SelectTrigger><SelectValue placeholder="Select a member..." /></SelectTrigger>
                  <SelectContent>
                    {group.members.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="deposit-amount">Amount (USD)</Label>
                <Input id="deposit-amount" type="number" step="0.01" placeholder="e.g., 50.00" value={depositAmount} onChange={e => setDepositAmount(e.target.value)} required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="deposit-desc">Description (Optional)</Label>
                <Textarea id="deposit-desc" placeholder="e.g., Cash payment for January" value={depositDescription} onChange={e => setDepositDescription(e.target.value)} />
              </div>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Record Contribution
              </Button>
            </form>
          </TabsContent>
          <TabsContent value="payout">
             <form onSubmit={handlePayout} className="space-y-4 pt-4">
              <div className="grid gap-2">
                <Label>Member</Label>
                <Select value={payoutMemberId} onValueChange={setPayoutMemberId} required>
                  <SelectTrigger><SelectValue placeholder="Select a member..." /></SelectTrigger>
                  <SelectContent>
                    {group.members.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="payout-amount">Amount (USD)</Label>
                <Input id="payout-amount" type="number" step="0.01" placeholder="e.g., 200.00" value={payoutAmount} onChange={e => setPayoutAmount(e.target.value)} required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="payout-desc">Description (Optional)</Label>
                <Textarea id="payout-desc" placeholder="e.g., Early withdrawal for emergency" value={payoutDescription} onChange={e => setPayoutDescription(e.target.value)} />
              </div>
              <Button type="submit" variant="destructive" disabled={isLoading}>
                 {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                 Record Payout
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

    