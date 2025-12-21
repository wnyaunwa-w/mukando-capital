'use client';

import { 
  ShoppingCart, 
  PiggyBank, 
  ArrowLeftRight, 
  Cake, 
  TrendingUp, 
  HeartHandshake, 
  Car, 
  Home, 
  MoreHorizontal 
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface GroupCategorySelectorProps {
  onSelect: (category: string) => void;
}

const CATEGORIES = [
  { 
    id: "grocery", 
    label: "Grocery", 
    description: "Pool funds together for bulk grocery purchases.", 
    icon: ShoppingCart,
    color: "bg-green-50 text-green-700 border-green-200"
  },
  { 
    id: "savings", 
    label: "Savings", 
    description: "A general-purpose group for collective savings goals.", 
    icon: PiggyBank,
    color: "bg-emerald-50 text-emerald-700 border-emerald-200"
  },
  { 
    id: "borrowing", 
    label: "Borrowing", 
    description: "A lending circle where members can borrow from the group fund.", 
    icon: ArrowLeftRight,
    color: "bg-blue-50 text-blue-700 border-blue-200"
  },
  { 
    id: "birthday", 
    label: "Birthday Savings", 
    description: "Save small amounts monthly to celebrate member birthdays.", 
    icon: Cake,
    color: "bg-pink-50 text-pink-700 border-pink-200"
  },
  { 
    id: "investment", 
    label: "Investments", 
    description: "Pool capital for joint investment opportunities.", 
    icon: TrendingUp,
    color: "bg-purple-50 text-purple-700 border-purple-200"
  },
  { 
    id: "burial", 
    label: "Burial Society", 
    description: "Provide financial support to members during times of bereavement.", 
    icon: HeartHandshake,
    color: "bg-slate-50 text-slate-700 border-slate-200"
  },
  { 
    id: "car", 
    label: "Car Purchase", 
    description: "Save specifically towards buying vehicles for members.", 
    icon: Car,
    color: "bg-orange-50 text-orange-700 border-orange-200"
  },
  { 
    id: "housing", 
    label: "Stand Purchase", 
    description: "Long-term savings for buying residential stands or building.", 
    icon: Home,
    color: "bg-cyan-50 text-cyan-700 border-cyan-200"
  },
  { 
    id: "other", 
    label: "Other Purposes", 
    description: "Create a custom group for any other shared goal.", 
    icon: MoreHorizontal,
    color: "bg-gray-50 text-gray-700 border-gray-200"
  }
];

export function GroupCategorySelector({ onSelect }: GroupCategorySelectorProps) {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-[#122932]">Create New Group</h2>
        <p className="text-slate-500">First, select the type of group you want to create.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {CATEGORIES.map((cat) => (
          <Card 
            key={cat.id} 
            onClick={() => onSelect(cat.label)}
            className={cn(
              "cursor-pointer transition-all hover:scale-[1.02] hover:shadow-md border",
              cat.color
            )}
          >
            <CardContent className="p-6 flex flex-col items-start gap-4">
              <div className="p-3 bg-white rounded-xl shadow-sm">
                <cat.icon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-lg mb-1">{cat.label}</h3>
                <p className="text-sm opacity-80 leading-relaxed">
                  {cat.description}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}