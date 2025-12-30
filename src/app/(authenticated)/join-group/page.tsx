"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ArrowLeft, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

import { 
  getFirestore, 
  doc, 
  setDoc, 
  updateDoc, 
  increment, 
  arrayUnion, // ✅ Import arrayUnion
  serverTimestamp,
  collection,
  query,
  where,
  getDocs
} from "firebase/firestore";
import { getFirebaseApp } from "@/lib/firebase/client";

export default function JoinGroupPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !code) return;
    
    const inputInviteCode = code.trim().toUpperCase(); 

    setLoading(true);
    const db = getFirestore(getFirebaseApp());

    try {
      // 1. QUERY to find group by Invite Code
      const groupsRef = collection(db, "groups");
      const q = query(groupsRef, where("inviteCode", "==", inputInviteCode));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        throw new Error("Invalid Invite Code. No group found.");
      }

      const groupDoc = querySnapshot.docs[0];
      const targetGroupId = groupDoc.id; 
      const groupData = groupDoc.data();

      // 2. Add User to Members Subcollection
      const memberRef = doc(db, "groups", targetGroupId, "members", user.uid);
      
      await setDoc(memberRef, {
        userId: user.uid, 
        displayName: user.displayName || "Member",
        photoURL: user.photoURL || null,
        role: "member",
        joinedAt: serverTimestamp(),
        contributionBalanceCents: 0,
        email: user.email,
        subscriptionStatus: 'unpaid'
      }, { merge: true });

      // 3. UPDATE GROUP: Add user to memberIds array & increment count
      const groupRef = doc(db, "groups", targetGroupId);
      await updateDoc(groupRef, {
        membersCount: increment(1),
        memberIds: arrayUnion(user.uid) // ✅ Critical for Dashboard visibility
      });

      toast({ 
        title: "Success!", 
        description: `You have joined ${groupData.name || "the group"}.` 
      });

      router.push(`/group/${targetGroupId}`);

    } catch (error: any) {
      console.error(error);
      toast({ 
        variant: "destructive", 
        title: "Error", 
        description: error.message || "Failed to join group." 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-10 px-4">
      <Button variant="ghost" className="mb-4 pl-0 hover:bg-transparent hover:text-[#576066] text-slate-500" onClick={() => router.back()}>
        <ArrowLeft className="mr-2 h-4 w-4" /> Back
      </Button>

      <Card className="bg-[#576066] border-none text-white shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Join a Group</CardTitle>
          <CardDescription className="text-slate-200">Enter the 6-character invite code.</CardDescription>
        </CardHeader>
        <form onSubmit={handleJoin}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="code" className="text-sm font-medium text-slate-100">Group Invite Code</label>
              <Input id="code" placeholder="e.g. VUYKM8" value={code} onChange={(e) => setCode(e.target.value)} className="bg-white text-slate-900 uppercase tracking-widest text-center text-lg h-12 font-bold border-white/20" required />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full bg-white text-[#576066] hover:bg-slate-100 font-bold h-12 text-lg shadow-sm" disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <CheckCircle2 className="mr-2 h-5 w-5" />} Join Group
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}