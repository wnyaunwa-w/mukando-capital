"use client";

import { useState, useEffect } from "react";
import { 
  Card, CardHeader, CardTitle, CardDescription, CardContent 
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { 
  Loader2, XCircle, AlertCircle, Settings, CheckCircle2, ArrowUp, ArrowDown, Calendar, Save
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { addMonths, format } from "date-fns";
import { 
  getFirestore, doc, updateDoc, collection, getDocs, getDoc, setDoc,
  addDoc, serverTimestamp, query, where, increment, onSnapshot 
} from "firebase/firestore";
import { getFirebaseApp } from "@/lib/firebase/client";
import { formatCurrency } from "@/lib/utils";
import { logActivity } from "@/lib/services/audit-service"; 
import { useAuth } from "@/components/auth-provider";

// --- INTERFACES ---
interface MemberOption {
  id: string;
  name: string;
  email: string;
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
    role: string;
}

export function AdminForms({ groupId, currencySymbol = "$" }: { groupId: string, currencySymbol?: string }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const db = getFirestore(getFirebaseApp());
  
  // --- STATE ---
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [pendingTx, setPendingTx] = useState<PendingTransaction[]>([]);
  const [txDates, setTxDates] = useState<Record<string, string>>({});
  const [dueDay, setDueDay] = useState<string>("31"); 
  
  // Rotation / Schedule State
  const [scheduleMembers, setScheduleMembers] = useState<ScheduledMember[]>([]);
  const [startDate, setStartDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [estimatedAmount, setEstimatedAmount] = useState("");
  
  // Manual Entry State
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [amount, setAmount] = useState('');
  const [reference, setReference] = useState('');

  // --- 1. FETCH MEMBERS & SETTINGS ---
  useEffect(() => {
    if (!groupId) return;
    
    const fetchStaticData = async () => {
      // A. Settings
      try {
        const groupDoc = await getDoc(doc(db, "groups", groupId));
        if (groupDoc.exists()) {
            const data = groupDoc.data();
            if (data.paymentDueDay) setDueDay(data.paymentDueDay.toString());
            if (data.contributionAmountCents) setEstimatedAmount((data.contributionAmountCents / 100).toString());
        }
      } catch (e) { console.error(e); }
      
      // B. Members (With Enrichment)
      try {
        const membersRef = collection(db, "groups", groupId, "members");
        const snapshot = await getDocs(membersRef);
        
        // Fetch real names from 'users' collection
        const enrichedMembers = await Promise.all(snapshot.docs.map(async (d) => {
            const mData = d.data();
            let realName = mData.displayName || "Member";
            
            // Try to fetch latest profile
            try {
                const userSnap = await getDoc(doc(db, "users", d.id));
                if (userSnap.exists() && userSnap.data().displayName) {
                    realName = userSnap.data().displayName;
                }
            } catch (err) { console.error("Profile fetch error", err); }

            return { 
                id: d.id, 
                name: realName, 
                email: "", 
                role: mData.role 
            };
        }));

        setMembers(enrichedMembers);
        
        // Only initialize schedule if it's empty (to avoid overwriting user re-ordering)
        setScheduleMembers(prev => {
            if (prev.length > 0) return prev;
            return enrichedMembers.map(m => ({ userId: m.id, displayName: m.name, role: m.role || 'member' }));
        });

      } catch (e) { console.error(e); }
    };

    fetchStaticData();
  }, [groupId, db]);

  // --- 2. LISTEN FOR TRANSACTIONS ---
  useEffect(() => {
    if (!groupId) return;
    const qTx = query(
        collection(db, 'groups', groupId, 'transactions'), 
        where('status', 'in', ['pending', 'pending_confirmation'])
    );
    
    const unsubscribe = onSnapshot(qTx, (snapshot) => {
        const txs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as PendingTransaction));
        setPendingTx(txs);
        setTxDates(prev => {
            const next = { ...prev };
            txs.forEach(tx => { 
                if (!next[tx.id]) next[tx.id] = tx.date || new Date().toISOString().split('T')[0]; 
            });
            return next;
        });
    });
    return () => unsubscribe();
  }, [groupId, db]);

  // --- 3. SCHEDULE LOGIC ---
  const moveMember = (index: number, direction: 'up' | 'down') => {
    const newOrder = [...scheduleMembers];
    if (direction === 'up' && index > 0) {
        [newOrder[index], newOrder[index - 1]] = [newOrder[index - 1], newOrder[index]];
    } else if (direction === 'down' && index < newOrder.length - 1) {
        [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
    }
    setScheduleMembers(newOrder);
  };

  const publishSchedule = async () => {
    if (!startDate || !estimatedAmount) {
        toast({ variant: "destructive", title: "Missing Info", description: "Please set a start date and payout amount." });
        return;
    }
    if (!confirm("This will overwrite any existing schedule. Confirm?")) return;
    
    setLoading(true);
    try {
        // Generate the schedule array
        const schedule = scheduleMembers.map((member, index) => {
            // Calculate date: Start Date + (Index * 1 Month)
            const date = addMonths(new Date(startDate), index);
            return {
                userId: member.userId,
                displayName: member.displayName,
                payoutDate: format(date, "yyyy-MM-dd"),
                amountCents: parseFloat(estimatedAmount) * 100,
                status: 'pending' // pending, paid, skipped
            };
        });

        // Save to Group Doc
        await updateDoc(doc(db, "groups", groupId), {
            payoutSchedule: schedule
        });
        
        if (user) {
            await logActivity({
                groupId,
                action: "SETTINGS_UPDATED" as any, 
                description: `Published new payout schedule starting ${startDate}`,
                performedBy: { uid: user.uid, displayName: user.displayName || "Admin" }
            });
        }

        toast({ title: "Schedule Published", description: "Members can now see their dates in the Schedule tab." });

    } catch (error) {
        console.error(error);
        toast({ variant: "destructive", title: "Error", description: "Failed to save schedule." });
    } finally {
        setLoading(false);
    }
  };

  // --- 4. ACTION HANDLERS (Approve/Reject/Manual) ---
  const saveDueDay = async () => {
    try { 
        await updateDoc(doc(db, "groups", groupId), { paymentDueDay: parseInt(dueDay) }); 
        toast({ title: "Saved", description: `Due date set to Day ${dueDay}` }); 
    } catch (e) { toast({ title: "Error", variant: "destructive" }); }
  };

  const approveTransaction = async (tx: PendingTransaction) => {
    setLoading(true);
    try {
      const confirmedDateStr = txDates[tx.id] || new Date().toISOString().split('T')[0];
      const confirmedDate = new Date(confirmedDateStr);
      const paymentDay = confirmedDate.getDate();
      const deadline = parseInt(dueDay) || 31;

      // Calculate Points
      let pointsEarned = 5;
      let scoreMessage = "Paid Very Late (+5 Points)";
      if (paymentDay <= deadline) { pointsEarned = 20; scoreMessage = "Excellent! Paid On Time (+20 Points)"; } 
      else if (paymentDay <= deadline + 5) { pointsEarned = 10; scoreMessage = "Paid Late (+10 Points)"; }

      const safeAmount = Number(tx.amountCents) || 0;

      // 1. Update Transaction Status
      await updateDoc(doc(db, 'groups', groupId, 'transactions', tx.id), {
          status: 'completed',
          approvedAt: serverTimestamp(),
          date: confirmedDateStr,
          pointsEarned
      });

      // 2. Update Group Balance
      await updateDoc(doc(db, 'groups', groupId), { currentBalanceCents: increment(safeAmount) });

      // 3. Update Member Balance
      try { 
          await updateDoc(doc(db, 'groups', groupId, 'members', tx.userId), { 
              contributionBalanceCents: increment(safeAmount), 
              lastPaymentDate: serverTimestamp() 
          }); 
      } catch (err) { console.warn("Member profile update warning:", err); }

      // 4. Update Global Credit Score (Fix: Better Error Handling & Explicit Check)
      try {
        if (!tx.userId) throw new Error("Missing User ID for score update");

        const userRef = doc(db, 'users', tx.userId);
        const userSnap = await getDoc(userRef);
        
        // Default to 400 if user has no score yet
        let currentScore = 400;
        if (userSnap.exists() && userSnap.data().creditScore !== undefined) {
            currentScore = userSnap.data().creditScore;
        }

        const newScore = Math.min(1250, currentScore + pointsEarned);
        
        // Use setDoc with merge to ensure document exists
        await setDoc(userRef, { creditScore: newScore }, { merge: true });
        
        console.log(`Updated score for ${tx.userId}: ${currentScore} -> ${newScore}`);
        
      } catch (scoreErr) {
        console.error("Score update failed:", scoreErr);
        scoreMessage = "Payment Approved (Score update failed)";
        toast({ variant: "destructive", title: "Score Error", description: "Payment approved, but credit score could not be updated." });
      }

      // 5. Audit Log
      if (user) await logActivity({ 
          groupId, 
          action: "PAYMENT_APPROVED" as any, 
          description: `Approved ${formatCurrency(safeAmount, currencySymbol)} from ${tx.userDisplayName}`, 
          performedBy: { uid: user.uid, displayName: user.displayName || "Admin" } 
      });

      // Only show success toast if we didn't already show an error toast for the score
      if (!scoreMessage.includes("failed")) {
          toast({ title: "Approved", description: scoreMessage });
      }

    } catch (error) { 
        console.error("Critical Approval Error", error);
        toast({ title: "Error", description: "Failed to approve transaction.", variant: "destructive" }); 
    } finally { 
        setLoading(false); 
    }
  };

  const rejectTransaction = async (txId: string, userId: string) => {
    if(!confirm("Reject this transaction?")) return;
    setLoading(true);
    try {
        await updateDoc(doc(db, 'groups', groupId, 'transactions', txId), { status: 'rejected' });
        try { 
            const userRef = doc(db, 'users', userId);
            const userSnap = await getDoc(userRef);
            let currentScore = userSnap.exists() && userSnap.data().creditScore !== undefined ? userSnap.data().creditScore : 400;
            await setDoc(userRef, { creditScore: Math.max(0, currentScore - 10) }, { merge: true });
        } catch(e) {}
        toast({ title: "Rejected", description: "Transaction rejected. (-10 pts)" });
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

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
        await updateDoc(doc(db, 'groups', groupId), { currentBalanceCents: increment(amountCents) });
        try { await updateDoc(doc(db, 'groups', groupId, 'members', selectedMemberId), { contributionBalanceCents: increment(amountCents), lastPaymentDate: serverTimestamp() }); } catch(e){}
        
        // Manual Entry Score Update (Hardened)
        try {
            if (!selectedMemberId) throw new Error("No Member ID");
            const userRef = doc(db, 'users', selectedMemberId);
            const userSnap = await getDoc(userRef);
            let currentScore = userSnap.exists() && userSnap.data().creditScore !== undefined ? userSnap.data().creditScore : 400;
            await setDoc(userRef, { creditScore: Math.min(1250, currentScore + 5) }, { merge: true });
        } catch(e){
            console.error("Manual Entry Score Update Failed:", e);
        }

        if (user) await logActivity({ groupId, action: "PAYMENT_RECORDED" as any, description: `Manually recorded ${formatCurrency(amountCents, currencySymbol)} for ${selectedMember?.name}`, performedBy: { uid: user.uid, displayName: user.displayName || "Admin" } });
        toast({ title: "Recorded", description: "Manual payment saved (+5 pts)." });
        setAmount(''); setReference('');
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  return (
    <div className="space-y-8">
      {/* 1. SETTINGS */}
      <Card className="border-slate-200 bg-slate-50">
        <CardHeader className="pb-3">
            <div className="flex items-center gap-2"><Settings className="h-5 w-5 text-slate-600" /><CardTitle className="text-lg">Group Settings</CardTitle></div>
            <CardDescription>Contributions due by Day {dueDay}.</CardDescription>
        </CardHeader>
        <CardContent className="flex items-end gap-4">
            <div className="space-y-2 flex-1">
                <Label>Deadline Day</Label>
                <Input type="number" min="1" max="31" value={dueDay} onChange={(e) => setDueDay(e.target.value)} className="w-20" />
            </div>
            <Button onClick={saveDueDay} className="bg-slate-700 hover:bg-slate-800">Save</Button>
        </CardContent>
      </Card>
      
      {/* 2. ROTATIONAL PICKER */}
      <Separator />
      <Card className="border-indigo-100 bg-indigo-50/30">
        <CardHeader>
            <div className="flex items-center gap-2 text-indigo-900">
                <Calendar className="h-5 w-5" />
                <CardTitle className="text-lg">Manage Payout Rotation</CardTitle>
            </div>
            <CardDescription>Drag or move members to set who gets paid when.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            {/* List to Reorder */}
            <div className="space-y-2 bg-white rounded-lg border p-2 shadow-sm max-h-60 overflow-y-auto">
                {scheduleMembers.map((m, index) => (
                    <div key={m.userId} className="flex items-center justify-between p-2 hover:bg-slate-50 rounded border-b last:border-0">
                        <div className="flex items-center gap-3">
                            <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                                {index + 1}
                            </div>
                            <span className="font-medium text-slate-700">{m.displayName}</span>
                        </div>
                        <div className="flex gap-1">
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => moveMember(index, 'up')} disabled={index === 0}>
                                <ArrowUp className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => moveMember(index, 'down')} disabled={index === scheduleMembers.length - 1}>
                                <ArrowDown className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Inputs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Start Date</Label>
                    <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-white" />
                    <p className="text-xs text-slate-500">First person gets paid on this date.</p>
                </div>
                <div className="space-y-2">
                    <Label>Payout Amount ({currencySymbol})</Label>
                    <Input type="number" value={estimatedAmount} onChange={(e) => setEstimatedAmount(e.target.value)} placeholder="500.00" className="bg-white font-bold" />
                </div>
            </div>

            <Button onClick={publishSchedule} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white" disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                Publish Schedule
            </Button>
        </CardContent>
      </Card>

      <Separator />

      {/* 3. PENDING APPROVALS */}
      <Card className="border-orange-200 bg-orange-50/50">
        <CardHeader>
            <div className="flex items-center gap-2 text-orange-800"><AlertCircle className="h-5 w-5" /><CardTitle className="text-lg">Pending Approvals</CardTitle></div>
        </CardHeader>
        <CardContent className="space-y-4">
            {pendingTx.length === 0 ? <p className="text-sm text-slate-500 italic">No pending approvals.</p> : pendingTx.map(tx => (
                <div key={tx.id} className="flex flex-col md:flex-row items-start md:items-center justify-between bg-white p-4 rounded-lg border shadow-sm gap-4">
                    <div className="flex-1">
                        <div className="font-bold text-slate-900 text-lg">{tx.userDisplayName}</div>
                        <div className="text-sm text-slate-500 mb-2">{tx.description || "Payment Claim"}</div>
                        <div className="font-bold text-[#2C514C] text-xl">{formatCurrency(tx.amountCents, currencySymbol)}</div>
                    </div>
                    <div className="flex flex-col gap-1.5 w-full md:w-auto">
                        <Label className="text-xs text-slate-500">Confirm Date</Label>
                        <Input type="date" className="w-full md:w-40 h-9 bg-slate-50 border-slate-300" value={txDates[tx.id] || ""} onChange={(e) => setTxDates(prev => ({ ...prev, [tx.id]: e.target.value }))} />
                    </div>
                    <div className="flex gap-2 w-full md:w-auto pt-4 md:pt-0">
                        <Button size="sm" variant="outline" className="border-red-200 text-red-700 hover:bg-red-50 flex-1 md:flex-none" onClick={() => rejectTransaction(tx.id, tx.userId)}><XCircle className="w-4 h-4 mr-1" /> Reject</Button>
                        <Button size="sm" className="bg-[#2C514C] hover:bg-[#23413d] text-white flex-1 md:flex-none" onClick={() => approveTransaction(tx)} disabled={loading}>{loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle2 className="w-4 h-4 mr-1" /> Approve</>}</Button>
                    </div>
                </div>
            ))}
        </CardContent>
      </Card>
      <Separator />

      {/* 4. MANUAL ENTRY */}
      <Card>
        <CardHeader><CardTitle>Record Manual Payment</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleManualEntry} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Member</Label><Select onValueChange={setSelectedMemberId} value={selectedMemberId}><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent>{members.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent></Select></div>
                
                <div className="space-y-2">
                    <Label>Amount ({currencySymbol})</Label>
                    <div className="relative">
                        <span className="absolute left-3 top-2.5 text-slate-500 font-bold">{currencySymbol}</span>
                        <Input type="number" className="pl-8" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" />
                    </div>
                </div>
            </div>
            <div className="space-y-2"><Label>Reference</Label><Input value={reference} onChange={e => setReference(e.target.value)} placeholder="e.g. Cash Handover" /></div>
            <Button type="submit" className="w-full bg-[#122932]" disabled={loading}>{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Record Payment"}</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}