'use client';

import { useState, useEffect } from "react";
import { PendingClaimsList } from './pending-claims-list';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar, ArrowUp, ArrowDown, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { addDays, addMonths, format } from "date-fns";
import { getFirestore, doc, updateDoc, collection, getDocs, getDoc } from "firebase/firestore";
import { getFirebaseApp } from "@/lib/firebase/client";

interface ScheduledMember {
  userId: string;
  displayName: string;
  photoURL?: string;
  role: string;
  payoutDate?: string;
  status?: string;
}

export function AdminForms({ groupId }: { groupId: string }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState<ScheduledMember[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [startDate, setStartDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [frequency, setFrequency] = useState("monthly"); 

  useEffect(() => {
    const fetchMembers = async () => {
      if (!groupId) return;
      try {
        const db = getFirestore(getFirebaseApp());
        const membersRef = collection(db, "groups", groupId, "members");
        const snapshot = await getDocs(membersRef);
        
        const memberPromises = snapshot.docs.map(async (memberDoc) => {
             const memberData = memberDoc.data();
             let displayName = memberData.displayName || "Member";
             let photoURL = memberData.photoURL || null;

             try {
                const userDocRef = doc(db, "users", memberDoc.id);
                const userSnap = await getDoc(userDocRef);
                if (userSnap.exists()) {
                    const userData = userSnap.data();
                    if (userData.displayName) displayName = userData.displayName;
                    if (userData.photoURL) photoURL = userData.photoURL;
                }
             } catch (err) {
                console.error("Could not fetch user profile", err);
             }

             return {
                 userId: memberDoc.id,
                 role: memberData.role,
                 displayName: displayName, 
                 photoURL: photoURL
             } as ScheduledMember;
        });

        const memberList = await Promise.all(memberPromises);
        setMembers(memberList);
      } catch (error) {
        console.error("Error fetching members:", error);
      }
    };
    fetchMembers();
  }, [groupId, isDialogOpen]);

  const generateSchedule = async () => {
    setLoading(true);
    try {
      const db = getFirestore(getFirebaseApp());
      const groupRef = doc(db, "groups", groupId);
      const scheduledMembers = members.map((member, index) => {
        let date = new Date(startDate);
        if (frequency === "weekly") date = addDays(date, index * 7);
        else date = addMonths(date, index);

        return {
          userId: member.userId,
          displayName: member.displayName,
          photoURL: member.photoURL, 
          payoutDate: format(date, "yyyy-MM-dd"),
          status: "pending"
        };
      });

      await updateDoc(groupRef, {
        payoutSchedule: scheduledMembers,
        nextPayoutDate: scheduledMembers[0]?.payoutDate || null,
        updatedAt: new Date()
      });

      toast({ title: "Schedule Saved", description: "The payout schedule has been updated." });
      setIsDialogOpen(false);
    } catch (error) {
      console.error("Error saving schedule:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to save the schedule." });
    } finally {
      setLoading(false);
    }
  };

  const moveMember = (index: number, direction: 'up' | 'down') => {
    const newMembers = [...members];
    if (direction === 'up' && index > 0) {
      [newMembers[index], newMembers[index - 1]] = [newMembers[index - 1], newMembers[index]];
    } else if (direction === 'down' && index < newMembers.length - 1) {
      [newMembers[index], newMembers[index + 1]] = [newMembers[index + 1], newMembers[index]];
    }
    setMembers(newMembers);
  };

  return (
    <div className="space-y-8">
      <section><PendingClaimsList groupId={groupId} /></section>
      <Separator />
      <section>
        <Card className="border-green-100 shadow-sm">
            <CardHeader>
                <CardTitle className="text-xl text-green-800">Payout Management</CardTitle>
                <CardDescription>Drag members to reorder. Save to update the dashboard.</CardDescription>
            </CardHeader>
            <CardContent>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-green-700 hover:bg-green-800"><Calendar className="mr-2 h-4 w-4" />Manage Payout Schedule</Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader><DialogTitle>Configure Payout Rotation</DialogTitle></DialogHeader>
                        <div className="grid gap-6 py-4">
                            <div className="flex items-center gap-4">
                                <div className="grid gap-2 flex-1"><Label>Start Date</Label><Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></div>
                                <div className="grid gap-2 flex-1"><Label>Frequency</Label><Select value={frequency} onValueChange={setFrequency}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="weekly">Weekly</SelectItem><SelectItem value="monthly">Monthly</SelectItem></SelectContent></Select></div>
                            </div>
                            <div className="border rounded-md divide-y max-h-[300px] overflow-y-auto">
                                {members.length === 0 ? <div className="p-4 text-center text-sm text-gray-500">Loading members...</div> : members.map((member, index) => (
                                    <div key={member.userId} className="flex items-center justify-between p-3 bg-white hover:bg-gray-50">
                                        <div className="flex items-center gap-3">
                                            <span className="text-muted-foreground font-mono text-xs w-6 text-center bg-gray-100 rounded">#{index + 1}</span>
                                            {member.photoURL ? <img src={member.photoURL} alt="" className="h-8 w-8 rounded-full object-cover bg-gray-200" /> : <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500"><User className="h-4 w-4" /></div>}
                                            <span className="font-medium text-sm">{member.displayName}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Button variant="ghost" size="icon" className="h-7 w-7" disabled={index === 0} onClick={() => moveMember(index, 'up')}><ArrowUp className="h-4 w-4" /></Button>
                                            <Button variant="ghost" size="icon" className="h-7 w-7" disabled={index === members.length - 1} onClick={() => moveMember(index, 'down')}><ArrowDown className="h-4 w-4" /></Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <DialogFooter><Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button><Button onClick={generateSchedule} disabled={loading} className="bg-green-700 hover:bg-green-800">{loading ? "Saving..." : "Generate & Save Schedule"}</Button></DialogFooter>
                    </DialogContent>
                </Dialog>
            </CardContent>
        </Card>
      </section>
    </div>
  );
}