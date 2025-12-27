"use client";

import { GlobalScoreboard } from "@/components/admin/global-scoreboard";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export default function AdminScoresPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
            </Button>
            <div>
                <h1 className="text-3xl font-bold text-[#122932]">Member Scores</h1>
                <p className="text-slate-500">View and export Mukando scores.</p>
            </div>
        </div>

        <GlobalScoreboard />
      </div>
    </div>
  );
}