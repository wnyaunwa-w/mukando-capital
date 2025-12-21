'use client';

import { useEffect, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  ChevronLeft 
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { getFirebaseApp } from '@/lib/firebase/client';
import { getFirestore, collection, doc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { cn } from "@/lib/utils";

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

export function CreateGroupDialog({
  isOpen,
  onOpenChange,
}: {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}) {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState<typeof CATEGORIES[0] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setSelectedCategory(null);
      setIsLoading(false);
    }
  }, [isOpen]);
  
  const handleCreateGroup = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);

    const formData = new FormData(event.currentTarget);
    const groupName = formData.get('groupName') as string;
    const whatsappLink = formData.get('whatsappLink') as string;

    if (!groupName || groupName.length < 3) {
      toast({ title: 'Validation Error', description: 'Group name must be at least 3 characters.', variant: 'destructive' });
      setIsLoading(false);
      return;
    }

    try {
      const app = getFirebaseApp();
      const auth = getAuth(app);
      const db = getFirestore(app);
      const user = auth.currentUser;

      if (!user) throw new Error('You must be logged in.');
      
      const inviteCode = generateInviteCode();
  
      if (!selectedCategory) throw new Error('Invalid group type.');

      const batch = writeBatch(db);
      const groupRef = doc(collection(db, 'groups'));
      
      const groupData: any = {
        name: groupName,
        description: selectedCategory.description,
        groupType: selectedCategory.id,
        categoryLabel: selectedCategory.label,
        currentBalanceCents: 0,
        createdAt: serverTimestamp(),
        ownerId: user.uid,
        inviteCode: inviteCode,
        memberIds: [user.uid],
        status: 'active'
      };
    
      if (whatsappLink) groupData.whatsappLink = whatsappLink;
      
      batch.set(groupRef, groupData);

      const memberDocRef = doc(db, 'groups', groupRef.id, 'members', user.uid);
      batch.set(memberDocRef, {
        name: user.displayName || user.email?.split('@')[0],
        avatarUrl: user.photoURL || `https://i.pravatar.cc/150?u=${user.uid}`,
        balanceCents: 0,
        contributionBalanceCents: 0,
        role: 'admin',
        joinedAt: serverTimestamp(),
        subscriptionStatus: 'unpaid',
      });
      
      await batch.commit();
      
      toast({ title: 'Success!', description: `Group created.` });
      onOpenChange(false);

    } catch (error: any) {
      console.error("Error creating group:", error);
      toast({ title: 'Error', description: 'Failed to create group.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }

  const handleCategorySelect = (cat: typeof CATEGORIES[0]) => {
    setSelectedCategory(cat);
    setStep(2);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      {/* FORCE HEIGHT: Added h-[80vh] to ensure it is visible */}
      <DialogContent className="sm:max-w-4xl w-[95vw] h-[80vh] flex flex-col font-sans p-0 overflow-hidden bg-white">
        
        {/* --- STEP 1: CATEGORY SELECTION --- */}
        {step === 1 && (
          <div className="flex flex-col h-full w-full">
            <DialogHeader className="px-6 pt-6 pb-4 shrink-0">
              <DialogTitle className="text-2xl font-bold tracking-tight text-[#122932] text-center">
                Create New Group
              </DialogTitle>
              <DialogDescription className="text-center text-slate-500">
                First, select the type of group you want to create.
              </DialogDescription>
            </DialogHeader>
            
            {/* FORCE VISIBILITY: Added min-h and background */}
            <div className="flex-grow overflow-y-auto p-6 bg-slate-50 border-t border-slate-100 min-h-[300px]">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-10">
                {CATEGORIES.map((cat) => (
                  <Card
                    key={cat.id}
                    className={cn(
                      "cursor-pointer transition-all hover:scale-[1.02] hover:shadow-md border",
                      cat.color
                    )}
                    onClick={() => handleCategorySelect(cat)}
                  >
                    <CardContent className="p-5 flex flex-col items-start gap-3">
                      <div className="p-2.5 bg-white/80 backdrop-blur rounded-xl shadow-sm">
                        <cat.icon className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg mb-1">{cat.label}</h3>
                        <p className="text-xs opacity-90 leading-relaxed font-medium">
                          {cat.description}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
            
            <DialogFooter className="p-4 border-t bg-white shrink-0">
               <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            </DialogFooter>
          </div>
        )}

        {/* --- STEP 2: GROUP DETAILS FORM --- */}
        {step === 2 && selectedCategory && (
          <div className="flex flex-col h-full sm:max-w-lg mx-auto w-full">
            <DialogHeader className="px-6 pt-6">
              <div className="flex items-center gap-2 mb-2">
                 <Button variant="ghost" size="icon" onClick={() => setStep(1)} className="h-8 w-8 -ml-2">
                    <ChevronLeft className="h-5 w-5" />
                 </Button>
                 <DialogTitle className="text-xl font-bold tracking-tight text-[#122932]">
                   Group Details
                 </DialogTitle>
              </div>
              <DialogDescription>
                Set up your <strong>{selectedCategory.label}</strong> group.
              </DialogDescription>
            </DialogHeader>

            <form ref={formRef} onSubmit={handleCreateGroup} className="flex-grow flex flex-col px-6 py-4">
              <input type="hidden" name="groupType" value={selectedCategory.id} />
              
              <div className="space-y-6">
                 {/* Selected Category Preview */}
                 <div className={cn("flex items-center gap-4 p-4 rounded-xl border", selectedCategory.color)}>
                    <div className="p-2 bg-white rounded-lg shadow-sm">
                        <selectedCategory.icon className="h-6 w-6" />
                    </div>
                    <div>
                        <p className="font-bold text-sm">{selectedCategory.label}</p>
                        <p className="text-xs opacity-80">{selectedCategory.description}</p>
                    </div>
                 </div>

                 <div className="grid gap-2">
                    <Label htmlFor="groupName" className="font-semibold text-slate-700">Group Name</Label>
                    <Input 
                      id="groupName" 
                      name="groupName" 
                      placeholder={`e.g., My ${selectedCategory.label} Circle`} 
                      autoFocus 
                      className="h-12 text-lg" 
                    />
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="whatsappLink" className="font-semibold text-slate-700">WhatsApp Invite Link (Optional)</Label>
                    <Input 
                      id="whatsappLink" 
                      name="whatsappLink" 
                      placeholder="https://chat.whatsapp.com/..." 
                      className="h-12"
                    />
                </div>
              </div>

              <DialogFooter className="mt-8 pb-6">
                <Button type="button" variant="outline" onClick={() => setStep(1)} className="font-medium">
                  Change Category
                </Button>
                <Button type="submit" disabled={isLoading} className="bg-[#2C514C] hover:bg-[#25423e] font-bold min-w-[120px]">
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create Group
                </Button>
              </DialogFooter>
            </form>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}