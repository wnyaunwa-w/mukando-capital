"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
import { 
  ShieldAlert, 
  Loader2, 
  Plus, 
  Minus,
  Banknote,
  ArrowLeft,
  Download,
  Trash2,
  Ban,
  CheckCircle,
  MoreHorizontal,
  Phone
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";
import { 
  getFirestore, 
  collection, 
  query, 
  getDocs, 
  doc, 
  updateDoc, 
  setDoc,
  deleteDoc,
  orderBy,
  getDoc,
  serverTimestamp
} from "firebase/firestore";
import { getFirebaseApp } from "@/lib/firebase/client";

// --- TYPES ---
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

interface AdminGroup {
  id: string;
  name: string;
  membersCount: number;
  currentBalanceCents: number;
  status: string;
}

interface AdminUser {
  uid: string;
  displayName: string;
  email: string;
  phoneNumber?: string; 
  role?: string;
  status?: string;
  joinedAt?: any;
}

export default function SuperAdminPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  
  // Data State
  const [feeRequests, setFeeRequests] = useState<FeeRequest[]>([]);
  const [groupsList, setGroupsList] = useState<AdminGroup[]>([]);
  const [usersList, setUsersList] = useState<AdminUser[]>([]);
  
  // Stats
  const [stats, setStats] = useState({
    totalGroups: 0,
    totalVolumeCents: 0,
    activeSubs: 0,
    totalEarningsCents: 0,
  });

  // Settings
  const [platformFeeCents, setPlatformFeeCents] = useState(100);
  const [savingFee, setSavingFee] = useState(false);

  const db = getFirestore(getFirebaseApp());

  // --- 1. FETCH ALL DATA ---
  useEffect(() => {
    const fetchData = async () => {
      try {
        // A. FETCH GROUPS
        const groupsSnap = await getDocs(collection(db, "groups"));
        const groupsData: AdminGroup[] = [];
        let volume = 0;
        
        groupsSnap.forEach(doc => {
            const d = doc.data();
            volume += (d.currentBalanceCents || 0);
            groupsData.push({ 
                id: doc.id, 
                name: d.name || "Unnamed Group",
                membersCount: d.membersCount || 0,
                currentBalanceCents: d.currentBalanceCents || 0,
                status: d.status || 'active'
            });
        });
        setGroupsList(groupsData);

        // B. FETCH USERS
        const usersSnap = await getDocs(collection(db, "users"));
        const usersData: AdminUser[] = [];
        usersSnap.forEach(doc => {
            const d = doc.data();
            
            // LOGIC: Fallback name if missing
            let safeName = d.displayName;
            if (!safeName && d.firstName && d.lastName) safeName = `${d.firstName} ${d.lastName}`;
            if (!safeName && d.email) safeName = d.email.split('@')[0];
            if (!safeName) safeName = "Unnamed User";

            usersData.push({
                uid: doc.id,
                displayName: safeName,
                email: d.email || "No Email",
                phoneNumber: d.phoneNumber || "N/A", 
                role: d.role || "member",
                status: d.status || "active",
                joinedAt: d.createdAt
            });
        });
        setUsersList(usersData);

        // C. FETCH FEE REQUESTS
        const qFees = query(collection(db, "fee_requests"), orderBy("createdAt", "desc"));
        const feesSnap = await getDocs(qFees);
        
        const requests: FeeRequest[] = [];
        let earnings = 0;
        let approvedCount = 0;

        feesSnap.forEach(doc => {
            const data = doc.data();
            requests.push({ id: doc.id, ...data } as FeeRequest);
            if (data.status === 'approved') {
                earnings += (data.amountCents || 0);
                approvedCount++;
            }
        });
        setFeeRequests(requests);

        // D. SET STATS
        setStats({
            totalGroups: groupsSnap.size,
            totalVolumeCents: volume,
            activeSubs: approvedCount, 
            totalEarningsCents: earnings 
        });

        // E. FETCH SETTINGS
        const settingsSnap = await getDoc(doc(db, "settings", "global"));
        if (settingsSnap.exists()) {
            setPlatformFeeCents(settingsSnap.data().platformFeeCents || 100);
        }

      } catch (error) {
        console.error("Admin Load Error:", error);
        toast({ variant: "destructive", title: "Error", description: "Failed to load admin data." });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // --- ACTIONS ---
  const handleFeeAction = async (request: FeeRequest, action: 'approved' | 'rejected') => {
    try {
        await updateDoc(doc(db, "fee_requests", request.id), { status: action });
        if (action === 'approved') {
            const memberRef = doc(db, "groups", request.groupId, "members", request.userId);
            await updateDoc(memberRef, {
                subscriptionStatus: 'active',
                subscriptionEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                updatedAt: serverTimestamp()
            });
            setStats(prev => ({
                ...prev, 
                activeSubs: prev.activeSubs + 1,
                totalEarningsCents: prev.totalEarningsCents + request.amountCents
            }));
        }
        setFeeRequests(prev => prev.map(r => r.id === request.id ? { ...r, status: action } : r));
        toast({ title: "Success", description: `Request ${action}` });
    } catch (error) {
        toast({ variant: "destructive", title: "Error", description: "Action failed." });
    }
  };

  const toggleGroupStatus = async (group: AdminGroup) => {
      const newStatus = group.status === 'suspended' ? 'active' : 'suspended';
      try {
          await updateDoc(doc(db, "groups", group.id), { status: newStatus });
          setGroupsList(prev => prev.map(g => g.id === group.id ? { ...g, status: newStatus } : g));
          toast({ title: "Updated", description: `Group is now ${newStatus}` });
      } catch (e) { toast({ variant: "destructive", title: "Error", description: "Could not update group." }); }
  };

  const deleteGroup = async (groupId: string) => {
      if(!confirm("Are you sure? This deletes the group permanently.")) return;
      try {
          await deleteDoc(doc(db, "groups", groupId));
          setGroupsList(prev => prev.filter(g => g.id !== groupId));
          setStats(prev => ({ ...prev, totalGroups: prev.totalGroups - 1 }));
          toast({ title: "Deleted", description: "Group removed." });
      } catch (e) { toast({ variant: "destructive", title: "Error", description: "Delete failed." }); }
  };

  const toggleUserStatus = async (user: AdminUser) => {
      const newStatus = user.status === 'banned' ? 'active' : 'banned';
      try {
          await updateDoc(doc(db, "users", user.uid), { status: newStatus });
          setUsersList(prev => prev.map(u => u.uid === user.uid ? { ...u, status: newStatus } : u));
          toast({ title: "Updated", description: `User is now ${newStatus}` });
      } catch (e) { toast({ variant: "destructive", title: "Error", description: "Could not update user." }); }
  };

  const deleteUser = async (uid: string) => {
      if(!confirm("Are you sure? This deletes the user permanently.")) return;
      try {
          await deleteDoc(doc(db, "users", uid));
          setUsersList(prev => prev.filter(u => u.uid !== uid));
          toast({ title: "Deleted", description: "User removed." });
      } catch (e) { toast({ variant: "destructive", title: "Error", description: "Delete failed." }); }
  };

  const downloadUserCSV = () => {
      const headers = ["User ID,Name,Email,Phone,Role,Status\n"];
      const rows = usersList.map(u => 
          `${u.uid},"${u.displayName}","${u.email}","${u.phoneNumber || ''}",${u.role || 'member'},${u.status || 'active'}`
      );
      const csvContent = "data:text/csv;charset=utf-8," + headers + rows.join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", "mukando_users_export.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const savePlatformFee = async () => {
    setSavingFee(true);
    try {
        await setDoc(doc(db, "settings", "global"), { platformFeeCents }, { merge: true });
        toast({ title: "Saved", description: "Global platform fee updated." });
    } catch (e) {
        toast({ variant: "destructive", title: "Error", description: "Could not save settings." });
    } finally {
        setSavingFee(false);
    }
  };

  if (loading) return <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-[#2C514C]" /></div>;

  const pendingRequests = feeRequests.filter(r => r.status === 'pending');

  return (
    <div className="space-y-6 pb-20 px-1 md:px-0">
      
      {/* HEADER & NAVIGATION */}
      <div className="flex flex-col gap-2">
        <Button 
            variant="ghost" 
            className="w-fit pl-0 text-slate-500 hover:bg-transparent hover:text-slate-900 mb-2" 
            onClick={() => router.push("/dashboard")}
        >
             <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
        </Button>

        <h1 className="text-2xl md:text-3xl font-bold text-[#122932] flex items-center gap-2">
            <ShieldAlert className="h-6 w-6 md:h-8 md:w-8 text-red-700" /> Super Admin
        </h1>
        <p className="text-sm md:text-base text-slate-500">Platform overview and revenue management.</p>
      </div>

      {/* STATS ROW - Responsive Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
        
        <Card className="bg-[#122932] text-white border-none shadow-md">
            <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-xs font-medium text-slate-300 uppercase tracking-wider">Total Groups</CardTitle>
                <div className="text-2xl font-bold">{stats.totalGroups}</div>
            </CardHeader>
        </Card>

        <Card className="bg-[#2f6f3e] text-white border-none shadow-md">
            <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-xs font-medium text-slate-200 uppercase tracking-wider">Volume Held</CardTitle>
                <div className="text-2xl font-bold">{formatCurrency(stats.totalVolumeCents)}</div>
            </CardHeader>
        </Card>

        <Card className="bg-amber-600 text-white border-none shadow-md">
            <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-xs font-medium text-amber-100 uppercase tracking-wider flex items-center gap-2">
                    <Banknote className="w-3 h-3" /> Earnings
                </CardTitle>
                <div className="text-2xl font-bold">{formatCurrency(stats.totalEarningsCents)}</div>
            </CardHeader>
        </Card>

        <Card className="bg-[#576066] text-white border-none shadow-md">
            <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-xs font-medium text-slate-300 uppercase tracking-wider">Active Subs</CardTitle>
                <div className="text-2xl font-bold">{stats.activeSubs}</div>
            </CardHeader>
        </Card>

        <Card className="bg-[#0f172a] text-white border-none shadow-md sm:col-span-2 xl:col-span-1">
            <CardHeader className="pb-1 pt-4 px-4">
                <CardTitle className="text-xs font-medium text-slate-400 uppercase tracking-wider">Sub Fee</CardTitle>
                <div className="text-2xl font-bold text-white flex items-center">
                    {formatCurrency(platformFeeCents)}<span className="text-xs text-slate-500 font-normal ml-1">/mo</span>
                </div>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-1 flex items-center gap-2">
                <Button variant="outline" size="icon" className="h-7 w-7 bg-transparent border-slate-600 hover:bg-slate-800" onClick={() => setPlatformFeeCents(c => Math.max(0, c - 50))}>
                    <Minus className="h-3 w-3 text-white" />
                </Button>
                <Button variant="outline" size="icon" className="h-7 w-7 bg-transparent border-slate-600 hover:bg-slate-800" onClick={() => setPlatformFeeCents(c => c + 50)}>
                    <Plus className="h-3 w-3 text-white" />
                </Button>
                <Button size="sm" className="h-7 ml-auto bg-[#2C514C] hover:bg-[#1f3a36]" onClick={savePlatformFee} disabled={savingFee}>
                    {savingFee ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save"}
                </Button>
            </CardContent>
        </Card>
      </div>

      {/* MAIN TABS */}
      <Tabs defaultValue="fees" className="w-full">
        {/* Scrollable Tabs List for Mobile */}
        <div className="overflow-x-auto pb-2 -mx-1 px-1">
            <TabsList className="bg-white border w-full justify-start md:justify-center min-w-[350px]">
                <TabsTrigger value="fees" className="data-[state=active]:bg-red-50 data-[state=active]:text-red-700">
                    Fees
                    {pendingRequests.length > 0 && <Badge className="ml-2 bg-red-600 hover:bg-red-700 h-5 px-1.5">{pendingRequests.length}</Badge>}
                </TabsTrigger>
                <TabsTrigger value="groups">Groups</TabsTrigger>
                <TabsTrigger value="users">Users</TabsTrigger>
            </TabsList>
        </div>

        {/* 1. FEE REQUESTS TAB */}
        <TabsContent value="fees" className="space-y-4">
            <Card>
                <CardHeader className="px-4 py-4">
                    <CardTitle className="text-lg">Pending Approvals</CardTitle>
                    <CardDescription>Verify Innbucks references.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 px-4 pb-4">
                    {pendingRequests.length === 0 ? (
                        <div className="text-center py-8 text-slate-500 text-sm">No pending requests.</div>
                    ) : (
                        pendingRequests.map((req) => (
                            <div key={req.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 border rounded-lg bg-slate-50 gap-3">
                                <div className="w-full sm:w-auto">
                                    <div className="font-bold text-[#122932] flex items-center justify-between sm:justify-start gap-2 text-sm">
                                        {req.userDisplayName}
                                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 whitespace-nowrap">
                                            {formatCurrency(req.amountCents)}
                                        </Badge>
                                    </div>
                                    <div className="text-sm text-slate-600 mt-1 bg-white p-1 rounded border inline-block w-full sm:w-auto text-center sm:text-left">
                                        Ref: <span className="font-mono font-semibold text-slate-900 select-all">{req.refNumber}</span>
                                    </div>
                                    <div className="text-xs text-slate-400 mt-1">
                                        {new Date(req.createdAt?.seconds * 1000).toLocaleDateString()}
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2 w-full sm:w-auto">
                                    <Button 
                                        variant="ghost" 
                                        size="sm"
                                        className="text-red-600 hover:text-red-700 hover:bg-red-50 border border-red-100"
                                        onClick={() => handleFeeAction(req, 'rejected')}
                                    >
                                        Reject
                                    </Button>
                                    <Button 
                                        size="sm"
                                        className="bg-green-700 hover:bg-green-800 text-white"
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

        {/* 2. GROUP MANAGEMENT TAB */}
        <TabsContent value="groups">
            <Card>
                <CardHeader className="px-4 py-4">
                    <CardTitle className="text-lg">All Groups</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left whitespace-nowrap">
                            <thead className="bg-slate-100 text-slate-700 font-medium border-b">
                                <tr>
                                    <th className="p-3 pl-4">Name</th>
                                    <th className="p-3">Members</th>
                                    <th className="p-3">Balance</th>
                                    <th className="p-3">Status</th>
                                    <th className="p-3 pr-4 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {groupsList.map(g => (
                                    <tr key={g.id} className="hover:bg-slate-50">
                                        <td className="p-3 pl-4 font-medium max-w-[150px] truncate">{g.name}</td>
                                        <td className="p-3">{g.membersCount}</td>
                                        <td className="p-3">{formatCurrency(g.currentBalanceCents)}</td>
                                        <td className="p-3">
                                            <Badge variant={g.status === 'suspended' ? 'destructive' : 'outline'} className={g.status === 'active' ? "bg-green-50 text-green-700 border-green-200" : ""}>
                                                {g.status || 'Active'}
                                            </Badge>
                                        </td>
                                        <td className="p-3 pr-4 text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => toggleGroupStatus(g)}>
                                                        {g.status === 'suspended' ? <span className="flex items-center text-green-600"><CheckCircle className="mr-2 h-4 w-4"/> Activate</span> : <span className="flex items-center text-amber-600"><Ban className="mr-2 h-4 w-4"/> Suspend</span>}
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => deleteGroup(g.id)} className="text-red-600">
                                                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </TabsContent>

        {/* 3. USER DIRECTORY TAB */}
        <TabsContent value="users">
             <Card>
                <CardHeader className="flex flex-row items-center justify-between px-4 py-4">
                    <CardTitle className="text-lg">Users</CardTitle>
                    <Button variant="outline" size="sm" onClick={downloadUserCSV} className="gap-2 h-8">
                        <Download className="h-3 w-3" /> <span className="hidden sm:inline">CSV</span>
                    </Button>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left whitespace-nowrap">
                            <thead className="bg-slate-100 text-slate-700 font-medium border-b">
                                <tr>
                                    <th className="p-3 pl-4">Name</th>
                                    <th className="p-3">Email</th>
                                    <th className="p-3">Phone</th>
                                    <th className="p-3">Status</th>
                                    <th className="p-3 pr-4 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {usersList.map(u => (
                                    <tr key={u.uid} className="hover:bg-slate-50">
                                        <td className="p-3 pl-4 font-medium max-w-[140px] truncate">{u.displayName}</td>
                                        <td className="p-3 text-slate-500 max-w-[150px] truncate">{u.email}</td>
                                        <td className="p-3 text-slate-500">{u.phoneNumber || '-'}</td>
                                        <td className="p-3">
                                            <Badge variant={u.status === 'banned' ? 'destructive' : 'outline'} className="text-xs">
                                                {u.status || 'active'}
                                            </Badge>
                                        </td>
                                        <td className="p-3 pr-4 text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => toggleUserStatus(u)}>
                                                        {u.status === 'banned' ? <span className="flex items-center text-green-600"><CheckCircle className="mr-2 h-4 w-4"/> Unban</span> : <span className="flex items-center text-amber-600"><Ban className="mr-2 h-4 w-4"/> Ban</span>}
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => deleteUser(u.uid)} className="text-red-600">
                                                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}