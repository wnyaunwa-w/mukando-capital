"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, Loader2, ArrowRight, Users, Wallet, Search, Plus } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { 
  getFirestore, 
  query, 
  getDocs, 
  doc, 
  getDoc, 
  where,
  collectionGroup
} from "firebase/firestore";
import { getFirebaseApp } from "@/lib/firebase/client";

// --- THE NEW COLOR PALETTE ---
const CARD_COLORS = [
  "bg-[#2C514C]", // 1. Dark Slate Grey
  "bg-[#576066]", // 2. Blue Slate
  "bg-[#2f6f3e]", // 3. Mukando Green (Original)
  "bg-[#122932]", // 4. Jet Black
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
          
          const loadedGroups: DashboardGroup[] = [];

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
    <div className="space-y-6 md:space-y-8 pb-10">
      
      {/* 1. RESPONSIVE HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-slate-200 pb-6">
        <div>
           <h1 className="text-2xl md:text-3xl font-bold text-[#122932]">Dashboard</h1>
           <p className="text-slate-500 mt-1 text-sm md:text-base">Welcome back, {user?.displayName || "Member"}.</p>
        </div>
        
        {/* Actions Stack on Mobile, Row on Desktop */}
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <Button 
                onClick={() => router.push("/create-group")} 
                className="bg-[#2C514C] hover:bg-[#122932] text-white shadow-md transition-all w-full sm:w-auto justify-center"
            >
                <Plus className="mr-2 h-5 w-5" />
                Create Group
            </Button>

            <Button 
                onClick={() => router.push("/join-group")} 
                className="bg-[#576066] hover:bg-[#122932] text-white shadow-md transition-all w-full sm:w-auto justify-center"
            >
                <Search className="mr-2 h-5 w-5" />
                Join Group
            </Button>
        </div>
      </div>

      {/* 2. GROUP CARDS GRID */}
      {groups.length === 0 ? (
          <div className="text-center py-12 md:py-20 bg-white rounded-xl border-2 border-dashed border-slate-200 px-4">
             <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-slate-400" />
             </div>
             <h3 className="text-lg font-medium text-slate-900">No active groups</h3>
             <p className="text-slate-500 max-w-sm mx-auto mt-1 mb-6 text-sm">
                You aren't in any active savings circles. Create one or join an existing group.
             </p>
             <div className="flex justify-center gap-4">
                 <Button onClick={() => router.push("/create-group")} className="bg-[#2f6f3e] hover:bg-[#255831] w-full sm:w-auto">
                    Create First Group
                 </Button>
             </div>
          </div>
      ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
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
                           <div className="grid grid-cols-2 gap-3 md:gap-4">
                               <div className="bg-white/10 p-2 md:p-3 rounded-lg backdrop-blur-sm">
                                   <p className="text-[10px] md:text-xs text-slate-300 flex items-center mb-1">
                                       <Wallet className="w-3 h-3 mr-1" /> Pool
                                   </p>
                                   <p className="text-base md:text-lg font-bold truncate">{formatCurrency(group.totalPool)}</p>
                               </div>
                               <div className="bg-white/10 p-2 md:p-3 rounded-lg backdrop-blur-sm">
                                   <p className="text-[10px] md:text-xs text-slate-300 flex items-center mb-1">
                                       <Users className="w-3 h-3 mr-1" /> My Contr.
                                   </p>
                                   <p className="text-base md:text-lg font-bold truncate">{formatCurrency(group.myContribution)}</p>
                               </div>
                           </div>
                        </CardContent>

                        <CardFooter className="pt-2">
                            <Button 
                                onClick={() => router.push(`/group/${group.id}`)} 
                                className="w-full bg-white text-[#122932] hover:bg-slate-100 font-bold shadow-sm h-10 md:h-11"
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
  );
}