"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Users, Loader2, ShieldCheck, User, LogOut, Trash2, MoreVertical, ShieldPlus, 
  Trophy, CheckCircle2, Shield, Star
} from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils"; 
import { 
  getFirestore, 
  collection, 
  onSnapshot, 
  doc,
  getDoc,
  deleteDoc,
  updateDoc,
  increment,
  arrayRemove 
} from "firebase/firestore";
import { getFirebaseApp } from "@/lib/firebase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Member {
  id: string;
  userId: string;
  displayName: string;
  role: 'admin' | 'member';
  joinedAt: any;
  email?: string;
  photoURL?: string; 
  contributionBalanceCents?: number;
  score?: number; 
}

export function MembersList({ groupId, currencySymbol = "$" }: { groupId: string, currencySymbol?: string }) {
  const { user } = useAuth(); 
  const { toast } = useToast();
  const router = useRouter();
  
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    if (!groupId || !user) return;

    const db = getFirestore(getFirebaseApp());
    const membersRef = collection(db, "groups", groupId, "members");

    const unsubscribe = onSnapshot(membersRef, async (snapshot) => {
      const basicMembers = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
      })) as Member[];

      const enrichedMembers = await Promise.all(basicMembers.map(async (member) => {
        let profileData = { 
            displayName: member.displayName || "Member", 
            photoURL: member.photoURL, 
            score: 400 
        };
        
        try {
            const userSnap = await getDoc(doc(db, "users", member.userId));
            if (userSnap.exists()) {
                const userData = userSnap.data();
                profileData = {
                    displayName: userData.displayName || member.displayName,
                    photoURL: userData.photoURL || null,
                    score: userData.creditScore !== undefined ? userData.creditScore : 400
                };
            }
        } catch (e) { console.error("Error fetching profile:", e); }

        return { ...member, ...profileData };
      }));

      enrichedMembers.sort((a, b) => {
        if (a.role === 'admin' && b.role !== 'admin') return -1;
        if (a.role !== 'admin' && b.role === 'admin') return 1;
        return (b.score || 0) - (a.score || 0);
      });

      setMembers(enrichedMembers);
      setLoading(false);
    }, (error) => { console.log("Snapshot error:", error); });

    return () => unsubscribe();
  }, [groupId, user]);

  const handleLeaveGroup = async () => {
    if (!user || !confirm("Are you sure you want to leave this group?")) return;
    setProcessingId("leave");
    try {
        const db = getFirestore(getFirebaseApp());
        await deleteDoc(doc(db, "groups", groupId, "members", user.uid));
        await updateDoc(doc(db, "groups", groupId), { membersCount: increment(-1), memberIds: arrayRemove(user.uid) });
        toast({ title: "Left Group", description: "You have successfully left the group." });
        router.push("/dashboard");
    } catch (error) { toast({ variant: "destructive", title: "Error", description: "Failed to leave." }); setProcessingId(null); }
  };

  const handleRemoveMember = async (targetMemberId: string, memberName: string) => {
    if (!confirm(`Remove ${memberName}?`)) return;
    setProcessingId(targetMemberId);
    try {
        const db = getFirestore(getFirebaseApp());
        await deleteDoc(doc(db, "groups", groupId, "members", targetMemberId));
        await updateDoc(doc(db, "groups", groupId), { membersCount: increment(-1), memberIds: arrayRemove(targetMemberId) });
        toast({ title: "Removed", description: `${memberName} removed.` });
    } catch (error) { toast({ variant: "destructive", title: "Error", description: "Failed to remove." }); } finally { setProcessingId(null); }
  };

  const handleMakeAdmin = async (targetMemberId: string, memberName: string) => {
    if (!confirm(`Promote ${memberName} to Admin?`)) return;
    setProcessingId(targetMemberId);
    try {
        const db = getFirestore(getFirebaseApp());
        await updateDoc(doc(db, "groups", groupId, "members", targetMemberId), { role: 'admin' });
        toast({ title: "Promoted", description: `${memberName} is now an Admin.` });
    } catch (error) { toast({ variant: "destructive", title: "Error", description: "Failed to promote." }); } finally { setProcessingId(null); }
  };

  // --- UPDATED BADGE RENDERER ---
  const renderScoreBadge = (score: number) => {
    // 700+ : Elite (Gold)
    if (score >= 700) {
        return (
            <div className="flex flex-col items-end">
                <span className="text-[9px] text-slate-400 uppercase font-bold mb-0.5">Mukando Score</span>
                <div className="flex items-center gap-1 text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200 text-xs font-bold">
                    <Trophy className="w-3.5 h-3.5 fill-amber-500" /> Elite
                </div>
            </div>
        );
    }
    // 550 - 699 : Very Good (Teal)
    if (score >= 550) {
        return (
            <div className="flex flex-col items-end">
                <span className="text-[9px] text-slate-400 uppercase font-bold mb-0.5">Mukando Score</span>
                <div className="flex items-center gap-1 text-teal-700 bg-teal-50 px-2.5 py-1 rounded-full border border-teal-200 text-xs font-bold">
                    <Star className="w-3.5 h-3.5 fill-teal-500" /> Very Good
                </div>
            </div>
        );
    }
    // 400 - 549 : Good (Green) - Matches your Dashboard
    if (score >= 400) {
        return (
            <div className="flex flex-col items-end">
                <span className="text-[9px] text-slate-400 uppercase font-bold mb-0.5">Mukando Score</span>
                <div className="flex items-center gap-1 text-green-700 bg-green-50 px-2.5 py-1 rounded-full border border-green-200 text-xs font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Good
                </div>
            </div>
        );
    }
    // < 400 : New Member (Grey)
    return (
        <div className="flex flex-col items-end opacity-70">
            <span className="text-[9px] text-slate-400 uppercase font-bold mb-0.5">Mukando Score</span>
            <div className="flex items-center gap-1 text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200 text-xs font-medium">
                <Shield className="w-3 h-3" /> New Member
            </div>
        </div>
    );
  };

  if (loading && !members.length) return <div className="p-10 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>;

  const currentUserRole = members.find(m => m.userId === user?.uid)?.role || 'member';

  return (
    <Card className="border-none shadow-none bg-transparent">
      <CardHeader className="px-0 pt-0 flex flex-row justify-between items-center">
        <div>
            <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5 text-slate-500" />
                Group Members ({members.length})
            </CardTitle>
            <CardDescription>People in this savings circle.</CardDescription>
        </div>
        <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={handleLeaveGroup} disabled={!!processingId}>
            {processingId === "leave" ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4 mr-2" />} Leave
        </Button>
      </CardHeader>
      <CardContent className="px-0 grid gap-4">
        {members.map((member) => (
          <div key={member.id} className="flex items-center justify-between p-3 bg-white rounded-lg border shadow-sm">
            
            {/* LEFT: Avatar & Info */}
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 border bg-slate-100">
                <AvatarImage src={member.photoURL || ""} className="object-cover" />
                <AvatarFallback className="text-slate-600 font-bold bg-slate-200">
                    {member.displayName ? member.displayName.substring(0, 1).toUpperCase() : "U"}
                </AvatarFallback>
              </Avatar>
              
              <div>
                <div className="flex items-center gap-2">
                    <p className="font-bold text-slate-900 text-sm">
                        {member.displayName}
                        {member.userId === user?.uid && <span className="text-xs text-slate-400 font-normal ml-1">(You)</span>}
                    </p>
                    {/* Badge next to name on mobile */}
                    <div className="md:hidden scale-75 origin-left">{renderScoreBadge(member.score || 400)}</div>
                </div>

                <div className="flex items-center gap-2 mt-1">
                    {member.role === 'admin' ? (
                        <Badge className="bg-green-100 text-green-800 hover:bg-green-200 border-none px-2 py-0 h-5 text-[10px]">
                            <ShieldCheck className="w-3 h-3 mr-1" /> Admin
                        </Badge>
                    ) : (
                        <Badge variant="secondary" className="bg-slate-100 text-slate-600 font-normal px-2 py-0 h-5 text-[10px]">
                            <User className="w-3 h-3 mr-1" /> Member
                        </Badge>
                    )}
                    {member.contributionBalanceCents !== undefined && (
                         <span className="text-[10px] text-slate-400 ml-1">
                            • {formatCurrency(member.contributionBalanceCents, currencySymbol)}
                         </span>
                    )}
                </div>
              </div>
            </div>

            {/* RIGHT: Score Badge & Actions */}
            <div className="flex items-center gap-4">
                
                {/* 1. Score Badge (Hidden on mobile) */}
                <div className="hidden md:block">
                    {renderScoreBadge(member.score || 400)}
                </div>

                {/* 2. Admin Vision: Exact Score */}
                {(currentUserRole === 'admin' || user?.uid === member.userId) && (
                    <div className="hidden sm:flex flex-col items-center">
                        <span className="text-[8px] text-slate-400 font-bold uppercase">Points</span>
                        <div className="text-xs font-mono font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded border">
                            {member.score || 400}
                        </div>
                    </div>
                )}

                {/* 3. Actions Menu */}
                {currentUserRole === 'admin' && member.userId !== user?.uid && (
                    <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Manage</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {member.role !== 'admin' && <DropdownMenuItem onClick={() => handleMakeAdmin(member.id, member.displayName)} className="text-blue-600 cursor-pointer"><ShieldPlus className="mr-2 h-4 w-4" /> Make Admin</DropdownMenuItem>}
                        <DropdownMenuItem onClick={() => handleRemoveMember(member.id, member.displayName)} className="text-red-600 cursor-pointer"><Trash2 className="mr-2 h-4 w-4" /> Remove</DropdownMenuItem>
                    </DropdownMenuContent>
                    </DropdownMenu>
                )}
            </div>

          </div>
        ))}
      </CardContent>
    </Card>
  );
}