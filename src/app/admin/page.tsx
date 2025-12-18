"use client";

import { useEffect, useState } from "react";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { 
  Users, 
  Wallet, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  ShieldAlert, 
  Save, 
  Plus, 
  Minus,
  Banknote
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";
import { 
  getFirestore, 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  updateDoc, 
  setDoc,
  orderBy,
  onSnapshot,
  getDoc,
  serverTimestamp
} from "firebase/firestore";
import { getFirebaseApp } from "@/lib/firebase/client";

interface FeeRequest {
  id: string;
  userId: string;
  userDisplayName: string;
  amountCents: number;
  refNumber: string;
  groupId: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: any;
}

export default function SuperAdminPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  
  // Stats
  const [stats, setStats] = useState({
    totalGroups: 0,
    totalVolumeCents: 0,
    activeSubs: 0,
    totalEarningsCents: 0, // <--- NEW STAT
  });

  // Fee Management
  const [feeRequests, setFeeRequests] = useState<FeeRequest[]>([]);
  
  // Settings
  const [platformFeeCents, setPlatformFeeCents] = useState(100);
  const [savingFee, setSavingFee] = useState(false);

  const db = getFirestore(getFirebaseApp());

  // 1. Fetch Dashboard Data
  useEffect(() => {
    const fetchData = async () => {
      try {
        // A. Stats: Groups & Volume
        const groupsSnap = await getDocs(collection(db, "groups"));
        let volume = 0;
        groupsSnap.forEach(doc => {
            volume += (doc.data().currentBalanceCents || 0);
        });

        // B. Stats: Active Subscribers (Users with active status)
        const usersSnap = await getDocs(collection(db, "users")); 
        // Note: For a real app, you might query specific sub-collections, 
        // but let's assume we can count based on Fee Requests for now or distinct users.
        
        // C. Fetch Fee Requests (Pending & History)
        const qFees = query(collection(db, "fee_requests"), orderBy("createdAt", "desc"));
        const feesSnap = await getDocs(qFees);
        
        const requests: FeeRequest[] = [];
        let earnings = 0;
        let approvedCount = 0;

        feesSnap.forEach(doc => {
            const data = doc.data();
            requests.push({ id: doc.id, ...data } as FeeRequest);
            
            // Calculate Earnings from Approved Requests
            if (data.status === 'approved') {
                earnings += (data.amountCents || 0);
                approvedCount++;
            }
        });

        setFeeRequests(requests);
        setStats({
            totalGroups: groupsSnap.size,
            totalVolumeCents: volume,
            activeSubs: approvedCount, // Approx proxy for active subs based on payments
            totalEarningsCents: earnings // <--- SET EARNINGS
        });

        // D. Fetch Settings
        const settingsSnap = await getDoc(doc(db, "settings", "global"));
        if (settingsSnap.exists()) {
            setPlatformFeeCents(settingsSnap.data().platformFeeCents || 100);
        }

      } catch (error) {
        console.error("Admin Load Error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // 2. Actions
  const handleFeeAction = async (request: FeeRequest, action: 'approved' | 'rejected') => {
    try {
        // Update Request Doc
        await updateDoc(doc(db, "fee_requests", request.id), { status: action });

        // Update User Status in Group
        if (action === 'approved') {
            const memberRef = doc(db, "groups", request.groupId, "members", request.userId);
            await updateDoc(memberRef, {
                subscriptionStatus: 'active',
                subscriptionEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // +30 Days
                updatedAt: serverTimestamp()
            });
            
            // Update Local Stats dynamically
            setStats(prev => ({
                ...prev, 
                activeSubs: prev.activeSubs + 1,
                totalEarningsCents: prev.totalEarningsCents + request.amountCents
            }));
        }

        // Remove from local list or update status
        setFeeRequests(prev => prev.map(r => r.id === request.id ? { ...r, status: action } : r));
        toast({ title: `Request ${action}`, description: "User access updated." });

    } catch (error) {
        toast({ variant: "destructive", title: "Error", description: "Failed to update status." });
    }
  };

  const savePlatformFee = async () => {
    setSavingFee(true);
    try {
        await setDoc(doc(db, "settings", "global"), { 
            platformFeeCents 
        }, { merge: true });
        toast({ title: "Saved", description: "Global platform fee updated." });
    } catch (e) {
        toast({ variant: "destructive", title: "Error", description: "Could not save settings." });
    } finally {
        setSavingFee(false);
    }
  };

  if (loading) return <div className="p-10 flex justify-center"><Loader2 className="animate-spin" /></div>;

  const pendingRequests = feeRequests.filter(r => r.status === 'pending');

  return (
    <div className="space-y-8 pb-10">
      
      {/* HEADER */}
      <div>
        <h1 className="text-3xl font-bold text-[#122932] flex items-center gap-2">
            <ShieldAlert className="h-8 w-8 text-red-700" /> Super Admin
        </h1>
        <p className="text-slate-500 mt-1">Platform overview and revenue management.</p>
      </div>

      {/* STATS ROW - Now with 5 Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        
        {/* 1. Total Groups */}
        <Card className="bg-[#122932] text-white border-none shadow-md">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-300">Total Groups</CardTitle>
                <div className="text-3xl font-bold">{stats.totalGroups}</div>
            </CardHeader>
            <CardContent>
                <div className="text-xs text-slate-400">Active communities</div>
            </CardContent>
        </Card>

        {/* 2. Total Volume */}
        <Card className="bg-[#2f6f3e] text-white border-none shadow-md">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-200">Total Volume Held</CardTitle>
                <div className="text-3xl font-bold">{formatCurrency(stats.totalVolumeCents)}</div>
            </CardHeader>
            <CardContent>
                <div className="text-xs text-slate-300">$ Across all wallets</div>
            </CardContent>
        </Card>

        {/* 3. NEW: Total Earnings */}
        <Card className="bg-amber-600 text-white border-none shadow-md">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-amber-100 flex items-center gap-2">
                    <Banknote className="w-4 h-4" /> Total Earnings
                </CardTitle>
                <div className="text-3xl font-bold">{formatCurrency(stats.totalEarningsCents)}</div>
            </CardHeader>
            <CardContent>
                <div className="text-xs text-amber-100">Platform revenue collected</div>
            </CardContent>
        </Card>

        {/* 4. Active Subs */}
        <Card className="bg-[#576066] text-white border-none shadow-md">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-300">Active Subs</CardTitle>
                <div className="text-3xl font-bold">{stats.activeSubs}</div>
            </CardHeader>
            <CardContent>
                <div className="text-xs text-slate-400">Paying members</div>
            </CardContent>
        </Card>

        {/* 5. Fee Control */}
        <Card className="bg-[#0f172a] text-white border-none shadow-md">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-400">Subscription Fee</CardTitle>
                <div className="text-3xl font-bold text-white flex items-center">
                    {formatCurrency(platformFeeCents)}<span className="text-sm text-slate-500 font-normal ml-1">/mo</span>
                </div>
            </CardHeader>
            <CardContent className="flex items-center gap-2">
                <Button variant="outline" size="icon" className="h-6 w-6 bg-transparent border-slate-600 hover:bg-slate-800" onClick={() => setPlatformFeeCents(c => Math.max(0, c - 50))}>
                    <Minus className="h-3 w-3 text-white" />
                </Button>
                <Button variant="outline" size="icon" className="h-6 w-6 bg-transparent border-slate-600 hover:bg-slate-800" onClick={() => setPlatformFeeCents(c => c + 50)}>
                    <Plus className="h-3 w-3 text-white" />
                </Button>
                <Button size="sm" className="h-7 ml-auto bg-[#2C514C] hover:bg-[#1f3a36]" onClick={savePlatformFee} disabled={savingFee}>
                    {savingFee ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save"}
                </Button>
            </CardContent>
        </Card>

      </div>

      {/* TABS AREA */}
      <Tabs defaultValue="fees" className="w-full">
        <TabsList className="bg-white border mb-4">
            <TabsTrigger value="fees" className="data-[state=active]:bg-red-50 data-[state=active]:text-red-700">
                Fee Requests 
                {pendingRequests.length > 0 && <Badge className="ml-2 bg-red-600 hover:bg-red-700">{pendingRequests.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="groups">Group Management</TabsTrigger>
            <TabsTrigger value="users">User Directory</TabsTrigger>
        </TabsList>

        <TabsContent value="fees" className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle>Pending Fee Approvals</CardTitle>
                    <CardDescription>Verify Innbucks references and approve access.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {pendingRequests.length === 0 ? (
                        <div className="text-center py-10 text-slate-500">No pending requests.</div>
                    ) : (
                        pendingRequests.map((req) => (
                            <div key={req.id} className="flex flex-col md:flex-row justify-between items-start md:items-center p-4 border rounded-lg bg-slate-50 gap-4">
                                <div>
                                    <div className="font-bold text-[#122932] flex items-center gap-2">
                                        {req.userDisplayName}
                                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                            {formatCurrency(req.amountCents)}
                                        </Badge>
                                    </div>
                                    <div className="text-sm text-slate-600 mt-1">
                                        <span className="font-semibold text-slate-900">Ref: {req.refNumber}</span>
                                    </div>
                                    <div className="text-xs text-slate-400 mt-1">
                                        {new Date(req.createdAt?.seconds * 1000).toLocaleString()} | Group ID: {req.groupId}
                                    </div>
                                </div>
                                <div className="flex gap-2 w-full md:w-auto">
                                    <Button 
                                        variant="ghost" 
                                        className="text-red-600 hover:text-red-700 hover:bg-red-50 w-full md:w-auto"
                                        onClick={() => handleFeeAction(req, 'rejected')}
                                    >
                                        Reject
                                    </Button>
                                    <Button 
                                        className="bg-green-700 hover:bg-green-800 text-white w-full md:w-auto"
                                        onClick={() => handleFeeAction(req, 'approved')}
                                    >
                                        Approve
                                    </Button>
                                </div>
                            </div>
                        ))
                    )}
                </CardContent>
            </Card>
        </TabsContent>

        <TabsContent value="groups">
            <div className="p-8 text-center text-slate-500 bg-white border rounded-lg border-dashed">
                Group management features coming soon.
            </div>
        </TabsContent>

        <TabsContent value="users">
             <div className="p-8 text-center text-slate-500 bg-white border rounded-lg border-dashed">
                User directory coming soon.
            </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}