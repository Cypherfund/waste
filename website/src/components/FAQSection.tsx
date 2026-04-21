"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-neutral-200 rounded-xl overflow-hidden">
      <button
        className="w-full flex items-center justify-between p-5 text-left hover:bg-neutral-50 transition-colors"
        onClick={() => setOpen(!open)}
      >
        <span className="text-sm font-semibold text-neutral-900 pr-4">{question}</span>
        {open ? (
          <ChevronUp className="h-5 w-5 text-neutral-400 shrink-0" />
        ) : (
          <ChevronDown className="h-5 w-5 text-neutral-400 shrink-0" />
        )}
      </button>
      {open && (
        <div className="px-5 pb-5 text-sm text-neutral-600 leading-relaxed border-t border-neutral-100 pt-3">
          {answer}
        </div>
      )}
    </div>
  );
}

export default function FAQSection({ faqs }: { faqs: { question: string; answer: string }[] }) {
  return (
    <div className="mt-10 space-y-3">
      {faqs.map((faq) => (
        <FAQItem key={faq.question} question={faq.question} answer={faq.answer} />
      ))}
    </div>
  );
}
