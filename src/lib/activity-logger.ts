import { getFirebaseApp } from '@/lib/firebase/client';
import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ActivityLogItem } from '@/lib/types';

export async function logActivity(
  groupId: string,
  actor: { uid: string; name: string; avatarUrl?: string },
  actionType: ActivityLogItem['actionType'],
  description: string
) {
  try {
    const app = getFirebaseApp();
    const db = getFirestore(app);
    
    await addDoc(collection(db, 'groups', groupId, 'activity_logs'), {
      groupId,
      actorId: actor.uid,
      actorName: actor.name || 'Unknown User',
      actorAvatar: actor.avatarUrl || '',
      actionType,
      description,
      timestamp: serverTimestamp(),
    });
  } catch (error) {
    console.error("Failed to log activity:", error);
    // We ideally don't want to block the main action if logging fails, so we just log the error.
  }
}