"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Loader2, 
  ArrowRight, 
  Users, 
  Wallet, 
  Search, 
  Plus, 
  TrendingUp, 
  Calendar 
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { 
  getFirestore, 
  query, 
  getDocs, 
  getDoc, 
  where,
  collectionGroup
} from "firebase/firestore";
import { getFirebaseApp } from "@/lib/firebase/client";
import Link from "next/link";

// --- THE COLOR PALETTE ---
const CARD_COLORS = [
  "bg-[#2C514C]", // Dark Slate Grey
  "bg-[#576066]", // Blue Slate
  "bg-[#2f6f3e]", // Mukando Green
  "bg-[#122932]", // Jet Black
];

interface DashboardGroup {
  id: string;
  name: string;
  description: string;
  myContribution: number;
  totalPool: number;
  memberCount: number;
  role: string;
  status?: string; 
}

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [groups, setGroups] = useState<DashboardGroup[]>([]);
  const [loading, setLoading] = useState(true);

  // Stats State
  const [totalSavings, setTotalSavings] = useState(0);

  useEffect(() => {
    async function fetchGroups() {
      if (!user) return;
      const db = getFirestore(getFirebaseApp());
      
      try {
          const myMembershipsQuery = query(
            collectionGroup(db, 'members'),
            where('userId', '==', user.uid)
          );

          const membershipSnapshot = await getDocs(myMembershipsQuery);
          
          const groupPromises = membershipSnapshot.docs.map(async (memberDoc) => {
             const groupRef = memberDoc.ref.parent.parent; 
             if (groupRef) {
                 const groupSnap = await getDoc(groupRef);
                 if (groupSnap.exists()) {
                     const gData = groupSnap.data();
                     const mData = memberDoc.data();

                     if (gData.status !== 'suspended' && gData.status !== 'archived') {
                         return {
                             id: groupSnap.id,
                             name: gData.name,
                             description: gData.description,
                             totalPool: gData.currentBalanceCents || 0,
                             memberCount: gData.membersCount || 0,
                             myContribution: mData.contributionBalanceCents || 0,
                             role: mData.role,
                             status: gData.status
                         } as DashboardGroup;
                     }
                 }
             }
             return null;
          });

          const results = await Promise.all(groupPromises);
          const validGroups = results.filter((g): g is DashboardGroup => g !== null);
          
          setGroups(validGroups);

          // Calculate Total Savings across ALL groups
          const total = validGroups.reduce((sum, g) => sum + (g.myContribution || 0), 0);
          setTotalSavings(total);

      } catch (error) {
          console.error("Error loading dashboard:", error);
      } finally {
          setLoading(false);
      }
    }

    fetchGroups();
  }, [user]);

  if (loading) return (
      <div className="flex flex-col items-center justify-center h-[50vh]">
          <Loader2 className="h-10 w-10 animate-spin text-[#2C514C]" />
          <p className="mt-4 text-slate-500">Loading your dashboard...</p>
      </div>
  );

  return (
    <div className="space-y-8 pb-10">
      
      {/* 1. WELCOME & ACTIONS */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
           <h1 className="text-3xl font-bold text-[#122932]">
             Welcome back, {user?.displayName?.split(" ")[0] || "Saver"}! 👋
           </h1>
           <p className="text-slate-500 mt-1">Here is your financial overview.</p>
        </div>
        
        {/* Buttons with DISTINCT colors */}
        <div className="flex gap-3 w-full md:w-auto">
            <Link href="/join-group">
                <Button className="bg-[#576066] hover:bg-[#464e54] gap-2 text-white w-full md:w-auto shadow-md">
                    <Search className="w-4 h-4" /> Join Group
                </Button>
            </Link>
            <Link href="/create-group">
                <Button className="bg-[#2C514C] hover:bg-[#25423e] gap-2 text-white w-full md:w-auto shadow-md">
                    <Plus className="w-4 h-4" /> Create Group
                </Button>
            </Link>
        </div>
      </div>

      {/* 2. STATS OVERVIEW CARDS (Now with Background Colors) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Savings - EMERALD TINT */}
        <div className="bg-emerald-50 p-6 rounded-2xl shadow-sm border border-emerald-100">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-white rounded-lg shadow-sm">
              <Wallet className="w-6 h-6 text-emerald-700" />
            </div>
          </div>
          <p className="text-sm text-emerald-800 font-medium">Total Savings</p>
          <h3 className="text-3xl font-bold text-emerald-900 mt-1">{formatCurrency(totalSavings)}</h3>
        </div>

        {/* Active Groups - BLUE TINT */}
        <div className="bg-blue-50 p-6 rounded-2xl shadow-sm border border-blue-100">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-white rounded-lg shadow-sm">
              <Users className="w-6 h-6 text-blue-700" />
            </div>
          </div>
          <p className="text-sm text-blue-800 font-medium">Active Groups</p>
          <h3 className="text-3xl font-bold text-blue-900 mt-1">{groups.length}</h3>
        </div>

        {/* Next Payout - PURPLE TINT */}
        <div className="bg-purple-50 p-6 rounded-2xl shadow-sm border border-purple-100">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-white rounded-lg shadow-sm">
              <Calendar className="w-6 h-6 text-purple-700" />
            </div>
          </div>
          <p className="text-sm text-purple-800 font-medium">Next Payout</p>
          <h3 className="text-3xl font-bold text-purple-900 mt-1">--/--</h3>
        </div>
      </div>

      {/* 3. YOUR GROUPS SECTION */}
      <div>
        <h2 className="text-xl font-bold text-[#122932] mb-4 flex items-center gap-2">
            <Users className="w-5 h-5" /> Your Groups
        </h2>
        
        {groups.length === 0 ? (
            // EMPTY STATE / EDUCATIONAL
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 bg-white p-8 rounded-xl border border-dashed border-slate-300 text-center flex flex-col items-center justify-center">
                    <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mb-4">
                        <TrendingUp className="h-8 w-8 text-slate-400" />
                    </div>
                    <h3 className="text-lg font-medium text-slate-900">No active groups yet</h3>
                    <p className="text-slate-500 max-w-sm mt-2 mb-6 text-sm">
                        You aren't in any active savings circles. Create a new Mukando or join an existing one to start saving.
                    </p>
                    <Button onClick={() => router.push("/create-group")} className="bg-[#2f6f3e]">
                        Create First Group
                    </Button>
                </div>
                {/* TIPS CARD */}
                <div className="bg-[#122932] p-6 rounded-xl text-white flex flex-col justify-center">
                    <h3 className="font-bold text-lg mb-4">Why join?</h3>
                    <ul className="space-y-3 text-sm text-slate-300">
                        <li className="flex gap-2">✅ Access lump sums without loans</li>
                        <li className="flex gap-2">✅ Build financial discipline</li>
                        <li className="flex gap-2">✅ 100% Digital & Transparent</li>
                    </ul>
                </div>
            </div>
        ) : (
            // LIST OF GROUPS (Your Original Card Design)
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {groups.map((group, index) => {
                    const colorClass = CARD_COLORS[index % CARD_COLORS.length];
                    return (
                    <Card key={group.id} className={`${colorClass} border-none shadow-lg text-white transition-transform active:scale-[0.98] md:hover:scale-[1.02] duration-200 flex flex-col`}>
                        <CardHeader className="pb-2">
                            <div className="flex justify-between items-start">
                                <CardTitle className="text-lg md:text-xl font-bold truncate pr-2">{group.name}</CardTitle>
                                <span className="bg-white/20 px-2 py-1 rounded text-xs font-medium backdrop-blur-sm whitespace-nowrap">
                                    {group.memberCount} Members
                                </span>
                            </div>
                            <CardDescription className="text-slate-200 line-clamp-1 h-5 text-sm">
                                {group.description || "No description"}
                            </CardDescription>
                        </CardHeader>
                        
                        <CardContent className="flex-1 space-y-4 pt-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-white/10 p-3 rounded-lg backdrop-blur-sm">
                                    <p className="text-xs text-slate-300 flex items-center mb-1">
                                        <Wallet className="w-3 h-3 mr-1" /> Pool
                                    </p>
                                    <p className="text-lg font-bold truncate">{formatCurrency(group.totalPool)}</p>
                                </div>
                                <div className="bg-white/10 p-3 rounded-lg backdrop-blur-sm">
                                    <p className="text-xs text-slate-300 flex items-center mb-1">
                                        <Users className="w-3 h-3 mr-1" /> My Contr.
                                    </p>
                                    <p className="text-lg font-bold truncate">{formatCurrency(group.myContribution)}</p>
                                </div>
                            </div>
                        </CardContent>

                        <CardFooter className="pt-2">
                            <Button 
                                onClick={() => router.push(`/group/${group.id}`)} 
                                className="w-full bg-white text-[#122932] hover:bg-slate-100 font-bold shadow-sm"
                            >
                                View Group <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </CardFooter>
                    </Card>
                    );
                })}
            </div>
        )}
      </div>
    </div>
  );
}