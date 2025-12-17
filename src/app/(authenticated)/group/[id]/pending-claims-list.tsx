'use client';

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, Check, AlertCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";
import { 
  getFirestore, 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  runTransaction,
  serverTimestamp 
} from "firebase/firestore";
import { getFirebaseApp } from "@/lib/firebase/client";

// --- NEW IMPORTS ---
import { useAuth } from "@/components/auth-provider";
import { logActivity } from "@/lib/services/audit-service";

interface Claim {
  id: string;
  userId: string;
  userDisplayName: string;
  type: 'manual_entry' | 'withdrawal';
  amountCents: number;
  description: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: any;
}

export function PendingClaimsList({ groupId }: { groupId: string }) {
  const { toast } = useToast();
  // --- NEW: Get the current user so we know who is clicking the button ---
  const { user } = useAuth();
  
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const db = getFirestore(getFirebaseApp());

  // 1. Listen for Pending Claims
  useEffect(() => {
    if (!groupId) return;
    
    const claimsRef = collection(db, "groups", groupId, "transactions");
    const q = query(
      claimsRef, 
      where("status", "==", "pending")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const pendingClaims = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Claim[];
      setClaims(pendingClaims);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [groupId, db]);

  // 2. Handle Approval (Updated with Logging)
  const handleApprove = async (claim: Claim) => {
    setProcessingId(claim.id);
    try {
      await runTransaction(db, async (transaction) => {
        // --- STEP 1: READS ---
        const groupRef = doc(db, "groups", groupId);
        const claimRef = doc(db, "groups", groupId, "transactions", claim.id);
        const memberRef = doc(db, "groups", groupId, "members", claim.userId);

        const groupDoc = await transaction.get(groupRef);
        const claimDoc = await transaction.get(claimRef);
        const memberDoc = await transaction.get(memberRef);

        if (!claimDoc.exists()) throw "Claim does not exist.";
        if (claimDoc.data().status !== 'pending') throw "Claim is already processed.";
        
        // --- STEP 2: CALCULATIONS ---
        const currentGroupBalance = groupDoc.exists() ? (groupDoc.data().currentBalanceCents || 0) : 0;
        const currentMemberContribution = memberDoc.exists() ? (memberDoc.data().contributionBalanceCents || 0) : 0;

        const newGroupBalance = currentGroupBalance + claim.amountCents;
        const newMemberContribution = currentMemberContribution + claim.amountCents;

        // --- STEP 3: WRITES ---
        transaction.update(claimRef, { 
            status: 'approved',
            reviewedAt: serverTimestamp() 
        });

        transaction.update(groupRef, { 
            currentBalanceCents: newGroupBalance,
            updatedAt: serverTimestamp()
        });

        if (memberDoc.exists()) {
            transaction.update(memberRef, { 
                contributionBalanceCents: newMemberContribution,
                lastActivity: serverTimestamp()
            });
        }
      });

      // --- NEW: AUDIT LOG ---
      if (user) {
        await logActivity({
            groupId: groupId,
            action: "PAYMENT_APPROVED",
            description: `Approved payment of ${formatCurrency(claim.amountCents)} from ${claim.userDisplayName}`,
            performedBy: { uid: user.uid, displayName: user.displayName || 'Admin' },
            metadata: { claimId: claim.id, amount: claim.amountCents }
        });
      }

      toast({ title: "Approved", description: "Transaction recorded successfully." });
    } catch (error) {
      console.error("Approval failed:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to approve claim." });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (claim: Claim) => {
    setProcessingId(claim.id);
    try {
      await runTransaction(db, async (transaction) => {
        const claimRef = doc(db, "groups", groupId, "transactions", claim.id);
        const claimDoc = await transaction.get(claimRef);
        if (!claimDoc.exists()) throw "Claim not found";
        
        transaction.update(claimRef, { 
            status: 'rejected',
            reviewedAt: serverTimestamp()
        });
      });

      // --- NEW: AUDIT LOG FOR REJECTION ---
      if (user) {
        await logActivity({
            groupId: groupId,
            action: "PAYMENT_REJECTED",
            description: `Rejected payment claim from ${claim.userDisplayName}`,
            performedBy: { uid: user.uid, displayName: user.displayName || 'Admin' },
            metadata: { claimId: claim.id }
        });
      }

      toast({ title: "Rejected", description: "Claim has been removed." });
    } catch (error) {
        toast({ variant: "destructive", title: "Error", description: "Could not reject claim." });
    } finally {
        setProcessingId(null);
    }
  };

  if (loading) return <div className="p-4 text-center text-sm text-gray-500"><Loader2 className="h-4 w-4 animate-spin inline mr-2"/>Checking claims...</div>;

  if (claims.length === 0) {
    return (
        <Card className="bg-slate-50 border-dashed shadow-none">
            <CardContent className="py-8 text-center text-slate-500 text-sm">
                No pending approvals yet.
                <div className="text-xs mt-1 text-slate-400">(If you just submitted a claim, the Admin must approve it first)</div>
            </CardContent>
        </Card>
    );
  }

  return (
    <Card className="border-orange-100 bg-orange-50/30">
        <CardHeader className="pb-3">
            <CardTitle className="text-lg text-orange-800 flex items-center gap-2">
                <AlertCircle className="h-5 w-5" /> Pending Approvals
            </CardTitle>
            <CardDescription>Verify receipt before approving.</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="space-y-3">
                {claims.map((claim) => (
                    <div key={claim.id} className="flex flex-col sm:flex-row sm:items-center justify-between bg-white p-3 rounded-md border shadow-sm gap-3">
                        <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-800">{claim.userDisplayName}</span>
                                <span className="text-xs text-slate-400">{new Date(claim.createdAt?.seconds * 1000 || Date.now()).toLocaleDateString()}</span>
                            </div>
                            <div className="text-sm text-slate-600">{claim.description || "Manual Entry"}</div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto">
                            <span className="font-bold text-green-700">{formatCurrency(claim.amountCents)}</span>
                            <div className="flex gap-2">
                                <Button 
                                    size="sm" 
                                    variant="outline" 
                                    className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-100"
                                    onClick={() => handleReject(claim)}
                                    disabled={!!processingId}
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                                <Button 
                                    size="sm" 
                                    className="h-8 bg-green-600 hover:bg-green-700 text-white"
                                    onClick={() => handleApprove(claim)}
                                    disabled={processingId === claim.id}
                                >
                                    {processingId === claim.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Approve"}
                                </Button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </CardContent>
    </Card>
  );
}