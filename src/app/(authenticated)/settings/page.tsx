'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/components/auth-provider';
import { getFirebaseApp } from '@/lib/firebase/client';
import { getFirestore, doc, updateDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Save, User, Phone, CreditCard, ShieldCheck, Camera, Upload } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

export default function SettingsPage() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Image Upload State
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  // Form States
  const [formData, setFormData] = useState({
    name: '',
    phoneNumber: '',
    innbucksAccountId: '',
    beneficiaryName: '',
    beneficiaryPhone: ''
  });

  // Load initial data
  useEffect(() => {
    if (profile) {
      setFormData({
        name: profile.name || '',
        phoneNumber: profile.phoneNumber || '',
        innbucksAccountId: profile.innbucksAccountId || '',
        beneficiaryName: profile.beneficiaryName || '',
        beneficiaryPhone: profile.beneficiaryPhone || ''
      });
      // Set initial preview to existing avatar
      if (profile.avatarUrl) {
        setAvatarPreview(profile.avatarUrl);
      }
    }
  }, [profile]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.id]: e.target.value
    }));
  };

  // Handle File Selection
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Simple validation (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({ title: "File too large", description: "Please select an image under 5MB.", variant: "destructive" });
        return;
      }

      setAvatarFile(file);
      // Create a local preview URL
      const objectUrl = URL.createObjectURL(file);
      setAvatarPreview(objectUrl);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);

    try {
      const app = getFirebaseApp();
      const db = getFirestore(app);
      const storage = getStorage(app);
      const userRef = doc(db, 'users', user.uid);

      let finalAvatarUrl = profile?.avatarUrl;

      // 1. If a new image was selected, Upload it first
      if (avatarFile) {
        const storageRef = ref(storage, `avatars/${user.uid}/${Date.now()}_${avatarFile.name}`);
        const snapshot = await uploadBytes(storageRef, avatarFile);
        finalAvatarUrl = await getDownloadURL(snapshot.ref);
      }

      // 2. Update Firestore Profile
      await updateDoc(userRef, {
        name: formData.name,
        phoneNumber: formData.phoneNumber,
        innbucksAccountId: formData.innbucksAccountId,
        beneficiaryName: formData.beneficiaryName,
        beneficiaryPhone: formData.beneficiaryPhone,
        ...(finalAvatarUrl && { avatarUrl: finalAvatarUrl }) // Only update if we have a URL
      });

      toast({ 
        title: "Settings Saved", 
        description: "Your profile information has been updated." 
      });
      
      // Clear the file input after successful save
      setAvatarFile(null);
      
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({ 
        title: "Error", 
        description: "Failed to save changes. Please try again.", 
        variant: "destructive" 
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (!profile) {
    return <div className="flex justify-center p-10"><Loader2 className="h-8 w-8 animate-spin text-green-700" /></div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 font-sans pb-10">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Account Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your profile details and payment preferences.</p>
      </div>

      <div className="grid gap-6">
        {/* 1. PUBLIC PROFILE */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-green-700" />
                <CardTitle>Public Profile</CardTitle>
            </div>
            <CardDescription>How you appear to other group members.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            
            {/* IMAGE UPLOAD SECTION */}
            <div className="flex items-center gap-6">
              <div className="relative group">
                <Avatar className="h-24 w-24 border-4 border-white shadow-md">
                    <AvatarImage src={avatarPreview || profile.avatarUrl || ''} className="object-cover" />
                    <AvatarFallback className="text-2xl bg-green-100 text-green-700">
                        {profile.name?.charAt(0) || 'U'}
                    </AvatarFallback>
                </Avatar>
                {/* Overlay Button for Click */}
                <div 
                  className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                    <Camera className="h-8 w-8 text-white" />
                </div>
              </div>
              
              <div className="space-y-2">
                <h3 className="font-medium text-gray-900">Profile Picture</h3>
                <div className="flex gap-3">
                   <Button 
                     type="button" 
                     variant="outline" 
                     size="sm" 
                     onClick={() => fileInputRef.current?.click()}
                   >
                     <Upload className="mr-2 h-4 w-4" /> Upload New
                   </Button>
                   <input 
                     type="file" 
                     ref={fileInputRef} 
                     className="hidden" 
                     accept="image/*" 
                     onChange={handleImageSelect}
                   />
                </div>
                <p className="text-xs text-gray-500">
                   JPG, GIF or PNG. Max size of 5MB.
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                    <Label htmlFor="name">Display Name</Label>
                    <Input 
                        id="name" 
                        value={formData.name} 
                        onChange={handleChange} 
                        placeholder="Your Name" 
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input 
                        id="email" 
                        value={profile.email} 
                        disabled 
                        className="bg-gray-50 text-gray-500 cursor-not-allowed" 
                    />
                </div>
            </div>
          </CardContent>
        </Card>

        {/* 2. CONTACT INFO (CRITICAL FOR NUDGES) */}
        <Card className="border-green-100 bg-green-50/20">
          <CardHeader>
             <div className="flex items-center gap-2">
                <Phone className="h-5 w-5 text-green-700" />
                <CardTitle>Contact Information</CardTitle>
             </div>
            <CardDescription>
                Required for <strong>Payment Reminders</strong> and <strong>Nudges</strong>.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
                <Label htmlFor="phoneNumber">WhatsApp Number</Label>
                <Input 
                    id="phoneNumber" 
                    value={formData.phoneNumber} 
                    onChange={handleChange} 
                    placeholder="+263 77..." 
                    className="border-green-200 focus-visible:ring-green-500"
                />
                <p className="text-xs text-muted-foreground">
                    Enter number in international format (e.g., +263...).
                </p>
            </div>
          </CardContent>
        </Card>

        {/* 3. PAYMENT DETAILS (CRITICAL FOR PAYOUTS) */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-green-700" />
                <CardTitle>Payment Details</CardTitle>
            </div>
            <CardDescription>Where should the admin send your payouts?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
                <Label htmlFor="innbucksAccountId">InnBucks Account ID / Phone</Label>
                <Input 
                    id="innbucksAccountId" 
                    value={formData.innbucksAccountId} 
                    onChange={handleChange} 
                    placeholder="Enter your InnBucks ID" 
                />
            </div>
            
            <Separator />
            
            <div className="grid gap-4 md:grid-cols-2">
                 <div className="space-y-2">
                    <Label htmlFor="beneficiaryName">Next of Kin Name (Optional)</Label>
                    <Input 
                        id="beneficiaryName" 
                        value={formData.beneficiaryName} 
                        onChange={handleChange} 
                        placeholder="Beneficiary Name" 
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="beneficiaryPhone">Next of Kin Phone (Optional)</Label>
                    <Input 
                        id="beneficiaryPhone" 
                        value={formData.beneficiaryPhone} 
                        onChange={handleChange} 
                        placeholder="Beneficiary Phone" 
                    />
                </div>
            </div>
          </CardContent>
          <CardFooter className="bg-gray-50 flex flex-col md:flex-row items-start md:items-center gap-4 py-4">
             <ShieldCheck className="h-5 w-5 text-green-600 hidden md:block" />
             <p className="text-xs text-gray-500 flex-1">
                Your payment details are only visible to Group Admins for the purpose of processing payouts.
             </p>
             <Button onClick={handleSave} disabled={isSaving} className="w-full md:w-auto bg-green-700 hover:bg-green-800">
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save Changes
             </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}