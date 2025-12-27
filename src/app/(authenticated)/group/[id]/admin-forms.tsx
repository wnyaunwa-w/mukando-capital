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
  XCircle, AlertCircle, DollarSign, Settings, CalendarIcon 
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
  status?: string;
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
  
  // Manage dates for each pending transaction individually
  const [txDates, setTxDates] = useState<Record<string, string>>({});

  // Settings State
  const [dueDay, setDueDay] = useState<string>("31"); 

  // Manual Entry State
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [amount, setAmount] = useState('');
  const [reference, setReference] = useState('');

  // Schedule State
  const [scheduleMembers, setScheduleMembers] = useState<ScheduledMember[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [startDate, setStartDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [frequency, setFrequency] = useState("monthly");

  // --- 1. FETCH MEMBERS & SETTINGS ---
  useEffect(() => {
    if (!groupId) return;

    const fetchStaticData = async () => {
      try {
        const groupDoc = await getDoc(doc(db, "groups", groupId));
        if (groupDoc.exists()) {
            const data = groupDoc.data();
            if (data.paymentDueDay) setDueDay(data.paymentDueDay.toString());
        }
      } catch (e) { console.error("Error fetching settings:", e); }

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

  // --- 2. LISTEN FOR PENDING TRANSACTIONS ---
  useEffect(() => {
    if (!groupId) return;

    const qTx = query(
        collection(db, 'groups', groupId, 'transactions'), 
        where('status', 'in', ['pending', 'pending_approval'])
    );

    const unsubscribe = onSnapshot(qTx, (snapshot) => {
        const txs = snapshot.docs.map(d => ({ 
            id: d.id, 
            ...d.data() 
        } as PendingTransaction));
        
        setPendingTx(txs);

        // Initialize local dates for any new TXs that don't have one set in state yet
        setTxDates(prev => {
            const next = { ...prev };
            txs.forEach(tx => {
                if (!next[tx.id]) {
                    // Use TX date if valid, otherwise today
                    next[tx.id] = tx.date || new Date().toISOString().split('T')[0];
                }
            });
            return next;
        });
    }, (error) => {
        console.error("Error listening to transactions:", error);
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

  // --- APPROVAL LOGIC (FIXED) ---
  const approveTransaction = async (tx: PendingTransaction) => {
    setLoading(true);
    try {
      // 1. Use the Admin-Confirmed Date from State
      const confirmedDateStr = txDates[tx.id] || new Date().toISOString().split('T')[0];
      const confirmedDate = new Date(confirmedDateStr);
      
      let pointsEarned = 0;
      let scoreMessage = "";

      const paymentDay = confirmedDate.getDate();
      const deadline = parseInt(dueDay) || 31;

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
        
        // Ensure TX exists
        const txDoc = await transaction.get(txRef);
        if (!txDoc.exists()) throw "Transaction missing";

        // ✅ SANITIZE AMOUNT: Ensure it's a number
        const safeAmount = Number(tx.amountCents) || 0;

        // Updates
        transaction.update(txRef, { 
            status: 'completed', 
            approvedAt: serverTimestamp(), 
            date: confirmedDateStr, // ✅ Save the corrected date
            pointsEarned 
        });
        transaction.update(groupRef, { currentBalanceCents: increment(safeAmount) });
        
        const memberDoc = await transaction.get(memberRef);
        if (memberDoc.exists()) {
             transaction.update(memberRef, { contributionBalanceCents: increment(safeAmount) });
        }

        const userSnap = await transaction.get(userRef);
        if (userSnap.exists()) {
             const currentScore = userSnap.data().creditScore || 400; 
             const newScore = Math.min(1250, currentScore + pointsEarned); 
             transaction.update(userRef, { creditScore: newScore });
        }
      });

      toast({ title: "Approved", description: `${scoreMessage}` });
    } catch (error) {
      console.error("Approval Error:", error);
      toast({ title: "Error", description: "Failed to approve transaction.", variant: "destructive" });
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
            
            const txDoc = await transaction.get(txRef);
            if (!txDoc.exists()) throw "Transaction missing";

            transaction.update(txRef, { status: 'rejected' });

            const userSnap = await transaction.get(userRef);
            if (userSnap.exists()) {
                const currentScore = userSnap.data().creditScore || 400;
                const newScore = Math.max(0, currentScore - 10); 
                transaction.update(userRef, { creditScore: newScore });
            }
        });
        toast({ title: "Rejected", description: "Transaction rejected. (-10 Points)" });
    } catch (e) { 
        console.error(e); 
        toast({ title: "Error", description: "Failed to reject.", variant: "destructive" });
    } finally { 
        setLoading(false); 
    }
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
        batch.update(doc(db, 'users', selectedMemberId), { creditScore: increment(5) });

        await batch.commit();
        toast({ title: "Recorded", description: "Manual payment saved (+5 pts)." });
        setAmount(''); setReference('');
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  const generateSchedule = async () => { /* ... existing code ... */ };
  const moveMember = (index: number, direction: 'up' | 'down') => { /* ... existing code ... */ };

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
                    <Input type="number" min="1" max="31" value={dueDay} onChange={(e) => setDueDay(e.target.value)} className="w-20" />
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
                Please verify the Payment Date. <span className="font-bold ml-1 text-orange-700">Deadline is Day {dueDay}.</span>
            </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            {pendingTx.length === 0 ? (
                <p className="text-sm text-slate-500 italic">No pending approvals.</p>
            ) : (
                pendingTx.map(tx => (
                    <div key={tx.id} className="flex flex-col md:flex-row items-start md:items-center justify-between bg-white p-4 rounded-lg border shadow-sm gap-4">
                        <div className="flex-1">
                            <div className="font-bold text-slate-900 text-lg">{tx.userDisplayName}</div>
                            <div className="text-sm text-slate-500 mb-2">{tx.description}</div>
                            <div className="flex items-center gap-2 mb-2">
                                <span className="font-bold text-[#2C514C] text-xl">{formatCurrency(tx.amountCents)}</span>
                            </div>
                        </div>

                        {/* ✅ Date Picker to Fix "Unknown Date" Issues */}
                        <div className="flex flex-col gap-1.5 w-full md:w-auto">
                            <Label className="text-xs text-slate-500">Confirm Payment Date</Label>
                            <div className="flex items-center gap-2">
                                <Input 
                                    type="date" 
                                    className="w-full md:w-40 h-9 bg-slate-50 border-slate-300"
                                    value={txDates[tx.id] || ""}
                                    onChange={(e) => setTxDates(prev => ({ ...prev, [tx.id]: e.target.value }))}
                                />
                            </div>
                        </div>

                        <div className="flex gap-2 w-full md:w-auto pt-4 md:pt-0">
                            <Button size="sm" variant="outline" className="border-red-200 text-red-700 hover:bg-red-50 flex-1 md:flex-none" onClick={() => rejectTransaction(tx.id, tx.userId)}>
                                <XCircle className="w-4 h-4 mr-1" /> Reject
                            </Button>
                            <Button size="sm" className="bg-[#2C514C] hover:bg-[#23413d] text-white flex-1 md:flex-none" onClick={() => approveTransaction(tx)} disabled={loading}>
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

      {/* 4. PAYOUT SCHEDULE (Existing Code) */}
      {/* ... (Kept simplified for brevity, assume the previous Schedule Card logic is here) ... */}
    </div>
  );
}