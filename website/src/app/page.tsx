"use client";

import Link from "next/link";
import {
  Calendar,
  MapPin,
  Star,
  Shield,
  WifiOff,
  Users,
  Truck,
  CheckCircle,
  ArrowRight,
  ChevronRight,
  Smartphone,
  Clock,
  Award,
} from "lucide-react";
import { useDictionary } from "@/i18n/DictionaryProvider";

export default function HomePage() {
  const { dict } = useDictionary();
  const t = dict.home;

  const stats = [
    { value: "2,500+", label: t.householdsServed },
    { value: "150+", label: t.activeCollectors },
    { value: "45,000+", label: t.pickupsCompleted },
    { value: "4.8/5", label: t.averageRating },
  ];

  const features = [
    { icon: Calendar, title: t.scheduleTitle, desc: t.scheduleDesc },
    { icon: MapPin, title: t.trackingTitle, desc: t.trackingDesc },
    { icon: Users, title: t.collectorsTitle, desc: t.collectorsDesc },
    { icon: Star, title: t.rateTitle, desc: t.rateDesc },
    { icon: Shield, title: t.secureTitle, desc: t.secureDesc },
    { icon: WifiOff, title: t.offlineTitle, desc: t.offlineDesc },
  ];

  const steps = [
    { n: 1, title: t.step1Title, desc: t.step1Desc, icon: Smartphone },
    { n: 2, title: t.step2Title, desc: t.step2Desc, icon: Calendar },
    { n: 3, title: t.step3Title, desc: t.step3Desc, icon: Truck },
    { n: 4, title: t.step4Title, desc: t.step4Desc, icon: CheckCircle },
  ];

  const testimonials = [
    { quote: t.quote1, name: "Marie T.", role: t.householdUser, rating: 5 },
    { quote: t.quote2, name: "Jean-Pierre K.", role: t.wasteCollector, rating: 5 },
    { quote: t.quote3, name: "Amina B.", role: t.householdUser, rating: 5 },
  ];

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-50 via-white to-primary-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-primary-100 text-primary-700 px-4 py-1.5 rounded-full text-sm font-medium mb-6">
                <Award className="h-4 w-4" />
                {t.badge}
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-neutral-900 leading-tight">
                {t.heroTitle}{" "}
                <span className="text-primary-500">{t.heroHighlight}</span>
              </h1>
              <p className="mt-6 text-lg text-neutral-600 leading-relaxed max-w-lg">
                {t.heroDesc}
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <Link href="/download" className="btn-primary">
                  {t.downloadNow}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
                <Link href="/guides" className="btn-secondary">
                  {t.learnHow}
                </Link>
              </div>
              <div className="mt-8 flex items-center gap-6 text-sm text-neutral-500">
                <span className="flex items-center gap-1"><CheckCircle className="h-4 w-4 text-primary-500" />{t.freeToUse}</span>
                <span className="flex items-center gap-1"><Smartphone className="h-4 w-4 text-primary-500" />{t.iosAndroid}</span>
                <span className="flex items-center gap-1"><WifiOff className="h-4 w-4 text-primary-500" />{t.offlineSupport}</span>
              </div>
            </div>
            <div className="relative hidden md:block">
              <div className="bg-white rounded-3xl shadow-2xl p-6 max-w-sm mx-auto border border-neutral-100">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-primary-500 rounded-xl flex items-center justify-center">
                    <Truck className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="font-bold text-neutral-900">{t.phoneName}</p>
                    <p className="text-xs text-neutral-500">{t.phoneSubtitle}</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="bg-primary-50 rounded-xl p-4 flex items-center gap-3">
                    <Clock className="h-5 w-5 text-primary-500" />
                    <div><p className="text-sm font-medium text-neutral-900">{t.nextPickup}</p><p className="text-xs text-neutral-500">{t.nextPickupTime}</p></div>
                  </div>
                  <div className="bg-green-50 rounded-xl p-4 flex items-center gap-3">
                    <MapPin className="h-5 w-5 text-green-500" />
                    <div><p className="text-sm font-medium text-neutral-900">{t.collectorEnRoute}</p><p className="text-xs text-neutral-500">{t.collectorEta}</p></div>
                  </div>
                  <div className="bg-yellow-50 rounded-xl p-4 flex items-center gap-3">
                    <Star className="h-5 w-5 text-yellow-500" />
                    <div><p className="text-sm font-medium text-neutral-900">{t.rateLastPickup}</p><p className="text-xs text-neutral-500">{t.rateSubtitle}</p></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-primary-600 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {stats.map((s) => (
              <div key={s.label}>
                <p className="text-3xl font-extrabold text-white">{s.value}</p>
                <p className="mt-1 text-sm text-primary-100">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-extrabold text-neutral-900">
              {t.featuresHeading} <span className="text-primary-500">{t.featuresHighlight}</span> {t.featuresEnd}
            </h2>
            <p className="mt-4 text-lg text-neutral-600">{t.featuresSubheading}</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((f) => (
              <div key={f.title} className="bg-neutral-50 rounded-2xl p-6 hover:shadow-lg transition-shadow border border-neutral-100">
                <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center mb-4">
                  <f.icon className="h-6 w-6 text-primary-500" />
                </div>
                <h3 className="text-lg font-bold text-neutral-900">{f.title}</h3>
                <p className="mt-2 text-sm text-neutral-600 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 md:py-24 bg-neutral-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-extrabold text-neutral-900">
              {t.howHeading} <span className="text-primary-500">{t.howHighlight}</span> {t.howEnd}
            </h2>
            <p className="mt-4 text-lg text-neutral-600">{t.howSubheading}</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((s) => (
              <div key={s.n} className="text-center">
                <div className="w-16 h-16 bg-primary-500 text-white rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
                  {s.n}
                </div>
                <h3 className="text-lg font-bold text-neutral-900">{s.title}</h3>
                <p className="mt-2 text-sm text-neutral-600">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Preview */}
      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-extrabold text-neutral-900">
              {t.lovedHeading} <span className="text-primary-500">{t.lovedHighlight}</span> {t.lovedEnd}
            </h2>
            <p className="mt-4 text-lg text-neutral-600">{t.lovedSubheading}</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((tm) => (
              <div key={tm.name} className="bg-neutral-50 rounded-2xl p-6 border border-neutral-100">
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: tm.rating }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-sm text-neutral-700 leading-relaxed italic">&ldquo;{tm.quote}&rdquo;</p>
                <div className="mt-4 pt-4 border-t border-neutral-200">
                  <p className="text-sm font-semibold text-neutral-900">{tm.name}</p>
                  <p className="text-xs text-neutral-500">{tm.role}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="text-center mt-10">
            <Link href="/testimonials" className="inline-flex items-center text-primary-500 font-medium hover:underline">
              {t.readMore} <ChevronRight className="ml-1 h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-primary-600 py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-extrabold text-white">{t.ctaHeading}</h2>
          <p className="mt-4 text-lg text-primary-100">{t.ctaDesc}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link href="/download" className="bg-white text-primary-600 px-8 py-3 rounded-xl font-semibold hover:bg-primary-50 transition-colors">
              {t.downloadApp}
            </Link>
            <Link href="/contact" className="border-2 border-white text-white px-8 py-3 rounded-xl font-semibold hover:bg-white/10 transition-colors">
              {t.contactUs}
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
