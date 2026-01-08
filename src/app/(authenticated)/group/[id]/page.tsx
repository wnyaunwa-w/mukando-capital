"use client";

export const dynamic = 'force-dynamic';

import React, { Suspense, useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  Loader2, 
  Copy, 
  Lock, 
  ArrowLeft, 
  MessageCircle, 
  Clock,
  CheckCircle2, 
  ShoppingCart, 
  PiggyBank, 
  ArrowLeftRight, 
  Cake, 
  TrendingUp, 
  HeartHandshake, 
  Car, 
  Home, 
  MoreHorizontal,
  CalendarClock
} from "lucide-react"; 
import { formatCurrency } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { getFirebaseApp } from "@/lib/firebase/client";
import { 
  getFirestore, 
  doc, 
  onSnapshot, 
  getDoc, 
  collection, 
  query, 
  where, 
  writeBatch, 
  increment 
} from "firebase/firestore";
import { cn } from "@/lib/utils";

// Component Imports
import { TransactionLedger } from "./transaction-ledger";
import { AdminForms } from "./admin-forms";
// ✅ FIX: Reverted to plural "members-list" to match your file name
import { MembersList } from "./members-list"; 
import { PayoutScheduleTab } from "./payout-schedule-tab";
import { ClaimPaymentDialog } from "./claim-payment-dialog";
import { PayFeeDialog } from "./pay-fee-dialog";
import { PayoutDialog } from "./payout-dialog"; 
import { CreditScoreBadge } from "@/components/credit-score-badge"; 

import type { Group, Member } from "@/lib/types";

// --- CONFIGURATION ---
const SUPER_ADMIN_PHONE = "263784567174"; 

const CATEGORY_CONFIG: Record<string, { label: string; icon: any; color: string; textColor: string }> = {
  grocery: { label: "Grocery", icon: ShoppingCart, color: "bg-green-100", textColor: "text-green-700" },
  savings: { label: "Savings", icon: PiggyBank, color: "bg-emerald-100", textColor: "text-emerald-700" },
  borrowing: { label: "Borrowing", icon: ArrowLeftRight, color: "bg-blue-100", textColor: "text-blue-700" },
  birthday: { label: "Birthday", icon: Cake, color: "bg-pink-100", textColor: "text-pink-700" },
  investment: { label: "Investment", icon: TrendingUp, color: "bg-purple-100", textColor: "text-purple-700" },
  burial: { label: "Burial Society", icon: HeartHandshake, color: "bg-slate-100", textColor: "text-slate-700" },
  car: { label: "Car Purchase", icon: Car, color: "bg-orange-100", textColor: "text-orange-700" },
  housing: { label: "Stand Purchase", icon: Home, color: "bg-cyan-100", textColor: "text-cyan-700" },
  other: { label: "General", icon: MoreHorizontal, color: "bg-gray-100", textColor: "text-gray-700" },
};

interface ExtendedMember extends Member {
  subscriptionStatus?: string;
  subscriptionEndsAt?: string;
  contributionBalanceCents?: number; 
  lastPaymentRef?: string; 
}

