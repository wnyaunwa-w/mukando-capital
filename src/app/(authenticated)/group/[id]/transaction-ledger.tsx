'use client';

import { useEffect, useState } from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { getFirebaseApp } from '@/lib/firebase/client';
import { 
  getFirestore, 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  limit 
} from 'firebase/firestore';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { Loader2, History, AlertCircle } from 'lucide-react';
import { useAuth } from '@/components/auth-provider';

interface Transaction {
  id: string;
  type: 'contribution' | 'payout' | 'fee';
  amountCents: number;
  description: string;
  date?: any;           // String "YYYY-MM-DD"
  createdAt?: any;      // Firestore Timestamp
  userId: string;
  userDisplayName?: string; // ✅ Fixed: Matches database field
  status?: string;      // ✅ Added: To filter approved items
}

export function TransactionLedger({ groupId }: { groupId: string }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (!groupId || !user) return;

    const db = getFirestore(getFirebaseApp());
    
    // Query: Order by createdAt (creation time) to show newest entries first
    const q = query(
      collection(db, 'groups', groupId, 'transactions'),
      orderBy('createdAt', 'desc'), 
      limit(20)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      try {
        const rawTxs = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Transaction[];
        
        // ✅ Filter: Only show approved ('completed') transactions
        const approvedTxs = rawTxs.filter(tx => tx.status === 'completed');
        
        setTransactions(approvedTxs);
        setIsLoading(false);
        setErrorMsg(null);
      } catch (err) {
        console.error("Data mapping error:", err);
        setErrorMsg("Failed to process transaction data.");
        setIsLoading(false);
      }
    }, (error) => {
      console.error("Firestore Error:", error);
      if (error.code === 'permission-denied') {
        setErrorMsg("You do not have permission to view these transactions.");
      } else {
        setErrorMsg("Could not load transactions.");
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [groupId, user]);

  // HELPER: "Bulletproof" Date Formatter
  const safeFormatDate = (tx: Transaction) => {
    // Priority: 1. Manual Date String (YYYY-MM-DD), 2. CreatedAt Timestamp
    const dateVal = tx.date || tx.createdAt;

    if (!dateVal) return '-';
    
    try {
        // Case A: Firestore Timestamp (has .seconds)
        if (typeof dateVal === 'object' && 'seconds' in dateVal) {
            return format(new Date(dateVal.seconds * 1000), 'dd MMM yyyy');
        }
        
        // Case B: String date or JS Date object
        const jsDate = new Date(dateVal);
        if (!isNaN(jsDate.getTime())) {
             return format(jsDate, 'dd MMM yyyy');
        }
    } catch (e) {
        // Ignore error
    }
    return 'Invalid Date';
  };

  if (isLoading) {
    return <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  if (errorMsg) {
    return (
        <Card className="border-red-100 bg-red-50">
            <CardContent className="flex flex-col items-center justify-center p-6 text-red-600">
                <AlertCircle className="h-8 w-8 mb-2" />
                <p className="font-medium">{errorMsg}</p>
            </CardContent>
        </Card>
    );
  }

  return (
    <Card className="border-none shadow-none">
      <CardHeader className="px-0 pt-0">
        <CardTitle className="flex items-center gap-2 text-xl text-[#122932]">
            <History className="h-5 w-5 text-slate-500" />
            Recent Activity
        </CardTitle>
        <CardDescription>
            Approved transactions. (Pending claims will not appear here yet).
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="rounded-md border bg-white">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="w-[120px]">Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Member</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-slate-500 text-sm">
                    No approved transactions yet.
                  </TableCell>
                </TableRow>
              ) : (
                transactions.map((tx) => (
                  <TableRow key={tx.id} className="hover:bg-slate-50">
                    {/* 1. DATE */}
                    <TableCell className="font-mono text-xs text-slate-500 whitespace-nowrap">
                      {safeFormatDate(tx)}
                    </TableCell>
                    
                    {/* 2. DESCRIPTION */}
                    <TableCell>
                      <div className="flex flex-col">
                          <span className="font-medium text-sm text-slate-900">{tx.description}</span>
                          <Badge 
                              variant="secondary" 
                              className={`w-fit mt-1 text-[10px] h-5 px-1.5 ${
                                  tx.type === 'contribution' ? 'bg-green-100 text-green-700 hover:bg-green-200' : 
                                  tx.type === 'payout' ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' : 
                                  'bg-slate-100 text-slate-700'
                              }`}
                          >
                              {tx.type}
                          </Badge>
                      </div>
                    </TableCell>
                    
                    {/* 3. MEMBER NAME (Corrected Field) */}
                    <TableCell className="text-sm text-slate-600">
                      {tx.userDisplayName || 'Unknown Member'}
                    </TableCell>
                    
                    {/* 4. AMOUNT */}
                    <TableCell className={`text-right font-bold ${
                      tx.type === 'contribution' ? 'text-green-600' : 'text-slate-900'
                    }`}>
                      {tx.type === 'contribution' ? '+' : ''}{formatCurrency(tx.amountCents)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}