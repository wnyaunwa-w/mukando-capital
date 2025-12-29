"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { 
  Card, CardContent, CardHeader, CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ShieldAlert, Loader2, Plus, Minus, Banknote, ArrowLeft, Download, Trash2, Ban, CheckCircle, MoreHorizontal
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";
import { 
  getFirestore, collection, query, getDocs, doc, updateDoc, setDoc, deleteDoc, orderBy, getDoc, serverTimestamp
} from "firebase/firestore";
import { getFirebaseApp } from "@/lib/firebase/client";
import { GlobalScoreboard } from "@/components/admin/global-scoreboard";

// --- TYPES ---
interface FeeRequest {
  id: string; userId: string; userDisplayName: string; amountCents: number; refNumber: string; groupId: string; status: 'pending' | 'approved' | 'rejected'; createdAt: any;
}
interface AdminGroup {
  id: string; name: string; membersCount: number; currentBalanceCents: number; status: string;
}
interface AdminUser {
  uid: string; displayName: string; email: string; phoneNumber?: string; role?: string; status?: string; joinedAt?: any;
}

export default function SuperAdminPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [feeRequests, setFeeRequests] = useState<FeeRequest[]>([]);
  const [groupsList, setGroupsList] = useState<AdminGroup[]>([]);
  const [usersList, setUsersList] = useState<AdminUser[]>([]);
  const [stats, setStats] = useState({ totalGroups: 0, totalVolumeCents: 0, activeSubs: 0, totalEarningsCents: 0 });
  const [platformFeeCents, setPlatformFeeCents] = useState(100);
  const [savingFee, setSavingFee] = useState(false);
  const db = getFirestore(getFirebaseApp());

  useEffect(() => {
    const fetchData = async () => {
      try {
        const groupsSnap = await getDocs(collection(db, "groups"));
        const groupsData: AdminGroup[] = [];
        let volume = 0;
        groupsSnap.forEach(doc => {
            const d = doc.data(); volume += (d.currentBalanceCents || 0);
            groupsData.push({ id: doc.id, name: d.name || "Unnamed", membersCount: d.membersCount || 0, currentBalanceCents: d.currentBalanceCents || 0, status: d.status || 'active' });
        });
        setGroupsList(groupsData);

        const usersSnap = await getDocs(collection(db, "users"));
        const usersData: AdminUser[] = [];
        usersSnap.forEach(doc => {
            const d = doc.data();
            let safeName = d.displayName;
            if (!safeName && d.firstName && d.lastName) safeName = `${d.firstName} ${d.lastName}`;
            if (!safeName && d.email) safeName = d.email.split('@')[0];
            usersData.push({ uid: doc.id, displayName: safeName || "User", email: d.email || "", phoneNumber: d.phoneNumber || "N/A", role: d.role || "member", status: d.status || "active", joinedAt: d.createdAt });
        });
        setUsersList(usersData);

        const qFees = query(collection(db, "fee_requests"), orderBy("createdAt", "desc"));
        const feesSnap = await getDocs(qFees);
        const requests: FeeRequest[] = [];
        let earnings = 0; let approvedCount = 0;
        feesSnap.forEach(doc => {
            const d = doc.data(); requests.push({ id: doc.id, ...d } as FeeRequest);
            if (d.status === 'approved') { earnings += (d.amountCents || 0); approvedCount++; }
        });
        setFeeRequests(requests);

        setStats({ totalGroups: groupsSnap.size, totalVolumeCents: volume, activeSubs: approvedCount, totalEarningsCents: earnings });

        const settingsSnap = await getDoc(doc(db, "settings", "global"));
        if (settingsSnap.exists()) {
            const d = settingsSnap.data();
            setPlatformFeeCents(d.platformFeeCents !== undefined ? d.platformFeeCents : 100);
        }
      } catch (e) { console.error(e); } finally { setLoading(false); }
    };
    fetchData();
  }, []);

  const handleFeeAction = async (req: FeeRequest, action: 'approved' | 'rejected') => {
    try {
        await updateDoc(doc(db, "fee_requests", req.id), { status: action });
        if (action === 'approved') {
            await updateDoc(doc(db, "groups", req.groupId, "members", req.userId), { subscriptionStatus: 'active', subscriptionEndsAt: new Date(Date.now() + 30*24*60*60*1000).toISOString(), updatedAt: serverTimestamp() });
            setStats(p => ({ ...p, activeSubs: p.activeSubs + 1, totalEarningsCents: p.totalEarningsCents + req.amountCents }));
        }
        setFeeRequests(p => p.map(r => r.id === req.id ? { ...r, status: action } : r));
        toast({ title: "Success", description: `Request ${action}` });
    } catch (e) { toast({ variant: "destructive", title: "Error" }); }
  };

  const savePlatformFee = async () => {
    setSavingFee(true);
    try {
        await setDoc(doc(db, "settings", "global"), { platformFeeCents }, { merge: true });
        toast({ title: "Saved", description: platformFeeCents === 0 ? "Platform is FREE" : "Fee updated" });
    } catch (e) { toast({ variant: "destructive", title: "Error" }); } finally { setSavingFee(false); }
  };

  const pendingRequests = feeRequests.filter(r => r.status === 'pending');

  if (loading) return <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-[#2C514C]" /></div>;

  return (
    <div className="space-y-6 pb-20 px-1 md:px-0">
      <div className="flex flex-col gap-2">
        <Button variant="ghost" className="w-fit pl-0 text-slate-500" onClick={() => router.push("/dashboard")}><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button>
        <h1 className="text-2xl md:text-3xl font-bold text-[#122932] flex items-center gap-2"><ShieldAlert className="h-6 w-6 text-red-700" /> Super Admin</h1>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
        <Card className="bg-[#122932] text-white border-none shadow-md"><CardHeader className="pb-2 pt-4 px-4"><CardTitle className="text-xs font-medium text-slate-300 uppercase">Groups</CardTitle><div className="text-2xl font-bold">{stats.totalGroups}</div></CardHeader></Card>
        <Card className="bg-[#2f6f3e] text-white border-none shadow-md"><CardHeader className="pb-2 pt-4 px-4"><CardTitle className="text-xs font-medium text-slate-200 uppercase">Volume</CardTitle><div className="text-2xl font-bold">{formatCurrency(stats.totalVolumeCents)}</div></CardHeader></Card>
        <Card className="bg-amber-600 text-white border-none shadow-md"><CardHeader className="pb-2 pt-4 px-4"><CardTitle className="text-xs font-medium text-amber-100 uppercase">Earnings</CardTitle><div className="text-2xl font-bold">{formatCurrency(stats.totalEarningsCents)}</div></CardHeader></Card>
        <Card className="bg-[#576066] text-white border-none shadow-md"><CardHeader className="pb-2 pt-4 px-4"><CardTitle className="text-xs font-medium text-slate-300 uppercase">Active Subs</CardTitle><div className="text-2xl font-bold">{stats.activeSubs}</div></CardHeader></Card>
        <Card className="bg-[#0f172a] text-white border-none shadow-md sm:col-span-2 xl:col-span-1">
            <CardHeader className="pb-1 pt-4 px-4"><CardTitle className="text-xs font-medium text-slate-400 uppercase">Sub Fee</CardTitle><div className="text-2xl font-bold text-white">{platformFeeCents === 0 ? "FREE" : formatCurrency(platformFeeCents)}</div></CardHeader>
            <CardContent className="px-4 pb-4 pt-1 flex items-center gap-2">
                <Button variant="outline" size="icon" className="h-7 w-7 border-slate-600" onClick={() => setPlatformFeeCents(c => Math.max(0, c - 50))}><Minus className="h-3 w-3 text-white" /></Button>
                <Button variant="outline" size="icon" className="h-7 w-7 border-slate-600" onClick={() => setPlatformFeeCents(c => c + 50)}><Plus className="h-3 w-3 text-white" /></Button>
                <Button size="sm" className="h-7 ml-auto bg-[#2C514C]" onClick={savePlatformFee} disabled={savingFee}>{savingFee ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save"}</Button>
            </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="fees" className="w-full">
        <div className="overflow-x-auto pb-2 -mx-1 px-1"><TabsList className="bg-white border w-full justify-start min-w-[350px]"><TabsTrigger value="fees">Fees {pendingRequests.length > 0 && <Badge className="ml-2 bg-red-600">{pendingRequests.length}</Badge>}</TabsTrigger><TabsTrigger value="groups">Groups</TabsTrigger><TabsTrigger value="users">Users</TabsTrigger><TabsTrigger value="scores">Scores</TabsTrigger></TabsList></div>
        <TabsContent value="fees" className="space-y-4"><Card><CardHeader className="px-4 py-4"><CardTitle className="text-lg">Pending</CardTitle></CardHeader><CardContent className="px-4 pb-4">{pendingRequests.length === 0 ? <div className="text-center py-8 text-slate-500">No requests</div> : pendingRequests.map(req => <div key={req.id} className="flex justify-between items-center p-3 border rounded mb-2"><div><div className="font-bold">{req.userDisplayName}</div><div className="text-sm font-mono">{req.refNumber}</div></div><div className="flex gap-2"><Button size="sm" variant="ghost" className="text-red-600" onClick={() => handleFeeAction(req, 'rejected')}>Reject</Button><Button size="sm" className="bg-green-700" onClick={() => handleFeeAction(req, 'approved')}>Approve</Button></div></div>)}</CardContent></Card></TabsContent>
        <TabsContent value="groups"><Card><CardHeader className="px-4 py-4"><CardTitle className="text-lg">Groups</CardTitle></CardHeader><CardContent className="p-0"><div className="overflow-x-auto"><table className="w-full text-sm text-left"><thead className="bg-slate-100 border-b"><tr><th className="p-3">Name</th><th className="p-3">Status</th><th className="p-3">Action</th></tr></thead><tbody>{groupsList.map(g => <tr key={g.id} className="border-b"><td className="p-3">{g.name}</td><td className="p-3"><Badge variant="outline">{g.status}</Badge></td><td className="p-3"><Button size="sm" variant="ghost" onClick={() => deleteDoc(doc(db, "groups", g.id))}><Trash2 className="h-4 w-4 text-red-500" /></Button></td></tr>)}</tbody></table></div></CardContent></Card></TabsContent>
        <TabsContent value="users"><Card><CardHeader className="px-4 py-4"><CardTitle className="text-lg">Users</CardTitle></CardHeader><CardContent className="p-0"><div className="overflow-x-auto"><table className="w-full text-sm text-left"><thead className="bg-slate-100 border-b"><tr><th className="p-3">Name</th><th className="p-3">Email</th><th className="p-3">Action</th></tr></thead><tbody>{usersList.map(u => <tr key={u.uid} className="border-b"><td className="p-3">{u.displayName}</td><td className="p-3">{u.email}</td><td className="p-3"><Button size="sm" variant="ghost" onClick={() => deleteDoc(doc(db, "users", u.uid))}><Trash2 className="h-4 w-4 text-red-500" /></Button></td></tr>)}</tbody></table></div></CardContent></Card></TabsContent>
        <TabsContent value="scores"><GlobalScoreboard /></TabsContent>
      </Tabs>
    </div>
  );
}