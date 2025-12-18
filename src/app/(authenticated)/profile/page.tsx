"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Upload, Save, User, CreditCard } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";

// Firebase Imports
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { updateProfile } from "firebase/auth";
import { getFirebaseApp } from "@/lib/firebase/client";

// Define the structure for our user's extra profile data
interface UserProfileData {
  displayName: string;
  phoneNumber: string;
  innbucksAccountId: string;
  ecocashNumber: string;
  beneficiaryName: string;
  beneficiaryPhone: string;
  photoURL?: string;
}

export default function ProfilePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState<UserProfileData>({
    displayName: "",
    phoneNumber: "",
    innbucksAccountId: "",
    ecocashNumber: "",
    beneficiaryName: "",
    beneficiaryPhone: "",
  });

  const db = getFirestore(getFirebaseApp());
  const storage = getStorage(getFirebaseApp());

  // 1. Fetch User Data on Mount
  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return;
      setIsFetching(true);
      try {
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          // If data exists in Firestore, use it
          setFormData(userDocSnap.data() as UserProfileData);
        } else {
          // Otherwise, pre-fill with basic Auth data
          setFormData((prev) => ({
            ...prev,
            displayName: user.displayName || "",
          }));
        }
        setAvatarPreview(user.photoURL || null);
      } catch (error) {
        console.error("Error fetching user data:", error);
        toast({ variant: "destructive", title: "Error", description: "Failed to load profile data." });
      } finally {
        setIsFetching(false);
      }
    };

    fetchUserData();
  }, [user, db, toast]);

  // Handle form input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  // Handle avatar file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file)); // Show local preview
    }
  };

  // Trigger hidden file input click
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  // Get initials for avatar fallback
  const getInitials = (name: string) => {
    return name
      ?.match(/(\b\S)?/g)
      ?.join("")
      ?.match(/(^\S|\S$)?/g)
      ?.join("")
      .toUpperCase() || "U";
  };

  // 2. Save Profile Changes
  const handleSave = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      let newPhotoURL = user.photoURL;

      // a) Upload new avatar if one was selected
      if (avatarFile) {
        const storageRef = ref(storage, `avatars/${user.uid}`);
        const snapshot = await uploadBytes(storageRef, avatarFile);
        newPhotoURL = await getDownloadURL(snapshot.ref);
      }

      // b) Update Firebase Auth Profile (standard data)
      await updateProfile(user, {
        displayName: formData.displayName,
        photoURL: newPhotoURL,
      });

      // c) Save all data to Firestore "users" collection
      const userDocRef = doc(db, "users", user.uid);
      await setDoc(userDocRef, {
        ...formData,
        photoURL: newPhotoURL,
        updatedAt: new Date(),
      }, { merge: true });

      toast({ title: "Success", description: "Profile updated successfully." });
      setAvatarFile(null); // Reset file input
      router.refresh(); // Refresh server components to reflect changes

    } catch (error: any) {
      console.error("Error saving profile:", error);
      toast({ variant: "destructive", title: "Error", description: error.message || "Failed to save profile." });
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetching) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-[#2C514C]" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-10">
      <div>
        <h1 className="text-3xl font-bold text-[#122932]">My Profile</h1>
        <p className="text-slate-500 mt-1">Manage your personal and financial details.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* --- LEFT COLUMN: Avatar & Personal Info --- */}
        <Card className="md:col-span-1 border-none shadow-md overflow-hidden">
          <CardHeader className="bg-[#2C514C] text-white text-center py-8">
            <div className="flex flex-col items-center gap-4">
              <Avatar className="h-32 w-32 border-4 border-white/20 shadow-sm">
                <AvatarImage src={avatarPreview || ""} className="object-cover" />
                <AvatarFallback className="bg-[#122932] text-white font-bold text-4xl">
                  {getInitials(formData.displayName)}
                </AvatarFallback>
              </Avatar>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept="image/*" 
                className="hidden" 
              />
              <Button 
                variant="secondary" 
                size="sm" 
                onClick={handleUploadClick}
                className="bg-white/10 hover:bg-white/20 text-white border-none"
              >
                <Upload className="w-4 h-4 mr-2" /> Change Avatar
              </Button>
            </div>
            <CardTitle className="mt-4 text-xl">{formData.displayName || "Mukando Member"}</CardTitle>
            <CardDescription className="text-slate-200">{user?.email}</CardDescription>
          </CardHeader>
        </Card>

        {/* --- RIGHT COLUMN: Form Fields --- */}
        <div className="md:col-span-2 space-y-8">
          
          {/* 1. Personal Details Card */}
          <Card className="border-none shadow-sm bg-[#f0fdf4]/50 border-l-4 border-l-[#2C514C]">
            <CardHeader>
              <CardTitle className="text-xl text-[#122932] flex items-center gap-2">
                <User className="h-5 w-5 text-[#2C514C]" /> Personal Details
              </CardTitle>
              <CardDescription>Update your public profile information.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="displayName" className="text-[#122932] font-medium">Display Name</Label>
                  <Input 
                    id="displayName" 
                    value={formData.displayName} 
                    onChange={handleChange} 
                    className="bg-white border-slate-200 focus-visible:ring-[#2C514C]"
                    placeholder="e.g., Tariro"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phoneNumber" className="text-[#122932] font-medium">Phone Number</Label>
                  <Input 
                    id="phoneNumber" 
                    value={formData.phoneNumber} 
                    onChange={handleChange} 
                    className="bg-white border-slate-200 focus-visible:ring-[#2C514C]"
                    placeholder="e.g., 0777123456"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 2. Financial & Beneficiary Details Card */}
          <Card className="border-none shadow-sm bg-[#f0fdf4]/50 border-l-4 border-l-[#2C514C]">
            <CardHeader>
              <CardTitle className="text-xl text-[#122932] flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-[#2C514C]" /> Financial & Beneficiary Details
              </CardTitle>
              <CardDescription>Manage your payout information and next of kin.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              
              <div className="space-y-2">
                <Label htmlFor="innbucksAccountId" className="text-[#122932] font-medium">InnBucks Account ID</Label>
                <Input 
                  id="innbucksAccountId" 
                  value={formData.innbucksAccountId} 
                  onChange={handleChange} 
                  className="bg-white border-slate-200 focus-visible:ring-[#2C514C]"
                  placeholder="e.g., 12345"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ecocashNumber" className="text-[#122932] font-medium">EcoCash Number</Label>
                <Input 
                  id="ecocashNumber" 
                  value={formData.ecocashNumber} 
                  onChange={handleChange} 
                  className="bg-white border-slate-200 focus-visible:ring-[#2C514C]"
                  placeholder="e.g., 0771234567"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="beneficiaryName" className="text-[#122932] font-medium">Beneficiary Name</Label>
                  <Input 
                    id="beneficiaryName" 
                    value={formData.beneficiaryName} 
                    onChange={handleChange} 
                    className="bg-white border-slate-200 focus-visible:ring-[#2C514C]"
                    placeholder="e.g., Jane Doe"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="beneficiaryPhone" className="text-[#122932] font-medium">Beneficiary Phone</Label>
                  <Input 
                    id="beneficiaryPhone" 
                    value={formData.beneficiaryPhone} 
                    onChange={handleChange} 
                    className="bg-white border-slate-200 focus-visible:ring-[#2C514C]"
                    placeholder="e.g., 0777654321"
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter className="bg-[#2C514C]/5 p-6">
              <Button 
                onClick={handleSave} 
                disabled={isLoading}
                className="bg-[#2C514C] hover:bg-[#25423e] text-white font-bold px-8 py-2 h-auto text-base"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-5 w-5" /> Save Changes
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>

        </div>
      </div>
    </div>
  );
}