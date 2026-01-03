 "use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ArrowRightLeft, Building2, Phone, Copy, CheckCircle2, Wallet } from "lucide-react"; 
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
  const [memberProfile, setMemberProfile] = useState<any>(null); 
  const [amount, setAmount] = useState("");
  const [copied, setCopied] = useState(false);

  // 1. Fetch Group Members
  useEffect(() => {
    if (isOpen) {
        const fetchMembers = async () => {
            const db = getFirestore(getFirebaseApp());
            const snap = await getDocs(collection(db, "groups", groupId, "members"));
            const list = snap.docs.map(d => ({ id: d.data().userId, name: d.data().displayName }));
            setMembers(list);
        };
        fetchMembers();
        setMemberProfile(null);
        setSelectedMemberId("");
        setAmount("");
    }
  }, [isOpen, groupId]);

  // 2. Fetch User Profile
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

  // Copy Helper
  const copyToClipboard = () => {
    if (!memberProfile) return;
    const details = `
      Pay To: ${memberProfile.displayName}
      Bank: ${memberProfile.bankName || "N/A"}
      Acc: ${memberProfile.accountNumber || "N/A"}
      Sort Code: ${memberProfile.sortCode || "N/A"}
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

      await addDoc(collection(db, "groups", groupId, "transactions"), {
        userId: selectedMemberId, 
        userDisplayName: targetMember?.name || "Member",
        type: "payout",
        amountCents: parseFloat(amount) * 100,
        status: "pending_confirmation", 
        createdAt: serverTimestamp(),
        initiatedBy: user.uid
      });

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

            {/* --- SECURE DETAILS CARD --- */}
            {fetchingProfile ? (
                <div className="flex items-center justify-center py-4 text-slate-500 gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> Fetching secure details...
                </div>
            ) : memberProfile && (
                <div className="bg-slate-50 border border-slate-200 rounded-lg overflow-hidden animate-in fade-in slide-in-from-top-2">
                    
                    {/* Header with Copy Button */}
                    <div className="bg-slate-100 px-4 py-2 border-b border-slate-200 flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Banking Details</span>
                        <Button variant="ghost" size="sm" className="h-6 px-2 text-slate-500 hover:text-slate-800" onClick={copyToClipboard}>
                            {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-green-600 mr-1" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
                            {copied ? "Copied" : "Copy"}
                        </Button>
                    </div>

                    <div className="p-4 space-y-4">
                        {/* 1. BANK ACCOUNT SECTION */}
                        {(memberProfile.bankName || memberProfile.accountNumber) ? (
                             <div className="grid gap-3">
                                <div className="grid grid-cols-3 gap-2 items-center">
                                    <span className="text-xs font-medium text-slate-500">Bank Name</span>
                                    <div className="col-span-2 font-semibold text-slate-800 flex items-center gap-2">
                                        <Building2 className="w-3.5 h-3.5 text-slate-400" />
                                        {memberProfile.bankName}
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 gap-2 items-center">
                                    <span className="text-xs font-medium text-slate-500">Account No.</span>
                                    <div className="col-span-2 font-mono font-bold text-slate-900 bg-white px-2 py-1 rounded border border-slate-200 inline-block">
                                        {memberProfile.accountNumber}
                                    </div>
                                </div>
                                {memberProfile.sortCode && (
                                    <div className="grid grid-cols-3 gap-2 items-center">
                                        <span className="text-xs font-medium text-slate-500">Sort Code</span>
                                        <div className="col-span-2 font-mono text-slate-700">
                                            {memberProfile.sortCode}
                                        </div>
                                    </div>
                                )}
                             </div>
                        ) : (
                            <div className="text-sm text-slate-400 italic flex items-center gap-2">
                                <Wallet className="w-4 h-4" /> No bank account linked.
                            </div>
                        )}

                        {/* Divider */}
                        <div className="border-t border-slate-200"></div>

                        {/* 2. MOBILE / CONTACT SECTION */}
                        <div className="grid grid-cols-3 gap-2 items-start">
                            <span className="text-xs font-medium text-slate-500 mt-1">Mobile / Cash</span>
                            <div className="col-span-2">
                                <div className="font-bold text-slate-800 flex items-center gap-2">
                                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                                    {memberProfile.phoneNumber || "N/A"}
                                </div>
                                <p className="text-[10px] text-slate-400 mt-1 leading-tight">
                                    Use for EcoCash, Innbucks, or arranging cash meetup.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

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