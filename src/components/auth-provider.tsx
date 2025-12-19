'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from 'react';
import { getAuth, onAuthStateChanged, type User } from 'firebase/auth';
import {
  getFirestore,
  doc,
  onSnapshot,
  setDoc,
  serverTimestamp,
  getDoc,
} from 'firebase/firestore';
import { getFirebaseApp } from '@/lib/firebase/client';
import type { User as UserProfile } from '@/lib/types';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
});

/**
 * Ensures a user document exists in Firestore. If not, it creates one.
 * This is crucial for new sign-ups.
 * @param user The Firebase Auth user object.
 */
async function checkAndCreateUserDocument(user: User): Promise<void> {
  const app = getFirebaseApp();
  const db = getFirestore(app);
  const userDocRef = doc(db, 'users', user.uid);

  const userDocSnap = await getDoc(userDocRef);
  if (userDocSnap.exists()) {
    return; // Document already exists
  }

  // User document doesn't exist, so create it.
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
  } catch (error) {
    console.error('Error creating user document:', error);
    // This could be reported to an error tracking service
    throw new Error('Failed to create user profile.');
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const app = getFirebaseApp();
    const auth = getAuth(app);
    const db = getFirestore(app);

    const unsubscribeAuth = onAuthStateChanged(
      auth,
      async (firebaseUser: User | null) => {
        if (firebaseUser) {
          try {
            // Ensure profile exists before proceeding
            await checkAndCreateUserDocument(firebaseUser);
            
            // Now that we know the doc exists, listen for its changes
            const userDocRef = doc(db, 'users', firebaseUser.uid);
            const unsubscribeProfile = onSnapshot(userDocRef, (docSnap) => {
              if (docSnap.exists()) {
                setUser(firebaseUser);
                // --- FIX APPLIED HERE ---
                setProfile({ 
                    uid: docSnap.id, // Changed 'id' to 'uid'
                    ...docSnap.data() 
                } as unknown as UserProfile); // Added 'as unknown' to force type
              } else {
                // This case should theoretically not happen due to checkAndCreateUserDocument, but is a good safeguard.
                setUser(null);
                setProfile(null);
              }
              setLoading(false);
            });
            // Return the profile listener's unsubscribe function
            return () => unsubscribeProfile();

          } catch (error) {
            console.error("Auth provider error:", error);
            setUser(null);
            setProfile(null);
            setLoading(false);
          }
        } else {
          // User is signed out
          setUser(null);
          setProfile(null);
          setLoading(false);
        }
      }
    );

    return () => unsubscribeAuth();
  }, []);

  const value = { user, profile, loading };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};