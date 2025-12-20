'use client';

import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { useState, useEffect } from "react";

export function ProfileAlert() {
  const { profile, loading } = useAuth();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // LOGIC: Check if critical fields are missing
    if (!loading && profile) {
      const isIncomplete = 
        !profile.phoneNumber || 
        profile.phoneNumber.trim() === '' ||
        !profile.name || 
        profile.name === 'New User'; // Assuming 'New User' is your default

      setIsVisible(isIncomplete);
    }
  }, [profile, loading]);

  if (!isVisible) return null;

  return (
    <Alert variant="destructive" className="mb-6 border-amber-200 bg-amber-50 text-amber-900">
      <AlertTriangle className="h-4 w-4 text-amber-600" />
      <AlertTitle className="text-amber-800 font-semibold">
        Profile Incomplete
      </AlertTitle>
      <AlertDescription className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mt-2">
        <p className="text-amber-700">
          Your profile is missing important details (Phone Number or Name). 
          Please update it to ensure you receive group notifications and payouts.
        </p>
        <Link href="/profile">
          <Button size="sm" variant="outline" className="border-amber-300 hover:bg-amber-100 text-amber-900 whitespace-nowrap">
            Update Profile <ArrowRight className="ml-2 h-3 w-3" />
          </Button>
        </Link>
      </AlertDescription>
    </Alert>
  );
}