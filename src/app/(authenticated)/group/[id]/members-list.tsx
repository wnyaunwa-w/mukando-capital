"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Loader2, ShieldCheck, User, LogOut, Trash2, MoreVertical, ShieldPlus } from "lucide-react";
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
}

// ✅ FIX: Added currencySymbol to props
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
        try {
            const userSnap = await getDoc(doc(db, "users", member.userId));
            if (userSnap.exists()) {
                const userData = userSnap.data();
                return { 
                    ...member, 
                    displayName: userData.displayName || member.displayName || "Named Member",
                    photoURL: userData.photoURL || null 
                };
            }
        } catch (e) {
            console.error("Error fetching profile:", e);
        }
        return member;
      }));

      setMembers(enrichedMembers);
      setLoading(false);
    }, (error) => {
        console.log("Snapshot error:", error);
    });

    return () => unsubscribe();
  }, [groupId, user]);

  const handleLeaveGroup = async () => {
    if (!user || !confirm("Are you sure you want to leave this group?")) return;
    setProcessingId("leave");
    try {
        const db = getFirestore(getFirebaseApp());
        await deleteDoc(doc(db, "groups", groupId, "members", user.uid));
        await updateDoc(doc(db, "groups", groupId), { 
            membersCount: increment(-1),
            memberIds: arrayRemove(user.uid) 
        });
        toast({ title: "Left Group", description: "You have successfully left the group." });
        router.push("/dashboard");
    } catch (error) {
        console.error(error);
        toast({ variant: "destructive", title: "Error", description: "Failed to leave." });
        setProcessingId(null);
    }
  };

  const handleRemoveMember = async (targetMemberId: string, memberName: string) => {
    if (!confirm(`Remove ${memberName}?`)) return;
    setProcessingId(targetMemberId);
    try {
        const db = getFirestore(getFirebaseApp());
        await deleteDoc(doc(db, "groups", groupId, "members", targetMemberId));
        await updateDoc(doc(db, "groups", groupId), { 
            membersCount: increment(-1),
            memberIds: arrayRemove(targetMemberId)
        });
        toast({ title: "Removed", description: `${memberName} removed.` });
    } catch (error) {
        toast({ variant: "destructive", title: "Error", description: "Failed to remove." });
    } finally { setProcessingId(null); }
  };

  const handleMakeAdmin = async (targetMemberId: string, memberName: string) => {
    if (!confirm(`Promote ${memberName} to Admin?`)) return;
    setProcessingId(targetMemberId);
    try {
        const db = getFirestore(getFirebaseApp());
        await updateDoc(doc(db, "groups", groupId, "members", targetMemberId), { role: 'admin' });
        toast({ title: "Promoted", description: `${memberName} is now an Admin.` });
    } catch (error) {
        toast({ variant: "destructive", title: "Error", description: "Failed to promote." });
    } finally { setProcessingId(null); }
  };

  if (loading && !members.length) return <div className="p-10 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>;

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
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 border bg-slate-100">
                <AvatarImage src={member.photoURL || ""} className="object-cover" />
                <AvatarFallback className="text-slate-600 font-bold">
                    {member.displayName ? member.displayName.substring(0, 2).toUpperCase() : "U"}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-bold text-slate-900 flex items-center gap-2">
                    {member.displayName}
                    {member.userId === user?.uid && <span className="text-xs text-slate-400 font-normal">(You)</span>}
                </p>
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
                    {/* ✅ FIX: Display balance with correct symbol */}
                    {member.contributionBalanceCents !== undefined && (
                         <span className="text-[10px] text-slate-400 ml-1">
                            • {formatCurrency(member.contributionBalanceCents, currencySymbol)}
                         </span>
                    )}
                </div>
              </div>
            </div>
            {members.find(m => m.userId === user?.uid)?.role === 'admin' && member.userId !== user?.uid && (
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
        ))}
      </CardContent>
    </Card>
  );
}