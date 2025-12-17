# **App Name**: Mukando Capital

## Core Features:

- User Authentication: Secure user authentication using Firebase Authentication.
- Stokvel Group Management: Create, join, and manage Stokvel groups with defined contribution schedules and payout rules.
- Transaction Recording: Record contributions and payouts (executed via Innbucks) with details such as date, member, and amount in USD (stored as cents).
- Cloud Function for Balance Updates: Implement a Cloud Function to handle all updates to `currentBalanceCents` and `memberBalanceCents` fields in Firestore, ensuring data integrity and consistency.
- Group Ledger: Display all transactions in a clear, chronological 'Group Ledger' page, showing contributions, payouts, and member balances.
- Reporting and Analytics: AI-powered feature to generate insights into group contribution patterns, payout trends, and individual member activity as a tool for decision making.
- Firestore Data Model: Adhere to the Firestore data model, storing all monetary values as integers (cents) in the database, using USD as the primary currency.

## Style Guidelines:

- Primary color: Deep Green (#388E3C), symbolizing growth and financial stability.
- Background color: Light Green (#E8F5E9), providing a calm and inviting feel.
- Accent color: Sky Blue (#87CEEB) to highlight important information and CTAs, conveying value.
- Body and headline font: 'PT Sans', a humanist sans-serif that provides a modern, yet accessible look for displaying financial data and group information.
- Use clean and modern icons to represent transactions, member actions, and group settings.
- Design a mobile-first, responsive layout that adapts to different screen sizes.
- Implement subtle transitions and animations to enhance user experience when navigating the ledger and viewing transaction details.