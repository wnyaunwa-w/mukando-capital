"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CalendarDays } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { 
  getFirestore, doc, getDoc 
} from "firebase/firestore";
import { getFirebaseApp } from "@/lib/firebase/client";

interface ScheduleItem {
  userId: string;
  displayName: string;
  payoutDate: string; // YYYY-MM-DD
  amountCents: number; 
  status: 'pending' | 'paid' | 'skipped';
}

// ✅ FIX: Added currencySymbol to props
export function PayoutScheduleTab({ groupId, currencySymbol = "$" }: { groupId: string, currencySymbol?: string }) {
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSchedule = async () => {
        const db = getFirestore(getFirebaseApp());
        const docRef = doc(db, "groups", groupId);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
            const data = snap.data();
            setSchedule(data.payoutSchedule || []);
        }
        setLoading(false);
    };
    fetchSchedule();
  }, [groupId]);

  if (loading) return <div className="text-center py-10">Loading schedule...</div>;

  if (schedule.length === 0) {
      return (
          <div className="flex flex-col items-center justify-center py-10 text-center bg-slate-50 border rounded-lg border-dashed">
              <CalendarDays className="h-10 w-10 text-slate-300 mb-2" />
              <h3 className="text-lg font-medium text-slate-900">No Payout Schedule Yet</h3>
              <p className="text-sm text-slate-500 max-w-sm">
                  Go to "Admin Forms" to generate the rotation order automatically.
              </p>
          </div>
      );
  }

  return (
    <div className="space-y-4">
        <div className="flex justify-between items-center">
            <h3 className="font-bold text-lg text-slate-800">Payout Rotation</h3>
            <span className="text-xs text-slate-500">Estimated dates</span>
        </div>
        
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Member</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {schedule.map((item, idx) => (
                    <TableRow key={idx}>
                        <TableCell className="font-medium text-slate-700">
                            {format(new Date(item.payoutDate), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell>{item.displayName}</TableCell>
                        <TableCell className="text-right font-bold text-slate-900">
                             {/* ✅ FIX: Using dynamic currency symbol */}
                            {formatCurrency(item.amountCents, currencySymbol)}
                        </TableCell>
                        <TableCell className="text-right">
                            {item.status === 'paid' ? (
                                <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-none">Paid</Badge>
                            ) : item.status === 'skipped' ? (
                                <Badge variant="outline" className="text-red-500 border-red-200">Skipped</Badge>
                            ) : (
                                <Badge variant="secondary" className="text-slate-500">Upcoming</Badge>
                            )}
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    </div>
  );
}