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
  date?: any;      // Old format
  createdAt?: any; // New format standard
  userId: string;
  userName?: string;
}

export function TransactionLedger({ groupId }: { groupId: string }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (!groupId || !user) return;

    const db = getFirestore(getFirebaseApp());
    
    // We order by 'createdAt' effectively. 
    // Note: If your existing data uses 'date', you might need to change this back to 'date' 
    // or ensure your data is consistent. For now, we try to be safe.
    const q = query(
      collection(db, 'groups', groupId, 'transactions'),
      orderBy('createdAt', 'desc'), 
      limit(20)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      try {
        const txs = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Transaction[];
        
        setTransactions(txs);
        setIsLoading(false);
        setErrorMsg(null);
      } catch (err) {
        console.error("Data mapping error:", err);
        setErrorMsg("Failed to process transaction data.");
        setIsLoading(false);
      }
    }, (error) => {
      console.error("Firestore Error:", error);
      // Determine user-friendly error
      if (error.code === 'permission-denied') {
        setErrorMsg("You do not have permission to view these transactions.");
      } else if (error.code === 'failed-precondition') {
         setErrorMsg("System Error: Missing Database Index.");
      } else {
        setErrorMsg("Could not load transactions.");
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [groupId, user]);

  // HELPER: "Bulletproof" Date Formatter
  const safeFormatDate = (tx: Transaction) => {
    // 1. Try to find *any* date field
    const dateVal = tx.createdAt || tx.date;

    if (!dateVal) return '-';
    
    try {
        // Case A: Firestore Timestamp (has .seconds)
        if (dateVal && typeof dateVal === 'object' && 'seconds' in dateVal) {
            return format(new Date(dateVal.seconds * 1000), 'dd MMM yyyy');
        }
        
        // Case B: JavaScript Date object or valid string/number
        const jsDate = new Date(dateVal);
        if (!isNaN(jsDate.getTime())) {
             return format(jsDate, 'dd MMM yyyy');
        }
    } catch (e) {
        // Ignore error and fall through
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-muted-foreground" />
            Recent Activity
        </CardTitle>
        <CardDescription>
            Approved transactions. (Pending claims will not appear here yet).
        </CardDescription>
      </CardHeader>
      <CardContent>
        {transactions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm bg-gray-50 rounded-lg border border-dashed">
            No approved transactions yet.
            <br/>
            <span className="text-xs opacity-70">
                (If you just submitted a claim, the Admin must approve it first)
            </span>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Member</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((tx) => (
                <TableRow key={tx.id}>
                  <TableCell className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                    {safeFormatDate(tx)}
                  </TableCell>
                  
                  <TableCell>
                    <div className="flex flex-col">
                        <span className="font-medium text-sm">{tx.description}</span>
                        <Badge 
                            variant="secondary" 
                            className={`w-fit mt-1 text-[10px] h-5 ${
                                tx.type === 'contribution' ? 'bg-green-100 text-green-700 hover:bg-green-200' : 
                                tx.type === 'payout' ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' : ''
                            }`}
                        >
                            {tx.type}
                        </Badge>
                    </div>
                  </TableCell>
                  
                  <TableCell className="text-sm text-muted-foreground">
                    {tx.userName || 'Member'}
                  </TableCell>
                  
                  <TableCell className={`text-right font-medium ${
                    tx.type === 'contribution' ? 'text-green-600' : 'text-gray-900'
                  }`}>
                    {tx.type === 'contribution' ? '+' : ''}{formatCurrency(tx.amountCents)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}