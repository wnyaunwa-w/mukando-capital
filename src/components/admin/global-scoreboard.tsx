"use client";

import { useState, useEffect } from "react";
import { 
  Card, CardHeader, CardTitle, CardDescription, CardContent 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { 
  Download, Loader2, Search, Trophy, Shield, ShieldCheck, Medal 
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { getFirestore, collection, getDocs, query, orderBy } from "firebase/firestore";
import { getFirebaseApp } from "@/lib/firebase/client";

// --- TYPES ---
interface UserScoreRecord {
  id: string;
  name: string;
  email: string;
  phone: string;
  score: number;
  tier: string;
  joinedAt: string;
}

export function GlobalScoreboard() {
  const [users, setUsers] = useState<UserScoreRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // --- 1. HELPER: CALCULATE TIER ---
  const getTier = (score: number) => {
    if (score >= 750) return "Excellent";
    if (score >= 650) return "Good";
    if (score >= 500) return "Fair";
    return "Low";
  };

  // --- 2. FETCH ALL DATA ---
  useEffect(() => {
    const fetchData = async () => {
      const db = getFirestore(getFirebaseApp());
      try {
        // Fetch all users
        const usersRef = collection(db, "users");
        // Ordering by creditScore descending to show top performers first
        const q = query(usersRef, orderBy("creditScore", "desc"));
        const snapshot = await getDocs(q);

        const records = snapshot.docs.map(doc => {
          const data = doc.data();
          const score = data.creditScore || 400; // Default if missing
          return {
            id: doc.id,
            name: data.displayName || "Unknown Member",
            email: data.email || "N/A",
            phone: data.phoneNumber || "N/A",
            score: score,
            tier: getTier(score),
            joinedAt: data.createdAt ? new Date(data.createdAt.seconds * 1000).toLocaleDateString() : "N/A"
          };
        });

        setUsers(records);
      } catch (error) {
        console.error("Error fetching scores:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // --- 3. EXPORT TO CSV ---
  const exportCSV = () => {
    // Define Headers
    const headers = ["Name", "Phone", "Email", "Mukando Score", "Tier", "Joined Date"];
    
    // Map Data to CSV Rows
    const rows = users.map(user => [
      `"${user.name}"`, // Quote strings to handle commas in names
      `"${user.phone}"`,
      `"${user.email}"`,
      user.score,
      user.tier,
      user.joinedAt
    ]);

    // Combine Headers and Rows
    const csvContent = [
      headers.join(","), 
      ...rows.map(row => row.join(","))
    ].join("\n");

    // Create Blob and Trigger Download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `mukando_scores_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter for Search
  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Card className="w-full shadow-md border-slate-200">
      <CardHeader className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <CardTitle className="text-xl flex items-center gap-2 text-[#122932]">
                <Trophy className="w-5 h-5 text-amber-500" />
                Global Score Registry
            </CardTitle>
            <CardDescription>
                Live record of all member Mukando Scores across the platform.
            </CardDescription>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                <Input 
                    placeholder="Search member..." 
                    className="pl-9" 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            <Button onClick={exportCSV} className="bg-[#2C514C] hover:bg-[#23413d] text-white">
                <Download className="w-4 h-4 mr-2" /> Export CSV
            </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        {loading ? (
            <div className="flex justify-center py-10">
                <Loader2 className="w-8 h-8 animate-spin text-[#2C514C]" />
            </div>
        ) : (
            <div className="rounded-md border overflow-hidden">
                <Table>
                    <TableHeader className="bg-slate-50">
                        <TableRow>
                            <TableHead>Member Name</TableHead>
                            <TableHead>Contact</TableHead>
                            <TableHead>Joined</TableHead>
                            <TableHead className="text-right">Score</TableHead>
                            <TableHead>Tier</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredUsers.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                                    No members found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredUsers.map((user) => (
                                <TableRow key={user.id}>
                                    <TableCell className="font-medium text-slate-900">
                                        {user.name}
                                    </TableCell>
                                    <TableCell className="text-slate-500 text-sm">
                                        <div>{user.email}</div>
                                        <div className="text-xs">{user.phone}</div>
                                    </TableCell>
                                    <TableCell className="text-slate-500 text-sm">{user.joinedAt}</TableCell>
                                    <TableCell className="text-right font-bold text-[#2C514C]">
                                        {user.score}
                                    </TableCell>
                                    <TableCell>
                                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-bold border ${
                                            user.tier === 'Excellent' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                            user.tier === 'Good' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                            user.tier === 'Fair' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                            'bg-red-50 text-red-700 border-red-200'
                                        }`}>
                                            {user.tier}
                                        </span>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        )}
        <div className="mt-4 text-xs text-slate-400 text-right">
            Total Members: {users.length}
        </div>
      </CardContent>
    </Card>
  );
}