function GroupContent() {
  const params = useParams();
  const id = typeof params.groupId === 'string' ? params.groupId : (typeof params.id === 'string' ? params.id : ''); 
  
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [group, setGroup] = useState<Group | null>(null);
  const [currentMember, setCurrentMember] = useState<ExtendedMember | null>(null);
  const [platformFee, setPlatformFee] = useState(100); 
  const [nextPayoutProfile, setNextPayoutProfile] = useState<{ photoURL: string | null, displayName: string } | null>(null);
  const [userProfile, setUserProfile] = useState<{ creditScore?: number } | null>(null);

  // Dialog States
  const [isClaimOpen, setIsClaimOpen] = useState(false);
  const [isPayFeeOpen, setIsPayFeeOpen] = useState(false);
  const [isPayoutOpen, setIsPayoutOpen] = useState(false);
  const [pendingPayout, setPendingPayout] = useState<any | null>(null);
  const [nextDueDateDisplay, setNextDueDateDisplay] = useState<string | null>(null);

  useEffect(() => {
    if (!id || !user) return;
    const db = getFirestore(getFirebaseApp());
    
    // 1. Group Data
    const unsubGroup = onSnapshot(doc(db, "groups", id), async (docSnap) => {
      if (docSnap.exists()) {
        const gData = { id: docSnap.id, ...docSnap.data() } as Group;
        setGroup(gData);

        // Calculate Next Payment Due Date
        if ((gData as any).paymentDueDay) {
            const dueDay = (gData as any).paymentDueDay;
            const today = new Date();
            let targetDate = new Date(today.getFullYear(), today.getMonth(), dueDay);
            if (today.getDate() > dueDay) {
                targetDate = new Date(today.getFullYear(), today.getMonth() + 1, dueDay);
            }
            setNextDueDateDisplay(targetDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }));
        } else {
            setNextDueDateDisplay(null);
        }

        // Next Payout Person Logic
        const schedule = (gData as any).payoutSchedule || [];
        const todayStr = new Date().toISOString().split('T')[0];
        const nextPerson = schedule
            .filter((m: any) => m.payoutDate >= todayStr && m.status === 'pending')
            .sort((a: any, b: any) => a.payoutDate.localeCompare(b.payoutDate))[0];
        
        if (nextPerson) {
             try {
                const userSnap = await getDoc(doc(db, "users", nextPerson.userId));
                if (userSnap.exists()) {
                    setNextPayoutProfile({
                        photoURL: userSnap.data().photoURL || null,
                        displayName: userSnap.data().displayName || nextPerson.displayName
                    });
                } else {
                    setNextPayoutProfile({ photoURL: nextPerson.photoURL, displayName: nextPerson.displayName });
                }
             } catch (e) { console.error(e); }
        } else {
            setNextPayoutProfile(null);
        }
      }
    });

    // 2. Member Data
    const unsubMember = onSnapshot(doc(db, "groups", id, "members", user.uid), (docSnap) => {
      if (docSnap.exists()) setCurrentMember({ userId: docSnap.id, ...docSnap.data() } as ExtendedMember);
    });

    // 3. Global User Data
    const unsubUserGlobal = onSnapshot(doc(db, "users", user.uid), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setUserProfile({ creditScore: data.creditScore !== undefined ? data.creditScore : 400 });
      } else {
        setUserProfile({ creditScore: 400 });
      }
    });

    // 4. Pending Payouts
    const payoutQuery = query(
        collection(db, "groups", id, "transactions"),
        where("userId", "==", user.uid),
        where("type", "==", "payout"),
        where("status", "==", "pending_confirmation")
    );
    const unsubPayouts = onSnapshot(payoutQuery, (snapshot) => {
        if (!snapshot.empty) {
            const payoutDoc = snapshot.docs[0];
            setPendingPayout({ id: payoutDoc.id, ...payoutDoc.data() });
        } else {
            setPendingPayout(null);
        }
    });

    // 5. Global Settings
    const unsubSettings = onSnapshot(doc(db, "settings", "global"), (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            const fee = data.platformFeeCents !== undefined ? data.platformFeeCents : 100;
            setPlatformFee(fee);
        }
    });

    return () => { unsubGroup(); unsubMember(); unsubPayouts(); unsubSettings(); unsubUserGlobal(); };
  }, [id, user]);

  const checkSubscription = () => {
    if (!currentMember) return { status: 'loading' };
    if (currentMember.subscriptionStatus === 'pending_approval') return { status: 'pending' };
    const isActive = currentMember.subscriptionStatus === 'active';
    if (!isActive) return { status: 'inactive' };
    if (currentMember.subscriptionEndsAt) {
        const expiryDate = new Date(currentMember.subscriptionEndsAt);
        const today = new Date();
        const diffDays = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays <= 0) return { status: 'expired' };
        if (diffDays <= 3) return { status: 'expiring', days: diffDays };
    }
    return { status: 'active' };
  };

  const subState = checkSubscription();
  const isPending = subState.status === 'pending';
  const isLocked = subState.status === 'inactive' || subState.status === 'expired' || isPending;
  const isAdmin = currentMember?.role === 'admin';
  
  // ✅ HELPER: Get Global Currency
  const currencySymbol = (group as any)?.currencySymbol || "$";

  const confirmReceipt = async () => {
    if (!pendingPayout || !group || !user) return;
    try {
        const db = getFirestore(getFirebaseApp());
        const batch = writeBatch(db);
        const txRef = doc(db, "groups", group.id, "transactions", pendingPayout.id);
        batch.update(txRef, { status: "completed" });
        const groupRef = doc(db, "groups", group.id);
        batch.update(groupRef, { currentBalanceCents: increment(-pendingPayout.amountCents) });
        const userRef = doc(db, "users", user.uid);
        batch.update(userRef, { creditScore: increment(5) });
        await batch.commit();
        toast({ title: "Success", description: "Payment receipt confirmed. (+5 Trust Points)" });
    } catch (e) {
        console.error(e);
        toast({ title: "Error", description: "Could not confirm payment.", variant: "destructive" });
    }
  };

  const getCategoryStyle = () => {
    if (!group) return null;
    const type = (group as any).groupType || 'other';
    return CATEGORY_CONFIG[type] || CATEGORY_CONFIG['other'];
  };
  const categoryStyle = getCategoryStyle();

  const getInviteCode = () => {
      if (!group) return "";
      return (group as any).inviteCode || group.id.substring(0,6).toUpperCase();
  }

  const shareToWhatsApp = () => {
    if (!group) return;
    const inviteCode = getInviteCode();
    const text = `Join my savings circle "${group.name}" on Mukando Capital!\n\nUse Invite Code: *${inviteCode}*\n\nOr click here to join: https://www.mukandocapital.com/join-group`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const copyCode = () => {
    if (group?.id) { 
        navigator.clipboard.writeText(getInviteCode()); 
        toast({ title: "Copied!", description: "Invite code copied." }); 
    }
  }

  const contactAdminForApproval = () => {
      const message = `Hi Admin, checking on my Platform Fee approval for group ${group?.name}. My payment ref was ${currentMember?.lastPaymentRef || 'sent recently'}.`;
      window.open(`https://wa.me/${SUPER_ADMIN_PHONE}?text=${encodeURIComponent(message)}`, '_blank');
  }

  const renderFeeButtonText = () => {
      if (isPending) return "Payment Under Review";
      if (platformFee === 0) return "Activate Access (Free)";
      return `Pay Platform Fee (${formatCurrency(platformFee)})`;
  };

  if (!group) return <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-[#2C514C]" /></div>;

  return (
    <div className="w-full space-y-6 pb-20 font-sans text-slate-800">
      
      {/* HEADER */}
      <div className="flex flex-col gap-4 w-full">
        <div className="flex justify-between items-center">
            <Button variant="ghost" className="pl-0 text-slate-500 hover:bg-transparent hover:text-slate-900" onClick={() => router.push("/dashboard")}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
            </Button>
            <Button onClick={shareToWhatsApp} className="hidden md:flex bg-[#25D366] hover:bg-[#128C7E] text-white gap-2 font-semibold shadow-sm">
                <MessageCircle className="w-4 h-4" /> Invite Members
            </Button>
        </div>

        <div className="w-full break-words flex flex-col md:flex-row justify-between items-start gap-4">
            <div className="flex-1">
                {categoryStyle && (
                    <div className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold mb-3", categoryStyle.color, categoryStyle.textColor)}>
                        <categoryStyle.icon className="w-3.5 h-3.5" />
                        <span>{categoryStyle.label}</span>
                    </div>
                )}
                <h1 className="text-3xl md:text-4xl font-bold text-[#122932] leading-tight">{group.name}</h1>
                <p className="text-gray-500 mt-1 text-sm md:text-base">{group.description}</p>
                <div className="flex items-center gap-3 mt-3">
                    <div className="flex items-center gap-2 bg-slate-100 border border-slate-200 px-3 py-1 rounded-md">
                        <span className="text-xs font-bold text-slate-500 uppercase">Code:</span>
                        <span className="font-mono font-bold text-[#2C514C] tracking-wider text-sm">{getInviteCode()}</span>
                    </div>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-400 hover:text-[#2C514C]" onClick={copyCode}><Copy className="h-4 w-4" /></Button>
                </div>
            </div>
            <Button onClick={shareToWhatsApp} className="md:hidden w-full bg-[#25D366] hover:bg-[#128C7E] text-white gap-2 font-bold h-12 shadow-sm">
                <MessageCircle className="w-5 h-5" /> Invite Members
            </Button>
        </div>
      </div>

      {/* PENDING PAYOUT ALERT */}
      {pendingPayout && (
          <Card className="bg-green-50 border-green-200 shadow-sm animate-in fade-in slide-in-from-top-2">
            <CardHeader className="pb-2">
                <div className="flex items-center gap-2 text-green-800">
                    <CheckCircle2 className="h-5 w-5" />
                    <CardTitle className="text-lg">Payment Incoming!</CardTitle>
                </div>
                <CardDescription className="text-green-700">
                    The Admin has marked a payout of <strong>{formatCurrency(pendingPayout.amountCents, currencySymbol)}</strong> to you.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col sm:flex-row gap-3">
                    <Button onClick={confirmReceipt} className="bg-green-700 hover:bg-green-800 text-white font-bold w-full sm:w-auto">Confirm Receipt</Button>
                    <Button variant="ghost" className="text-green-700 hover:text-green-900 hover:bg-green-100 w-full sm:w-auto">Report Issue</Button>
                </div>
            </CardContent>
          </Card>
      )}

      {/* STATS CARDS */}
      <div className={`grid grid-cols-1 md:grid-cols-3 gap-4 ${isLocked ? 'opacity-50 pointer-events-none blur-sm' : ''}`}>
        <Card className="bg-[#2C514C] text-white border-none shadow-lg w-full">
            <CardHeader className="py-4"><CardTitle className="text-slate-200 text-sm uppercase">Total Balance</CardTitle></CardHeader>
            <CardContent className="pb-4 pt-0">
                <div className="text-3xl font-bold text-white truncate">{formatCurrency(group.currentBalanceCents || 0, currencySymbol)}</div>
            </CardContent>
        </Card>
        <Card className="bg-[#576066] text-white border-none shadow-lg w-full">
            <CardHeader className="py-4 flex flex-row items-center justify-between"><CardTitle className="text-slate-200 text-sm uppercase">My Contribution</CardTitle>{userProfile?.creditScore !== undefined && <CreditScoreBadge score={userProfile.creditScore} />}</CardHeader>
            <CardContent className="pb-4 pt-0">
                <div className="text-3xl font-bold text-white truncate">{formatCurrency(currentMember?.contributionBalanceCents || 0, currencySymbol)}</div>
                {nextDueDateDisplay && (<div className="mt-2 flex items-center gap-1.5 text-xs text-slate-300 font-medium bg-white/10 px-2 py-1 rounded w-fit"><CalendarClock className="w-3.5 h-3.5" /><span>Next Due: {nextDueDateDisplay}</span></div>)}
            </CardContent>
        </Card>
        <Card className="bg-[#122932] text-white border-none shadow-lg w-full">
            <CardHeader className="py-4"><CardTitle className="text-slate-200 text-sm uppercase">Next Payout</CardTitle></CardHeader>
            <CardContent className="pb-4 pt-0">
             {(() => {
                const schedule = (group as any).payoutSchedule || [];
                const nextPerson = schedule.find((m: any) => m.status === 'pending');
                if (nextPerson) {
                  const displayProfile = nextPayoutProfile || { photoURL: nextPerson.photoURL, displayName: nextPerson.displayName };
                  return (<div className="flex items-center gap-3"><div className="h-10 w-10 flex-shrink-0 rounded-full bg-white/10 flex items-center justify-center font-bold text-white border border-white/20 overflow-hidden">{displayProfile.photoURL ? <img src={displayProfile.photoURL} className="h-full w-full object-cover"/> : (displayProfile.displayName?.charAt(0) || "?")}</div><div className="min-w-0 flex-1"><div className="font-bold truncate text-white text-lg">{displayProfile.displayName}</div><div className="text-xs text-green-400 font-medium">Due: {nextPerson.payoutDate}</div></div></div>);
                }
                return <div className="text-sm text-slate-400 py-2">No upcoming payout.</div>;
             })()}
            </CardContent>
        </Card>
      </div>

      {/* ACTION BUTTONS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Button className="bg-[#2C514C] hover:bg-[#1b3330] text-white h-12 w-full font-bold shadow-sm" onClick={() => setIsClaimOpen(true)} disabled={isLocked}>Claim Manual Payment</Button>
        <Button className="bg-[#576066] hover:bg-[#464e54] text-white h-12 w-full font-bold shadow-sm" onClick={() => setIsPayFeeOpen(true)} disabled={isPending}>{renderFeeButtonText()}</Button>
        <Button className="bg-[#122932] hover:bg-[#0d1f26] text-white h-12 w-full font-bold shadow-sm disabled:opacity-40 disabled:cursor-not-allowed" onClick={() => setIsPayoutOpen(true)} disabled={!isAdmin} title={!isAdmin ? "Only Admins can initiate payouts" : "Send money to a member"}>Payout Member</Button>
      </div>

      {/* TABS */}
      {isPending ? (
          <div className="text-center py-20 bg-amber-50 border-2 border-dashed border-amber-200 rounded-xl flex flex-col items-center justify-center gap-3">
            <div className="bg-amber-100 p-4 rounded-full animate-pulse"><Clock className="h-12 w-12 text-amber-600" /></div><h3 className="text-lg font-bold text-amber-900">Payment Under Review</h3><p className="text-amber-700 max-w-sm mx-auto">We have received your payment proof. An admin will review and activate your access shortly.</p><Button onClick={contactAdminForApproval} variant="outline" className="mt-2 border-amber-300 text-amber-800 hover:bg-amber-100"><MessageCircle className="w-4 h-4 mr-2" /> Follow up via WhatsApp</Button>
        </div>
      ) : isLocked ? (
          <div className="text-center py-20 bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center gap-3">
              <div className="bg-slate-100 p-4 rounded-full"><Lock className="h-12 w-12 text-slate-400" /></div><h3 className="text-lg font-bold text-slate-900">Access Restricted</h3><p className="text-slate-500 max-w-sm mx-auto">Activate your group privileges by paying Platform Fee.</p><Button onClick={() => setIsPayFeeOpen(true)} className="mt-2 bg-[#2C514C] hover:bg-[#25423e] text-white">{platformFee === 0 ? "Activate Access (Free)" : `Pay Now (${formatCurrency(platformFee)})`}</Button>
          </div>
      ) : (
        <Tabs defaultValue="ledger" className="w-full mt-4">
            <div className="w-full overflow-x-auto pb-2 scrollbar-hide"><TabsList className="w-auto inline-flex justify-start h-auto p-0 bg-transparent space-x-6"><TabsTrigger value="ledger" className="border-b-2 border-transparent data-[state=active]:border-[#2C514C] data-[state=active]:text-[#2C514C] pb-2 bg-transparent whitespace-nowrap font-medium text-slate-500">Ledger</TabsTrigger><TabsTrigger value="members" className="border-b-2 border-transparent data-[state=active]:border-[#2C514C] data-[state=active]:text-[#2C514C] pb-2 bg-transparent whitespace-nowrap font-medium text-slate-500">Members</TabsTrigger>{isAdmin && <TabsTrigger value="schedule" className="border-b-2 border-transparent data-[state=active]:border-[#2C514C] data-[state=active]:text-[#2C514C] pb-2 bg-transparent whitespace-nowrap font-medium text-slate-500">Schedule</TabsTrigger>}{isAdmin && <TabsTrigger value="admin" className="border-b-2 border-transparent data-[state=active]:border-[#2C514C] data-[state=active]:text-[#2C514C] pb-2 bg-transparent whitespace-nowrap font-medium text-slate-500">Admin Forms</TabsTrigger>}</TabsList></div>
            
            {/* ✅ GLOBAL: Pass currencySymbol to tabs */}
            <TabsContent value="ledger" className="mt-4 w-full"><div className="w-full overflow-x-auto border rounded-lg bg-white shadow-sm"><div className="min-w-[600px] md:min-w-full"><TransactionLedger groupId={group.id} currencySymbol={currencySymbol} /></div></div></TabsContent>
            <TabsContent value="members" className="mt-4 w-full"><div className="w-full overflow-x-auto bg-white rounded-lg shadow-sm"><MembersList groupId={group.id} currencySymbol={currencySymbol} /></div></TabsContent>
            {isAdmin && <TabsContent value="schedule" className="mt-4 w-full"><div className="w-full overflow-x-auto border rounded-lg bg-white shadow-sm"><div className="min-w-[600px] md:min-w-full"><PayoutScheduleTab groupId={group.id} currencySymbol={currencySymbol} /></div></div></TabsContent>}
            {isAdmin && <TabsContent value="admin" className="mt-4 w-full"><div className="w-full overflow-x-auto bg-white rounded-lg shadow-sm"><AdminForms groupId={group.id} currencySymbol={currencySymbol} /></div></TabsContent>}
        </Tabs>
      )}

      <ClaimPaymentDialog isOpen={isClaimOpen} onOpenChange={setIsClaimOpen} groupId={group.id} isSubscriptionLocked={isLocked} currencySymbol={currencySymbol} />
      <PayFeeDialog isOpen={isPayFeeOpen} onOpenChange={setIsPayFeeOpen} groupId={group.id} />
      <PayoutDialog isOpen={isPayoutOpen} onOpenChange={setIsPayoutOpen} groupId={group.id} currencySymbol={currencySymbol} />
    </div>
  );
}

export default function GroupPage() {
  return <Suspense fallback={null}><GroupContent /></Suspense>;
}