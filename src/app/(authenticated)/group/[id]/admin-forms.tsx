'use client';

import { useState, useEffect } from "react";
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent 
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Calendar, 
  ArrowUp, 
  ArrowDown, 
  User, 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  DollarSign 
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { addDays, addMonths, format } from "date-fns";
import { 
  getFirestore, 
  doc, 
  updateDoc, 
  collection, 
  getDocs, 
  getDoc, 
  addDoc,
  serverTimestamp,
  query,
  where,
  runTransaction,
  increment
} from "firebase/firestore";
import { getFirebaseApp } from "@/lib/firebase/client";
import { formatCurrency } from "@/lib/utils";

// --- INTERFACES ---
interface MemberOption {
  id: string;
  name: string;
  email: string;
  photoURL?: string;
  role?: string;
}

interface PendingTransaction {
  id: string;
  userId: string;
  userDisplayName: string;
  amountCents: number;
  description: string;
  date: string;
}

interface ScheduledMember {
  userId: string;
  displayName: string;
  photoURL?: string;
  role: string;
  payoutDate?: string;
  status?: string;
}

export function AdminForms({ groupId }: { groupId: string }) {
  const { toast } = useToast();
  const db = getFirestore(getFirebaseApp());
  
  // --- STATE: PAYMENTS & SCORING ---
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [pendingTx, setPendingTx] = useState<PendingTransaction[]>([]);
  
  // Manual Entry Form State
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [amount, setAmount] = useState('');
  const [reference, setReference] = useState('');

  // --- STATE: SCHEDULE ---
  const [scheduleMembers, setScheduleMembers] = useState<ScheduledMember[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [startDate, setStartDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [frequency, setFrequency] = useState("monthly");

  // --- 1. FETCH DATA (Combined) ---
  useEffect(() => {
    if (!groupId) return;

    const fetchData = async () => {
      // A. Fetch Members for both Select Lists & Schedule
      const membersRef = collection(db, "groups", groupId, "members");
      const snapshot = await getDocs(membersRef);
      
      const memberDataPromises = snapshot.docs.map(async (memberDoc) => {
         const mData = memberDoc.data();
         let displayName = mData.displayName || "Member";
         let photoURL = mData.photoURL || null;
         let email = mData.email || "";

         // Try to fetch latest profile data
         try {
            const userSnap = await getDoc(doc(db, "users", memberDoc.id));
            if (userSnap.exists()) {
                const uData = userSnap.data();
                if (uData.displayName) displayName = uData.displayName;
                if (uData.photoURL) photoURL = uData.photoURL;
                if (uData.email) email = uData.email;
            }
         } catch (e) { console.error(e); }

         return {
             id: memberDoc.id,
             name: displayName,
             email: email,
             photoURL: photoURL,
             role: mData.role
         };
      });

      const fullMembers = await Promise.all(memberDataPromises);
      
      // Update Payment Select List
      setMembers(fullMembers);

      // Update Schedule List (Format for schedule logic)
      setScheduleMembers(fullMembers.map(m => ({
          userId: m.id,
          displayName: m.name,
          photoURL: m.photoURL || undefined,
          role: m.role || 'member'
      })));

      // B. Fetch Pending Transactions
      const qTx = query(
        collection(db, 'groups', groupId, 'transactions'),
        where('status', '==', 'pending_approval')
      );
      const snapTx = await getDocs(qTx);
      setPendingTx(snapTx.docs.map(d => ({ id: d.id, ...d.data() } as PendingTransaction)));
    };

    fetchData();
  }, [groupId, db, isDialogOpen]); // Re-fetch schedule list when dialog opens/closes to be safe

  // =========================================================
  // LOGIC PART 1: PAYMENTS & CREDIT SCORE
  // =========================================================

  const approveTransaction = async (tx: PendingTransaction) => {
    setLoading(true);
    try {
      await runTransaction(db, async (transaction) => {
        const txRef = doc(db, 'groups', groupId, 'transactions', tx.id);
        const groupRef = doc(db, 'groups', groupId);
        const userRef = doc(db, 'users', tx.userId);
        
        // 1. Mark TX Completed & Update Group Balance
        transaction.update(txRef, { status: 'completed', approvedAt: serverTimestamp() });
        transaction.update(groupRef, { currentBalanceCents: increment(tx.amountCents) });
        
        // 2. Update Member Balance
        const memberRef = doc(db, 'groups', groupId, 'members', tx.userId);
        transaction.update(memberRef, { contributionBalanceCents: increment(tx.amountCents) });

        // 3. CREDIT SCORE LOGIC (+5 Points)
        const userSnap = await transaction.get(userRef);
        if (userSnap.exists()) {
             const currentScore = userSnap.data().creditScore || 400; 
             const newScore = Math.min(850, currentScore + 5);
             transaction.update(userRef, { creditScore: newScore });
        }
      });

      toast({ title: "Approved", description: `Member earned +5 Trust Points.` });
      setPendingTx(prev => prev.filter(t => t.id !== tx.id));
    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: "Failed to approve.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const rejectTransaction = async (txId: string, userId: string) => {
    if(!confirm("Reject this transaction? The member will lose 10 Trust Points.")) return;
    
    setLoading(true);
    try {
        await runTransaction(db, async (transaction) => {
            // 1. Get Refs
            const txRef = doc(db, 'groups', groupId, 'transactions', txId);
            const userRef = doc(db, 'users', userId);

            // 2. Mark Transaction as Rejected
            transaction.update(txRef, { status: 'rejected' });

            // 3. PENALTY LOGIC (-10 Points)
            const userSnap = await transaction.get(userRef);
            if (userSnap.exists()) {
                const currentScore = userSnap.data().creditScore || 400;
                // Ensure score doesn't drop below 0
                const newScore = Math.max(0, currentScore - 10); 
                transaction.update(userRef, { creditScore: newScore });
            }
        });

        setPendingTx(prev => prev.filter(t => t.id !== txId));
        toast({ title: "Rejected", description: "Transaction rejected. Member penalized -10 points." });
    } catch (e) {
        console.error(e);
        toast({ title: "Error", description: "Could not reject transaction.", variant: "destructive" });
    } finally {
        setLoading(false);
    }
  };

  const handleManualEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMemberId || !amount) return;
    setLoading(true);

    try {
        const selectedMember = members.find(m => m.id === selectedMemberId);
        const amountCents = parseFloat(amount) * 100;

        // Auto-complete transaction
        await addDoc(collection(db, 'groups', groupId, 'transactions'), {
            type: 'contribution',
            amountCents,
            description: reference || 'Manual Entry',
            userId: selectedMemberId,
            userDisplayName: selectedMember?.name,
            status: 'completed',
            createdAt: serverTimestamp(),
            date: new Date().toISOString().split('T')[0]
        });

        // Update Balances
        const batch = (await import("firebase/firestore")).writeBatch(db);
        batch.update(doc(db, 'groups', groupId), { currentBalanceCents: increment(amountCents) });
        batch.update(doc(db, 'groups', groupId, 'members', selectedMemberId), { 
            contributionBalanceCents: increment(amountCents) 
        });
        await batch.commit();

        toast({ title: "Recorded", description: "Manual payment saved." });
        setAmount('');
        setReference('');
    } catch (error) {
        console.error(error);
        toast({ title: "Error", variant: "destructive" });
    } finally {
        setLoading(false);
    }
  };


  // =========================================================
  // LOGIC PART 2: PAYOUT SCHEDULE
  // =========================================================

  const generateSchedule = async () => {
    setLoading(true);
    try {
      const groupRef = doc(db, "groups", groupId);
      const scheduledList = scheduleMembers.map((member, index) => {
        let date = new Date(startDate);
        if (frequency === "weekly") date = addDays(date, index * 7);
        else date = addMonths(date, index);

        return {
          userId: member.userId,
          displayName: member.displayName,
          photoURL: member.photoURL || null, 
          payoutDate: format(date, "yyyy-MM-dd"),
          status: "pending"
        };
      });

      await updateDoc(groupRef, {
        payoutSchedule: scheduledList,
        nextPayoutDate: scheduledList[0]?.payoutDate || null,
        updatedAt: new Date()
      });

      toast({ title: "Schedule Saved", description: "Payout dates updated." });
      setIsDialogOpen(false);
    } catch (error) {
      console.error(error);
      toast({ variant: "destructive", title: "Error", description: "Failed to save schedule." });
    } finally {
      setLoading(false);
    }
  };

  const moveMember = (index: number, direction: 'up' | 'down') => {
    const newMembers = [...scheduleMembers];
    if (direction === 'up' && index > 0) {
      [newMembers[index], newMembers[index - 1]] = [newMembers[index - 1], newMembers[index]];
    } else if (direction === 'down' && index < newMembers.length - 1) {
      [newMembers[index], newMembers[index + 1]] = [newMembers[index + 1], newMembers[index]];
    }
    setScheduleMembers(newMembers);
  };


  // =========================================================
  // RENDER UI
  // =========================================================
  return (
    <div className="space-y-8">
      
      {/* SECTION 1: APPROVALS */}
      <Card className="border-orange-200 bg-orange-50/50">
        <CardHeader>
            <div className="flex items-center gap-2 text-orange-800">
                <AlertCircle className="h-5 w-5" />
                <CardTitle className="text-lg">Pending Approvals</CardTitle>
            </div>
            <CardDescription>Verify payments here. Approving increases Member Trust Score.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            {pendingTx.length === 0 ? (
                <p className="text-sm text-slate-500 italic">No pending approvals.</p>
            ) : (
                pendingTx.map(tx => (
                    <div key={tx.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-white p-4 rounded-lg border shadow-sm gap-4">
                        <div>
                            <div className="font-bold text-slate-900">{tx.userDisplayName}</div>
                            <div className="text-sm text-slate-500">{tx.description} • {tx.date}</div>
                            <div className="text-lg font-bold text-[#2C514C] mt-1">{formatCurrency(tx.amountCents)}</div>
                        </div>
                        <div className="flex gap-2 w-full sm:w-auto">
                            <Button 
                                size="sm" 
                                variant="outline" 
                                className="border-red-200 text-red-700 hover:bg-red-50 flex-1"
                                onClick={() => rejectTransaction(tx.id, tx.userId)}
                            >
                                <XCircle className="w-4 h-4 mr-1" /> Reject
                            </Button>
                            <Button size="sm" className="bg-[#2C514C] hover:bg-[#23413d] text-white flex-1" onClick={() => approveTransaction(tx)} disabled={loading}>
                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle2 className="w-4 h-4 mr-1" /> Approve</>}
                            </Button>
                        </div>
                    </div>
                ))
            )}
        </CardContent>
      </Card>

      <Separator />

      {/* SECTION 2: MANUAL ENTRY */}
      <Card>
        <CardHeader>
          <CardTitle>Record Manual Payment</CardTitle>
          <CardDescription>For cash payments or corrections.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleManualEntry} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Select Member</Label>
                    <Select onValueChange={setSelectedMemberId} value={selectedMemberId}>
                    <SelectTrigger><SelectValue placeholder="Select member..." /></SelectTrigger>
                    <SelectContent>
                        {members.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                    </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label>Amount ($)</Label>
                    <div className="relative">
                        <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                        <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="pl-9" placeholder="0.00" step="0.01" />
                    </div>
                </div>
            </div>
            <div className="space-y-2">
                <Label>Reference</Label>
                <Input value={reference} onChange={e => setReference(e.target.value)} placeholder="e.g. Cash handed at meeting" />
            </div>
            <Button type="submit" className="w-full bg-[#122932]" disabled={loading || !selectedMemberId || !amount}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Record Payment"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Separator />

      {/* SECTION 3: PAYOUT SCHEDULE (Preserved) */}
      <Card className="border-green-100 shadow-sm">
            <CardHeader>
                <CardTitle className="text-xl text-green-800">Payout Management</CardTitle>
                <CardDescription>Drag members to reorder. Save to update the dashboard.</CardDescription>
            </CardHeader>
            <CardContent>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-green-700 hover:bg-green-800"><Calendar className="mr-2 h-4 w-4" />Manage Payout Schedule</Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader><DialogTitle>Configure Payout Rotation</DialogTitle></DialogHeader>
                        <div className="grid gap-6 py-4">
                            <div className="flex items-center gap-4">
                                <div className="grid gap-2 flex-1"><Label>Start Date</Label><Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></div>
                                <div className="grid gap-2 flex-1"><Label>Frequency</Label><Select value={frequency} onValueChange={setFrequency}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="weekly">Weekly</SelectItem><SelectItem value="monthly">Monthly</SelectItem></SelectContent></Select></div>
                            </div>
                            <div className="border rounded-md divide-y max-h-[300px] overflow-y-auto">
                                {scheduleMembers.length === 0 ? <div className="p-4 text-center text-sm text-gray-500">Loading members...</div> : scheduleMembers.map((member, index) => (
                                    <div key={member.userId} className="flex items-center justify-between p-3 bg-white hover:bg-gray-50">
                                        <div className="flex items-center gap-3">
                                            <span className="text-muted-foreground font-mono text-xs w-6 text-center bg-gray-100 rounded">#{index + 1}</span>
                                            {member.photoURL ? <img src={member.photoURL} alt="" className="h-8 w-8 rounded-full object-cover bg-gray-200" /> : <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500"><User className="h-4 w-4" /></div>}
                                            <span className="font-medium text-sm">{member.displayName}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Button variant="ghost" size="icon" className="h-7 w-7" disabled={index === 0} onClick={() => moveMember(index, 'up')}><ArrowUp className="h-4 w-4" /></Button>
                                            <Button variant="ghost" size="icon" className="h-7 w-7" disabled={index === scheduleMembers.length - 1} onClick={() => moveMember(index, 'down')}><ArrowDown className="h-4 w-4" /></Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <DialogFooter><Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button><Button onClick={generateSchedule} disabled={loading} className="bg-green-700 hover:bg-green-800">{loading ? "Saving..." : "Generate & Save Schedule"}</Button></DialogFooter>
                    </DialogContent>
                </Dialog>
            </CardContent>
        </Card>
    </div>
  );
}