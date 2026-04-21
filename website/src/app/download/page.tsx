import type { Metadata } from "next";
import Link from "next/link";
import { Smartphone, CheckCircle, ArrowRight, Leaf, Shield, Wifi, Battery, Download } from "lucide-react";
import { getDictionary } from "@/i18n/dictionaries";
import { getLocale } from "@/i18n/getLocale";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary(getLocale());
  return { title: dict.download.metaTitle, description: dict.download.metaDesc };
}

export default async function DownloadPage() {
  const dict = await getDictionary(getLocale());
  const t = dict.download;
  const p = "";

  const appFeatures = [t.f1, t.f2, t.f3, t.f4, t.f5, t.f6];
  const requirements = [
    { platform: "iOS", version: t.iosVersion, devices: t.iosDevices },
    { platform: "Android", version: t.androidVersion, devices: t.androidDevices },
  ];

  return (
    <>
      <section className="bg-gradient-to-br from-primary-50 via-white to-primary-50 py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-4xl md:text-5xl font-extrabold text-neutral-900">
                {t.heroTitle} <span className="text-primary-500">{t.heroHighlight}</span> {t.heroEnd}
              </h1>
              <p className="mt-6 text-lg text-neutral-600 leading-relaxed">{t.heroDesc}</p>
              <div className="mt-8 flex flex-wrap gap-4">
                <a href="#" className="inline-flex items-center gap-3 bg-neutral-900 text-white px-6 py-3.5 rounded-xl hover:bg-neutral-800 transition-colors shadow-lg">
                  <svg className="h-7 w-7" viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
                  <div className="text-left">
                    <p className="text-[10px] opacity-80">{t.downloadOnThe}</p>
                    <p className="text-sm font-semibold -mt-0.5">{t.appStore}</p>
                  </div>
                </a>
                <a href="#" className="inline-flex items-center gap-3 bg-neutral-900 text-white px-6 py-3.5 rounded-xl hover:bg-neutral-800 transition-colors shadow-lg">
                  <svg className="h-7 w-7" viewBox="0 0 24 24" fill="currentColor"><path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 01-.61-.92V2.734a1 1 0 01.609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-3.198l2.807 1.626a1 1 0 010 1.73l-2.808 1.626L15.206 12l2.492-2.491zM5.864 2.658L16.8 8.99l-2.3 2.3-8.636-8.632z"/></svg>
                  <div className="text-left">
                    <p className="text-[10px] opacity-80">{t.getItOn}</p>
                    <p className="text-sm font-semibold -mt-0.5">{t.googlePlay}</p>
                  </div>
                </a>
              </div>
              <p className="mt-4 text-sm text-neutral-500">{t.freeNote}</p>
            </div>
            <div className="flex flex-col items-center gap-8">
              <div className="text-center">
                <p className="text-sm font-semibold text-neutral-700 mb-3">{t.scanToDownload}</p>
                <div className="grid grid-cols-2 gap-6">
                  <div className="flex flex-col items-center">
                    <div className="w-36 h-36 bg-white border-2 border-neutral-200 rounded-2xl flex items-center justify-center shadow-sm">
                      <div className="w-28 h-28 bg-neutral-100 rounded-lg flex flex-col items-center justify-center">
                        <Smartphone className="h-8 w-8 text-neutral-400 mb-1" />
                        <p className="text-[10px] text-neutral-400">{t.iosQr}</p>
                      </div>
                    </div>
                    <p className="mt-2 text-xs font-medium text-neutral-600">{t.appStore}</p>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="w-36 h-36 bg-white border-2 border-neutral-200 rounded-2xl flex items-center justify-center shadow-sm">
                      <div className="w-28 h-28 bg-neutral-100 rounded-lg flex flex-col items-center justify-center">
                        <Smartphone className="h-8 w-8 text-neutral-400 mb-1" />
                        <p className="text-[10px] text-neutral-400">{t.androidQr}</p>
                      </div>
                    </div>
                    <p className="mt-2 text-xs font-medium text-neutral-600">{t.googlePlay}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="section-heading">{t.whatYouGet}</h2>
          <div className="mt-10 grid sm:grid-cols-2 gap-4">
            {appFeatures.map((feat) => (
              <div key={feat} className="flex items-start gap-3 p-4">
                <CheckCircle className="h-5 w-5 text-primary-500 shrink-0 mt-0.5" />
                <p className="text-neutral-700">{feat}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 bg-neutral-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="section-heading">{t.sysReq}</h2>
          <div className="mt-10 grid sm:grid-cols-2 gap-6">
            {requirements.map((req) => (
              <div key={req.platform} className="bg-white p-6 rounded-2xl border border-neutral-200">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center">
                    <Smartphone className="h-5 w-5 text-primary-500" />
                  </div>
                  <h3 className="text-lg font-semibold">{req.platform}</h3>
                </div>
                <ul className="space-y-2 text-sm text-neutral-600">
                  <li className="flex items-center gap-2"><Shield className="h-4 w-4 text-neutral-400" />{req.version}</li>
                  <li className="flex items-center gap-2"><Battery className="h-4 w-4 text-neutral-400" />{req.devices}</li>
                  <li className="flex items-center gap-2"><Wifi className="h-4 w-4 text-neutral-400" />{t.internetNote}</li>
                  <li className="flex items-center gap-2"><Download className="h-4 w-4 text-neutral-400" />{t.downloadSize}</li>
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 bg-primary-500">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Leaf className="h-12 w-12 text-white/80 mx-auto mb-4" />
          <h2 className="text-2xl md:text-3xl font-bold text-white">{t.ctaHeading}</h2>
          <p className="mt-3 text-primary-100">{t.ctaDesc}</p>
          <Link href={`${p}/guides`} className="mt-6 inline-flex items-center gap-2 bg-white text-primary-600 font-semibold px-6 py-3 rounded-lg hover:bg-neutral-100 transition-colors">
            {t.seeHow}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </>
  );
}
