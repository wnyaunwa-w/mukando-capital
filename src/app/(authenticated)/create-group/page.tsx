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
      <Button variant="ghost" className="mb-4 pl-0 hover:bg-transparent hover:text-green-700" onClick={() => router.back()}>
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Create New Group</CardTitle>
          <CardDescription>Start a new saving circle. You will be the Admin.</CardDescription>
        </CardHeader>
        <form onSubmit={handleCreate}>
          <CardContent className="space-y-6">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Auto-Generated ID Field */}
              <div className="space-y-2">
                <Label htmlFor="id">Group ID (Invite Code)</Label>
                <div className="flex gap-2">
                  <Input 
                    id="id" 
                    value={generatedId} 
                    readOnly
                    className="bg-slate-50 font-mono text-center tracking-widest font-bold text-green-800"
                  />
                  <Button type="button" variant="outline" size="icon" onClick={refreshCode} title="Generate new code">
                    <RefreshCw className="h-4 w-4 text-slate-500" />
                  </Button>
                </div>
                <p className="text-xs text-slate-500">This code is auto-generated for you.</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="monthlyContribution">Monthly Amount ($)</Label>
                <Input 
                  id="monthlyContribution" 
                  type="number" 
                  placeholder="100" 
                  value={formData.monthlyContribution} 
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Group Name</Label>
              <Input 
                id="name" 
                placeholder="e.g. Johnson Family Savings" 
                value={formData.name} 
                onChange={handleChange}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea 
                id="description" 
                placeholder="What is this group for?" 
                value={formData.description} 
                onChange={handleChange}
                rows={3}
              />
            </div>

          </CardContent>
          <CardFooter className="bg-slate-50 p-6 border-t">
            <Button type="submit" className="w-full bg-green-700 hover:bg-green-800 h-12 text-lg" disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Plus className="mr-2 h-5 w-5" />}
              Create Group
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}