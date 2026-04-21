"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X, Leaf, Globe } from "lucide-react";
import { useDictionary } from "@/i18n/DictionaryProvider";

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { dict, locale, switchLocale } = useDictionary();
  const nav = dict.common.nav;

  const navLinks = [
    { href: "/", label: nav.home },
    { href: "/download", label: nav.download },
    { href: "/testimonials", label: nav.testimonials },
    { href: "/about", label: nav.about },
    { href: "/guides", label: nav.guides },
    { href: "/contact", label: nav.contact },
  ];

  const otherLocale = locale === "en" ? "fr" : "en";

  const handleSwitchLang = () => {
    switchLocale(otherLocale);
  };

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-neutral-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <Leaf className="h-8 w-8 text-primary-500" />
            <span className="text-xl font-bold text-primary-700">KmerTrash</span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-neutral-600 hover:text-primary-500 transition-colors"
              >
                {link.label}
              </Link>
            ))}
            <button
              onClick={handleSwitchLang}
              className="flex items-center gap-1 text-sm font-medium text-neutral-500 hover:text-primary-500 transition-colors"
            >
              <Globe className="h-4 w-4" />
              <span translate="no">{otherLocale.toUpperCase()}</span>
            </button>
            <Link href="/download" className="btn-primary text-sm py-2 px-4">
              {nav.getApp}
            </Link>
          </nav>

          {/* Mobile toggle */}
          <button
            className="md:hidden p-2 text-neutral-600"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Nav */}
      {mobileOpen && (
        <div className="md:hidden border-t border-neutral-200 bg-white">
          <nav className="flex flex-col px-4 py-4 gap-3">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-neutral-700 hover:text-primary-500 py-2"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <button
              onClick={() => {
                handleSwitchLang();
                setMobileOpen(false);
              }}
              className="flex items-center gap-1 text-sm font-medium text-neutral-500 hover:text-primary-500 py-2"
            >
              <Globe className="h-4 w-4" />
              <span translate="no">{otherLocale === "fr" ? "Français" : "English"}</span>
            </button>
            <Link
              href="/download"
              className="btn-primary text-sm mt-2"
              onClick={() => setMobileOpen(false)}
            >
              {nav.getApp}
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
