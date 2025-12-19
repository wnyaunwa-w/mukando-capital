'use client';

// FORCE REBUILD: Restoring the correct Blue Landing Page layout
// This comment ensures Vercel sees a file change and triggers a new deployment.

import Image from "next/image";
import React from 'react';
import Link from 'next/link';
import { ShieldCheck, Users, TrendingUp, ArrowRight, Menu, Star, Facebook, Twitter, Instagram } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white font-sans text-gray-900 flex flex-col">
      {/* --- Navbar --- */}
      <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
             <span className="text-2xl font-bold text-green-800 tracking-tight">
               Mukando Capital
             </span>
          </div>
          
          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <Link href="#features" className="text-sm font-medium text-gray-600 hover:text-green-700 transition">Features</Link>
            <Link href="/about" className="text-sm font-medium text-gray-600 hover:text-green-700 transition">About Us</Link>
            <Link href="/contact" className="text-sm font-medium text-gray-600 hover:text-green-700 transition">Contact Us</Link>
          </nav>

          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-medium text-gray-600 hover:text-green-700 transition">
              Login
            </Link>
            <Link href="/signup" className="bg-green-700 hover:bg-green-800 text-white px-5 py-2 rounded-full text-sm font-semibold shadow-md transition-all hover:shadow-lg">
              Get Started
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* --- Hero Section --- */}
        <section className="relative w-full py-20 lg:py-32 px-6 flex flex-col items-center text-center overflow-hidden">
          
          {/* Background Image Container - OPTIMIZED */}
          <div className="absolute inset-0 z-0">
            <Image 
              src="/images/home.png" 
              alt="Background" 
              fill
              priority // Forces this to load instantly
              className="object-cover"
            />
            <div className="absolute inset-0 bg-sky-300/50 mix-blend-multiply"></div>
          </div>

          {/* Content */}
          <div className="relative z-10 max-w-4xl mx-auto">
            <h1 className="text-5xl md:text-7xl font-extrabold text-white mb-6 tracking-tight leading-tight">
              Transform Your <br className="hidden md:block" />
              Mukando Experience
            </h1>
            <p className="text-lg md:text-xl text-white mb-10 max-w-2xl mx-auto leading-relaxed font-medium drop-shadow-md">
              Join the digital revolution in community saving. Secure, transparent, and easy to manage group contributions.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/signup" className="inline-flex h-12 items-center justify-center rounded-full bg-green-700 px-8 text-lg font-medium text-white shadow transition-colors hover:bg-green-800 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50">
                Start Saving Now
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
              <Link href="/login" className="inline-flex h-12 items-center justify-center rounded-full border-2 border-green-800 bg-white/80 backdrop-blur-sm px-8 text-lg font-medium text-green-800 shadow-sm transition-colors hover:bg-white hover:text-green-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50">
                Member Login
              </Link>
            </div>
          </div>
        </section>

        {/* --- Features Grid --- */}
        <section id="features" className="py-24 bg-gray-50">
          <div className="container mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold tracking-tight text-green-900 sm:text-4xl">Everything you need to manage your Mukando group</h2>
              <p className="mt-4 text-lg text-gray-600">Say goodbye to spreadsheets and manual tracking.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="flex flex-col items-start p-8 rounded-2xl bg-white shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <div className="h-12 w-12 rounded-lg bg-green-100 flex items-center justify-center mb-6">
                  <ShieldCheck className="w-6 h-6 text-green-700" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Secure Ledger</h3>
                <p className="text-gray-600 leading-relaxed">
                  Every transaction is recorded digitally. Transparency builds trust within your savings circle.
                </p>
              </div>
              
              <div className="flex flex-col items-start p-8 rounded-2xl bg-white shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <div className="h-12 w-12 rounded-lg bg-emerald-100 flex items-center justify-center mb-6">
                  <Users className="w-6 h-6 text-emerald-700" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Member Management</h3>
                <p className="text-gray-600 leading-relaxed">
                  Easily add members, assign roles, and track individual payout schedules automatically.
                </p>
              </div>

              <div className="flex flex-col items-start p-8 rounded-2xl bg-white shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <div className="h-12 w-12 rounded-lg bg-teal-100 flex items-center justify-center mb-6">
                  <TrendingUp className="w-6 h-6 text-teal-700" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Financial Growth</h3>
                <p className="text-gray-600 leading-relaxed">
                  Visualize your group's progress and hit your savings goals faster with smart insights.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* --- Image Showcase --- */}
        <section className="py-20 bg-sky-100">
          <div className="container mx-auto px-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
               <div className="relative group">
                 <div className="absolute -inset-1 bg-gradient-to-r from-green-600 to-emerald-600 rounded-3xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
                 {/* OPTIMIZED: Ladies Image */}
                 <div className="relative h-[180px] md:h-[250px] rounded-2xl overflow-hidden shadow-2xl bg-gray-100">
                   <Image 
                     src="/images/ladies.png" 
                     alt="Community Members" 
                     fill
                     className="object-cover transform transition duration-500 hover:scale-105"
                   />
                 </div>
               </div>
               
               <div className="flex flex-col justify-center space-y-8">
                  {/* OPTIMIZED: Phone Interface Image */}
                  <div className="relative h-[180px] md:h-[250px] w-full max-w-2xl mx-auto rounded-[2.5rem] border-[8px] border-gray-900 bg-gray-800 shadow-2xl overflow-hidden">
                    <Image 
                      src="/images/Mukando1.png" 
                      alt="Mobile App Interface" 
                      fill
                      className="object-cover"
                    />
                  </div>
               </div>
            </div>
          </div>
        </section>

        {/* --- Happy Mukando Communities Reviews --- */}
        <section id="reviews" className="py-24 bg-white border-t border-gray-100">
          <div className="container mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold tracking-tight text-green-900 sm:text-4xl">Happy Mukando Communities</h2>
              <p className="mt-4 text-lg text-gray-600">See what our members across Zimbabwe are saying.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Review 1 */}
              <div className="p-8 rounded-2xl bg-green-50/50 border border-green-100">
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-gray-700 italic mb-6">"Mukando Capital has completely changed how our savings group works! The app is so easy to use, even for our older members. I love being able to check our group balance anytime. It’s brought so much peace of mind to our community here in Mutare."</p>
                <div>
                  <h4 className="font-bold text-gray-900">Tsitsi Muchena</h4>
                  <p className="text-sm text-green-700">Mutare</p>
                </div>
              </div>

              {/* Review 2 */}
              <div className="p-8 rounded-2xl bg-green-50/50 border border-green-100">
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-gray-700 italic mb-6">"We no longer have to worry about handling large amounts of cash or losing our record books. Plus, the ability to easily add new members and see who has paid is fantastic. It’s really helped us organise and grow our group in Gweru."</p>
                <div>
                  <h4 className="font-bold text-gray-900">Blessings Dube</h4>
                  <p className="text-sm text-green-700">Gweru</p>
                </div>
              </div>

              {/* Review 3 */}
              <div className="p-8 rounded-2xl bg-green-50/50 border border-green-100">
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-gray-700 italic mb-6">"Mukando Capital made it possible! We set up our group in minutes, and now we’re all saving towards buying groceries. The app keeps us accountable and motivated. It’s truly a game-changer for everyone."</p>
                <div>
                  <h4 className="font-bold text-gray-900">Rufaro Nyathi</h4>
                  <p className="text-sm text-green-700">Harare</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* --- Footer --- */}
      <footer className="bg-green-700 text-white py-16 border-t border-green-800">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            
            {/* Brand Column */}
            <div className="flex flex-col space-y-4">
              <span className="text-2xl font-bold tracking-tight text-white">
                 Mukando Capital
              </span>
              <p className="text-green-100 text-sm">
                &copy; {new Date().getFullYear()} All rights reserved.
              </p>
            </div>

            {/* Legal Column */}
            <div className="flex flex-col space-y-4">
              <h3 className="font-bold text-lg tracking-tight">Legal</h3>
              <div className="flex flex-col space-y-2 text-sm text-green-100">
                <Link href="/privacy-policy" className="hover:text-white transition w-fit">Privacy Policy</Link>
                <Link href="/terms-of-use" className="hover:text-white transition w-fit">Terms of Service</Link>
                <Link href="/contact" className="hover:text-white transition w-fit">Contact Support</Link>
              </div>
            </div>

            {/* Connect Column */}
            <div className="flex flex-col space-y-4">
              <h3 className="font-bold text-lg tracking-tight">Connect</h3>
              <div className="flex gap-4">
                <a href="https://facebook.com" className="bg-green-600/50 p-2 rounded-full hover:bg-green-600 transition">
                  <Facebook className="w-5 h-5 text-white" />
                </a>
                <a href="https://twitter.com" className="bg-green-600/50 p-2 rounded-full hover:bg-green-600 transition">
                  <Twitter className="w-5 h-5 text-white" />
                </a>
                <a href="https://instagram.com" className="bg-green-600/50 p-2 rounded-full hover:bg-green-600 transition">
                  <Instagram className="w-5 h-5 text-white" />
                </a>
              </div>
            </div>

          </div>
        </div>
      </footer>
    </div>
  );
}