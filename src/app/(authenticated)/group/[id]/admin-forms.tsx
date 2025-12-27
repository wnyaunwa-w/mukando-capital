'use client';

import { useState, useEffect } from "react";
import { 
  Card, CardHeader, CardTitle, CardDescription, CardContent 
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { 
  Calendar, ArrowUp, ArrowDown, User, Loader2, CheckCircle2, 
  XCircle, AlertCircle, DollarSign, Settings 
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { addDays, addMonths, format } from "date-fns";
import { 
  getFirestore, doc, updateDoc, collection, getDocs, getDoc, 
  addDoc, serverTimestamp, query, where, runTransaction, increment, onSnapshot 
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
  
  // --- STATE ---
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [pendingTx, setPendingTx] = useState<PendingTransaction[]>([]);
  
  // Settings State
  const [dueDay, setDueDay] = useState<string>("31"); // Default: End of month

  // Manual Entry State
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [amount, setAmount] = useState('');
  const [reference, setReference] = useState('');

  // Schedule State
  const [scheduleMembers, setScheduleMembers] = useState<ScheduledMember[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [startDate, setStartDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [frequency, setFrequency] = useState("monthly");

  // --- 1. FETCH MEMBERS & SETTINGS (One-time) ---
  useEffect(() => {
    if (!groupId) return;

    const fetchStaticData = async () => {
      // A. Fetch Group Settings (Due Day)
      try {
        const groupDoc = await getDoc(doc(db, "groups", groupId));
        if (groupDoc.exists()) {
            const data = groupDoc.data();
            if (data.paymentDueDay) setDueDay(data.paymentDueDay.toString());
        }
      } catch (e) { console.error("Error fetching settings:", e); }

      // B. Fetch Members
      try {
        const membersRef = collection(db, "groups", groupId, "members");
        const snapshot = await getDocs(membersRef);
        
        const memberDataPromises = snapshot.docs.map(async (memberDoc) => {
            const mData = memberDoc.data();
            let displayName = mData.displayName || "Member";
            let photoURL = mData.photoURL || null;
            let email = mData.email || "";

            try {
                const userSnap = await getDoc(doc(db, "users", memberDoc.id));
                if (userSnap.exists()) {
                    const uData = userSnap.data();
                    if (uData.displayName) displayName = uData.displayName;
                    if (uData.photoURL) photoURL = uData.photoURL;
                }
            } catch (e) { console.error(e); }

            return { id: memberDoc.id, name: displayName, email, photoURL, role: mData.role };
        });

        const fullMembers = await Promise.all(memberDataPromises);
        setMembers(fullMembers);
        setScheduleMembers(fullMembers.map(m => ({
            userId: m.id, displayName: m.name, photoURL: m.photoURL || undefined, role: m.role || 'member'
        })));
      } catch (e) { console.error("Error fetching members:", e); }
    };

    fetchStaticData();
  }, [groupId, db]);

  // --- 2. LISTEN FOR PENDING TRANSACTIONS (Real-time) ---
  useEffect(() => {
    if (!groupId) return;

    const qTx = query(
        collection(db, 'groups', groupId, 'transactions'), 
        where('status', '==', 'pending_approval')
    );

    const unsubscribe = onSnapshot(qTx, (snapshot) => {
        const txs = snapshot.docs.map(d => ({ 
            id: d.id, 
            ...d.data() 
        } as PendingTransaction));
        setPendingTx(txs);
    });

    return () => unsubscribe();
  }, [groupId, db]);


  // --- SETTINGS: SAVE DUE DAY ---
  const saveDueDay = async () => {
    try {
        await updateDoc(doc(db, "groups", groupId), { paymentDueDay: parseInt(dueDay) });
        toast({ title: "Saved", description: `Contributions now due on day ${dueDay} of the month.` });
    } catch (e) {
        toast({ title: "Error", description: "Could not save setting.", variant: "destructive" });
    }
  };

  // --- APPROVAL LOGIC (SCORING V3) ---
  const approveTransaction = async (tx: PendingTransaction) => {
    setLoading(true);
    try {
      let pointsEarned = 0;
      let scoreMessage = "";

      // 1. Calculate Score based on Due Date
      const paymentDate = new Date(tx.date);
      const paymentDay = paymentDate.getDate();
      const deadline = parseInt(dueDay);

      // Scoring Logic:
      if (paymentDay <= deadline) {
          pointsEarned = 20; 
          scoreMessage = "Excellent! Paid On Time (+20 Points)";
      } 
      else if (paymentDay <= deadline + 5) {
          pointsEarned = 10; 
          scoreMessage = "Paid Late (+10 Points)";
      } 
      else {
          pointsEarned = 5; 
          scoreMessage = "Paid Very Late (+5 Points)";
      }

      await runTransaction(db, async (transaction) => {
        const txRef = doc(db, 'groups', groupId, 'transactions', tx.id);
        const groupRef = doc(db, 'groups', groupId);
        const userRef = doc(db, 'users', tx.userId);
        const memberRef = doc(db, 'groups', groupId, 'members', tx.userId);
        
        // Updates
        transaction.update(txRef, { status: 'completed', approvedAt: serverTimestamp(), pointsEarned });
        transaction.update(groupRef, { currentBalanceCents: increment(tx.amountCents) });
        transaction.update(memberRef, { contributionBalanceCents: increment(tx.amountCents) });

        // Credit Score Update
        const userSnap = await transaction.get(userRef);
        if (userSnap.exists()) {
             const currentScore = userSnap.data().creditScore || 400; 
             const newScore = Math.min(850, currentScore + pointsEarned); // Max score 850
             transaction.update(userRef, { creditScore: newScore });
        }
      });

      toast({ title: "Approved", description: `${scoreMessage}` });
      // Note: onSnapshot will automatically remove it from the list
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
            const txRef = doc(db, 'groups', groupId, 'transactions', txId);
            const userRef = doc(db, 'users', userId);
            transaction.update(txRef, { status: 'rejected' });

            const userSnap = await transaction.get(userRef);
            if (userSnap.exists()) {
                const currentScore = userSnap.data().creditScore || 400;
                // Penalize -10 points
                const newScore = Math.max(0, currentScore - 10); 
                transaction.update(userRef, { creditScore: newScore });
            }
        });
        toast({ title: "Rejected", description: "Transaction rejected. (-10 Points)" });
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  // --- MANUAL ENTRY ---
  const handleManualEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMemberId || !amount) return;
    setLoading(true);
    try {
        const selectedMember = members.find(m => m.id === selectedMemberId);
        const amountCents = parseFloat(amount) * 100;
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
        const batch = (await import("firebase/firestore")).writeBatch(db);
        batch.update(doc(db, 'groups', groupId), { currentBalanceCents: increment(amountCents) });
        batch.update(doc(db, 'groups', groupId, 'members', selectedMemberId), { contributionBalanceCents: increment(amountCents) });
        
        // Bonus for manual entry (+5)
        batch.update(doc(db, 'users', selectedMemberId), { creditScore: increment(5) });

        await batch.commit();
        toast({ title: "Recorded", description: "Manual payment saved (+5 pts)." });
        setAmount(''); setReference('');
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  // --- SCHEDULE LOGIC ---
  const generateSchedule = async () => {
    setLoading(true);
    try {
      const groupRef = doc(db, "groups", groupId);
      const scheduledList = scheduleMembers.map((member, index) => {
        let date = new Date(startDate);
        if (frequency === "weekly") date = addDays(date, index * 7);
        else date = addMonths(date, index);
        return {
          userId: member.userId, displayName: member.displayName, photoURL: member.photoURL || null, 
          payoutDate: format(date, "yyyy-MM-dd"), status: "pending"
        };
      });
      await updateDoc(groupRef, { payoutSchedule: scheduledList, nextPayoutDate: scheduledList[0]?.payoutDate || null, updatedAt: new Date() });
      toast({ title: "Schedule Saved", description: "Payout dates updated." });
      setIsDialogOpen(false);
    } catch (error) { console.error(error); } finally { setLoading(false); }
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

  return (
    <div className="space-y-8">
      
      {/* 1. SETTINGS CARD */}
      <Card className="border-slate-200 bg-slate-50">
        <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-slate-600" />
                <CardTitle className="text-lg">Group Settings</CardTitle>
            </div>
            <CardDescription>Set the contribution deadline to automate credit scoring.</CardDescription>
        </CardHeader>
        <CardContent className="flex items-end gap-4">
            <div className="space-y-2 flex-1">
                <Label>Monthly Contribution Deadline (Day of Month)</Label>
                <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-500">Day:</span>
                    <Input 
                        type="number" min="1" max="31" 
                        value={dueDay} 
                        onChange={(e) => setDueDay(e.target.value)} 
                        className="w-20"
                    />
                    <span className="text-sm text-slate-500">of every month</span>
                </div>
            </div>
            <Button onClick={saveDueDay} className="bg-slate-700 hover:bg-slate-800">Save Setting</Button>
        </CardContent>
      </Card>

      <Separator />

      {/* 2. PENDING APPROVALS */}
      <Card className="border-orange-200 bg-orange-50/50">
        <CardHeader>
            <div className="flex items-center gap-2 text-orange-800">
                <AlertCircle className="h-5 w-5" />
                <CardTitle className="text-lg">Pending Approvals</CardTitle>
            </div>
            <CardDescription>
                System will check if paid by Day {dueDay}. 
                <span className="font-bold ml-1 text-orange-700">On Time = +20 pts, Late = +10 pts.</span>
            </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            {pendingTx.length === 0 ? (
                <p className="text-sm text-slate-500 italic">No pending approvals.</p>
            ) : (
                pendingTx.map(tx => (
                    <div key={tx.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-white p-4 rounded-lg border shadow-sm gap-4">
                        <div>
                            <div className="font-bold text-slate-900">{tx.userDisplayName}</div>
                            <div className="text-sm text-slate-500">{tx.description} • Paid: {tx.date}</div>
                            <div className="text-lg font-bold text-[#2C514C] mt-1">{formatCurrency(tx.amountCents)}</div>
                        </div>
                        <div className="flex gap-2 w-full sm:w-auto">
                            <Button size="sm" variant="outline" className="border-red-200 text-red-700 hover:bg-red-50 flex-1" onClick={() => rejectTransaction(tx.id, tx.userId)}>
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

      {/* 3. MANUAL ENTRY */}
      <Card>
        <CardHeader><CardTitle>Record Manual Payment</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleManualEntry} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Select Member</Label>
                    <Select onValueChange={setSelectedMemberId} value={selectedMemberId}><SelectTrigger><SelectValue placeholder="Select member..." /></SelectTrigger><SelectContent>{members.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent></Select>
                </div>
                <div className="space-y-2">
                    <Label>Amount ($)</Label>
                    <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" step="0.01" />
                </div>
            </div>
            <div className="space-y-2"><Label>Reference</Label><Input value={reference} onChange={e => setReference(e.target.value)} placeholder="e.g. Cash handed at meeting" /></div>
            <Button type="submit" className="w-full bg-[#122932]" disabled={loading || !selectedMemberId || !amount}>{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Record Payment"}</Button>
          </form>
        </CardContent>
      </Card>

      <Separator />

      {/* 4. PAYOUT SCHEDULE */}
      <Card className="border-green-100 shadow-sm">
            <CardHeader><CardTitle className="text-xl text-green-800">Payout Management</CardTitle></CardHeader>
            <CardContent>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild><Button className="bg-green-700 hover:bg-green-800"><Calendar className="mr-2 h-4 w-4" />Manage Schedule</Button></DialogTrigger>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader><DialogTitle>Configure Payout Rotation</DialogTitle></DialogHeader>
                        <div className="grid gap-6 py-4">
                            <div className="flex items-center gap-4">
                                <div className="grid gap-2 flex-1"><Label>Start Date</Label><Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></div>
                                <div className="grid gap-2 flex-1"><Label>Frequency</Label><Select value={frequency} onValueChange={setFrequency}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="weekly">Weekly</SelectItem><SelectItem value="monthly">Monthly</SelectItem></SelectContent></Select></div>
                            </div>
                            <div className="border rounded-md divide-y max-h-[300px] overflow-y-auto">
                                {scheduleMembers.map((member, index) => (
                                    <div key={member.userId} className="flex items-center justify-between p-3 bg-white hover:bg-gray-50">
                                        <div className="flex items-center gap-3">
                                            <span className="text-muted-foreground font-mono text-xs w-6 text-center bg-gray-100 rounded">#{index + 1}</span>
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
                        <DialogFooter><Button onClick={generateSchedule} disabled={loading} className="bg-green-700 hover:bg-green-800">Save Schedule</Button></DialogFooter>
                    </DialogContent>
                </Dialog>
            </CardContent>
        </Card>
    </div>
  );
}