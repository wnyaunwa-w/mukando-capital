
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { getAuth } from 'firebase/auth';
import { getFirebaseApp } from '@/lib/firebase/client';
import { getFirestore, doc, updateDoc, deleteDoc, arrayRemove, writeBatch } from 'firebase/firestore';
import type { Group } from '@/lib/types';

export function LeaveGroupDialog({
  isOpen,
  onOpenChange,
  group,
}: {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  group: Group;
}) {
  const { toast } = useToast();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleLeaveGroup = async () => {
    setIsLoading(true);
    try {
      const app = getFirebaseApp();
      const auth = getAuth(app);
      const db = getFirestore(app);
      const user = auth.currentUser;

      if (!user) {
        throw new Error('You must be logged in.');
      }
      if (group.ownerId === user.uid) {
        throw new Error('Group owners cannot leave a group. You must transfer ownership first.');
      }
      
      const userMemberInfo = group.members.find(m => m.id === user.uid);
      if(userMemberInfo && userMemberInfo.balanceCents > 0) {
          throw new Error('You cannot leave the group while you have an outstanding balance. Please settle your dues.');
      }

      const batch = writeBatch(db);
      
      // Ref to the main group document
      const groupRef = doc(db, 'groups', group.id);
      batch.update(groupRef, {
        memberIds: arrayRemove(user.uid),
      });

      // Ref to the user's document in the members subcollection
      const memberRef = doc(db, 'groups', group.id, 'members', user.uid);
      batch.delete(memberRef);

      await batch.commit();

      toast({ title: 'Success', description: `You have left the group "${group.name}".` });
      onOpenChange(false);
      router.push('/dashboard');
      router.refresh();

    } catch (error: any) {
      console.error('Error leaving group:', error);
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. You will be removed from the group and will lose access to its data.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleLeaveGroup} disabled={isLoading} className="bg-destructive hover:bg-destructive/90">
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Leave Group
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
