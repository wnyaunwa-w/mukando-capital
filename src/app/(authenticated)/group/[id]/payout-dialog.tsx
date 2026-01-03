"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ArrowRightLeft, Building2, Phone, Copy, CheckCircle2 } from "lucide-react"; 
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  serverTimestamp,
  getDocs,
  getDoc,
  doc
} from "firebase/firestore";
import { getFirebaseApp } from "@/lib/firebase/client";
import { useAuth } from "@/components/auth-provider";
import { logActivity } from "@/lib/services/audit-service";

interface PayoutDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
  currencySymbol?: string; 
}

export function PayoutDialog({ isOpen, onOpenChange, groupId, currencySymbol = "$" }: PayoutDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [fetchingProfile, setFetchingProfile] = useState(false);
  
  const [members, setMembers] = useState<{id: string, name: string}[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [memberProfile, setMemberProfile] = useState<any>(null); // Stores the fetched bank details
  const [amount, setAmount] = useState("");
  const [copied, setCopied] = useState(false);

  // 1. Fetch Group Members (for the dropdown)
  useEffect(() => {
    if (isOpen) {
        const fetchMembers = async () => {
            const db = getFirestore(getFirebaseApp());
            const snap = await getDocs(collection(db, "groups", groupId, "members"));
            const list = snap.docs.map(d => ({ id: d.data().userId, name: d.data().displayName }));
            setMembers(list);
        };
        fetchMembers();
        // Reset state on open
        setMemberProfile(null);
        setSelectedMemberId("");
        setAmount("");
    }
  }, [isOpen, groupId]);

  // 2. Fetch Specific User Profile (When Admin selects a member)
  useEffect(() => {
    if (!selectedMemberId) {
        setMemberProfile(null);
        return;
    }

    const fetchPayeeDetails = async () => {
        setFetchingProfile(true);
        const db = getFirestore(getFirebaseApp());
        try {
            const userSnap = await getDoc(doc(db, "users", selectedMemberId));
            if (userSnap.exists()) {
                setMemberProfile(userSnap.data());
            }
        } catch (error) {
            console.error("Error fetching payee details:", error);
        } finally {
            setFetchingProfile(false);
        }
    };

    fetchPayeeDetails();
  }, [selectedMemberId]);

  // Helper to copy details to clipboard
  const copyToClipboard = () => {
    if (!memberProfile) return;
    const details = `
      Pay To: ${memberProfile.displayName}
      Bank: ${memberProfile.bankName || "N/A"}
      Acc: ${memberProfile.accountNumber || "N/A"}
      Phone: ${memberProfile.phoneNumber || "N/A"}
    `;
    navigator.clipboard.writeText(details);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Copied", description: "Payment details copied to clipboard." });
  };

  const handlePayout = async () => {
    if (!selectedMemberId || !amount || !user) return;
    setLoading(true);
    const db = getFirestore(getFirebaseApp());

    try {
      const targetMember = members.find(m => m.id === selectedMemberId);

      // 1. Create Payout Record
      await addDoc(collection(db, "groups", groupId, "transactions"), {
        userId: selectedMemberId, 
        userDisplayName: targetMember?.name || "Member",
        type: "payout",
        amountCents: parseFloat(amount) * 100,
        status: "pending_confirmation", 
        createdAt: serverTimestamp(),
        initiatedBy: user.uid
      });

      // 2. Log Activity
      await logActivity({
        groupId,
        action: "PAYOUT_INITIATED" as any, 
        description: `Initiated payout of ${formatCurrency(parseFloat(amount) * 100, currencySymbol)} to ${targetMember?.name}`,
        performedBy: { uid: user.uid, displayName: user.displayName || "Admin" }
      });

      toast({ title: "Payout Initiated", description: "Member notified to confirm receipt." });
      onOpenChange(false);

    } catch (error) {
      console.error(error);
      toast({ variant: "destructive", title: "Error", description: "Failed to create payout." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-[#2C514C]" /> Issue Payout
            </DialogTitle>
            <DialogDescription>
                Select a member to reveal their payment details.
            </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
            
            {/* Member Selection */}
            <div className="space-y-2">
                <Label>Select Beneficiary</Label>
                <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
                    <SelectTrigger><SelectValue placeholder="Who is receiving money?" /></SelectTrigger>
                    <SelectContent>
                        {members.map(m => (
                            <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* --- PAYOUT DETAILS CARD (The "Secret" Reveal) --- */}
            {fetchingProfile ? (
                <div className="flex items-center justify-center py-4 text-slate-500 gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> Fetching secure details...
                </div>
            ) : memberProfile && (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3 text-sm animate-in fade-in slide-in-from-top-2">
                    <div className="flex justify-between items-start">
                        <span className="font-bold text-slate-700">Payment Details</span>
                        <Button variant="ghost" size="sm" className="h-6 px-2 text-slate-500" onClick={copyToClipboard}>
                            {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-green-600 mr-1" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
                            {copied ? "Copied" : "Copy"}
                        </Button>
                    </div>

                    {/* Bank Section (For Diaspora) */}
                    {(memberProfile.bankName || memberProfile.accountNumber) && (
                        <div className="grid grid-cols-1 gap-1">
                            <div className="flex items-center gap-2 text-slate-600">
                                <Building2 className="w-3.5 h-3.5" /> 
                                <span className="font-semibold">{memberProfile.bankName}</span>
                            </div>
                            <div className="pl-6 text-slate-500 font-mono">
                                {memberProfile.accountNumber}
                                {memberProfile.sortCode && <span className="ml-2 text-xs text-slate-400">({memberProfile.sortCode})</span>}
                            </div>
                        </div>
                    )}

                    {/* Phone/Mobile Money Section (For Zimbabwe) */}
                    <div className="grid grid-cols-1 gap-1">
                        <div className="flex items-center gap-2 text-slate-600">
                            <Phone className="w-3.5 h-3.5" />
                            <span className="font-semibold">Mobile / Cash Contact</span>
                        </div>
                        <div className="pl-6 text-slate-800 font-bold tracking-wide">
                            {memberProfile.phoneNumber || "No phone number set"}
                        </div>
                        <p className="pl-6 text-xs text-slate-400">
                            Use this for EcoCash, Innbucks, or arranging cash meetup.
                        </p>
                    </div>
                </div>
            )}

            {/* Amount Input */}
            <div className="space-y-2">
                <Label>Payout Amount ({currencySymbol})</Label>
                <Input 
                    type="number" 
                    placeholder="500" 
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="font-bold text-lg"
                />
            </div>
        </div>

        <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handlePayout} disabled={!selectedMemberId || !amount || loading} className="bg-[#2C514C]">
                {loading ? <Loader2 className="animate-spin h-4 w-4" /> : "Record Payout"}
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}