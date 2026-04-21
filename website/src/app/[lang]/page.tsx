import Link from "next/link";
import {
  Leaf,
  CalendarCheck,
  MapPin,
  Star,
  ShieldCheck,
  Smartphone,
  Truck,
  ArrowRight,
  CheckCircle,
  Recycle,
  Users,
} from "lucide-react";
import { getDictionary } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";

export default async function Home({ params }: { params: { lang: Locale } }) {
  const dict = await getDictionary(params.lang);
  const t = dict.home;
  const p = `/${params.lang}`;

  const features = [
    { icon: CalendarCheck, title: t.scheduleTitle, description: t.scheduleDesc },
    { icon: MapPin, title: t.trackingTitle, description: t.trackingDesc },
    { icon: Truck, title: t.collectorsTitle, description: t.collectorsDesc },
    { icon: Star, title: t.rateTitle, description: t.rateDesc },
    { icon: ShieldCheck, title: t.secureTitle, description: t.secureDesc },
    { icon: Smartphone, title: t.offlineTitle, description: t.offlineDesc },
  ];

  const stats = [
    { value: "5,000+", label: t.householdsServed },
    { value: "200+", label: t.activeCollectors },
    { value: "50,000+", label: t.pickupsCompleted },
    { value: "4.8", label: t.averageRating },
  ];

  const steps = [
    { step: "01", title: t.step1Title, description: t.step1Desc, icon: Smartphone },
    { step: "02", title: t.step2Title, description: t.step2Desc, icon: CalendarCheck },
    { step: "03", title: t.step3Title, description: t.step3Desc, icon: Truck },
    { step: "04", title: t.step4Title, description: t.step4Desc, icon: CheckCircle },
  ];

  return (
    <>
      {/* ===== HERO ===== */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-50 via-white to-primary-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <span className="inline-flex items-center gap-2 bg-primary-100 text-primary-700 text-sm font-medium px-4 py-1.5 rounded-full mb-6">
                <Leaf className="h-4 w-4" />
                {t.badge}
              </span>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-neutral-900 leading-tight">
                {t.heroTitle}{" "}
                <span className="text-primary-500">{t.heroHighlight}</span>
              </h1>
              <p className="mt-6 text-lg text-neutral-600 leading-relaxed max-w-lg">
                {t.heroDesc}
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <Link href={`${p}/download`} className="btn-primary text-base px-8 py-3.5">
                  {t.downloadNow}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
                <Link href={`${p}/guides`} className="btn-secondary text-base px-8 py-3.5">
                  {t.learnHow}
                </Link>
              </div>
              <div className="mt-8 flex items-center gap-6 text-sm text-neutral-500">
                <span className="flex items-center gap-1.5">
                  <CheckCircle className="h-4 w-4 text-primary-500" />
                  {t.freeToUse}
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle className="h-4 w-4 text-primary-500" />
                  {t.iosAndroid}
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle className="h-4 w-4 text-primary-500" />
                  {t.offlineSupport}
                </span>
              </div>
            </div>

            {/* Phone mockup */}
            <div className="relative flex justify-center">
              <div className="relative w-[280px] h-[560px] bg-neutral-900 rounded-[3rem] p-3 shadow-2xl">
                <div className="w-full h-full bg-gradient-to-b from-primary-500 to-primary-700 rounded-[2.3rem] flex flex-col items-center justify-center text-white overflow-hidden">
                  <Leaf className="h-16 w-16 mb-4 opacity-90" />
                  <p className="text-2xl font-bold">{t.phoneName}</p>
                  <p className="text-sm opacity-80 mt-1">{t.phoneSubtitle}</p>
                  <div className="mt-8 space-y-3 w-full px-6">
                    <div className="bg-white/20 rounded-xl p-3 flex items-center gap-3">
                      <CalendarCheck className="h-5 w-5" />
                      <div>
                        <p className="text-xs font-semibold">{t.nextPickup}</p>
                        <p className="text-[10px] opacity-80">{t.nextPickupTime}</p>
                      </div>
                    </div>
                    <div className="bg-white/20 rounded-xl p-3 flex items-center gap-3">
                      <Truck className="h-5 w-5" />
                      <div>
                        <p className="text-xs font-semibold">{t.collectorEnRoute}</p>
                        <p className="text-[10px] opacity-80">{t.collectorEta}</p>
                      </div>
                    </div>
                    <div className="bg-white/20 rounded-xl p-3 flex items-center gap-3">
                      <Star className="h-5 w-5" />
                      <div>
                        <p className="text-xs font-semibold">{t.rateLastPickup}</p>
                        <p className="text-[10px] opacity-80">{t.rateSubtitle}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="absolute -top-6 -right-6 w-24 h-24 bg-accent-400 rounded-full opacity-20 blur-2xl" />
              <div className="absolute -bottom-6 -left-6 w-32 h-32 bg-primary-300 rounded-full opacity-20 blur-2xl" />
            </div>
          </div>
        </div>
      </section>

      {/* ===== STATS ===== */}
      <section className="bg-primary-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-3xl md:text-4xl font-extrabold text-white">{stat.value}</p>
                <p className="mt-1 text-sm text-primary-100">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FEATURES ===== */}
      <section className="py-20 md:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="section-heading">
            {t.featuresHeading}{" "}
            <span className="text-primary-500">{t.featuresHighlight}</span> {t.featuresEnd}
          </h2>
          <p className="section-subheading">{t.featuresSubheading}</p>
          <div className="mt-16 grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature) => (
              <div key={feature.title} className="group p-6 rounded-2xl border border-neutral-200 hover:border-primary-200 hover:shadow-lg transition-all duration-300">
                <div className="w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center group-hover:bg-primary-100 transition-colors">
                  <feature.icon className="h-6 w-6 text-primary-500" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-neutral-900">{feature.title}</h3>
                <p className="mt-2 text-sm text-neutral-600 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== HOW IT WORKS ===== */}
      <section className="py-20 md:py-28 bg-neutral-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="section-heading">
            {t.howHeading} <span className="text-primary-500">{t.howHighlight}</span> {t.howEnd}
          </h2>
          <p className="section-subheading">{t.howSubheading}</p>
          <div className="mt-16 grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((s, i) => (
              <div key={s.step} className="relative text-center">
                <div className="w-16 h-16 bg-primary-500 rounded-2xl flex items-center justify-center mx-auto shadow-lg">
                  <s.icon className="h-8 w-8 text-white" />
                </div>
                <p className="mt-4 text-xs font-bold text-primary-400 uppercase tracking-wider">
                  {t.step} {s.step}
                </p>
                <h3 className="mt-2 text-lg font-semibold text-neutral-900">{s.title}</h3>
                <p className="mt-1 text-sm text-neutral-600">{s.description}</p>
                {i < steps.length - 1 && (
                  <ArrowRight className="hidden lg:block absolute top-8 -right-4 h-6 w-6 text-neutral-300" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== TESTIMONIALS SNIPPET ===== */}
      <section className="py-20 md:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="section-heading">
            {t.lovedHeading} <span className="text-primary-500">{t.lovedHighlight}</span> {t.lovedEnd}
          </h2>
          <p className="section-subheading">{t.lovedSubheading}</p>
          <div className="mt-16 grid md:grid-cols-3 gap-8">
            {[
              { name: "Marie N.", role: t.householdUser, quote: t.quote1, rating: 5 },
              { name: "Jean-Paul K.", role: t.wasteCollector, quote: t.quote2, rating: 5 },
              { name: "Aisha D.", role: t.householdUser, quote: t.quote3, rating: 4 },
            ].map((item) => (
              <div key={item.name} className="p-6 rounded-2xl bg-neutral-50 border border-neutral-100">
                <div className="flex gap-1 mb-3">
                  {Array.from({ length: item.rating }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-accent-400 text-accent-400" />
                  ))}
                </div>
                <p className="text-sm text-neutral-700 italic leading-relaxed">&ldquo;{item.quote}&rdquo;</p>
                <div className="mt-4 flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                    <Users className="h-5 w-5 text-primary-500" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-neutral-900">{item.name}</p>
                    <p className="text-xs text-neutral-500">{item.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Link href={`${p}/testimonials`} className="text-primary-500 font-semibold hover:underline inline-flex items-center gap-1">
              {t.readMore}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section className="py-20 md:py-28 bg-gradient-to-r from-primary-600 to-primary-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Recycle className="h-14 w-14 text-white/80 mx-auto mb-6" />
          <h2 className="text-3xl md:text-4xl font-bold text-white">{t.ctaHeading}</h2>
          <p className="mt-4 text-lg text-primary-100 max-w-xl mx-auto">{t.ctaDesc}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link href={`${p}/download`} className="inline-flex items-center justify-center px-8 py-3.5 bg-white text-primary-600 font-semibold rounded-lg hover:bg-neutral-100 transition-colors shadow-lg">
              {t.downloadApp}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
            <Link href={`${p}/contact`} className="inline-flex items-center justify-center px-8 py-3.5 border-2 border-white/40 text-white font-semibold rounded-lg hover:bg-white/10 transition-colors">
              {t.contactUs}
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
