"use client";

import { useEffect, useState } from "react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { 
  getFirestore, 
  collection, 
  query, 
  orderBy, 
  onSnapshot 
} from "firebase/firestore";
import { getFirebaseApp } from "@/lib/firebase/client";

interface Transaction {
  id: string;
  type: 'contribution' | 'payout';
  amountCents: number;
  userDisplayName: string;
  createdAt: any;
  status: 'pending' | 'completed' | 'pending_confirmation';
}

// ✅ FIX: Added currencySymbol to props
export function TransactionLedger({ groupId, currencySymbol = "$" }: { groupId: string, currencySymbol?: string }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const db = getFirestore(getFirebaseApp());
    const q = query(
      collection(db, "groups", groupId, "transactions"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const txs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Transaction[];
      setTransactions(txs);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [groupId]);

  if (loading) return <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-slate-400" /></div>;

  if (transactions.length === 0) {
    return <div className="p-8 text-center text-slate-500 border rounded-lg bg-slate-50">No transactions recorded yet.</div>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Member</TableHead>
          <TableHead>Type</TableHead>
          <TableHead className="text-right">Amount</TableHead>
          <TableHead className="text-right">Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {transactions.map((tx) => (
          <TableRow key={tx.id}>
            <TableCell className="text-xs text-slate-500">
              {tx.createdAt?.seconds ? new Date(tx.createdAt.seconds * 1000).toLocaleDateString() : 'N/A'}
            </TableCell>
            <TableCell className="font-medium text-slate-700">{tx.userDisplayName}</TableCell>
            <TableCell>
              <Badge variant="outline" className={tx.type === 'contribution' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-purple-50 text-purple-700 border-purple-200'}>
                {tx.type === 'contribution' ? 'Paid In' : 'Payout'}
              </Badge>
            </TableCell>
            <TableCell className="text-right font-bold text-slate-900">
              {/* ✅ FIX: Using dynamic currency symbol */}
              {formatCurrency(tx.amountCents, currencySymbol)}
            </TableCell>
            <TableCell className="text-right">
              {tx.status === 'completed' ? (
                <Badge className="bg-green-100 text-green-700 border-none shadow-none hover:bg-green-100">Success</Badge>
              ) : (
                <Badge variant="secondary" className="text-slate-500">Pending</Badge>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}