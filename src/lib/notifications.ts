import { getFirebaseApp } from '@/lib/firebase/client';
import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore';

export async function sendNotification(
  userId: string,
  title: string,
  message: string,
  type: 'info' | 'warning' | 'success' | 'error' = 'info',
  link?: string
) {
  try {
    const app = getFirebaseApp();
    const db = getFirestore(app);
    
    // Notifications live in a subcollection under the User
    await addDoc(collection(db, 'users', userId, 'notifications'), {
      userId,
      title,
      message,
      type,
      read: false,
      createdAt: serverTimestamp(),
      link: link || null,
    });
  } catch (error) {
    console.error("Failed to send notification:", error);
  }
}