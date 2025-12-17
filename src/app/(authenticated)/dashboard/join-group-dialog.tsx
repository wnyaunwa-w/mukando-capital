'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { getAuth, type User } from 'firebase/auth';
import { getFirebaseApp } from '@/lib/firebase/client';
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
  arrayUnion,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';

export function JoinGroupDialog({
  isOpen,
  onOpenChange,
}: {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}) {
  const { toast } = useToast();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const handleJoinGroup = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    try {
      const formData = new FormData(event.currentTarget);
      const rawCode = formData.get('inviteCode') as string;
      if (!rawCode) throw new Error('Please enter a code');

      const app = getFirebaseApp();
      const auth = getAuth(app);
      const db = getFirestore(app);
      const user = auth.currentUser;
      if (!user) {
        throw new Error('You must be logged in to join.');
      }
      
      const code = rawCode.trim().toUpperCase();

      const groupsRef = collection(db, 'groups');
      const q = query(groupsRef, where('inviteCode', '==', code));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        throw new Error('Invalid Invite Code. Please check and try again.');
      }

      const groupDoc = querySnapshot.docs[0];
      const groupData = groupDoc.data();

      if (groupData.memberIds?.includes(user.uid)) {
        throw new Error('You are already a member of this group.');
      }

      // Add user to members subcollection
      await setDoc(doc(db, 'groups', groupDoc.id, 'members', user.uid), {
        name: user.displayName || user.email?.split('@')[0],
        avatarUrl: user.photoURL || `https://i.pravatar.cc/150?u=${user.uid}`,
        balanceCents: 0,
        role: 'member',
        joinedAt: serverTimestamp(),
        subscriptionStatus: 'unpaid',
      });
      
      // Update the memberIds array on the main group document
      await updateDoc(doc(db, 'groups', groupDoc.id), {
        memberIds: arrayUnion(user.uid),
      });

      toast({ title: 'Success', description: 'You have joined the group!' });
      onOpenChange(false);
      router.refresh();

    } catch (error: any) {
      console.error(error);
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
    // Reset form when dialog closes
  useEffect(() => {
    if (!isOpen) {
      formRef.current?.reset();
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      {/* UPDATED: Added font-sans for consistent font family */}
      <DialogContent className="sm:max-w-[425px] font-sans">
        <DialogHeader>
          {/* UPDATED: Added font-bold, tracking-tight, text-green-900 */}
          <DialogTitle className="text-2xl font-bold tracking-tight text-green-900">Join a Group</DialogTitle>
          <DialogDescription className="text-gray-600">
            Enter the invite code you received to join an existing group.
          </DialogDescription>
        </DialogHeader>
        <form ref={formRef} onSubmit={handleJoinGroup}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              {/* UPDATED: Added font-semibold text-gray-700 */}
              <Label htmlFor="inviteCode" className="font-semibold text-gray-700">Invite Code</Label>
              <Input
                id="inviteCode"
                name="inviteCode"
                placeholder="Enter code..."
                disabled={isLoading}
              />
            </div>
          </div>
          <DialogFooter>
            {/* UPDATED: Added font-medium */}
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
              className="font-medium"
            >
              Cancel
            </Button>
            {/* UPDATED: Changed to green-700 background and added font-bold */}
            <Button type="submit" disabled={isLoading} className="bg-green-700 hover:bg-green-800 font-bold">
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Join Group
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}