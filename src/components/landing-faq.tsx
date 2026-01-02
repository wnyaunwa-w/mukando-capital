"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export function LandingFAQ() {
  const faqs = [
    {
      question: "What is Mukando Capital?",
      answer: "Mukando Capital is a digital platform that helps friends and families manage their savings groups (rounds/stokvels). We replace messy notebooks with a transparent digital ledger, ensuring everyone knows exactly who has paid and whose turn it is to receive money."
    },
    {
      question: "How do I join a savings group?",
      answer: "You need an Invite Code (e.g., 'ZB8R9V') from a group administrator. Once you have the code, log in to your dashboard, select 'Join Group', and enter the code to become a member instantly."
    },
    {
      question: "What is the 'Mukando Score'?",
      answer: "The Mukando Score is your financial reputation on the platform. Every new member starts with a score of 400 (Good). Paying your contributions on time raises your score, helping you build trust and join bigger savings circles in the future."
    },
    {
      question: "Is there a fee to use the platform?",
      answer: "Creating an account is free. To activate full access to a group's ledger and features, a small monthly Platform Fee (e.g., $1.00) may apply. This fee helps us maintain the secure servers and verify user identities."
    },
    {
      question: "How do payouts work?",
      answer: "When it is your turn to receive the pooled funds, the Group Admin initiates a payout on the app. Once you receive the actual money (via cash or mobile money), you confirm the receipt in the app. This updates the ledger and boosts your Trust Score."
    },
    {
      question: "Can I leave a group?",
      answer: "Yes, you can leave a group at any time via the Members tab. However, please ensure you have settled any outstanding debts to the group to avoid negatively impacting your Mukando Score."
    }
  ];

  return (
    <section className="py-24 bg-slate-50" id="faq">
      <div className="container mx-auto px-4 max-w-3xl">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-[#122932] mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-slate-600">
            Everything you need to know about secure digital savings.
          </p>
        </div>

        <Accordion type="single" collapsible className="w-full bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          {faqs.map((faq, index) => (
            <AccordionItem key={index} value={`item-${index}`} className="border-b last:border-0 px-6">
              <AccordionTrigger className="text-left font-semibold text-slate-800 hover:text-[#2C514C] py-6 text-lg">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-slate-500 leading-relaxed pb-6 text-base">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}