'use client';

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, ShieldCheck, UserPlus, DollarSign, XCircle, Clock } from "lucide-react";
import { 
  getFirestore, 
  collection, 
  query, 
  orderBy, 
  limit, 
  onSnapshot 
} from "firebase/firestore";
import { getFirebaseApp } from "@/lib/firebase/client";

interface LogEntry {
  id: string;
  action: string;
  description: string;
  performedBy: { displayName: string };
  timestamp: any;
}

export function AuditLogViewer({ groupId }: { groupId: string }) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  
  // Helper to choose icon based on action
  const getIcon = (action: string) => {
    switch(action) {
      case 'PAYMENT_APPROVED': return <ShieldCheck className="h-4 w-4 text-green-600" />;
      case 'PAYMENT_REJECTED': return <XCircle className="h-4 w-4 text-red-600" />;
      case 'PAYMENT_CLAIMED': return <DollarSign className="h-4 w-4 text-blue-600" />;
      case 'MEMBER_JOINED': return <UserPlus className="h-4 w-4 text-purple-600" />;
      default: return <FileText className="h-4 w-4 text-slate-500" />;
    }
  };

  useEffect(() => {
    const db = getFirestore(getFirebaseApp());
    const q = query(
      collection(db, "groups", groupId, "audit_logs"),
      orderBy("timestamp", "desc"),
      limit(50) // Only show last 50 events for performance
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as LogEntry[];
      setLogs(data);
    });

    return () => unsubscribe();
  }, [groupId]);

  return (
    <Card className="mt-6 border-slate-200 shadow-sm">
      <CardHeader className="pb-3 border-b bg-slate-50/50">
        <CardTitle className="text-md font-bold text-slate-800 flex items-center gap-2">
          <Clock className="h-4 w-4" /> Activity Audit Log
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[300px] w-full p-4">
          <div className="space-y-4">
            {logs.length === 0 && (
                <p className="text-sm text-slate-400 text-center py-4">No activity recorded yet.</p>
            )}
            {logs.map((log) => (
              <div key={log.id} className="flex gap-3 text-sm border-b border-slate-50 pb-3 last:border-0 last:pb-0">
                <div className="mt-0.5">{getIcon(log.action)}</div>
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <span className="font-medium text-slate-900">{log.description}</span>
                    <span className="text-xs text-slate-400 whitespace-nowrap ml-2">
                      {log.timestamp?.seconds ? new Date(log.timestamp.seconds * 1000).toLocaleString() : 'Just now'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Performed by: <span className="font-semibold">{log.performedBy?.displayName || 'Unknown'}</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}