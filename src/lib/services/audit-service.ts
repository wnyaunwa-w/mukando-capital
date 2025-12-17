import { getFirestore, collection, addDoc, serverTimestamp } from "firebase/firestore";
import { getFirebaseApp } from "@/lib/firebase/client";

export type AuditAction = 
  | "GROUP_CREATED"
  | "MEMBER_JOINED"
  | "PAYMENT_CLAIMED"
  | "PAYMENT_APPROVED"
  | "PAYMENT_REJECTED"
  | "FEE_PAID"
  | "PAYOUT_UPDATED";

interface LogDetails {
  groupId: string;
  action: AuditAction;
  description: string;
  performedBy: {
    uid: string;
    displayName: string;
    email?: string;
  };
  metadata?: Record<string, any>; // Flexible object for extra data (amounts, dates)
}

export async function logActivity(details: LogDetails) {
  const db = getFirestore(getFirebaseApp());
  
  try {
    // We store logs INSIDE the group so they are easy to query per group
    const logsRef = collection(db, "groups", details.groupId, "audit_logs");
    
    await addDoc(logsRef, {
      action: details.action,
      description: details.description,
      performedBy: details.performedBy,
      metadata: details.metadata || {},
      timestamp: serverTimestamp(),
      searchKey: details.action // Helps if we want to filter later
    });

    console.log(`[AUDIT] ${details.action}: ${details.description}`);
  } catch (error) {
    console.error("Failed to log activity:", error);
    // Note: We swallow the error here so the main app doesn't crash just because a log failed.
  }
}