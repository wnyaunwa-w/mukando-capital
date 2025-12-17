
"use client";

import { useState, useEffect } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { getFirebaseApp } from "@/lib/firebase/client";
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// UI Imports (Standard Shadcn paths)
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
import { Loader2 } from "lucide-react";
import { useAuth } from "@/components/auth-provider";

export function ProfileCompletionModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  
  const { user: authUser, profile, loading: authLoading } = useAuth();

  useEffect(() => {
      if (authLoading) return; // Wait until auth state is resolved
      
      if (!authUser || !profile) {
        setIsOpen(false);
        return;
      }
      
      // Logic: If phone is missing, OPEN modal.
      if (!profile.phoneNumber) {
        setIsOpen(true);
        // Pre-fill name if we have it from auth provider
        if (profile.name && !name) {
          setName(profile.name);
        }
      } else {
        setIsOpen(false);
      }
  }, [profile, authUser, authLoading, name]);


  const handleSave = async () => {
    if (!phone || !name) {
      toast({ title: "Error", description: "Name and phone number are required.", variant: "destructive" });
      return;
    }
    
    setLoading(true);
    const app = getFirebaseApp();
    const auth = getAuth(app);
    const db = getFirestore(app);

    try {
      if (!auth.currentUser) return;
      
      await updateDoc(doc(db, "users", auth.currentUser.uid), {
        phoneNumber: phone,
        name: name,
      });
      
      toast({ title: "Profile Updated!" });
      // The listener in useEffect will close the modal on next state update
      setIsOpen(false);
    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: "Failed to save details." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
        // Prevent closing if data is invalid
        if (!open && (!name || !phone)) {
             toast({ title: "Profile Incomplete", description: "You must complete your profile to continue.", variant: "destructive" });
        } else {
            setIsOpen(open);
        }
    }}>
      <DialogContent className="sm:max-w-[425px]" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Complete Your Profile</DialogTitle>
          <DialogDescription>Please provide your details to continue.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name-modal">Display Name</Label>
            <Input id="name-modal" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your Name" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="phone-modal">Phone Number</Label>
            <Input id="phone-modal" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="077..." />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSave} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {loading ? "Saving..." : "Save & Continue"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
