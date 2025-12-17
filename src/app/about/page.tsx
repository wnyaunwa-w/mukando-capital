'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, CheckCircle2 } from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white font-sans text-gray-900 flex flex-col">
      {/* --- Navbar (Consistent with Home) --- */}
      <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
             <Link href="/" className="text-2xl font-bold text-green-800 tracking-tight cursor-pointer">
               Mukando Capital
             </Link>
          </div>
          
          <nav className="hidden md:flex items-center gap-8">
            <Link href="/#features" className="text-sm font-medium text-gray-600 hover:text-green-700 transition">Features</Link>
            <Link href="/about" className="text-sm font-medium text-green-700 transition">About Us</Link>
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
        <section className="relative w-full py-20 px-6 bg-green-50 text-center">
          <div className="max-w-3xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-extrabold text-green-900 mb-6">
              Empowering Communities,<br />One Mukando at a Time.
            </h1>
            <p className="text-lg text-gray-600 leading-relaxed">
              We are digitizing the age-old tradition of community savings. We believe that when people save together, they grow faster, build trust, and achieve financial freedom.
            </p>
          </div>
        </section>

        {/* --- Our Mission & Vision --- */}
        <section className="py-20 bg-white">
          <div className="container mx-auto px-6 grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
            
            {/* Text Content */}
            <div className="space-y-8">
              <div>
                <h2 className="text-3xl font-bold text-gray-900 mb-4">Our Mission</h2>
                <p className="text-gray-600 leading-relaxed">
                  To provide a secure, transparent, and easy-to-use digital platform that simplifies group savings for communities across Zimbabwe and beyond. We want to eliminate the risks of cash handling and manual record-keeping.
                </p>
              </div>
              <div>
                <h2 className="text-3xl font-bold text-gray-900 mb-4">Our Vision</h2>
                <p className="text-gray-600 leading-relaxed">
                  A future where every community group has access to modern financial tools that help them build wealth, invest in their dreams, and support one another without barriers.
                </p>
              </div>
              
              <div className="pt-4">
                <Link href="/signup" className="inline-flex items-center text-green-700 font-semibold hover:text-green-800 transition">
                  Join our journey <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
              </div>
            </div>

            {/* Image/Visual - UPDATED TO HOME.PNG */}
            <div className="relative h-[400px] rounded-3xl overflow-hidden shadow-xl bg-gray-100">
               <img 
                 src="/images/home.png" 
                 alt="Mukando Vision" 
                 className="w-full h-full object-cover"
               />
            </div>
          </div>
        </section>

        {/* --- Why Choose Us --- */}
        <section className="py-20 bg-gray-50">
          <div className="container mx-auto px-6">
             <div className="text-center mb-12">
               <h2 className="text-3xl font-bold text-gray-900">Why We Built Mukando Capital</h2>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
               <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
                 <CheckCircle2 className="w-10 h-10 text-green-600 mb-4" />
                 <h3 className="font-bold text-xl mb-2">Safety First</h3>
                 <p className="text-gray-600">We wanted to stop the theft and loss associated with keeping cash in boxes.</p>
               </div>
               <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
                 <CheckCircle2 className="w-10 h-10 text-green-600 mb-4" />
                 <h3 className="font-bold text-xl mb-2">Transparency</h3>
                 <p className="text-gray-600">We believe every member should know exactly how much is in the pot, anytime.</p>
               </div>
               <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
                 <CheckCircle2 className="w-10 h-10 text-green-600 mb-4" />
                 <h3 className="font-bold text-xl mb-2">Accessibility</h3>
                 <p className="text-gray-600">We designed our tool to be simple enough for anyone to use, on any phone.</p>
               </div>
             </div>
          </div>
        </section>
      </main>

      {/* --- Footer (Consistent with Home) --- */}
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