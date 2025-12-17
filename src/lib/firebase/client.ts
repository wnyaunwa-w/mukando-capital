'use client';

import { initializeApp, getApp, getApps, FirebaseOptions } from 'firebase/app';
import { getFirestore, doc, updateDoc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import type { User as FirebaseUser } from 'firebase/auth';

const firebaseConfig: FirebaseOptions = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || process.env.FIREBASE_APP_ID,
};

// Singleton pattern to initialize Firebase app on the client
export function getFirebaseApp() {
    if (!getApps().length) {
        return initializeApp(firebaseConfig);
    }
    return getApp();
}

export async function updateFirestoreUser(userId: string, data: Record<string, any>) {
    const app = getFirebaseApp();
    const db = getFirestore(app);
    const userDocRef = doc(db, 'users', userId);
    await updateDoc(userDocRef, data);
}


/**
 * Checks if a user document exists in Firestore. If not, it creates one.
 * This is essential for new users signing up for the first time, regardless of method.
 * @param user The Firebase Auth user object.
 */
export async function checkAndCreateUserDocument(user: FirebaseUser) {
    const app = getFirebaseApp();
    const db = getFirestore(app);
    const userDocRef = doc(db, 'users', user.uid);

    const userDocSnap = await getDoc(userDocRef);

    if (!userDocSnap.exists()) {
        // User document doesn't exist, create it.
        try {
            await setDoc(userDocRef, {
                email: user.email,
                name: user.displayName || user.email?.split('@')[0] || 'New User',
                avatarUrl: user.photoURL || `https://i.pravatar.cc/150?u=${user.uid}`,
                createdAt: serverTimestamp(),
                phoneNumber: user.phoneNumber || '',
                role: 'member', // Default role for all new users
                groups: [],
            });
            console.log(`Created new user document for ${user.uid}`);
        } catch (error) {
            console.error("Error creating user document:", error);
            // Handle the error appropriately, maybe show a toast to the user.
        }
    }
}
