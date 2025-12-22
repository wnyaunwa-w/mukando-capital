'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, Lock, User, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  updateProfile, 
  GoogleAuthProvider, 
  signInWithPopup,
  getAdditionalUserInfo 
} from 'firebase/auth';
import { getFirebaseApp, checkAndCreateUserDocument } from '@/lib/firebase/client'; 

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Initialize app and auth
  const app = getFirebaseApp();
  const auth = getAuth(app);

  // --- Handle Email Signup ---
  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // 1. Create the user in Authentication
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // 2. Update their display name
      if (auth.currentUser) {
          await updateProfile(auth.currentUser, { displayName: name });
      }

      // 3. Create the user document in Firestore (Database)
      await checkAndCreateUserDocument(userCredential.user);

      // 4. ✅ SEND WELCOME EMAIL (Non-blocking)
      fetch('/api/send-welcome', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: userCredential.user.email,
          name: name 
        }),
      }).catch(err => console.error("Email failed:", err)); // We catch error so it doesn't stop redirect

      // 5. REDIRECT TO DASHBOARD
      router.push('/dashboard'); 
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/email-already-in-use') {
        setError('This email is already registered. Try logging in.');
      } else {
        setError('Failed to create account. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // --- Handle Google Signup ---
  const handleGoogleSignup = async () => {
    setError('');
    setLoading(true);

    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      
      // Ensure user exists in database
      await checkAndCreateUserDocument(result.user);

      // ✅ CHECK IF NEW USER -> SEND EMAIL
      const details = getAdditionalUserInfo(result);
      if (details?.isNewUser) {
        fetch('/api/send-welcome', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: result.user.email,
            name: result.user.displayName || 'Member'
          }),
        }).catch(err => console.error("Email failed:", err));
      }
      
      // REDIRECT TO DASHBOARD
      router.push('/dashboard'); 
    } catch (err: any) {
      console.error(err);
      setError('Failed to sign up with Google.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white font-sans text-gray-900 flex flex-col">
      {/* --- Navbar (Consistent) --- */}
      <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
             <Link href="/" className="text-2xl font-bold text-green-800 tracking-tight cursor-pointer">
               Mukando Capital
             </Link>
          </div>
          
          <nav className="hidden md:flex items-center gap-8">
            <Link href="/#features" className="text-sm font-medium text-gray-600 hover:text-green-700 transition">Features</Link>
            <Link href="/about" className="text-sm font-medium text-gray-600 hover:text-green-700 transition">About Us</Link>
            <Link href="/contact" className="text-sm font-medium text-gray-600 hover:text-green-700 transition">Contact Us</Link>
          </nav>

          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-medium text-green-700 hover:text-green-800 transition">
              Login
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center py-12 px-6 bg-sky-50">
        <div className="w-full max-w-md bg-white p-8 md:p-10 rounded-3xl shadow-xl border border-gray-100">
          
          <div className="text-center mb-8">
            <h1 className="text-3xl font-extrabold text-green-900 mb-2">Create Account</h1>
            <p className="text-gray-600">Join your community savings group today.</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-100 flex items-start gap-3 text-red-700">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {/* --- Google Signup Button --- */}
          <button 
            type="button"
            onClick={handleGoogleSignup}
            disabled={loading}
            className="w-full bg-white hover:bg-gray-50 text-gray-700 font-semibold py-3.5 rounded-xl border border-gray-200 shadow-sm transition-all flex items-center justify-center gap-3 mb-6 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? (
                <Loader2 className="w-5 h-5 animate-spin text-green-700" />
            ) : (
                <>
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                <span>Sign up with Google</span>
                </>
            )}
          </button>

          {/* --- Divider --- */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Or register with email</span>
            </div>
          </div>

          <form onSubmit={handleEmailSignup} className="space-y-5">
            {/* Full Name Field */}
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium text-gray-700">Full Name</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <User className="h-5 w-5" />
                </div>
                <input 
                  type="text" 
                  id="name" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none transition" 
                  placeholder="John Doe" 
                />
              </div>
            </div>

            {/* Email Field */}
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-gray-700">Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <Mail className="h-5 w-5" />
                </div>
                <input 
                  type="email" 
                  id="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none transition" 
                  placeholder="you@example.com" 
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium text-gray-700">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <Lock className="h-5 w-5" />
                </div>
                <input 
                  type="password" 
                  id="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none transition" 
                  placeholder="Create a password" 
                />
              </div>
              <p className="text-xs text-gray-500">Must be at least 8 characters.</p>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-green-700 hover:bg-green-800 text-white font-bold py-3.5 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 group disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>Create Account <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" /></>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-gray-100 text-center">
            <p className="text-gray-600">
              Already have an account?{' '}
              <Link href="/login" className="font-semibold text-green-700 hover:underline">
                Log in here
              </Link>
            </p>
          </div>
        </div>
      </main>

      {/* --- Footer (Consistent) --- */}
      <footer className="bg-green-700 text-white py-12 border-t border-green-800">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex flex-col items-center md:items-start">
              <span className="text-xl font-bold text-white tracking-tight">
                 Mukando Capital
              </span>
              <p className="text-green-100 text-sm mt-2">
                &copy; {new Date().getFullYear()} All rights reserved.
              </p>
            </div>
            <div className="flex gap-8 text-sm text-green-100">
              <Link href="/privacy-policy" className="hover:text-white transition">Privacy Policy</Link>
              <Link href="/terms-of-use" className="hover:text-white transition">Terms of Service</Link>
              <Link href="/contact" className="hover:text-white transition">Contact Support</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}