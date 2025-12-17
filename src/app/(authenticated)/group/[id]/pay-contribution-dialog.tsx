'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Copy, MessageCircle, AlertCircle } from 'lucide-react';
import type { Group, Member, User } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

export function PayContributionDialog({
  isOpen,
  onOpenChange,
  group,
  admin,
  currentUser,
}: {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  group: Group;
  admin: Member | null;
  currentUser: User | null;
}) {
  const { toast } = useToast();
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied!', description: `${text} copied to clipboard.` });
  }

  const adminPhoneNumber = admin?.phoneNumber;
  const adminName = admin?.name || 'Admin';

  const handleWhatsAppNotify = () => {
    if (!adminPhoneNumber) return;

    // Pre-filled message for the Admin
    const text = `Hi ${adminName}, I am sending a contribution to ${group.name}. Please look out for it on InnBucks.`;
    
    // Create WhatsApp Link
    const cleanNumber = adminPhoneNumber.replace(/\D/g, ''); 
    const url = `https://wa.me/${cleanNumber}?text=${encodeURIComponent(text)}`;
    
    window.open(url, '_blank');
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Pay Contribution</DialogTitle>
          <DialogDescription>
            To pay your contribution, send the funds to the group administrator via Innbucks and then claim the payment.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="rounded-lg border bg-secondary/50 p-4">
              <h4 className="font-semibold text-secondary-foreground">Admin Details</h4>
              <p className="text-sm text-secondary-foreground/80">
                  Send your contribution to <span className="font-bold">{adminName}</span>.
              </p>
          </div>
          
          {/* PHONE NUMBER DISPLAY */}
          {adminPhoneNumber ? (
             <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <p className="text-sm text-muted-foreground">Innbucks Number</p>
                  <p className="font-mono text-lg font-bold">{adminPhoneNumber}</p>
                </div>
                <Button size="icon" variant="ghost" onClick={() => copyToClipboard(adminPhoneNumber)}>
                    <Copy className="h-4 w-4" />
                </Button>
            </div>
          ) : (
             <div className="text-sm text-center text-muted-foreground p-4 bg-gray-50 rounded-lg">
                The group admin has not set their phone number yet.
             </div>
          )}

           {/* WHATSAPP BUTTON (ALWAYS VISIBLE) */}
           <div className="flex justify-end">
              <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  className={adminPhoneNumber ? "text-green-600 border-green-200 hover:bg-green-50 gap-2 w-full sm:w-auto" : "gap-2 w-full sm:w-auto"}
                  onClick={handleWhatsAppNotify}
                  disabled={!adminPhoneNumber}
              >
                  {adminPhoneNumber ? (
                      <><MessageCircle className="h-4 w-4" /> Notify Admin on WhatsApp</>
                  ) : (
                      <><AlertCircle className="h-4 w-4" /> Admin Phone Not Set</>
                  )}
              </Button>
           </div>

           <div className="rounded-lg border bg-secondary/50 p-4">
              <h4 className="font-semibold text-secondary-foreground">Next Step</h4>
              <p className="text-sm text-secondary-foreground/80">
                  After sending the money, use the <strong>&quot;Claim Manual Payment&quot;</strong> button and enter the transaction reference to have your contribution recorded.
              </p>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}