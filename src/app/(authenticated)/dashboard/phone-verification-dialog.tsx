'use client';

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { doc, setDoc } from "firebase/firestore";
import { getFirebaseApp } from "@/lib/firebase/client";
import { getFirestore } from "firebase/firestore";
import { getAuth, updateProfile } from "firebase/auth";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/components/auth-provider";


export function PhoneVerificationDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  
  const { user: authUser, profile, loading: authLoading } = useAuth();


  useEffect(() => {
    if (authLoading) return;
    if (!authUser || !profile) {
      setIsOpen(false);
      return;
    }

    const isDefaultName = profile.name === authUser.email?.split('@')[0];

    // Open if phone number is missing OR if the name is the default one and they haven't set a displayName in their auth profile yet
    if (!profile.phoneNumber || (isDefaultName && !authUser.displayName) ) {
      setIsOpen(true);
      setPhone(profile.phoneNumber || "");
      setDisplayName(profile.name || authUser.displayName || "");
    } else {
      setIsOpen(false);
    }
  }, [profile, authUser, authLoading]);


  const handleSave = async () => {
    if (!displayName || displayName.length < 2) {
        toast({ title: "Validation Error", description: "Please enter a valid full name.", variant: "destructive" });
        return;
    }
    if (!phone) {
        toast({ title: "Validation Error", description: "Phone number cannot be empty.", variant: "destructive" });
        return;
    }
    // Basic regex for a Zim phone number - can be improved
    const phoneRegex = /^(?:\+263|0)7[1-9]\d{7}$/;
    if (!phoneRegex.test(phone)) {
        toast({ title: "Validation Error", description: "Please enter a valid Zimbabwean phone number.", variant: "destructive" });
        return;
    }

    setLoading(true);

    try {
      const app = getFirebaseApp();
      const auth = getAuth(app);
      const db = getFirestore(app);
      const user = auth.currentUser;
      if (!user) throw new Error("User not authenticated");
      
      // Update both Firestore and Auth Profile
      await setDoc(doc(db, "users", user.uid), {
        name: displayName,
        phoneNumber: phone
      }, { merge: true });

      if (user.displayName !== displayName) {
        await updateProfile(user, { displayName });
      }

      toast({ title: "Success", description: "Profile updated successfully!" });
      setIsOpen(false);

    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: "Failed to save profile.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
      if (profile?.phoneNumber && profile?.name) {
          setIsOpen(false);
      } else {
          toast({ title: "Profile Incomplete", description: "You must complete your profile to continue.", variant: "destructive" });
      }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {/* UPDATED: Added font-sans for consistent font family */}
      <DialogContent className="sm:max-w-[425px] font-sans" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          {/* UPDATED: Added font-bold, tracking-tight, text-green-900 */}
          <DialogTitle className="text-2xl font-bold tracking-tight text-green-900">Complete Your Profile</DialogTitle>
          <DialogDescription className="text-gray-600">
            Please enter your full name and phone number to continue. This is required for Innbucks integration.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            {/* UPDATED: Added font-semibold text-gray-700 */}
            <Label htmlFor="displayName" className="font-semibold text-gray-700">Full Name</Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g., Tariro Smith"
              disabled={loading}
              autoFocus
            />
          </div>
          <div className="grid gap-2">
            {/* UPDATED: Added font-semibold text-gray-700 */}
            <Label htmlFor="phone" className="font-semibold text-gray-700">Phone Number</Label>
            <Input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g., 0777123456"
              disabled={loading}
            />
          </div>
        </div>
        <DialogFooter>
          {/* UPDATED: Changed to green-700 background and added font-bold */}
          <Button onClick={handleSave} disabled={loading} className="bg-green-700 hover:bg-green-800 font-bold">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save and Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}