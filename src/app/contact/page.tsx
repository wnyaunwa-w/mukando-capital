'use client';

import React from 'react';
import Link from 'next/link';
import { Mail, Phone, MapPin, Send } from 'lucide-react';

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-white font-sans text-gray-900 flex flex-col">
      {/* --- Navbar (Consistent with Home & About) --- */}
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
            <Link href="/contact" className="text-sm font-medium text-green-700 transition">Contact Us</Link>
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
        <section className="relative w-full py-20 px-6 bg-sky-100 text-center">
          <div className="max-w-3xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-extrabold text-green-900 mb-6">
              Get in Touch
            </h1>
            <p className="text-lg text-gray-600 leading-relaxed">
              Have questions about setting up your Mukando group? We are here to help you every step of the way.
            </p>
          </div>
        </section>

        {/* --- Contact Content --- */}
        <section className="py-20 bg-white">
          <div className="container mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-16">
            
            {/* Left Column: Contact Info */}
            <div className="space-y-10">
              <div className="prose">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">Let's Chat</h2>
                <p className="text-gray-600">
                  Whether you need technical support, want to partner with us, or just want to say hello, we'd love to hear from you.
                </p>
              </div>

              <div className="grid gap-6">
                {/* Email Card */}
                <div className="flex items-start gap-4 p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition">
                  <div className="p-3 rounded-full bg-green-100 text-green-700">
                    <Mail className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Email Us</h3>
                    <p className="text-sm text-gray-500 mb-1">Our friendly team is here to help.</p>
                    <a href="mailto:admin@mukandocapital.com" className="text-green-700 font-medium hover:underline">admin@mukandocapital.com</a>
                  </div>
                </div>

                {/* Phone Card */}
                <div className="flex items-start gap-4 p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition">
                  <div className="p-3 rounded-full bg-green-100 text-green-700">
                    <Phone className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Call Us</h3>
                    <p className="text-sm text-gray-500 mb-1">Mon-Fri from 8am to 5pm.</p>
                    <a href="tel:+263784567174" className="text-green-700 font-medium hover:underline">+263 78 456 7174</a>
                  </div>
                </div>

                {/* Office Card */}
                <div className="flex items-start gap-4 p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition">
                  <div className="p-3 rounded-full bg-green-100 text-green-700">
                    <MapPin className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Visit Us</h3>
                    <p className="text-sm text-gray-500 mb-1">Come say hello at our HQ.</p>
                    <p className="text-gray-700">Sub Division H, Binda Estate, Goromonzi, Zimbabwe</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Contact Form */}
            {/* UPDATED: Changed bg-gray-50 to bg-sky-100 and updated border color */}
            <div className="bg-sky-100 p-8 md:p-10 rounded-3xl shadow-sm border border-sky-200">
              <form className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label htmlFor="firstName" className="text-sm font-medium text-gray-700">First name</label>
                    <input type="text" id="firstName" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none transition bg-white" placeholder="Jane" />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="lastName" className="text-sm font-medium text-gray-700">Last name</label>
                    <input type="text" id="lastName" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none transition bg-white" placeholder="Doe" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium text-gray-700">Email</label>
                  <input type="email" id="email" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none transition bg-white" placeholder="jane@example.com" />
                </div>

                <div className="space-y-2">
                  <label htmlFor="message" className="text-sm font-medium text-gray-700">Message</label>
                  <textarea id="message" rows={4} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none transition resize-none bg-white" placeholder="How can we help you?"></textarea>
                </div>

                <button type="submit" className="w-full bg-green-700 hover:bg-green-800 text-white font-bold py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2">
                  Send Message <Send className="w-5 h-5" />
                </button>
              </form>
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