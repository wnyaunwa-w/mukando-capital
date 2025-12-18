"use client";

import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LogOut, Mail, User, Shield } from "lucide-react";
import { getAuth, signOut } from "firebase/auth";
import { getFirebaseApp } from "@/lib/firebase/client";
import { useRouter } from "next/navigation";

export default function ProfilePage() {
  const { user } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    const auth = getAuth(getFirebaseApp());
    await signOut(auth);
    router.push("/");
  };

  // Get initials for the avatar (e.g. "Wellington Nyaunwa" -> "WN")
  const getInitials = (name: string) => {
    return name
      ?.match(/(\b\S)?/g)
      ?.join("")
      ?.match(/(^\S|\S$)?/g)
      ?.join("")
      .toUpperCase();
  };

  if (!user) return null;

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      
      {/* HEADER */}
      <div>
        <h1 className="text-3xl font-bold text-[#122932]">My Profile</h1>
        <p className="text-slate-500 mt-1">Manage your account settings and preferences.</p>
      </div>

      {/* PROFILE CARD */}
      <Card className="border-none shadow-md bg-white">
        <CardHeader className="pb-4 border-b border-slate-100">
            <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16 border-2 border-[#2C514C]">
                    <AvatarImage src={user.photoURL || ""} />
                    <AvatarFallback className="bg-[#2C514C] text-white font-bold text-xl">
                        {getInitials(user.displayName || "User")}
                    </AvatarFallback>
                </Avatar>
                <div>
                    <CardTitle className="text-xl">{user.displayName || "Mukando Member"}</CardTitle>
                    <CardDescription>{user.email}</CardDescription>
                </div>
            </div>
        </CardHeader>
        
        <CardContent className="pt-6 space-y-6">
            
            {/* User Details Section */}
            <div className="space-y-4">
                <h3 className="font-medium text-slate-900 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-[#2C514C]" /> Account Details
                </h3>
                
                <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Full Name</label>
                        <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-md border border-slate-100">
                            <User className="w-4 h-4 text-slate-400" />
                            <span className="text-sm font-medium">{user.displayName || "Not set"}</span>
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Email Address</label>
                        <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-md border border-slate-100">
                            <Mail className="w-4 h-4 text-slate-400" />
                            <span className="text-sm font-medium">{user.email}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Account Actions */}
            <div className="pt-4 border-t border-slate-100">
                <Button 
                    variant="destructive" 
                    onClick={handleSignOut}
                    className="w-full sm:w-auto bg-red-50 text-red-600 hover:bg-red-100 border border-red-100"
                >
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                </Button>
            </div>

        </CardContent>
      </Card>
    </div>
  );
}