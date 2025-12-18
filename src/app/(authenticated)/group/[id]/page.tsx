"use client";

export const dynamic = 'force-dynamic';

import React, { Suspense, useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Copy, Share2, Lock, ArrowLeft, MessageCircle } from "lucide-react"; 
import { formatCurrency } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { getFirebaseApp } from "@/lib/firebase/client";
import { getFirestore, doc, onSnapshot, getDoc } from "firebase/firestore";

// Component Imports
import { TransactionLedger } from "./transaction-ledger";
import { AdminForms } from "./admin-forms";
import { MembersList } from "./members-list";
import { PayoutScheduleTab } from "./payout-schedule-tab";
import { ClaimPaymentDialog } from "./claim-payment-dialog";
import { PayFeeDialog } from "./pay-fee-dialog";

import type { Group, Member } from "@/lib/types";

interface ExtendedMember extends Member {
  subscriptionStatus?: string;
  subscriptionEndsAt?: string;
  contributionBalanceCents?: number; 
}

function GroupContent() {
  const params = useParams();
  const id = typeof params.groupId === 'string' ? params.groupId : (typeof params.id === 'string' ? params.id : ''); 
  // ^^^ ROBUST ID CHECK: Handles both [groupId] and [id] folder naming
  
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [group, setGroup] = useState<Group | null>(null);
  const [currentMember, setCurrentMember] = useState<ExtendedMember | null>(null);
  const [platformFee, setPlatformFee] = useState(100); 
  const [nextPayoutProfile, setNextPayoutProfile] = useState<{ photoURL: string | null, displayName: string } | null>(null);

  const [isClaimOpen, setIsClaimOpen] = useState(false);
  const [isPayFeeOpen, setIsPayFeeOpen] = useState(false);

  useEffect(() => {
    if (!id || !user) return;
    const db = getFirestore(getFirebaseApp());
    
    // 1. Listen to Group Data
    const unsubGroup = onSnapshot(doc(db, "groups", id), async (docSnap) => {
      if (docSnap.exists()) {
        const gData = { id: docSnap.id, ...docSnap.data() } as Group;
        setGroup(gData);

        // Calculate Next Payout Person
        const schedule = (gData as any).payoutSchedule || [];
        const today = new Date().toISOString().split('T')[0];
        const nextPerson = schedule
            .filter((m: any) => m.payoutDate >= today && m.status === 'pending')
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

    // 2. Listen to Member Data
    const unsubMember = onSnapshot(doc(db, "groups", id, "members", user.uid), (docSnap) => {
      if (docSnap.exists()) setCurrentMember({ userId: docSnap.id, ...docSnap.data() } as ExtendedMember);
    });

    // 3. Listen to Global Settings
    const unsubSettings = onSnapshot(doc(db, "settings", "global"), (docSnap) => {
        if (docSnap.exists() && docSnap.data().platformFeeCents) setPlatformFee(docSnap.data().platformFeeCents);
    });

    return () => { unsubGroup(); unsubMember(); unsubSettings(); };
  }, [id, user]);

  const checkSubscription = () => {
    if (!currentMember) return { status: 'loading' };
    const isActive = currentMember.subscriptionStatus === 'active';
    if (!isActive) return { status: 'inactive' };
    if (currentMember.subscriptionEndsAt) {
        const expiryDate = new Date(currentMember.subscriptionEndsAt);
        const today = new Date();
        const diffTime = expiryDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays <= 0) return { status: 'expired' };
        if (diffDays <= 3) return { status: 'expiring', days: diffDays };
    }
    return { status: 'active' };
  };

  const subState = checkSubscription();
  const isLocked = subState.status === 'inactive' || subState.status === 'expired';
  const isAdmin = currentMember?.role === 'admin';

  // --- WHATSAPP SHARE FUNCTION ---
  const shareToWhatsApp = () => {
    if (!group) return;
    const inviteCode = group.id.substring(0,6).toUpperCase();
    const text = `Join my savings circle "${group.name}" on Mukando Capital!\n\nUse Invite Code: *${inviteCode}*\n\nOr click here to join: https://www.mukandocapital.com/join-group`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const copyCode = () => {
    if (group?.id) { 
        navigator.clipboard.writeText(group.id.substring(0,6).toUpperCase()); 
        toast({ title: "Copied!", description: "Invite code copied to clipboard." }); 
    }
  }

  if (!group) return <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-[#2C514C]" /></div>;

  return (
    <div className="w-full space-y-6 pb-20 font-sans text-slate-800">
      
      {/* HEADER AREA */}
      <div className="flex flex-col gap-4 w-full">
        
        {/* Top Row: Back Button & Desktop Invite Button */}
        <div className="flex justify-between items-center">
            <Button variant="ghost" className="pl-0 text-slate-500 hover:bg-transparent hover:text-slate-900" onClick={() => router.push("/dashboard")}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
            </Button>
            
            {/* DESKTOP INVITE BUTTON */}
            <Button 
                onClick={shareToWhatsApp}
                className="hidden md:flex bg-[#25D366] hover:bg-[#128C7E] text-white gap-2 font-semibold shadow-sm"
            >
                <MessageCircle className="w-4 h-4" /> Invite via WhatsApp
            </Button>
        </div>

        {/* Title & Mobile Actions Row */}
        <div className="w-full break-words flex flex-col md:flex-row justify-between items-start gap-4">
            <div className="flex-1">
                <h1 className="text-3xl md:text-4xl font-bold text-[#122932] leading-tight">{group.name}</h1>
                <p className="text-gray-500 mt-1 text-sm md:text-base">{group.description}</p>
                
                {/* Invite Code Badge */}
                <div className="flex items-center gap-3 mt-3">
                    <div className="flex items-center gap-2 bg-slate-100 border border-slate-200 px-3 py-1 rounded-md">
                        <span className="text-xs font-bold text-slate-500 uppercase">Code:</span>
                        <span className="font-mono font-bold text-[#2C514C] tracking-wider text-sm">
                            {group.id.substring(0,6).toUpperCase()}
                        </span>
                    </div>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-400 hover:text-[#2C514C]" onClick={copyCode}>
                        <Copy className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* MOBILE INVITE BUTTON (Full Width) */}
            <Button 
                onClick={shareToWhatsApp}
                className="md:hidden w-full bg-[#25D366] hover:bg-[#128C7E] text-white gap-2 font-bold h-12 shadow-sm"
            >
                <MessageCircle className="w-5 h-5" /> Invite Members to Join
            </Button>
        </div>
      </div>

      {/* STATS CARDS */}
      <div className={`grid grid-cols-1 md:grid-cols-3 gap-4 ${isLocked ? 'opacity-50 pointer-events-none blur-sm' : ''}`}>
        <Card className="bg-[#2C514C] text-white border-none shadow-lg w-full">
            <CardHeader className="py-4"><CardTitle className="text-slate-200 text-sm uppercase">Total Balance</CardTitle></CardHeader>
            <CardContent className="pb-4 pt-0"><div className="text-3xl font-bold text-white truncate">{formatCurrency(group.currentBalanceCents || 0)}</div></CardContent>
        </Card>
        <Card className="bg-[#576066] text-white border-none shadow-lg w-full">
            <CardHeader className="py-4"><CardTitle className="text-slate-200 text-sm uppercase">My Contribution</CardTitle></CardHeader>
            <CardContent className="pb-4 pt-0"><div className="text-3xl font-bold text-white truncate">{formatCurrency(currentMember?.contributionBalanceCents || 0)}</div></CardContent>
        </Card>
        <Card className="bg-[#122932] text-white border-none shadow-lg w-full">
            <CardHeader className="py-4"><CardTitle className="text-slate-200 text-sm uppercase">Next Payout</CardTitle></CardHeader>
            <CardContent className="pb-4 pt-0">
             {(() => {
                const schedule = (group as any).payoutSchedule || [];
                const nextPerson = schedule.find((m: any) => m.status === 'pending');
                if (nextPerson) {
                  const displayProfile = nextPayoutProfile || { photoURL: nextPerson.photoURL, displayName: nextPerson.displayName };
                  return (
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 flex-shrink-0 rounded-full bg-white/10 flex items-center justify-center font-bold text-white border border-white/20 overflow-hidden">
                          {displayProfile.photoURL ? <img src={displayProfile.photoURL} className="h-full w-full object-cover"/> : (displayProfile.displayName?.charAt(0) || "?")}
                      </div>
                      <div className="min-w-0 flex-1">
                          <div className="font-bold truncate text-white text-lg">{displayProfile.displayName}</div>
                          <div className="text-xs text-green-400 font-medium">Due: {nextPerson.payoutDate}</div>
                      </div>
                    </div>
                  );
                }
                return <div className="text-sm text-slate-400 py-2">No upcoming payout.</div>;
             })()}
            </CardContent>
        </Card>
      </div>

      {/* ACTION BUTTONS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Button 
            className="bg-[#2C514C] hover:bg-[#1b3330] text-white h-12 w-full font-bold shadow-sm" 
            onClick={() => setIsClaimOpen(true)} 
            disabled={isLocked}
        >
            Claim Manual Payment
        </Button>
        <Button 
            className="bg-[#576066] hover:bg-[#464e54] text-white h-12 w-full font-bold shadow-sm" 
            onClick={() => setIsPayFeeOpen(true)}
        >
            Pay Fee
        </Button>
      </div>

      {/* TABS & CONTENT */}
      {isLocked ? (
        <div className="text-center py-20 bg-slate-50 border-2 border-dashed rounded-xl"><Lock className="h-12 w-12 text-slate-300 mx-auto" /> Locked</div>
      ) : (
        <Tabs defaultValue="ledger" className="w-full mt-4">
            
            {/* SCROLLABLE TAB LIST */}
            <div className="w-full overflow-x-auto pb-2 scrollbar-hide">
                <TabsList className="w-auto inline-flex justify-start h-auto p-0 bg-transparent space-x-6">
                    <TabsTrigger value="ledger" className="border-b-2 border-transparent data-[state=active]:border-[#2C514C] data-[state=active]:text-[#2C514C] pb-2 bg-transparent whitespace-nowrap font-medium text-slate-500">Ledger</TabsTrigger>
                    <TabsTrigger value="members" className="border-b-2 border-transparent data-[state=active]:border-[#2C514C] data-[state=active]:text-[#2C514C] pb-2 bg-transparent whitespace-nowrap font-medium text-slate-500">Members</TabsTrigger>
                    {isAdmin && <TabsTrigger value="schedule" className="border-b-2 border-transparent data-[state=active]:border-[#2C514C] data-[state=active]:text-[#2C514C] pb-2 bg-transparent whitespace-nowrap font-medium text-slate-500">Schedule</TabsTrigger>}
                    {isAdmin && <TabsTrigger value="admin" className="border-b-2 border-transparent data-[state=active]:border-[#2C514C] data-[state=active]:text-[#2C514C] pb-2 bg-transparent whitespace-nowrap font-medium text-slate-500">Admin Forms</TabsTrigger>}
                </TabsList>
            </div>
            
            {/* TAB CONTENTS */}
            <TabsContent value="ledger" className="mt-4 w-full">
                <div className="w-full overflow-x-auto border rounded-lg bg-white shadow-sm">
                    <div className="min-w-[600px] md:min-w-full"> 
                        <TransactionLedger groupId={group.id} />
                    </div>
                </div>
            </TabsContent>

            <TabsContent value="members" className="mt-4 w-full">
                <div className="w-full overflow-x-auto bg-white rounded-lg shadow-sm">
                    <MembersList groupId={group.id} />
                </div>
            </TabsContent>

            {isAdmin && (
                <TabsContent value="schedule" className="mt-4 w-full">
                    <div className="w-full overflow-x-auto border rounded-lg bg-white shadow-sm">
                        <div className="min-w-[600px] md:min-w-full">
                            <PayoutScheduleTab groupId={group.id} />
                        </div>
                    </div>
                </TabsContent>
            )}

            {isAdmin && (
                <TabsContent value="admin" className="mt-4 w-full">
                    <div className="w-full overflow-x-auto bg-white rounded-lg shadow-sm">
                        <AdminForms groupId={group.id} />
                    </div>
                </TabsContent>
            )}
        </Tabs>
      )}

      <ClaimPaymentDialog isOpen={isClaimOpen} onOpenChange={setIsClaimOpen} groupId={group.id} isSubscriptionLocked={isLocked} />
      <PayFeeDialog isOpen={isPayFeeOpen} onOpenChange={setIsPayFeeOpen} groupId={group.id} />
    </div>
  );
}

export default function GroupPage() {
  return <Suspense fallback={null}><GroupContent /></Suspense>;
}