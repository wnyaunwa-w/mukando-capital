'use client';

import { useState } from 'react';
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
import { Copy, Check, Share2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Group } from '@/lib/types';

export function InviteMembersDialog({
  isOpen,
  onOpenChange,
  group
}: {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  group: Group;
}) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  // Use window.location.origin to get the current domain (localhost or production)
  // Fallback to empty string for server-side rendering safety
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const inviteLink = `${origin}/invite/${group.inviteCode}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    toast({ title: 'Copied!', description: 'Invite link copied to clipboard.' });
    setTimeout(() => setCopied(false), 2000);
  };

  const shareToWhatsApp = () => {
    const text = `Join my savings group "${group.name}" on Mukando Capital! Click here: ${inviteLink}`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md font-sans">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold tracking-tight text-green-900">Invite Members</DialogTitle>
          <DialogDescription>
            Share this link to let others join <strong>{group.name}</strong> instantly.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-6 py-4">
            
          {/* Link Section */}
          <div className="grid gap-2">
            <Label className="font-semibold text-gray-700">Magic Invite Link</Label>
            <div className="flex items-center space-x-2">
              <div className="grid flex-1 gap-2">
                <Input
                  id="link"
                  defaultValue={inviteLink}
                  readOnly
                  className="bg-gray-50 text-gray-600 border-gray-200"
                />
              </div>
              <Button type="button" size="icon" onClick={copyToClipboard} className={copied ? "bg-green-600" : "bg-gray-900 text-white"}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* Social Share Section */}
          <div className="grid gap-2">
            <Button onClick={shareToWhatsApp} className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white font-bold flex items-center gap-2">
                <Share2 className="w-5 h-5" />
                Share via WhatsApp
            </Button>
          </div>
        </div>

        <DialogFooter className="sm:justify-start">
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}