"use client";

import Link from "next/link";
import { Apple, PlayCircle, CheckCircle, Smartphone, Wifi, ArrowRight } from "lucide-react";
import { useDictionary } from "@/i18n/DictionaryProvider";

export default function DownloadPage() {
  const { dict } = useDictionary();
  const t = dict.download;

  const features = [t.f1, t.f2, t.f3, t.f4, t.f5, t.f6];

  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-to-br from-primary-50 via-white to-primary-50 py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-4xl md:text-5xl font-extrabold text-neutral-900">
                {t.heroTitle} <span className="text-primary-500">{t.heroHighlight}</span> {t.heroEnd}
              </h1>
              <p className="mt-6 text-lg text-neutral-600 leading-relaxed">{t.heroDesc}</p>
              <div className="mt-8 flex flex-wrap gap-4">
                <a href="#" className="inline-flex items-center gap-3 bg-neutral-900 text-white px-6 py-3 rounded-xl hover:bg-neutral-800 transition-colors">
                  <Apple className="h-6 w-6" />
                  <div className="text-left"><p className="text-[10px] leading-none">{t.downloadOnThe}</p><p className="text-sm font-semibold">{t.appStore}</p></div>
                </a>
                <a href="#" className="inline-flex items-center gap-3 bg-neutral-900 text-white px-6 py-3 rounded-xl hover:bg-neutral-800 transition-colors">
                  <PlayCircle className="h-6 w-6" />
                  <div className="text-left"><p className="text-[10px] leading-none">{t.getItOn}</p><p className="text-sm font-semibold">{t.googlePlay}</p></div>
                </a>
              </div>
              <p className="mt-4 text-sm text-neutral-500">{t.freeNote}</p>
            </div>
            <div className="hidden md:flex justify-center">
              <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-xs border border-neutral-100 text-center">
                <h3 className="text-lg font-bold text-neutral-900 mb-4">{t.scanToDownload}</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-neutral-100 rounded-xl aspect-square flex items-center justify-center"><span className="text-xs text-neutral-400">{t.iosQr}</span></div>
                  <div className="bg-neutral-100 rounded-xl aspect-square flex items-center justify-center"><span className="text-xs text-neutral-400">{t.androidQr}</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 md:py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl md:text-3xl font-extrabold text-neutral-900 text-center mb-10">{t.whatYouGet}</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {features.map((f) => (
              <div key={f} className="flex items-start gap-3 p-4 rounded-xl bg-neutral-50 border border-neutral-100">
                <CheckCircle className="h-5 w-5 text-primary-500 mt-0.5 shrink-0" />
                <p className="text-sm text-neutral-700">{f}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* System Requirements */}
      <section className="py-16 md:py-20 bg-neutral-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl md:text-3xl font-extrabold text-neutral-900 text-center mb-10">{t.sysReq}</h2>
          <div className="grid sm:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl p-6 border border-neutral-200">
              <div className="flex items-center gap-3 mb-4">
                <Apple className="h-6 w-6 text-neutral-900" />
                <h3 className="text-lg font-bold text-neutral-900">iOS</h3>
              </div>
              <ul className="space-y-2 text-sm text-neutral-600">
                <li className="flex items-center gap-2"><Smartphone className="h-4 w-4 text-neutral-400" />{t.iosVersion}</li>
                <li className="flex items-center gap-2"><Smartphone className="h-4 w-4 text-neutral-400" />{t.iosDevices}</li>
                <li className="flex items-center gap-2"><Wifi className="h-4 w-4 text-neutral-400" />{t.internetNote}</li>
              </ul>
            </div>
            <div className="bg-white rounded-2xl p-6 border border-neutral-200">
              <div className="flex items-center gap-3 mb-4">
                <PlayCircle className="h-6 w-6 text-green-600" />
                <h3 className="text-lg font-bold text-neutral-900">Android</h3>
              </div>
              <ul className="space-y-2 text-sm text-neutral-600">
                <li className="flex items-center gap-2"><Smartphone className="h-4 w-4 text-neutral-400" />{t.androidVersion}</li>
                <li className="flex items-center gap-2"><Smartphone className="h-4 w-4 text-neutral-400" />{t.androidDevices}</li>
                <li className="flex items-center gap-2"><Wifi className="h-4 w-4 text-neutral-400" />{t.downloadSize}</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-primary-600 py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-extrabold text-white">{t.ctaHeading}</h2>
          <p className="mt-4 text-lg text-primary-100">{t.ctaDesc}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <a href="#" className="inline-flex items-center gap-3 bg-white text-neutral-900 px-6 py-3 rounded-xl font-semibold hover:bg-primary-50 transition-colors">
              <Apple className="h-5 w-5" /> {t.appStore}
            </a>
            <a href="#" className="inline-flex items-center gap-3 bg-white text-neutral-900 px-6 py-3 rounded-xl font-semibold hover:bg-primary-50 transition-colors">
              <PlayCircle className="h-5 w-5" /> {t.googlePlay}
            </a>
          </div>
          <Link href="/guides" className="mt-6 inline-flex items-center text-primary-100 hover:text-white transition-colors">
            {t.seeHow} <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </div>
      </section>
    </>
  );
}
