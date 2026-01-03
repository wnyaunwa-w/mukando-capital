"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter 
} from "@/components/ui/card";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, Globe, Building2, User, Upload } from "lucide-react";
import { getFirestore, doc, getDoc, updateDoc } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { updateProfile } from "firebase/auth";
import { getFirebaseApp } from "@/lib/firebase/client";

// --- CONFIGURATION: Supported Countries ---
const COUNTRIES = [
  { name: "Zimbabwe", code: "+263", currency: "USD", symbol: "$" },
  { name: "United Kingdom", code: "+44", currency: "GBP", symbol: "£" },
  { name: "South Africa", code: "+27", currency: "ZAR", symbol: "R" },
  { name: "United States", code: "+1", currency: "USD", symbol: "$" },
  { name: "Australia", code: "+61", currency: "AUD", symbol: "A$" },
  { name: "Canada", code: "+1", currency: "CAD", symbol: "C$" },
];

export default function ProfilePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- FORM STATE ---
  const [displayName, setDisplayName] = useState("");
  const [photoURL, setPhotoURL] = useState("");
  
  // Location & Contact
  const [country, setCountry] = useState("Zimbabwe");
  const [phoneCode, setPhoneCode] = useState("+263");
  const [phoneNumber, setPhoneNumber] = useState("");
  
  // Universal Banking Details
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [sortCode, setSortCode] = useState(""); 

  // Beneficiary (Next of Kin)
  const [beneficiaryName, setBeneficiaryName] = useState("");
  const [beneficiaryPhone, setBeneficiaryPhone] = useState("");

  // 1. Fetch User Data
  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const db = getFirestore(getFirebaseApp());
      const docRef = doc(db, "users", user.uid);
      const snap = await getDoc(docRef);

      if (snap.exists()) {
        const data = snap.data();
        setDisplayName(data.displayName || user.displayName || "");
        setPhotoURL(data.photoURL || user.photoURL || "");
        
        // Load Country & Smart Phone Logic
        const savedCountry = data.country || "Zimbabwe";
        setCountry(savedCountry);
        const countryConfig = COUNTRIES.find(c => c.name === savedCountry);
        setPhoneCode(countryConfig?.code || "+263");
        setPhoneNumber(data.phoneNumber?.replace(countryConfig?.code || "", "") || "");

        // Load Bank Details
        setBankName(data.bankName || "");
        setAccountNumber(data.accountNumber || "");
        setSortCode(data.sortCode || "");

        // Load Beneficiary
        setBeneficiaryName(data.beneficiaryName || "");
        setBeneficiaryPhone(data.beneficiaryPhone || "");
      }
      setFetching(false);
    };
    fetchData();
  }, [user]);

  // 2. Handle Country Change
  const handleCountryChange = (newCountry: string) => {
    setCountry(newCountry);
    const config = COUNTRIES.find(c => c.name === newCountry);
    if (config) {
        setPhoneCode(config.code);
    }
  };

  // 3. Handle File Upload (Avatar)
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    try {
      const storage = getStorage(getFirebaseApp());
      const storageRef = ref(storage, `avatars/${user.uid}/${file.name}`);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);

      // Update Auth & Firestore immediately
      await updateProfile(user, { photoURL: downloadURL });
      const db = getFirestore(getFirebaseApp());
      await updateDoc(doc(db, "users", user.uid), { photoURL: downloadURL });
      
      setPhotoURL(downloadURL);
      toast({ title: "Success", description: "Profile picture updated." });
    } catch (error) {
      console.error(error);
      toast({ variant: "destructive", title: "Error", description: "Failed to upload image." });
    } finally {
      setUploading(false);
    }
  };

  // 4. Save Changes
  const handleSave = async () => {
    if (!user) return;
    setLoading(true);
    const db = getFirestore(getFirebaseApp());

    try {
      const config = COUNTRIES.find(c => c.name === country);
      const currencySymbol = config?.symbol || "$";
      const currencyCode = config?.currency || "USD";
      const fullPhone = `${phoneCode}${phoneNumber.replace(/^0+/, '')}`; 

      await updateDoc(doc(db, "users", user.uid), {
        displayName,
        country,
        phoneNumber: fullPhone,
        bankName,
        accountNumber,
        sortCode,
        beneficiaryName,
        beneficiaryPhone,
        currencyPreference: currencyCode,
        currencySymbol: currencySymbol,
        updatedAt: new Date().toISOString()
      });

      // Also update Auth profile display name
      if (displayName !== user.displayName) {
          await updateProfile(user, { displayName });
      }

      toast({ title: "Profile Updated", description: "Your global details are saved." });
    } catch (error) {
      console.error(error);
      toast({ variant: "destructive", title: "Error", description: "Could not save profile." });
    } finally {
      setLoading(false);
    }
  };

  if (fetching) return <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-[#2C514C]" /></div>;

  return (
    <div className="max-w-5xl mx-auto pb-20">
      
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#122932]">Your Profile</h1>
        <p className="text-slate-500">Manage your global account settings.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-8 items-start">
        
        {/* --- LEFT SIDEBAR: AVATAR --- */}
        <Card className="w-full md:w-80 bg-[#2C514C] text-white border-none shadow-lg">
            <CardContent className="pt-10 pb-8 flex flex-col items-center text-center">
                <div className="relative group">
                    <Avatar className="h-32 w-32 border-4 border-white/20 shadow-xl">
                        <AvatarImage src={photoURL} className="object-cover" />
                        <AvatarFallback className="text-4xl font-bold text-[#2C514C] bg-white">
                            {displayName ? displayName.charAt(0).toUpperCase() : user?.email?.charAt(0).toUpperCase()}
                        </AvatarFallback>
                    </Avatar>
                    {/* Hidden File Input */}
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
                </div>
                
                <h2 className="mt-4 text-xl font-bold">{displayName || "Member"}</h2>
                <p className="text-sm text-green-100/80 break-all">{user?.email}</p>

                {/* RESTORED: Change Avatar Button */}
                <Button 
                    onClick={() => fileInputRef.current?.click()} 
                    disabled={uploading}
                    className="mt-6 w-full bg-white/10 hover:bg-white/20 text-white border border-white/20"
                >
                    {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                    Change Avatar
                </Button>
            </CardContent>
        </Card>

        {/* --- RIGHT SIDE: FORMS --- */}
        <div className="flex-1 space-y-6">
            {/* --- 1. PERSONAL DETAILS --- */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><User className="w-5 h-5 text-green-700"/> Personal Details</CardTitle>
                    <CardDescription>Your public identity on Mukando.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label>Display Name</Label>
                            <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="e.g. Rudo Dube" />
                        </div>
                        
                        <div className="space-y-2">
                            <Label>Country of Residence</Label>
                            <Select value={country} onValueChange={handleCountryChange}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {COUNTRIES.map((c) => (
                                        <SelectItem key={c.name} value={c.name}>{c.name} ({c.currency})</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2 md:col-span-2">
                            <Label>Phone Number</Label>
                            <div className="flex">
                                <div className="bg-slate-100 border border-r-0 rounded-l-md px-3 flex items-center text-slate-500 font-mono text-sm">{phoneCode}</div>
                                <Input value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} className="rounded-l-none" placeholder="771234567" type="tel" />
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* --- 2. GLOBAL PAYOUT DETAILS --- */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Building2 className="w-5 h-5 text-green-700"/> Payout Details</CardTitle>
                    <CardDescription>Where should Admins send your money when it's your turn?</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label>Bank / Service Name</Label>
                            <Input value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="e.g. Monzo, Chase, FNB, or WorldRemit" />
                        </div>
                        <div className="space-y-2">
                            <Label>Account Number / IBAN</Label>
                            <Input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} placeholder="Account Number" />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                            <Label>Sort Code / Routing / Swift (Optional)</Label>
                            <Input value={sortCode} onChange={(e) => setSortCode(e.target.value)} placeholder="For international transfers" />
                        </div>
                    </div>
                    <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded-md mt-2">
                        Note: These details are shared securely with your Group Admin only when a payout is due.
                    </div>
                </CardContent>
            </Card>

            {/* --- 3. BENEFICIARY --- */}
            <Card>
                <CardHeader>
                    <CardTitle>Beneficiary (Next of Kin)</CardTitle>
                    <CardDescription>Who should we contact in case of emergency?</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2"><Label>Beneficiary Name</Label><Input value={beneficiaryName} onChange={(e) => setBeneficiaryName(e.target.value)} /></div>
                    <div className="space-y-2"><Label>Beneficiary Phone</Label><Input value={beneficiaryPhone} onChange={(e) => setBeneficiaryPhone(e.target.value)} /></div>
                </CardContent>
                <CardFooter>
                    <Button onClick={handleSave} disabled={loading || uploading} className="w-full md:w-auto bg-[#2C514C] hover:bg-[#23413d]">
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Save Changes
                    </Button>
                </CardFooter>
            </Card>
        </div>
      </div>
    </div>
  );
}