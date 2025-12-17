"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { getFirebaseApp } from '@/lib/firebase/client';
import { 
  getFirestore,
  doc, 
  onSnapshot, 
  collection, 
  query, 
  orderBy,
  getDoc
} from "firebase/firestore";
import type { Group, Member, Transaction, Claim, User as UserProfile } from '@/lib/types';
import { errorEmitter } from '@/lib/firebase/error-emitter';
import { FirestorePermissionError } from '@/lib/firebase/errors';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from "@/hooks/use-toast";
import { 
  Copy, 
  UserPlus, 
  LogOut, 
  Download,
  Loader2,
  ShieldAlert,
  Banknote,
  Clock,
  Ban,
  Calendar,
  ArrowRight
} from "lucide-react";
import { ClaimPaymentDialog } from "@/app/(authenticated)/group/[id]/claim-payment-dialog";
import { LeaveGroupDialog } from "@/app/(authenticated)/group/[id]/leave-group-dialog";
import { TransactionForms } from "@/app/(authenticated)/group/[id]/transaction-forms";
import { PendingClaims } from "@/app/(authenticated)/group/[id]/pending-claims";
import { MembersList } from "@/app/(authenticated)/group/[id]/members-list";
import { TransactionLedger } from "@/app/(authenticated)/group/[id]/transaction-ledger";
import { InviteMembersDialog } from "@/app/(authenticated)/group/[id]/invite-members-dialog";
import { PayFeeDialog } from "@/app/(authenticated)/group/[id]/pay-fee-dialog";
import { PayContributionDialog } from "@/app/(authenticated)/group/[id]/pay-contribution-dialog";
import { PayoutScheduleTab } from "@/app/(authenticated)/group/[id]/payout-schedule-tab"; 
import { ActivityLogTab } from "@/app/(authenticated)/group/[id]/activity-log-tab";
import { useAuth } from "@/components/auth-provider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ExportLedgerButton } from "@/components/export-ledger-button";

