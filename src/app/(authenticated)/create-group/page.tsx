'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from '@/hooks/use-toast';
import { 
  Loader2, 
  ShoppingCart, 
  PiggyBank, 
  ArrowLeftRight, 
  Cake, 
  TrendingUp, 
  HeartHandshake, 
  Car, 
  Home, 
  MoreHorizontal,
  RefreshCw,
  ArrowLeft,
  Globe
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { getFirebaseApp } from '@/lib/firebase/client';
import { getFirestore, collection, doc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { cn } from "@/lib/utils";

// --- GLOBAL CURRENCY SUPPORT ---
const CURRENCIES = [
  { code: "USD", symbol: "$", label: "US Dollar ($)" },
  { code: "GBP", symbol: "£", label: "British Pound (£)" },
  { code: "ZAR", symbol: "R", label: "South African Rand (R)" },
  { code: "EUR", symbol: "€", label: "Euro (€)" },
  { code: "AUD", symbol: "A$", label: "Australian Dollar (A$)" },
  { code: "CAD", symbol: "C$", label: "Canadian Dollar (C$)" },
];

// --- CATEGORY DEFINITIONS ---
const CATEGORIES = [
  { 
    id: "grocery", 
    label: "Grocery", 
    description: "Pool funds together for bulk grocery purchases.", 
    icon: ShoppingCart,
    color: "bg-green-50 text-green-700 border-green-200"
  },
  { 
    id: "savings", 
    label: "Savings", 
    description: "A general-purpose group for collective savings goals.", 
    icon: PiggyBank,
    color: "bg-emerald-50 text-emerald-700 border-emerald-200"
  },
  { 
    id: "borrowing", 
    label: "Borrowing", 
    description: "A lending circle where members can borrow.", 
    icon: ArrowLeftRight,
    color: "bg-blue-50 text-blue-700 border-blue-200"
  },
  { 
    id: "birthday", 
    label: "Birthday Savings", 
    description: "Save small amounts monthly for birthdays.", 
    icon: Cake,
    color: "bg-pink-50 text-pink-700 border-pink-200"
  },
  { 
    id: "investment", 
    label: "Investments", 
    description: "Pool capital for joint investment opportunities.", 
    icon: TrendingUp,
    color: "bg-purple-50 text-purple-700 border-purple-200"
  },
  { 
    id: "burial", 
    label: "Burial Society", 
    description: "Financial support during times of bereavement.", 
    icon: HeartHandshake,
    color: "bg-slate-50 text-slate-700 border-slate-200"
  },
  { 
    id: "car", 
    label: "Car Purchase", 
    description: "Save specifically towards buying vehicles.", 
    icon: Car,
    color: "bg-orange-50 text-orange-700 border-orange-200"
  },
  { 
    id: "housing", 
    label: "Stand Purchase", 
    description: "Long-term savings for buying residential stands.", 
    icon: Home,
    color: "bg-cyan-50 text-cyan-700 border-cyan-200"
  },
  { 
    id: "other", 
    label: "Other Purposes", 
    description: "Create a custom group for any other goal.", 
    icon: MoreHorizontal,
    color: "bg-gray-50 text-gray-700 border-gray-200"
  }
];

function generateInviteCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export default function CreateGroupPage() {
  const router = useRouter();
  const { toast } = useToast();
  
  // State
  const [step, setStep] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState<typeof CATEGORIES[0] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  
  // New Global State
  const [currency, setCurrency] = useState("USD"); 
  const [paymentInstructions, setPaymentInstructions] = useState("");

  useEffect(() => {
    setInviteCode(generateInviteCode());
  }, []);

  const refreshCode = () => setInviteCode(generateInviteCode());

  const handleCreateGroup = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);

    const formData = new FormData(event.currentTarget);
    const groupName = formData.get('groupName') as string;
    const amountStr = formData.get('amount') as string;
    const description = formData.get('description') as string;

    if (!groupName || groupName.length < 3) {
      toast({ title: 'Error', description: 'Group name is too short.', variant: 'destructive' });
      setIsLoading(false);
      return;
    }

    try {
      const app = getFirebaseApp();
      const auth = getAuth(app);
      const db = getFirestore(app);
      const user = auth.currentUser;

      if (!user) throw new Error('You must be logged in.');
      if (!selectedCategory) throw new Error('No category selected.');

      // Get Currency Details
      const selectedCurrency = CURRENCIES.find(c => c.code === currency) || CURRENCIES[0];

      const batch = writeBatch(db);
      const groupRef = doc(collection(db, 'groups'));
      
      const groupData: any = {
        name: groupName,
        description: description || selectedCategory.description,
        groupType: selectedCategory.id,
        categoryLabel: selectedCategory.label,
        
        // Financials
        monthlyAmount: amountStr ? parseFloat(amountStr) : 0,
        contributionAmountCents: amountStr ? parseFloat(amountStr) * 100 : 0,
        currencyCode: selectedCurrency.code, // e.g. "GBP"
        currencySymbol: selectedCurrency.symbol, // e.g. "£"
        paymentInstructions: paymentInstructions || "Contact Admin for payment details.",

        currentBalanceCents: 0,
        createdAt: serverTimestamp(),
        ownerId: user.uid,
        inviteCode: inviteCode,
        memberIds: [user.uid],
        membersCount: 1, 
        status: 'active'
      };
      
      batch.set(groupRef, groupData);

      const memberDocRef = doc(db, 'groups', groupRef.id, 'members', user.uid);
      batch.set(memberDocRef, {
        userId: user.uid,
        name: user.displayName || user.email?.split('@')[0],
        avatarUrl: user.photoURL || `https://i.pravatar.cc/150?u=${user.uid}`,
        balanceCents: 0,
        contributionBalanceCents: 0,
        role: 'admin',
        joinedAt: serverTimestamp(),
        subscriptionStatus: 'active', // Creator is always active
      });
      
      await batch.commit();
      
      toast({ title: 'Success!', description: `Group '${groupName}' created!` });
      router.push(`/group/${groupRef.id}`);

    } catch (error: any) {
      console.error("Error creating group:", error);
      toast({ title: 'Error', description: 'Failed to create group.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCategorySelect = (cat: typeof CATEGORIES[0]) => {
    setSelectedCategory(cat);
    setStep(2);
  };

  // Helper to get current symbol
  const currentSymbol = CURRENCIES.find(c => c.code === currency)?.symbol || "$";

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans">
      
      {/* HEADER: Back Button */}
      <div className="max-w-4xl mx-auto mb-6">
        <Button 
            variant="ghost" 
            onClick={() => step === 2 ? setStep(1) : router.back()} 
            className="text-slate-500 hover:text-slate-800 pl-0"
        >
            <ArrowLeft className="mr-2 h-4 w-4" /> 
            {step === 2 ? "Back to Categories" : "Back to Dashboard"}
        </Button>
      </div>

      {/* --- STEP 1: CATEGORY SELECTION --- */}
      {step === 1 && (
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10 space-y-2">
             <h1 className="text-3xl font-bold text-[#122932]">Create New Group</h1>
             <p className="text-slate-500">First, select the type of group you want to create.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 pb-20">
            {CATEGORIES.map((cat) => (
              <Card
                key={cat.id}
                className={cn(
                  "cursor-pointer transition-all hover:scale-[1.02] hover:shadow-md border",
                  cat.color 
                )}
                onClick={() => handleCategorySelect(cat)}
              >
                <CardContent className="p-6 flex flex-col items-start gap-4">
                  <div className="p-3 rounded-xl bg-white shadow-sm"> 
                    <cat.icon className={cn("h-6 w-6", cat.color.split(' ')[1])} />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg mb-2">{cat.label}</h3>
                    <p className="text-sm opacity-90 leading-relaxed">
                      {cat.description}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* --- STEP 2: GREEN FORM --- */}
      {step === 2 && selectedCategory && (
        <div className="max-w-2xl mx-auto">
            <div className="bg-[#2C514C] text-white rounded-2xl shadow-xl overflow-hidden">
                
                {/* Header */}
                <div className="p-8 border-b border-white/10">
                    <h2 className="text-2xl font-bold mb-1">Create New Group</h2>
                    <p className="text-green-100/80">Start a new global savings circle.</p>
                    
                    <div className="mt-4 flex items-center justify-between">
                        <div className="inline-flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-lg border border-white/20">
                            <selectedCategory.icon className="h-4 w-4 text-green-300" />
                            <span className="text-sm font-medium text-green-50">{selectedCategory.label}</span>
                        </div>
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 text-green-200">
                             <Globe className="h-4 w-4" />
                             <span className="text-xs uppercase tracking-wider">Diaspora Ready</span>
                        </div>
                    </div>
                </div>

                {/* Form */}
                <div className="p-8 pt-6">
                    <form onSubmit={handleCreateGroup} className="space-y-6">
                        
                        {/* Row: Code + Currency */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="inviteCode" className="text-green-100 font-medium">Invite Code</Label>
                                <div className="flex gap-2">
                                    <div className="flex-1 bg-white rounded-md h-10 flex items-center justify-center font-mono font-bold text-slate-800 tracking-widest shadow-sm">
                                        {inviteCode}
                                    </div>
                                    <Button type="button" size="icon" variant="secondary" onClick={refreshCode} className="shrink-0 bg-white/20 hover:bg-white/30 text-white border-0">
                                        <RefreshCw className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-green-100 font-medium">Currency</Label>
                                <Select value={currency} onValueChange={setCurrency}>
                                    <SelectTrigger className="bg-white text-slate-900 border-0 h-10">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {CURRENCIES.map(c => (
                                            <SelectItem key={c.code} value={c.code}>{c.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Name + Amount */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                             <div className="space-y-2">
                                <Label htmlFor="groupName" className="text-green-100 font-medium">Group Name</Label>
                                <Input 
                                    id="groupName" 
                                    name="groupName" 
                                    placeholder="e.g. Zim-UK Nurses Savings" 
                                    className="bg-white text-slate-900 border-0 focus-visible:ring-2 focus-visible:ring-green-400"
                                    autoFocus
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="amount" className="text-green-100 font-medium">Contribution ({currentSymbol})</Label>
                                <div className="relative">
                                    <span className="absolute left-3 top-2 text-slate-500 font-bold z-10">
                                        {currentSymbol}
                                    </span>
                                    <Input 
                                        id="amount" 
                                        name="amount" 
                                        type="number" 
                                        placeholder="100" 
                                        className="bg-white text-slate-900 border-0 focus-visible:ring-2 focus-visible:ring-green-400 pl-8"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Instructions (The Genius Part) */}
                        <div className="space-y-2">
                            <Label htmlFor="payInstructions" className="text-green-100 font-medium flex items-center justify-between">
                                <span>Payment Instructions</span>
                                <span className="text-xs text-green-200 font-normal opacity-80">How should members pay?</span>
                            </Label>
                            <Textarea 
                                id="payInstructions" 
                                placeholder={`e.g. "Send to my Monzo: 00-11-22, Acc 12345678" or "WorldRemit to +263..."`}
                                value={paymentInstructions}
                                onChange={(e) => setPaymentInstructions(e.target.value)}
                                className="bg-white text-slate-900 border-0 focus-visible:ring-2 focus-visible:ring-green-400 min-h-[80px]"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description" className="text-green-100 font-medium">Description (Optional)</Label>
                            <Textarea 
                                id="description" 
                                name="description" 
                                placeholder="What is this group for?" 
                                className="bg-white text-slate-900 border-0 focus-visible:ring-2 focus-visible:ring-green-400 min-h-[80px]"
                            />
                        </div>

                        <Button 
                            type="submit" 
                            disabled={isLoading}
                            className="w-full bg-white text-[#2C514C] hover:bg-green-50 font-bold h-12 text-lg shadow-lg mt-4"
                        >
                            {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "+ Launch Global Group"}
                        </Button>

                    </form>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}