'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, query, where, getDocs, doc, setDoc, updateDoc, arrayUnion, serverTimestamp } from 'firebase/firestore';
import { getFirebaseApp, checkAndCreateUserDocument } from '@/lib/firebase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Loader2, AlertCircle, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function InvitePage() {
  const params = useParams();
  const inviteCode = params.code as string;
  const router = useRouter();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [groupDetails, setGroupDetails] = useState<any>(null);
  const [error, setError] = useState('');
  const [user, setUser] = useState<any>(null);

  const app = getFirebaseApp();
  const auth = getAuth(app);
  const db = getFirestore(app);

  // 1. Listen for Auth State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, [auth]);

  // 2. Fetch Group Details based on Code
  useEffect(() => {
    const fetchGroup = async () => {
      try {
        const q = query(collection(db, 'groups'), where('inviteCode', '==', inviteCode));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
          setError('This invite link is invalid or has expired.');
        } else {
          const groupDoc = snapshot.docs[0];
          setGroupDetails({ id: groupDoc.id, ...groupDoc.data() });
        }
      } catch (err) {
        console.error(err);
        setError('Failed to load invite details.');
      } finally {
        setIsLoading(false);
      }
    };

    if (inviteCode) fetchGroup();
  }, [inviteCode, db]);

  // 3. Logic to Join Group
  const handleJoin = async () => {
    if (!user || !groupDetails) return;
    setIsJoining(true);

    try {
      // Check if already a member
      if (groupDetails.memberIds?.includes(user.uid)) {
        toast({ title: "Already a member", description: "Taking you to the dashboard." });
        router.push(`/dashboard`);
        return;
      }

      // Add user to members subcollection
      await setDoc(doc(db, 'groups', groupDetails.id, 'members', user.uid), {
        name: user.displayName || user.email?.split('@')[0],
        avatarUrl: user.photoURL || `https://i.pravatar.cc/150?u=${user.uid}`,
        balanceCents: 0,
        role: 'member',
        joinedAt: serverTimestamp(),
        subscriptionStatus: 'unpaid',
      });

      // Update main group doc
      await updateDoc(doc(db, 'groups', groupDetails.id), {
        memberIds: arrayUnion(user.uid),
      });

      toast({ title: "Success!", description: `You have joined ${groupDetails.name}` });
      router.push('/dashboard');

    } catch (err: any) {
      console.error(err);
      toast({ title: "Error", description: "Failed to join group.", variant: "destructive" });
    } finally {
      setIsJoining(false);
    }
  };

  // 4. Handle Login/Signup if not authenticated
  const handleGoogleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      await checkAndCreateUserDocument(result.user);
      // The useEffect will catch the new 'user' state and we can let them click "Join"
    } catch (err) {
      console.error(err);
      toast({ title: "Login Failed", variant: "destructive" });
    }
  };

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center font-sans"><Loader2 className="h-8 w-8 animate-spin text-green-700" /></div>;
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 font-sans p-4">
        <Card className="w-full max-w-md border-red-200">
            <CardHeader className="text-center">
                <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
                    <AlertCircle className="w-6 h-6 text-red-600" />
                </div>
                <CardTitle className="text-red-900">Invite Error</CardTitle>
                <CardDescription>{error}</CardDescription>
            </CardHeader>
            <CardFooter>
                <Button asChild className="w-full bg-green-700 hover:bg-green-800">
                    <Link href="/">Go to Homepage</Link>
                </Button>
            </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 font-sans p-4">
      <div className="mb-8 text-center">
          <span className="text-2xl font-bold tracking-tight text-green-800">Mukando Capital</span>
      </div>
      
      <Card className="w-full max-w-md shadow-xl border-t-4 border-t-green-700">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mb-4">
            <Users className="w-8 h-8 text-green-700" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-gray-900">
            You're invited!
          </CardTitle>
          <CardDescription className="text-lg mt-2">
            Join the <span className="font-bold text-green-700">{groupDetails?.name}</span> group on Mukando.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
           <div className="bg-gray-50 p-4 rounded-lg text-sm text-center text-gray-600">
              <p>{groupDetails?.description}</p>
              <div className="mt-2 font-medium">
                  {groupDetails?.memberIds?.length || 0} existing members
              </div>
           </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-3">
          {user ? (
            <Button onClick={handleJoin} disabled={isJoining} className="w-full bg-green-700 hover:bg-green-800 h-12 text-lg font-bold shadow-md">
              {isJoining ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "Accept Invite & Join"}
            </Button>
          ) : (
             <div className="w-full space-y-3">
                <Button onClick={handleGoogleLogin} className="w-full h-12 text-lg bg-white text-gray-800 border hover:bg-gray-50 shadow-sm relative">
                    <img src="https://www.google.com/favicon.ico" alt="G" className="w-5 h-5 absolute left-4" />
                    Sign in with Google to Join
                </Button>
                <div className="text-center text-xs text-gray-500">
                    Or <Link href="/signup" className="underline text-green-700">sign up with email</Link>
                </div>
             </div>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}