export default function GroupDetails({ groupId }: { groupId: string }) {
  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [adminProfile, setAdminProfile] = useState<Member | null>(null);
  const [platformFeeCents, setPlatformFeeCents] = useState(100); // Default to 100 ($1.00) while loading
  
  // Dialog states
  const [isClaimOpen, setIsClaimOpen] = useState(false);
  const [isPayContributionOpen, setIsPayContributionOpen] = useState(false);
  const [isLeaveOpen, setIsLeaveOpen] = useState(false);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isPayFeeOpen, setIsPayFeeOpen] = useState(false);

  const { toast } = useToast();
  const router = useRouter();
  
  const app = getFirebaseApp();
  const db = getFirestore(app);

  const { user, profile: currentUserProfile, loading: authLoading } = useAuth();

  // --- FETCH GROUP DATA ---
  useEffect(() => {
    if (!groupId || !user) return; 

    const groupRef = doc(db, "groups", groupId);
    const unsubGroup = onSnapshot(groupRef, (doc) => {
      if (doc.exists()) {
        const groupData = { id: doc.id, ...doc.data() } as Group;
        if (!groupData.memberIds?.includes(user.uid)) {
            toast({ title: "Access Denied", description: "You are not a member of this group.", variant: 'destructive' });
            router.push('/dashboard');
        } else {
            setGroup(groupData);
        }
      } else {
        toast({ title: "Error", description: "Group not found.", variant: 'destructive' });
        router.push('/dashboard');
      }
    }, (error) => {
        const permissionError = new FirestorePermissionError({
            path: groupRef.path,
            operation: 'get',
        });
        errorEmitter.emit('permission-error', permissionError);
        toast({ title: "Error", description: "Failed to load group data.", variant: 'destructive' });
        router.push('/dashboard');
    });

    const membersRef = collection(db, "groups", groupId, "members");
    const unsubMembers = onSnapshot(membersRef, async (snap) => {
        const memberList = snap.docs.map(d => ({ id: d.id, ...d.data() } as Member));
        setMembers(memberList);
        
        const groupDoc = await getDoc(doc(db, 'groups', groupId));
        const ownerId = groupDoc.data()?.ownerId;
        if(ownerId) {
            const userDoc = await getDoc(doc(db, 'users', ownerId));
            if(userDoc.exists()) {
                const adminData = userDoc.data() as UserProfile;
                setAdminProfile({
                    id: userDoc.id,
                    name: adminData.name,
                    avatarUrl: adminData.avatarUrl,
                    phoneNumber: adminData.phoneNumber,
                    balanceCents: 0, 
                });
            }
        }
    }, (error) => {
        const permissionError = new FirestorePermissionError({ path: membersRef.path, operation: 'list' });
        errorEmitter.emit('permission-error', permissionError);
    });

    const txnsRef = collection(db, "groups", groupId, "transactions");
    const qTxn = query(txnsRef, orderBy("date", "desc"));
    const unsubTxn = onSnapshot(qTxn, (snap) => {
      setTransactions(snap.docs.map(d => ({ id: d.id, ...d.data() } as Transaction)));
    }, (error) => {
        const permissionError = new FirestorePermissionError({ path: txnsRef.path, operation: 'list' });
        errorEmitter.emit('permission-error', permissionError);
    });
    
    const claimsRef = collection(db, "groups", groupId, "claims");
    const qClaims = query(claimsRef, orderBy("createdAt", "desc"));
    const unsubClaims = onSnapshot(qClaims, (snap) => {
        setClaims(snap.docs.map(d => {
            const data = d.data();
            return {
                id: d.id,
                ...data,
                createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
            } as Claim;
        }));
    }, (error) => {
        const permissionError = new FirestorePermissionError({ path: claimsRef.path, operation: 'list' });
        errorEmitter.emit('permission-error', permissionError);
    });

    return () => {
      unsubGroup();
      unsubMembers();
      unsubTxn();
      unsubClaims();
    };
  }, [groupId, db, user, router, toast]); 

  // --- FETCH PLATFORM FEE ---
  useEffect(() => {
    const fetchFee = async () => {
      try {
        const settingsRef = doc(db, 'settings', 'global');
        const settingsSnap = await getDoc(settingsRef);
        if (settingsSnap.exists() && typeof settingsSnap.data().platformFeeCents === 'number') {
          setPlatformFeeCents(settingsSnap.data().platformFeeCents);
        }
      } catch (error) {
        console.error("Error fetching platform fee:", error);
      }
    };
    fetchFee();
  }, [db]);

  if (authLoading || !group || !user || members.length === 0) {
    return <div className="p-10 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto"/> Loading Group Details...</div>;
  }
  
  const isGroupAdmin = members.find(m => m.id === user.uid)?.role === 'admin';
  const currentUserMember = members.find(m => m.id === user.uid);
  
  // --- SUBSCRIPTION LOGIC ---
  const now = new Date();
  let expiryDate: Date | null = null;
  let isExpired = false;
  let daysRemaining = 0;
  let isWarningPhase = false;

  if (currentUserMember?.subscriptionExpiry) {
     expiryDate = (currentUserMember.subscriptionExpiry as any).toDate 
        ? (currentUserMember.subscriptionExpiry as any).toDate() 
        : new Date(currentUserMember.subscriptionExpiry);

     if (expiryDate && now > expiryDate) {
        isExpired = true;
     }

     if (expiryDate) {
        const diffTime = Math.abs(expiryDate.getTime() - now.getTime());
        daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
        if (!isExpired && daysRemaining <= 5) isWarningPhase = true;
     }
  }

  const isUnpaid = currentUserMember?.subscriptionStatus === 'unpaid';
  const isLockedOut = isExpired || isUnpaid;

  // --- NEXT PAYOUT LOGIC ---
  let nextPayoutMember: Member | null = null;
  let nextPayoutDateStr: string | null = null;

  if (group.payoutSchedule && group.payoutSchedule.length > 0) {
    const sortedSchedule = [...group.payoutSchedule]
        .filter(item => item.status === 'pending')
        .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime());
    
    if (sortedSchedule.length > 0) {
        const nextItem = sortedSchedule[0];
        nextPayoutMember = members.find(m => m.id === nextItem.memberId) || null;
        nextPayoutDateStr = nextItem.scheduledDate;
    }
  }


  const pendingClaims = claims.filter(c => c.status === 'pending');
  const isSuspended = group.status === 'suspended';

  const groupWithSubcollections: Group = {
      ...group,
      members: members,
      transactions: transactions,
      claims: claims
  };


  return (
    <div className="space-y-6 font-sans">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary tracking-tight">{group.name}</h1>
          <p className="text-muted-foreground">{group.description || "Group Dashboard"}</p>
        </div>
        <div className="flex flex-wrap gap-2">
            {isGroupAdmin && (
              <>
                <Button variant="outline" onClick={() => setIsInviteOpen(true)} disabled={isSuspended || isLockedOut}><UserPlus className="mr-2"/> Invite</Button>
              </>
            )}
        </div>
      </div>

       {/* ALERTS */}
       {isSuspended && (
         <Alert variant="destructive">
            <ShieldAlert className="h-4 w-4" />
            <AlertTitle>Group Suspended</AlertTitle>
            <AlertDescription>This group has been suspended.</AlertDescription>
          </Alert>
       )}

       {!isSuspended && isLockedOut && (
         <Alert variant="destructive" className="bg-red-50 border-red-200 text-red-900">
            <Ban className="h-4 w-4 text-red-600" />
            <AlertTitle className="text-red-800 font-bold">Subscription Expired</AlertTitle>
            {/* UPDATED: Added amount to the alert */}
            <AlertDescription className="text-red-700">
               Please <strong>Pay Platform Fee ({formatCurrency(platformFeeCents)})</strong> to resume.
            </AlertDescription>
          </Alert>
       )}

       {!isSuspended && !isLockedOut && isWarningPhase && (
         <Alert className="bg-yellow-50 border-yellow-200 text-yellow-900">
            <Clock className="h-4 w-4 text-yellow-600" />
            <AlertTitle className="text-yellow-800 font-bold">Subscription Expiring Soon</AlertTitle>
            <AlertDescription className="text-yellow-700">{daysRemaining} days remaining.</AlertDescription>
          </Alert>
       )}
      
      {/* METRICS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Total Balance</CardTitle>
            <Download className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-700 tracking-tight">
              {formatCurrency(group.currentBalanceCents)}
            </div>
          </CardContent>
        </Card>
        
        <Card className="hover:shadow-md transition-shadow">
           <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">My Contribution</CardTitle>
             <Download className="h-4 w-4 text-gray-400" />
           </CardHeader>
           <CardContent>
             <div className="text-3xl font-bold text-blue-700 tracking-tight">
               {formatCurrency(currentUserMember?.balanceCents || 0)}
             </div>
           </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow border-green-100 bg-green-50/30">
           <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Next Payout</CardTitle>
             <Calendar className="h-4 w-4 text-green-600" />
           </CardHeader>
           <CardContent>
             {nextPayoutMember && nextPayoutDateStr ? (
                <div className="flex items-center gap-3 mt-1">
                    <Avatar className="h-10 w-10 border-2 border-white shadow-sm">
                        <AvatarImage src={nextPayoutMember.avatarUrl} />
                        <AvatarFallback>{nextPayoutMember.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                        <span className="font-bold text-gray-900 leading-none">{nextPayoutMember.name}</span>
                        <span className="text-sm text-green-700 font-medium">
                            {format(new Date(nextPayoutDateStr), 'MMMM d, yyyy')}
                        </span>
                    </div>
                </div>
             ) : (
                <div className="flex flex-col h-10 justify-center">
                    <span className="text-sm text-gray-400 italic">No payouts scheduled</span>
                </div>
             )}
           </CardContent>
        </Card>
      </div>

       {/* ACTION BUTTONS */}
       <div className="flex flex-wrap gap-4">
          {!isGroupAdmin && (
             <Button 
               onClick={() => setIsPayContributionOpen(true)} 
               className="flex-1 bg-green-700 hover:bg-green-800 text-white shadow-sm" 
               disabled={isSuspended}
             >
                <Banknote className="mr-2 h-4 w-4" /> Pay Contribution
             </Button>
          )}
          <Button 
            onClick={() => setIsClaimOpen(true)} 
            className="flex-1 bg-green-700 hover:bg-green-800 text-white shadow-sm" 
            disabled={isSuspended || isLockedOut} 
          >
            Claim Manual Payment
          </Button>
          
          {/* UPDATED: Pay Fee Button now shows the amount */}
          <Button 
            onClick={() => setIsPayFeeOpen(true)} 
            className={`flex-1 text-white shadow-sm ${isLockedOut ? 'bg-red-600 hover:bg-red-700 animate-pulse' : 'bg-green-700 hover:bg-green-800'}`}
            disabled={isSuspended}
          >
             {isLockedOut ? `Pay Platform Fee (${formatCurrency(platformFeeCents)}) (Required)` : `Pay Platform Fee (${formatCurrency(platformFeeCents)})`}
          </Button>
       </div>

      {isGroupAdmin && !isSuspended && pendingClaims.length > 0 && (
         <PendingClaims claims={pendingClaims} members={members} groupId={groupId} />
      )}

       {/* TABS */}
       <Tabs defaultValue="ledger" className="w-full">
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 lg:w-auto lg:inline-flex lg:gap-2 bg-gray-100 p-1 rounded-lg">
                <TabsTrigger 
                  value="ledger" 
                  className="data-[state=active]:bg-white data-[state=active]:text-green-800 data-[state=active]:shadow-sm font-medium rounded-md transition-all"
                >
                  Ledger
                </TabsTrigger>
                <TabsTrigger 
                  value="members"
                  className="data-[state=active]:bg-white data-[state=active]:text-green-800 data-[state=active]:shadow-sm font-medium rounded-md transition-all"
                >
                  Members
                </TabsTrigger>
                <TabsTrigger 
                  value="schedule"
                  className="data-[state=active]:bg-white data-[state=active]:text-green-800 data-[state=active]:shadow-sm font-medium rounded-md transition-all"
                >
                  Schedule
                </TabsTrigger>
                
                <TabsTrigger 
                  value="activity"
                  className="data-[state=active]:bg-white data-[state=active]:text-green-800 data-[state=active]:shadow-sm font-medium rounded-md transition-all"
                >
                  Activity
                </TabsTrigger>

                {isGroupAdmin && (
                    <TabsTrigger 
                    value="forms" 
                    disabled={isSuspended}
                    className="data-[state=active]:bg-white data-[state=active]:text-green-800 data-[state=active]:shadow-sm font-medium rounded-md transition-all"
                    >
                    Admin Forms
                    </TabsTrigger>
                )}
            </TabsList>
            
            <div className="mt-6">
                <TabsContent value="ledger" className="space-y-4">
                    <div className="flex justify-end pt-2">
                    <ExportLedgerButton group={groupWithSubcollections} className="border-green-200 text-green-700 hover:bg-green-50" />
                    </div>
                    <TransactionLedger transactions={transactions} members={members} />
                </TabsContent>
                
                <TabsContent value="members">
                    <MembersList members={members} groupId={groupId} groupName={group.name} isGroupAdmin={isGroupAdmin || false} groupOwnerId={group.ownerId!} />
                </TabsContent>

                <TabsContent value="schedule">
                    <PayoutScheduleTab group={groupWithSubcollections} members={members} isAdmin={isGroupAdmin || false} />
                </TabsContent>
                
                <TabsContent value="activity">
                    <ActivityLogTab groupId={groupId} />
                </TabsContent>

                <TabsContent value="forms">
                    <TransactionForms group={groupWithSubcollections} />
                </TabsContent>
            </div>
        </Tabs>

      <div className="border-t pt-6 mt-6">
         <Button variant="destructive" onClick={() => setIsLeaveOpen(true)}>
            <LogOut className="mr-2 h-4 w-4" /> Leave Group
         </Button>
      </div>
      
      {/* Dialogs */}
      <ClaimPaymentDialog isOpen={isClaimOpen} onOpenChange={setIsClaimOpen} groupId={groupId} isSubscriptionLocked={isLockedOut} />
      {!isGroupAdmin && (
        <PayContributionDialog 
            isOpen={isPayContributionOpen} 
            onOpenChange={setIsPayContributionOpen}
            group={group}
            admin={adminProfile}
            currentUser={currentUserProfile}
        />
      )}
      <LeaveGroupDialog isOpen={isLeaveOpen} onOpenChange={setIsLeaveOpen} group={groupWithSubcollections} />
      {isGroupAdmin && <InviteMembersDialog isOpen={isInviteOpen} onOpenChange={setIsInviteOpen} group={groupWithSubcollections}/>}
      <PayFeeDialog isOpen={isPayFeeOpen} onOpenChange={setIsPayFeeOpen} groupId={groupId} platformFeeCents={platformFeeCents} />
    </div>
  );
}