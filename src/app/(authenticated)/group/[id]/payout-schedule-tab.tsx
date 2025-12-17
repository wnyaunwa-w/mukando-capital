'use client';

import { useState, useEffect } from "react";
import { Loader2, Save, Calendar as CalendarIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// UI Components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// Firebase
import { getFirestore, doc, getDoc, getDocs, collection, updateDoc } from "firebase/firestore";
import { getFirebaseApp } from "@/lib/firebase/client";

// Types
interface ScheduleItem {
  userId: string;
  displayName: string;
  photoURL: string | null;
  payoutDate: string; // YYYY-MM-DD
  status: 'pending' | 'paid';
}

export function PayoutScheduleTab({ groupId }: { groupId: string }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [scheduleItems, setScheduleItems] = useState<ScheduleItem[]>([]);

  const db = getFirestore(getFirebaseApp());

  // 1. Fetch Members and merge with existing schedule
  useEffect(() => {
    const fetchData = async () => {
      if (!groupId) return;
      setLoading(true);
      try {
        // A. Get current group schedule data to see who has dates assigned
        const groupDoc = await getDoc(doc(db, "groups", groupId));
        const currentSchedule = groupDoc.data()?.payoutSchedule || [];
        
        // FIX: Explicitly tell TypeScript this Map contains 'any' data
        const scheduleMap = new Map<string, any>(
            currentSchedule.map((item: any) => [item.userId, item])
        );

        // B. Get all current members to list them in the table
        const membersSnapshot = await getDocs(collection(db, "groups", groupId, "members"));
        
        const unifiedSchedule: ScheduleItem[] = await Promise.all(membersSnapshot.docs.map(async (memberDoc) => {
            const userId = memberDoc.id;
            // Default to member doc data
            let displayName = memberDoc.data().displayName || "Unknown";
            let photoURL = memberDoc.data().photoURL || null;

            // Try to get up-to-date profile info from root 'users' collection
            try {
                const userSnap = await getDoc(doc(db, "users", userId));
                if (userSnap.exists()) {
                    displayName = userSnap.data().displayName || displayName;
                    photoURL = userSnap.data().photoURL || photoURL;
                }
            } catch (e) { 
                // ignore missing user profile, fallback to group member data 
            }

            const existingEntry = scheduleMap.get(userId);

            return {
                userId,
                displayName,
                photoURL,
                // Use existing date/status if saved, otherwise default to empty
                payoutDate: existingEntry?.payoutDate || "", 
                status: existingEntry?.status || 'pending'
            };
        }));

        // Sort by date (put those with dates at the top)
        unifiedSchedule.sort((a, b) => {
            if (!a.payoutDate) return 1;
            if (!b.payoutDate) return -1;
            return a.payoutDate.localeCompare(b.payoutDate);
        });

        setScheduleItems(unifiedSchedule);
      } catch (error) {
        console.error("Error fetching schedule data:", error);
        toast({ variant: "destructive", title: "Error", description: "Could not load schedule data." });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [groupId, db, toast]);

  // 2. Handlers for local state updates (Typing in the table)
  const updateItem = (userId: string, field: keyof ScheduleItem, value: string) => {
    setScheduleItems(prev => prev.map(item => 
        item.userId === userId ? { ...item, [field]: value } : item
    ));
  };

  // 3. Save to Firebase
  const handleSave = async () => {
    setSaving(true);
    try {
        const groupRef = doc(db, "groups", groupId);
        
        // Find next payout date (earliest future date that is still PENDING)
        const today = new Date().toISOString().split('T')[0];
        const pendingFuture = scheduleItems
            .filter(i => i.status === 'pending' && i.payoutDate && i.payoutDate >= today)
            .sort((a, b) => a.payoutDate.localeCompare(b.payoutDate));

        await updateDoc(groupRef, {
            payoutSchedule: scheduleItems,
            // Automatically update the dashboard "Next Payout" card
            nextPayoutDate: pendingFuture.length > 0 ? pendingFuture[0].payoutDate : null,
            updatedAt: new Date()
        });
        
        toast({ title: "Success", description: "Payout schedule updated." });
    } catch (error) {
        console.error("Error saving:", error);
        toast({ variant: "destructive", title: "Error", description: "Failed to save changes." });
    } finally {
        setSaving(false);
    }
  };

  if (loading) return <div className="py-10 flex justify-center"><Loader2 className="animate-spin text-green-700" /></div>;

  return (
    <Card className="border-none shadow-none">
        <CardHeader className="px-0 pt-0 flex flex-row items-center justify-between">
            <div>
                <CardTitle className="text-xl font-bold">Payout Schedule</CardTitle>
                <CardDescription>Manually manage dates and mark payouts as complete.</CardDescription>
            </div>
            <Button onClick={handleSave} disabled={saving} className="bg-green-700 hover:bg-green-800 gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Changes
            </Button>
        </CardHeader>
        <CardContent className="px-0">
            <div className="border rounded-md">
            <Table>
                <TableHeader>
                    <TableRow className="bg-slate-50">
                        <TableHead>Member</TableHead>
                        <TableHead>Expected Date</TableHead>
                        <TableHead className="w-[150px]">Status</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {scheduleItems.map((item) => (
                        <TableRow key={item.userId}>
                            <TableCell className="flex items-center gap-3 font-medium">
                                <Avatar className="h-8 w-8">
                                    <AvatarImage src={item.photoURL || ""} />
                                    <AvatarFallback className="bg-green-100 text-green-700">
                                        {item.displayName.charAt(0)}
                                    </AvatarFallback>
                                </Avatar>
                                {item.displayName}
                            </TableCell>
                            <TableCell>
                                <div className="relative">
                                    <Input 
                                        type="date" 
                                        value={item.payoutDate}
                                        onChange={(e) => updateItem(item.userId, 'payoutDate', e.target.value)}
                                        className="pl-10"
                                    />
                                    <CalendarIcon className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                                </div>
                            </TableCell>
                            <TableCell>
                                <Select 
                                    value={item.status} 
                                    onValueChange={(val) => updateItem(item.userId, 'status', val as 'pending' | 'paid')}
                                >
                                    <SelectTrigger className={item.status === 'paid' ? "bg-green-50 text-green-700 border-green-200 font-bold" : ""}>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="pending">Pending</SelectItem>
                                        <SelectItem value="paid" className="text-green-700 font-medium">Paid</SelectItem>
                                    </SelectContent>
                                </Select>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
            </div>
        </CardContent>
    </Card>
  );
}