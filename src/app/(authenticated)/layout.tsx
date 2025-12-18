"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { 
  LayoutDashboard, 
  Users, 
  LogOut, 
  Menu, 
  X, 
  PlusCircle, 
  ShieldAlert,
  UserCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getAuth, signOut as firebaseSignOut } from "firebase/auth";
import { getFirebaseApp } from "@/lib/firebase/client";

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuth(); 
  const router = useRouter();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // --- SECURITY CHECK ---
  const isSuperAdmin = user?.email === "wnyaunwa@gmail.com";

  const navItems = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "My Groups", href: "/dashboard", icon: Users }, 
    { name: "Join Group", href: "/join-group", icon: PlusCircle },
    { name: "Profile", href: "/profile", icon: UserCircle },
  ];

  const handleSignOut = async () => {
    try {
        const auth = getAuth(getFirebaseApp());
        await firebaseSignOut(auth);
        router.push("/"); 
    } catch (error) {
        console.error("Error signing out:", error);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans overflow-x-hidden"> 
      
      {/* 2. DESKTOP SIDEBAR */}
      <aside className="hidden md:flex w-64 flex-col fixed inset-y-0 z-50 bg-[#122932] text-white shadow-xl transition-all">
        <div className="h-16 flex items-center px-6 border-b border-white/10">
           <span className="font-bold text-xl tracking-tight text-white">Mukando Capital</span>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link 
                key={item.name} 
                href={item.href}
                className={cn(
                  "flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors duration-200",
                  isActive 
                    ? "bg-[#2C514C] text-white shadow-sm" 
                    : "text-slate-300 hover:bg-white/10 hover:text-white"
                )}
              >
                <item.icon className="mr-3 h-5 w-5" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {isSuperAdmin && (
            <div className="px-4 pb-2">
            <Link 
                href="/admin"
                className={cn(
                    "flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors duration-200",
                    pathname === '/admin' 
                    ? "bg-red-900/50 text-red-100" 
                    : "text-slate-400 hover:bg-red-900/30 hover:text-red-100"
                )}
            >
                <ShieldAlert className="mr-3 h-5 w-5" />
                Super Admin
            </Link>
            </div>
        )}

        <div className="p-4 border-t border-white/10 bg-[#0d1f26]">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="h-8 w-8 rounded-full bg-[#2C514C] flex items-center justify-center text-xs font-bold text-white border border-white/20">
              {user?.displayName?.substring(0,2).toUpperCase() || "U"}
            </div>
            <div className="overflow-hidden">
                <p className="text-sm font-medium text-white truncate">{user?.displayName || "Member"}</p>
                <p className="text-xs text-slate-400 truncate">{user?.email}</p>
            </div>
          </div>
          <Button 
            variant="outline" 
            className="w-full justify-start text-red-300 border-red-900/50 hover:bg-red-950/50 hover:text-red-200 bg-transparent" 
            onClick={handleSignOut}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* 3. MOBILE HEADER */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-[#122932] z-50 flex items-center justify-between px-4 shadow-md">
         <div className="flex items-center">
            <span className="font-bold text-white text-lg">Mukando Capital</span>
         </div>
         <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-white p-2">
            {isMobileMenuOpen ? <X /> : <Menu />}
         </button>
      </div>

      {/* MOBILE MENU */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm pt-16" onClick={() => setIsMobileMenuOpen(false)}>
            <div className="bg-[#122932] p-4 space-y-2 border-t border-white/10" onClick={e => e.stopPropagation()}>
                {navItems.map((item) => (
                    <Link 
                        key={item.name} 
                        href={item.href} 
                        className="flex items-center px-4 py-3 text-white rounded-md hover:bg-white/10"
                        onClick={() => setIsMobileMenuOpen(false)}
                    >
                        <item.icon className="mr-3 h-5 w-5" />
                        {item.name}
                    </Link>
                ))}

                {isSuperAdmin && (
                    <Link 
                        href="/admin" 
                        className="flex items-center px-4 py-3 text-red-300 rounded-md hover:bg-white/10"
                        onClick={() => setIsMobileMenuOpen(false)}
                    >
                        <ShieldAlert className="mr-3 h-5 w-5" />
                        Super Admin
                    </Link>
                )}

                <Button 
                    className="w-full mt-4 bg-red-600 hover:bg-red-700 text-white" 
                    onClick={handleSignOut}
                >
                    Sign Out
                </Button>
            </div>
        </div>
      )}

      {/* 4. MAIN CONTENT AREA */}
      <main className={cn(
        "flex-1 transition-all duration-300 min-h-screen",
        "md:pl-64", 
        "pt-16 md:pt-0",
        "w-full max-w-[100vw] overflow-x-hidden"
      )}>
        <div className="p-4 md:p-8 max-w-7xl mx-auto w-full">
            {children}
        </div>
      </main>
    </div>
  );
}