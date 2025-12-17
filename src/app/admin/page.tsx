"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Loader2, 
  CheckCircle2, 
  ShieldAlert, 
  ArrowLeft, 
  Download, 
  Users, 
  DollarSign, 
  LayoutGrid, 
  Plus, 
  Minus,
  MoreHorizontal,
  Ban,
  Trash2,
  Unlock,
  Settings
} from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";

import { 
  getFirestore, 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  writeBatch,
  serverTimestamp,
  orderBy,
  getDoc,
  setDoc,
  deleteDoc,
  updateDoc
} from "firebase/firestore";
import { getFirebaseApp } from "@/lib/firebase/client";

// --- TYPES ---
interface FeeRequest {
  id: string;
  userId: string;
  userDisplayName: string;
  amountCents: number;
  refNumber: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: any;
  groupId?: string; 
}

interface GroupData {
  id: string;
  name: string;
  currentBalanceCents: number;
  membersCount?: number;
  status?: 'active' | 'suspended';
}

interface UserData {
  id: string;
  displayName?: string;
  email?: string;
  phoneNumber?: string;
  role?: string;
  subscriptionStatus?: string;
  accountStatus?: 'active' | 'suspended'; 
  createdAt?: any;
}

export default function SuperAdminPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  
  // Data State
  const [requests, setRequests] = useState<FeeRequest[]>([]);
  const [groups, setGroups] = useState<GroupData[]>([]);
  const [allUsers, setAllUsers] = useState<UserData[]>([]);
  const [platformFeeCents, setPlatformFeeCents] = useState(100); 
  
  // UI State
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [isSavingFee, setIsSavingFee] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetchAllData();
  }, [user]);

  const fetchAllData = async () => {
    setLoading(true);
    const db = getFirestore(getFirebaseApp());
    try {
      // 1. Fetch Fee Requests
      const reqQuery = query(
        collection(db, "fee_requests"),
        where("status", "==", "pending"),
        orderBy("createdAt", "desc")
      );
      const reqSnap = await getDocs(reqQuery);
      setRequests(reqSnap.docs.map(d => ({ id: d.id, ...d.data() })) as FeeRequest[]);

      // 2. Fetch All Groups
      const groupSnap = await getDocs(collection(db, "groups"));
      setGroups(groupSnap.docs.map(d => ({ id: d.id, ...d.data() })) as GroupData[]);

      // 3. Fetch All Users
      const userSnap = await getDocs(collection(db, "users"));
      setAllUsers(userSnap.docs.map(d => ({ id: d.id, ...d.data() })) as UserData[]);

      // 4. Fetch Settings
      const settingsRef = doc(db, "settings", "global");
      const settingsSnap = await getDoc(settingsRef);
      if (settingsSnap.exists() && settingsSnap.data().platformFeeCents) {
        setPlatformFeeCents(settingsSnap.data().platformFeeCents);
      }

    } catch (error) {
      console.error("Fetch error:", error);
      toast({ variant: "destructive", title: "Access Error", description: "Could not load admin data." });
    } finally {
      setLoading(false);
    }
  };

  // --- ACTION: APPROVE/REJECT FEE ---
  const handleDecision = async (req: FeeRequest, decision: 'approved' | 'rejected') => {
    setProcessingId(req.id);
    const db = getFirestore(getFirebaseApp());
    const batch = writeBatch(db);

    try {
      const requestRef = doc(db, "fee_requests", req.id);
      batch.update(requestRef, { 
        status: decision,
        reviewedBy: user?.uid,
        reviewedAt: serverTimestamp()
      });

      if (decision === 'approved') {
        if (req.groupId) {
            const memberRef = doc(db, "groups", req.groupId, "members", req.userId);
            const nextMonth = new Date();
            nextMonth.setDate(nextMonth.getDate() + 30);

            batch.set(memberRef, { 
              subscriptionStatus: 'active',
              subscriptionEndsAt: nextMonth.toISOString(), 
              lastFeePayment: serverTimestamp()
            }, { merge: true }); 
        }
      }

      await batch.commit();
      toast({ title: "Success", description: `Request ${decision}.` });
      setRequests(prev => prev.filter(r => r.id !== req.id));

    } catch (error) {
      console.error(error);
      toast({ variant: "destructive", title: "Error", description: "Failed to update record." });
    } finally {
      setProcessingId(null);
    }
  };

  // --- ACTION: MANAGE USERS ---
  const handleUserAction = async (targetUser: UserData, action: 'suspend' | 'activate' | 'delete') => {
    if (!confirm(`Are you sure you want to ${action} this user?`)) return;
    setProcessingId(targetUser.id);
    const db = getFirestore(getFirebaseApp());

    try {
        if (action === 'delete') {
            await deleteDoc(doc(db, "users", targetUser.id));
            setAllUsers(prev => prev.filter(u => u.id !== targetUser.id));
            toast({ title: "Deleted", description: "User record removed." });
        } else {
            const newStatus = action === 'suspend' ? 'suspended' : 'active';
            await updateDoc(doc(db, "users", targetUser.id), {
                accountStatus: newStatus
            });
            setAllUsers(prev => prev.map(u => u.id === targetUser.id ? { ...u, accountStatus: newStatus } : u));
            toast({ title: "Updated", description: `User marked as ${newStatus}.` });
        }
    } catch (error) {
        console.error(error);
        toast({ variant: "destructive", title: "Error", description: `Failed to ${action} user.` });
    } finally {
        setProcessingId(null);
    }
  };

  // --- NEW ACTION: MANAGE GROUPS ---
  const handleGroupAction = async (targetGroup: GroupData, action: 'suspend' | 'activate' | 'delete') => {
    if (!confirm(`Are you sure you want to ${action} this group?`)) return;
    setProcessingId(targetGroup.id);
    const db = getFirestore(getFirebaseApp());

    try {
        if (action === 'delete') {
            await deleteDoc(doc(db, "groups", targetGroup.id));
            setGroups(prev => prev.filter(g => g.id !== targetGroup.id));
            toast({ title: "Deleted", description: "Group deleted successfully." });
        } else {
            const newStatus = action === 'suspend' ? 'suspended' : 'active';
            await updateDoc(doc(db, "groups", targetGroup.id), {
                status: newStatus
            });
            setGroups(prev => prev.map(g => g.id === targetGroup.id ? { ...g, status: newStatus } : g));
            toast({ title: "Updated", description: `Group marked as ${newStatus}.` });
        }
    } catch (error) {
        console.error(error);
        toast({ variant: "destructive", title: "Error", description: `Failed to ${action} group.` });
    } finally {
        setProcessingId(null);
    }
  };

  // --- ACTION: SAVE FEE SETTINGS ---
  const saveFee = async () => {
    setIsSavingFee(true);
    const db = getFirestore(getFirebaseApp());
    try {
        await setDoc(doc(db, "settings", "global"), { 
            platformFeeCents: platformFeeCents,
            updatedBy: user?.uid,
            updatedAt: serverTimestamp()
        }, { merge: true });
        toast({ title: "Saved", description: `Subscription fee updated to ${formatCurrency(platformFeeCents)}` });
    } catch (error) {
        toast({ variant: "destructive", title: "Error", description: "Failed to save settings." });
    } finally {
        setIsSavingFee(false);
    }
  };

  const downloadCSV = () => {
    const headers = ['Name', 'Email', 'Phone', 'Role', 'Status', 'Joined Date'];
    const rows = allUsers.map(u => [
        `"${u.displayName || 'No Name'}"`,
        `"${u.email || ''}"`,
        `"${u.phoneNumber || ''}"`,
        u.role || 'user',
        u.accountStatus || 'active',
        u.createdAt ? new Date(u.createdAt.seconds * 1000).toLocaleDateString() : '-'
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `mukando_users_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalVolume = groups.reduce((acc, g) => acc + (g.currentBalanceCents || 0), 0);
  const activeSubs = allUsers.filter(u => u.subscriptionStatus === 'active').length;

  if (loading) return <div className="p-10 flex justify-center"><Loader2 className="animate-spin h-8 w-8 text-slate-400" /></div>;

  return (
    <div className="max-w-6xl mx-auto space-y-8 py-8 px-4 font-sans">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <Button variant="ghost" className="pl-0 text-slate-500 hover:text-slate-800 mb-1" onClick={() => router.push("/dashboard")}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to App
            </Button>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
                <ShieldAlert className="h-8 w-8 text-red-600" />
                Super Admin
            </h1>
            <p className="text-slate-500">Platform overview and management.</p>
        </div>
      </div>

      {/* KPI CARDS - VIBRANT THEME */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Card 1: Groups (Dark Slate Grey) */}
        <Card className="bg-[#2C514C] text-white border-none shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-200">Total Groups</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{groups.length}</div>
            <p className="text-xs text-slate-300 mt-1 flex items-center">
               <LayoutGrid className="h-3 w-3 mr-1" /> Active communities
            </p>
          </CardContent>
        </Card>

        {/* Card 2: Volume (Mukando Green) */}
        <Card className="bg-[#2f6f3e] text-white border-none shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-200">Total Volume Held</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatCurrency(totalVolume)}</div>
            <p className="text-xs text-slate-200 mt-1 flex items-center">
               <DollarSign className="h-3 w-3 mr-1" /> Across all wallets
            </p>
          </CardContent>
        </Card>

        {/* Card 3: Subs (Blue Slate) */}
        <Card className="bg-[#576066] text-white border-none shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-200">Active Subs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{activeSubs}</div>
            <p className="text-xs text-slate-300 mt-1 flex items-center">
               <Users className="h-3 w-3 mr-1" /> Paying members
            </p>
          </CardContent>
        </Card>

        {/* Card 4: Fee Settings (Jet Black) */}
        <Card className="bg-[#122932] text-white border-none shadow-md">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-200">Subscription Fee</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="text-3xl font-bold mb-2">
                    {formatCurrency(platformFeeCents)}
                    <span className="text-xs font-normal text-slate-400 ml-1">/mo</span>
                </div>
                <div className="flex items-center gap-1">
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7 bg-white/10 hover:bg-white/20 text-white" 
                        onClick={() => setPlatformFeeCents(p => Math.max(0, p - 50))}
                    >
                        <Minus className="h-3 w-3" />
                    </Button>
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7 bg-white/10 hover:bg-white/20 text-white" 
                        onClick={() => setPlatformFeeCents(p => p + 50)}
                    >
                        <Plus className="h-3 w-3" />
                    </Button>
                    <Button 
                        size="sm" 
                        className="ml-auto h-7 text-xs bg-[#2C514C] hover:bg-[#255831] text-white border border-transparent shadow-sm"
                        onClick={saveFee}
                        disabled={isSavingFee}
                    >
                        {isSavingFee ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Save'}
                    </Button>
                </div>
            </CardContent>
        </Card>
      </div>

      {/* TABS */}
      <Tabs defaultValue="requests" className="w-full">
        <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent gap-6">
           <TabsTrigger value="requests" className="rounded-none border-b-2 border-transparent data-[state=active]:border-red-600 data-[state=active]:text-red-700 pb-3 px-1">
              Fee Requests
              {requests.length > 0 && <span className="ml-2 bg-red-100 text-red-600 text-xs px-2 py-0.5 rounded-full font-bold">{requests.length}</span>}
           </TabsTrigger>
           <TabsTrigger value="groups" className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-700 pb-3 px-1">
              Group Management
           </TabsTrigger>
           <TabsTrigger value="users" className="rounded-none border-b-2 border-transparent data-[state=active]:border-purple-600 data-[state=active]:text-purple-700 pb-3 px-1">
              User Directory
           </TabsTrigger>
        </TabsList>

        {/* TAB 1: FEE REQUESTS */}
        <TabsContent value="requests" className="mt-6">
            <Card>
                <CardHeader>
                    <CardTitle>Pending Fee Approvals</CardTitle>
                    <CardDescription>Verify Innbucks references and approve access.</CardDescription>
                </CardHeader>
                <CardContent>
                    {requests.length === 0 ? (
                        <div className="text-center py-12 text-slate-500 italic bg-slate-50 rounded-md border border-dashed">
                            <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                            No pending requests.
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {requests.map(req => (
                                <div key={req.id} className="flex flex-col md:flex-row justify-between items-center bg-white p-4 rounded-lg border shadow-sm gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-slate-900">{req.userDisplayName || "Unknown User"}</span>
                                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">{formatCurrency(req.amountCents)}</Badge>
                                        </div>
                                        <div className="text-sm text-slate-500 mt-1">Ref: <span className="font-mono font-bold text-slate-700">{req.refNumber}</span></div>
                                        <div className="text-xs text-slate-400">
                                            {req.createdAt ? new Date(req.createdAt.seconds * 1000).toLocaleString() : 'Just now'}
                                            {req.groupId && <span className="ml-2 text-slate-300">| Group ID: {req.groupId}</span>}
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button variant="ghost" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => handleDecision(req, 'rejected')} disabled={!!processingId}>Reject</Button>
                                        <Button className="bg-green-700 hover:bg-green-800" onClick={() => handleDecision(req, 'approved')} disabled={!!processingId}>
                                            {processingId === req.id ? <Loader2 className="animate-spin h-4 w-4" /> : "Approve"}
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </TabsContent>

        {/* TAB 2: GROUPS - NOW WITH ACTIONS */}
        <TabsContent value="groups" className="mt-6">
            <Card>
                <CardHeader>
                    <CardTitle>All Groups</CardTitle>
                    <CardDescription>Monitor all active savings circles.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Group Name</TableHead>
                                <TableHead>Balance</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {groups.map(group => (
                                <TableRow key={group.id}>
                                    <TableCell className="font-medium">{group.name}</TableCell>
                                    <TableCell>{formatCurrency(group.currentBalanceCents || 0)}</TableCell>
                                    <TableCell>
                                        {group.status === 'suspended' ? (
                                            <Badge variant="destructive">Suspended</Badge>
                                        ) : (
                                            <Badge className="bg-green-100 text-green-700 hover:bg-green-200 border-none shadow-none">Active</Badge>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" className="h-8 w-8 p-0">
                                                    <span className="sr-only">Open menu</span>
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuLabel>Group Actions</DropdownMenuLabel>
                                                {group.status === 'suspended' ? (
                                                    <DropdownMenuItem onClick={() => handleGroupAction(group, 'activate')} className="text-green-600 cursor-pointer">
                                                        <Unlock className="mr-2 h-4 w-4" /> Activate Group
                                                    </DropdownMenuItem>
                                                ) : (
                                                    <DropdownMenuItem onClick={() => handleGroupAction(group, 'suspend')} className="text-orange-600 cursor-pointer">
                                                        <Ban className="mr-2 h-4 w-4" /> Suspend Group
                                                    </DropdownMenuItem>
                                                )}
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem onClick={() => handleGroupAction(group, 'delete')} className="text-red-600 cursor-pointer font-bold">
                                                    <Trash2 className="mr-2 h-4 w-4" /> Delete Group
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </TabsContent>

        {/* TAB 3: USERS */}
        <TabsContent value="users" className="mt-6">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>User Directory</CardTitle>
                        <CardDescription>List of all registered members.</CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={downloadCSV} className="gap-2">
                        <Download className="h-4 w-4" /> Export CSV
                    </Button>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Email / Phone</TableHead>
                                <TableHead>Account</TableHead>
                                <TableHead>Joined</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {allUsers.map(u => (
                                <TableRow key={u.id}>
                                    <TableCell className="font-medium">
                                        {u.displayName || u.email?.split('@')[0] || <span className="text-slate-400 italic">No Name</span>}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col text-xs">
                                            <span>{u.email}</span>
                                            <span className="text-slate-400">{u.phoneNumber}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {u.accountStatus === 'suspended' ? (
                                            <Badge variant="destructive">Suspended</Badge>
                                        ) : (
                                            <Badge className="bg-green-100 text-green-700 hover:bg-green-200 border-none shadow-none">Active</Badge>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-xs text-slate-500">
                                        {u.createdAt ? new Date(u.createdAt.seconds * 1000).toLocaleDateString() : '-'}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" className="h-8 w-8 p-0">
                                                    <span className="sr-only">Open menu</span>
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                {u.accountStatus === 'suspended' ? (
                                                    <DropdownMenuItem onClick={() => handleUserAction(u, 'activate')} className="text-green-600 cursor-pointer">
                                                        <Unlock className="mr-2 h-4 w-4" /> Activate User
                                                    </DropdownMenuItem>
                                                ) : (
                                                    <DropdownMenuItem onClick={() => handleUserAction(u, 'suspend')} className="text-orange-600 cursor-pointer">
                                                        <Ban className="mr-2 h-4 w-4" /> Suspend User
                                                    </DropdownMenuItem>
                                                )}
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem onClick={() => handleUserAction(u, 'delete')} className="text-red-600 cursor-pointer font-bold">
                                                    <Trash2 className="mr-2 h-4 w-4" /> Delete Permanently
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}