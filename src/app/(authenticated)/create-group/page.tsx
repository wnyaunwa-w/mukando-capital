"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowLeft, Plus, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Firebase Imports
import { getFirestore, doc, setDoc, serverTimestamp, getDoc } from "firebase/firestore";
import { getFirebaseApp } from "@/lib/firebase/client";

// Helper to generate random 6-char code
const generateGroupCode = () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

export default function CreateGroupPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [generatedId, setGeneratedId] = useState("");
  
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    monthlyContribution: "100", // Default $100
  });

  // Generate a code on mount
  useEffect(() => {
    setGeneratedId(generateGroupCode());
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.id]: e.target.value }));
  };

  const refreshCode = () => {
    setGeneratedId(generateGroupCode());
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    if (!formData.name) {
      toast({ variant: "destructive", title: "Missing fields", description: "Please enter a group name." });
      return;
    }

    setLoading(true);
    const db = getFirestore(getFirebaseApp());

    try {
      // 1. Check collision (rare, but good practice)
      const groupRef = doc(db, "groups", generatedId);
      const docSnap = await getDoc(groupRef);
      
      if (docSnap.exists()) {
        // Just try one more time if collision happens
        const newId = generateGroupCode();
        setGeneratedId(newId);
        toast({ title: "ID Collision", description: "Generated a new ID. Please try again." });
        setLoading(false);
        return;
      }

      const contributionAmount = parseFloat(formData.monthlyContribution) * 100; // Convert to cents

      // 2. Create Group
      await setDoc(groupRef, {
        name: formData.name,
        description: formData.description,
        createdBy: user.uid,
        createdAt: serverTimestamp(),
        currentBalanceCents: 0,
        monthlyContributionCents: contributionAmount,
        currency: "USD",
        status: "active",
        membersCount: 1, 
        payoutSchedule: [],
        nextPayoutDate: null
      });

      // 3. Add Creator as Admin
      const memberRef = doc(db, "groups", generatedId, "members", user.uid);
      await setDoc(memberRef, {
        userId: user.uid,
        email: user.email,
        displayName: user.displayName || "Admin",
        photoURL: user.photoURL || null,
        role: "admin",
        joinedAt: serverTimestamp(),
        contributionBalanceCents: 0,
        status: "active"
      });

      toast({ title: "Success!", description: `Group ${generatedId} created successfully.` });
      
      // 4. Redirect
      router.push(`/group/${generatedId}`);

    } catch (error: any) {
      console.error(error);
      toast({ variant: "destructive", title: "Error", description: "Failed to create group." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-10 px-4">
      <Button 
        variant="ghost" 
        className="mb-4 pl-0 hover:bg-transparent hover:text-[#2C514C] text-slate-500" 
        onClick={() => router.back()}
      >
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
      </Button>

      {/* --- COLORED CARD (Mukando Green) --- */}
      <Card className="bg-[#2C514C] border-none text-white shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Create New Group</CardTitle>
          <CardDescription className="text-slate-200">
            Start a new saving circle. You will be the Admin.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleCreate}>
          <CardContent className="space-y-6">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Auto-Generated ID Field */}
              <div className="space-y-2">
                <Label htmlFor="id" className="text-slate-100">Group ID (Invite Code)</Label>
                <div className="flex gap-2">
                  <Input 
                    id="id" 
                    value={generatedId} 
                    readOnly
                    // White input, Green text for emphasis
                    className="bg-white font-mono text-center tracking-widest font-bold text-[#2C514C] border-white/20"
                  />
                  {/* Refresh button styled for dark background */}
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="icon" 
                    onClick={refreshCode} 
                    title="Generate new code"
                    className="bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-slate-300">This code is auto-generated for you.</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="monthlyContribution" className="text-slate-100">Monthly Amount ($)</Label>
                <Input 
                  id="monthlyContribution" 
                  type="number" 
                  placeholder="100" 
                  value={formData.monthlyContribution} 
                  onChange={handleChange}
                  className="bg-white text-slate-900 border-white/20"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name" className="text-slate-100">Group Name</Label>
              <Input 
                id="name" 
                placeholder="e.g. Johnson Family Savings" 
                value={formData.name} 
                onChange={handleChange}
                className="bg-white text-slate-900 border-white/20"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-slate-100">Description (Optional)</Label>
              <Textarea 
                id="description" 
                placeholder="What is this group for?" 
                value={formData.description} 
                onChange={handleChange}
                className="bg-white text-slate-900 border-white/20"
                rows={3}
              />
            </div>

          </CardContent>
          <CardFooter className="p-6 border-t border-white/10">
            {/* White Button with Green Text */}
            <Button 
              type="submit" 
              className="w-full bg-white text-[#2C514C] hover:bg-slate-100 font-bold h-12 text-lg shadow-sm" 
              disabled={loading}
            >
              {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Plus className="mr-2 h-5 w-5" />}
              Create Group
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}