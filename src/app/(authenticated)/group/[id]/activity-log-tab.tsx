'use client';

import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { getFirebaseApp } from '@/lib/firebase/client';
import { getFirestore, collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Activity } from 'lucide-react';

interface LogEntry {
  id: string;
  message: string;
  type: string;
  createdAt: any;
}

export function ActivityLog({ groupId }: { groupId: string }) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const db = getFirestore(getFirebaseApp());
    const q = query(
      collection(db, 'groups', groupId, 'activity_logs'),
      orderBy('createdAt', 'desc'),
      limit(20)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as LogEntry[];
      setLogs(data);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [groupId]);

  if (isLoading) return <div className="flex justify-center p-4"><Loader2 className="h-5 w-5 animate-spin" /></div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Activity className="h-4 w-4" /> Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px] pr-4">
          <div className="space-y-4">
            {logs.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-10">No recent activity.</div>
            ) : (
                logs.map((log) => (
                <div key={log.id} className="flex flex-col space-y-1 pb-3 border-b border-border/50 last:border-0">
                    <span className="text-sm font-medium">{log.message}</span>
                    <span className="text-xs text-muted-foreground">
                    {log.createdAt?.seconds ? new Date(log.createdAt.seconds * 1000).toLocaleString() : 'Just now'}
                    </span>
                </div>
                ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}