export interface User {
  uid: string;
  email: string | null;
  name: string | null;
  photoURL: string | null;
  phoneNumber?: string;
  createdAt?: any;
  subscriptionStatus?: 'active' | 'inactive';
}

export interface Member {
  userId: string;
  name: string;
  email: string;
  role: 'admin' | 'member';
  joinedAt: any;
  phoneNumber?: string;
}

export interface Group {
  id: string;
  name: string;
  description: string;
  currentBalanceCents: number; // The Dashboard needs this
  contributionAmountCents?: number; // <--- ADDED THIS BACK
  memberIds: string[];
  createdAt: any;
  createdBy: string;
  status?: 'active' | 'suspended';
  frequency?: 'weekly' | 'monthly';
}

export interface Transaction {
  id: string;
  type: 'contribution' | 'payout' | 'fee';
  amountCents: number;
  description: string;
  userId: string;
  userName?: string;
  createdAt?: any;
  date?: any; 
}

export interface Claim {
  id: string;
  userId: string;
  amountCents: number;
  innbucksReference: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: any;
  type?: 'manual_claim';
  userName?: string;
}