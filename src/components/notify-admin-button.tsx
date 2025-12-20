'use client';

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { MessageCircle, Loader2 } from "lucide-react";
import { getFirestore, collection, query, where, getDocs, getDoc, doc } from "firebase/firestore";
import { getFirebaseApp } from "@/lib/firebase/client";

interface NotifyAdminButtonProps {
  groupId: string;
  amount?: number; // Optional: to pre-fill message
  groupName?: string; // Optional: to pre-fill message
}

export function NotifyAdminButton({ groupId, amount, groupName }: NotifyAdminButtonProps) {
  const [adminPhone, setAdminPhone] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchAdminNumber = async () => {
      setLoading(true);
      try {
        const db = getFirestore(getFirebaseApp());

        // 1. Find the Admin's User ID from the Group Members collection
        const membersRef = collection(db, "groups", groupId, "members");
        const q = query(membersRef, where("role", "==", "admin")); // Assumes role is stored as 'admin'
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
          const adminId = snapshot.docs[0].id; // The member doc ID is usually the User ID

          // 2. Fetch the Admin's real Profile to get the phone number
          const userDoc = await getDoc(doc(db, "users", adminId));
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            if (userData.phoneNumber) {
              setAdminPhone(userData.phoneNumber);
            }
          }
        }
      } catch (error) {
        console.error("Could not fetch admin number", error);
      } finally {
        setLoading(false);
      }
    };

    if (groupId) {
      fetchAdminNumber();
    }
  }, [groupId]);

  const handleWhatsAppClick = () => {
    if (!adminPhone) return;

    // 1. Clean the number (remove spaces, dashes, + signs)
    // WhatsApp requires format like: 26377123456 (no plus, no zeroes at start if international)
    let cleanNumber = adminPhone.replace(/[^\d]/g, ''); // Remove non-digits

    // Logic to handle Zimbabwe numbers specifically if needed
    // If it starts with '07', replace 0 with 263
    if (cleanNumber.startsWith('07')) {
        cleanNumber = '263' + cleanNumber.substring(1);
    }

    // 2. Create the message
    const text = `Hello Admin! I have just submitted a claim payment` + 
                 (amount ? ` of $${(amount / 100).toFixed(2)}` : "") + 
                 (groupName ? ` for ${groupName}` : "") + 
                 `. Please verify.`;

    // 3. Open WhatsApp
    const url = `https://wa.me/${cleanNumber}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  if (loading) {
    return <Button disabled variant="outline" size="sm"><Loader2 className="w-4 h-4 animate-spin" /></Button>;
  }

  if (!adminPhone) {
    // Fallback if admin hasn't set a phone number
    return <Button disabled variant="outline" size="sm">Admin Contact Unavailable</Button>;
  }

  return (
    <Button 
      onClick={handleWhatsAppClick} 
      className="bg-[#25D366] hover:bg-[#128C7E] text-white gap-2"
    >
      <MessageCircle className="w-4 h-4" />
      Notify Admin
    </Button>
  );
}