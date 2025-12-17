
import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { firestore } from '@/lib/firebase-server'; // Uses firebase-admin
import { headers } from 'next/headers';

export async function POST(req: NextRequest) {
  const headersList = headers();
  const authorization = headersList.get('authorization');
  
  if (!authorization || !authorization.startsWith('Bearer ')) {
    return NextResponse.json({ message: 'Unauthorized: No token provided.' }, { status: 401 });
  }

  const token = authorization.split('Bearer ')[1];

  try {
    const decodedToken = await getAuth().verifyIdToken(token);
    const uid = decodedToken.uid;

    // Optional: Add more complex logic here, like checking if the user is a group owner
    // and preventing deletion if they haven't transferred ownership.
    // For now, we will proceed with deletion.

    // 1. Delete user from Firestore
    // Note: This won't delete subcollections. A Cloud Function would be needed for cascading deletes.
    await firestore.collection('users').doc(uid).delete();
    
    // 2. Delete user from Firebase Auth
    await getAuth().deleteUser(uid);

    return NextResponse.json({ message: 'Account deleted successfully.' });

  } catch (error: any) {
    console.error('Error deleting user account:', error);
    let message = 'An unexpected error occurred.';
    if (error.code === 'auth/id-token-expired') {
      message = 'Authentication token has expired. Please log in again.';
    } else if (error.code === 'auth/user-not-found') {
      message = 'User account not found. It may have already been deleted.';
    }
    
    return NextResponse.json({ message }, { status: 500 });
  }
}
