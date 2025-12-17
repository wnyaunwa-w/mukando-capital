'use client';

import { useState, useEffect } from 'react';
import { Bell, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getFirebaseApp } from '@/lib/firebase/client';
import { 
  getFirestore, 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  onSnapshot, 
  doc, 
  updateDoc 
} from 'firebase/firestore';
import { useAuth } from '@/components/auth-provider';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import type { AppNotification } from '@/lib/types';

export function NotificationsBell() {
  const { user } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!user) return;

    const app = getFirebaseApp();
    const db = getFirestore(app);
    const notifsRef = collection(db, 'users', user.uid, 'notifications');
    
    // Get last 20 notifications
    const q = query(notifsRef, orderBy('createdAt', 'desc'), limit(20));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as AppNotification[];
      
      setNotifications(data);
      setUnreadCount(data.filter(n => !n.read).length);
    });

    return () => unsubscribe();
  }, [user]);

  const markAsRead = async (notificationId: string) => {
    if (!user) return;
    const app = getFirebaseApp();
    const db = getFirestore(app);
    const notifRef = doc(db, 'users', user.uid, 'notifications', notificationId);
    await updateDoc(notifRef, { read: true });
  };

  const handleClick = async (notification: AppNotification) => {
    if (!notification.read) {
        await markAsRead(notification.id);
    }
    setIsOpen(false);
    if (notification.link) {
        router.push(notification.link);
    }
  };

  const markAllRead = async () => {
    if (!user) return;
    const app = getFirebaseApp();
    const db = getFirestore(app);
    
    const unread = notifications.filter(n => !n.read);
    unread.forEach(async (n) => {
        const notifRef = doc(db, 'users', user.uid, 'notifications', n.id);
        await updateDoc(notifRef, { read: true });
    });
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5 text-gray-600" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 h-2.5 w-2.5 rounded-full bg-red-600 ring-2 ring-white animate-pulse" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h4 className="font-semibold text-sm">Notifications</h4>
          {unreadCount > 0 && (
            // FIX: Changed size="xs" to size="sm" and added h-6 class
            <Button variant="ghost" size="sm" onClick={markAllRead} className="text-xs h-6 px-2 text-green-700">
              Mark all read
            </Button>
          )}
        </div>
        <ScrollArea className="h-[300px]">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No notifications yet.
            </div>
          ) : (
            <div className="flex flex-col">
              {notifications.map((notif) => (
                <button
                  key={notif.id}
                  onClick={() => handleClick(notif)}
                  className={`flex flex-col items-start p-4 text-left text-sm hover:bg-gray-50 border-b last:border-0 transition-colors ${
                    !notif.read ? 'bg-green-50/50' : ''
                  }`}
                >
                  <div className="flex justify-between w-full gap-2">
                    <span className={`font-medium ${!notif.read ? 'text-green-800' : 'text-gray-900'}`}>
                      {notif.title}
                    </span>
                    <span className="text-[10px] text-gray-400 whitespace-nowrap mt-0.5">
                      {notif.createdAt?.toDate ? format(notif.createdAt.toDate(), 'MMM d') : ''}
                    </span>
                  </div>
                  <p className="text-gray-500 mt-1 line-clamp-2 leading-snug">
                    {notif.message}
                  </p>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}