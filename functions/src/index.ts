
import * as logger from "firebase-functions/logger";
import { https, setGlobalOptions } from "firebase-functions/v2";
import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

// Initialize Firebase Admin SDK
initializeApp();
const db = getFirestore();

// Set global options for all functions
setGlobalOptions({ region: "us-central1" });


interface ProcessClaimData {
  groupId: string;
  claimId: string;
  action: 'approve' | 'reject';
}

export const processClaim = https.onCall(async (request) => {
  if (!request.auth) {
    throw new https.HttpsError("unauthenticated", "Authentication required.");
  }
  
  const { groupId, claimId, action } = request.data as ProcessClaimData;
  const adminUid = request.auth.uid;
  
  if (!groupId || !claimId || !action) {
    throw new https.HttpsError("invalid-argument", "Missing required fields.");
  }
  
  const groupRef = db.collection("groups").doc(groupId);
  const claimRef = groupRef.collection("claims").doc(claimId);
  
  try {
    
    return db.runTransaction(async (transaction) => {
        const adminMemberRef = groupRef.collection('members').doc(adminUid);

        // All reads must be inside the transaction
        const claimDoc = await transaction.get(claimRef);
        const adminMemberDoc = await transaction.get(adminMemberRef);
        
        if (!claimDoc.exists) {
            throw new https.HttpsError("not-found", "Claim not found.");
        }
        
        const claimData = claimDoc.data()!;
        
        if (claimData.status !== 'pending') {
            throw new https.HttpsError("failed-precondition", "This claim has already been processed.");
        }

        if(!adminMemberDoc.exists || adminMemberDoc.data()?.role !== 'admin') {
           throw new https.HttpsError("permission-denied", "You are not an admin of this group.");
        }

        if (action === 'approve') {
            const { userId, amountCents, innbucksReference } = claimData;

            if (!userId || typeof amountCents !== 'number' || !innbucksReference) {
                throw new https.HttpsError("invalid-argument", "Claim data is incomplete or invalid, cannot approve.");
            }

            const memberRef = groupRef.collection("members").doc(userId);
            const transactionRef = groupRef.collection("transactions").doc();
            
            // Perform writes
            transaction.update(groupRef, { currentBalanceCents: FieldValue.increment(amountCents) });
            transaction.update(memberRef, { balanceCents: FieldValue.increment(amountCents) });
            transaction.set(transactionRef, {
                type: 'contribution',
                amountCents,
                date: new Date(),
                memberId: userId,
                description: `Approved claim. Ref: ${innbucksReference}`,
                processedBy: adminUid
            });
            transaction.update(claimRef, { status: 'approved', processedAt: new Date(), processedBy: adminUid });
            return { success: true, message: "Claim approved successfully." };
        
        } else if (action === 'reject') {
            transaction.update(claimRef, { status: 'rejected', processedAt: new Date(), processedBy: adminUid });
            return { success: true, message: "Claim rejected." };
        } else {
            throw new https.HttpsError("invalid-argument", "Invalid action specified.");
        }
    });

  } catch (error) {
    logger.error("Error processing claim:", error);
    if (error instanceof https.HttpsError) throw error;
    throw new https.HttpsError("internal", "An error occurred while processing the claim.");
  }
});
