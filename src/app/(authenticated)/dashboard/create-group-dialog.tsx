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
import { Loader2 } from 'lucide-react';
import { GROUP_TYPES, type GroupType } from '@/lib/group-types';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getFirebaseApp } from '@/lib/firebase/client';
import { getFirestore, collection, doc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Helper to generate a random 6-character alphanumeric code
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
  const [selectedType, setSelectedType] = useState<GroupType | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  // Reset state when dialog is closed/opened
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setSelectedType(null);
      setIsLoading(false);
    }
  }, [isOpen]);
  
  const handleCreateGroup = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);

    const formData = new FormData(event.currentTarget);
    const groupName = formData.get('groupName') as string;
    const groupType = formData.get('groupType') as string;
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

      if (!user) {
        throw new Error('You must be logged in to create a group.');
      }
      
      const inviteCode = generateInviteCode();
      const selectedGroupType = GROUP_TYPES.find(t => t.id === groupType);
  
      if (!selectedGroupType) {
          throw new Error('Invalid group type selected.');
      }

      // Use a write batch to perform atomic operations
      const batch = writeBatch(db);

      // 1. Create the group document reference with a new ID
      const groupRef = doc(collection(db, 'groups'));
      
      const groupData: any = {
        name: groupName,
        description: selectedGroupType.description,
        groupType: groupType,
        currentBalanceCents: 0,
        createdAt: serverTimestamp(),
        ownerId: user.uid,
        inviteCode: inviteCode,
        memberIds: [user.uid], // CRITICAL: Add creator to the memberIds array
        status: 'active'
      };
    
      if (whatsappLink) {
        groupData.whatsappLink = whatsappLink;
      }
      
      batch.set(groupRef, groupData);

      // 2. Add the creator as the first member (and admin) in the subcollection
      const memberDocRef = doc(db, 'groups', groupRef.id, 'members', user.uid);
      batch.set(memberDocRef, {
        name: user.displayName || user.email?.split('@')[0],
        avatarUrl: user.photoURL || `https://i.pravatar.cc/150?u=${user.uid}`,
        balanceCents: 0,
        role: 'admin',
        joinedAt: serverTimestamp(),
        subscriptionStatus: 'unpaid',
      });
      
      // Commit the batch
      await batch.commit();
      
      toast({ 
        title: 'Success!', 
        description: `Group '${groupName}' created. Invite code: ${inviteCode}` 
      });
      onOpenChange(false);

    } catch (error: any) {
      console.error("Error creating group:", error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create group.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }


  const handleTypeSelect = (type: GroupType) => {
    setSelectedType(type);
    setStep(2);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      {/* UPDATED: Added font-sans to the content wrapper */}
      <DialogContent className="sm:max-w-lg w-[95vw] flex flex-col max-h-[80vh] font-sans">
        {step === 1 && (
          <>
            <DialogHeader>
              {/* UPDATED: Added font-bold, tracking-tight, text-green-900 */}
              <DialogTitle className="text-2xl font-bold tracking-tight text-green-900">Create New Group</DialogTitle>
              <DialogDescription className="text-gray-600">
                First, select the type of group you want to create.
              </DialogDescription>
            </DialogHeader>
            <div className="flex-grow overflow-y-auto -mx-6 px-6">
              <div className="grid grid-cols-2 gap-4 py-4 pb-10">
                {GROUP_TYPES.map((type) => (
                  <Card
                    key={type.id}
                    className="cursor-pointer hover:bg-green-50 hover:border-green-200 transition-all border-gray-100"
                    onClick={() => handleTypeSelect(type)}
                  >
                    <CardHeader>
                      <type.icon className="h-6 w-6 mb-2 text-green-700" />
                      {/* UPDATED: Added font-bold tracking-tight */}
                      <CardTitle className="text-base font-bold tracking-tight text-gray-900">{type.label}</CardTitle>
                      <CardDescription className="text-xs text-gray-500">{type.description}</CardDescription>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            </div>
          </>
        )}
        {step === 2 && selectedType && (
          <div className="flex flex-col h-full">
            <DialogHeader>
              {/* UPDATED: Added font-bold tracking-tight */}
              <DialogTitle className="text-xl font-bold tracking-tight text-green-900">
                Details for &quot;{selectedType.label}&quot; Group
              </DialogTitle>
              <DialogDescription className="text-gray-600">
                Give your new group a name and optionally add a WhatsApp chat link.
              </DialogDescription>
            </DialogHeader>
            <form ref={formRef} onSubmit={handleCreateGroup} className="flex-grow flex flex-col space-y-4">
              <input type="hidden" name="groupType" value={selectedType.id} />
              <div className="grid gap-4 py-4">
                 <div className="grid gap-2">
                    <Label htmlFor="groupName" className="font-semibold text-gray-700">Group Name</Label>
                    <div className="flex items-center gap-4">
                        <div className="bg-green-50 p-3 rounded-lg">
                            <selectedType.icon className="h-6 w-6 text-green-700" />
                        </div>
                        <Input id="groupName" name="groupName" placeholder={`e.g., ${selectedType.label} Fund`} autoFocus className="flex-1" />
                    </div>
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="whatsappLink" className="font-semibold text-gray-700">WhatsApp Invite Link (Optional)</Label>
                    <Input id="whatsappLink" name="whatsappLink" placeholder="https://chat.whatsapp.com/..." />
                </div>
              </div>

              <DialogFooter className="mt-auto pt-4 border-t">
                <Button type="button" variant="ghost" onClick={() => setStep(1)} className="font-medium">
                  Back
                </Button>
                {/* UPDATED: Button style to match theme */}
                <Button type="submit" disabled={isLoading} className="bg-green-700 hover:bg-green-800 font-bold">
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