"use client";

import { useState } from "react";
import { Send } from "lucide-react";

interface ContactDict {
  formTitle: string;
  fullName: string;
  namePlaceholder: string;
  emailAddress: string;
  emailPlaceholder: string;
  inquiryType: string;
  selectInquiry: string;
  generalInquiry: string;
  technicalSupport: string;
  feedback: string;
  partnership: string;
  pressMedia: string;
  reportProblem: string;
  message: string;
  messagePlaceholder: string;
  sendMessage: string;
  messageSent: string;
  thankYou: string;
  sendAnother: string;
}

export default function ContactForm({ dict }: { dict: ContactDict }) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    inquiryType: "",
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);

  const inquiryTypes = [
    dict.generalInquiry,
    dict.technicalSupport,
    dict.feedback,
    dict.partnership,
    dict.pressMedia,
    dict.reportProblem,
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="bg-primary-50 border border-primary-200 rounded-2xl p-10 text-center">
        <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Send className="h-8 w-8 text-primary-500" />
        </div>
        <h3 className="text-xl font-bold text-neutral-900">{dict.messageSent}</h3>
        <p className="mt-2 text-neutral-600">{dict.thankYou}</p>
        <button
          onClick={() => {
            setSubmitted(false);
            setFormData({ name: "", email: "", inquiryType: "", message: "" });
          }}
          className="mt-6 btn-secondary text-sm"
        >
          {dict.sendAnother}
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-neutral-50 rounded-2xl border border-neutral-200 p-6 md:p-8"
    >
      <h2 className="text-xl font-bold text-neutral-900 mb-6">{dict.formTitle}</h2>
      <div className="space-y-5">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-neutral-700 mb-1.5">
            {dict.fullName}
          </label>
          <input
            type="text"
            id="name"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-4 py-2.5 rounded-lg border border-neutral-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none transition-colors text-sm"
            placeholder={dict.namePlaceholder}
          />
        </div>
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-neutral-700 mb-1.5">
            {dict.emailAddress}
          </label>
          <input
            type="email"
            id="email"
            required
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="w-full px-4 py-2.5 rounded-lg border border-neutral-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none transition-colors text-sm"
            placeholder={dict.emailPlaceholder}
          />
        </div>
        <div>
          <label htmlFor="inquiryType" className="block text-sm font-medium text-neutral-700 mb-1.5">
            {dict.inquiryType}
          </label>
          <select
            id="inquiryType"
            required
            value={formData.inquiryType}
            onChange={(e) => setFormData({ ...formData, inquiryType: e.target.value })}
            className="w-full px-4 py-2.5 rounded-lg border border-neutral-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none transition-colors text-sm bg-white"
          >
            <option value="">{dict.selectInquiry}</option>
            {inquiryTypes.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="message" className="block text-sm font-medium text-neutral-700 mb-1.5">
            {dict.message}
          </label>
          <textarea
            id="message"
            required
            rows={5}
            value={formData.message}
            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
            className="w-full px-4 py-2.5 rounded-lg border border-neutral-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none transition-colors text-sm resize-none"
            placeholder={dict.messagePlaceholder}
          />
        </div>
        <button type="submit" className="btn-primary w-full">
          <Send className="mr-2 h-4 w-4" />
          {dict.sendMessage}
        </button>
      </div>
    </form>
  );
}
