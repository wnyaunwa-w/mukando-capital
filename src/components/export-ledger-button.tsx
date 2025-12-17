'use client';

import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { Group } from '@/lib/types'; // We assume your types are here
import { formatCurrency } from '@/lib/utils';

interface ExportLedgerButtonProps {
  group: Group;
  className?: string;
}

export function ExportLedgerButton({ group, className }: ExportLedgerButtonProps) {

  const handleExport = () => {
    if (!group.transactions || group.transactions.length === 0) {
      alert("No transactions to export.");
      return;
    }

    // 1. Define the CSV Headers
    const headers = [
      "Date",
      "Transaction ID",
      "Member Name",
      "Type",
      "Description",
      "Amount (USD)",
      "Status"
    ];

    // 2. Format the data rows
    const rows = group.transactions.map((tx: any) => {
      // Handle Firebase Timestamp or standard Date
      const dateObj = tx.createdAt?.toDate ? tx.createdAt.toDate() : new Date(tx.createdAt);
      const formattedDate = dateObj.toLocaleDateString() + ' ' + dateObj.toLocaleTimeString();

      // Format Amount (convert cents to dollars)
      // We keep it as a raw number so Excel can do math on it
      const amount = (tx.amountCents / 100).toFixed(2);

      // Sanitize fields to escape commas or quotes (prevents CSV breaking)
      const escape = (text: string) => {
        if (!text) return "";
        return `"${String(text).replace(/"/g, '""')}"`; 
      };

      return [
        escape(formattedDate),
        escape(tx.id),
        escape(tx.memberName || "Unknown"),
        escape(tx.type), 
        escape(tx.description || ""),
        amount,
        escape(tx.status || "completed")
      ].join(",");
    });

    // 3. Combine Headers and Rows
    const csvContent = [headers.join(","), ...rows].join("\n");

    // 4. Create a Blob and trigger the download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.href = url;
    // Name the file: "GroupName_Ledger.csv"
    link.setAttribute("download", `${group.name.replace(/\s+/g, '_')}_Ledger.csv`);
    document.body.appendChild(link);
    link.click();
    
    // Cleanup
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <Button variant="outline" size="sm" onClick={handleExport} className={className}>
      <Download className="mr-2 h-4 w-4" />
      Download CSV
    </Button>
  );
}