import {
  BookOpen,
  Smartphone,
  CalendarCheck,
  Camera,
  Star,
  MapPin,
  WifiOff,
  HelpCircle,
} from "lucide-react";
import { getDictionary } from "@/i18n/dictionaries";
import { getLocale } from "@/i18n/getLocale";
import FAQSection from "@/components/FAQSection";

export default async function GuidesPage() {
  const dict = await getDictionary(getLocale());
  const t = dict.guides;
  const p = "";

  const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
    Smartphone, CalendarCheck, MapPin, Camera, Star, WifiOff,
  };

  const guides = [
    { icon: "Smartphone", title: t.g1Title, steps: [t.g1s1, t.g1s2, t.g1s3, t.g1s4, t.g1s5] },
    { icon: "CalendarCheck", title: t.g2Title, steps: [t.g2s1, t.g2s2, t.g2s3, t.g2s4, t.g2s5] },
    { icon: "MapPin", title: t.g3Title, steps: [t.g3s1, t.g3s2, t.g3s3, t.g3s4, t.g3s5] },
    { icon: "Camera", title: t.g4Title, steps: [t.g4s1, t.g4s2, t.g4s3, t.g4s4, t.g4s5] },
    { icon: "Star", title: t.g5Title, steps: [t.g5s1, t.g5s2, t.g5s3, t.g5s4, t.g5s5] },
    { icon: "WifiOff", title: t.g6Title, steps: [t.g6s1, t.g6s2, t.g6s3, t.g6s4, t.g6s5] },
  ];

  const faqs = [
    { question: t.faq1q, answer: t.faq1a }, { question: t.faq2q, answer: t.faq2a },
    { question: t.faq3q, answer: t.faq3a }, { question: t.faq4q, answer: t.faq4a },
    { question: t.faq5q, answer: t.faq5a }, { question: t.faq6q, answer: t.faq6a },
    { question: t.faq7q, answer: t.faq7a }, { question: t.faq8q, answer: t.faq8a },
    { question: t.faq9q, answer: t.faq9a }, { question: t.faq10q, answer: t.faq10a },
  ];

  return (
    <>
      <section className="bg-gradient-to-br from-primary-50 via-white to-primary-50 py-16 md:py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold text-neutral-900">
            {t.heading} <span className="text-primary-500">{t.headingHighlight}</span> {t.headingEnd}
          </h1>
          <p className="mt-4 text-lg text-neutral-600 max-w-2xl mx-auto">{t.subheading}</p>
        </div>
      </section>

      <section className="py-16 md:py-20 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="section-heading">
            <BookOpen className="inline h-8 w-8 text-primary-500 mr-2 -mt-1" />
            {t.stepByStep}
          </h2>
          <div className="mt-12 space-y-8">
            {guides.map((guide) => {
              const Icon = iconMap[guide.icon] || Smartphone;
              return (
                <div key={guide.title} className="bg-neutral-50 rounded-2xl border border-neutral-100 p-6 md:p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center">
                      <Icon className="h-5 w-5 text-primary-500" />
                    </div>
                    <h3 className="text-lg font-bold text-neutral-900">{guide.title}</h3>
                  </div>
                  <ol className="space-y-4">
                    {guide.steps.map((step: string, i: number) => (
                      <li key={i} className="flex items-start gap-4">
                        <span className="w-7 h-7 bg-primary-500 text-white rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                          {i + 1}
                        </span>
                        <p className="text-sm text-neutral-700 leading-relaxed pt-1">{step}</p>
                      </li>
                    ))}
                  </ol>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section id="faq" className="py-16 md:py-20 bg-neutral-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="section-heading">
            <HelpCircle className="inline h-8 w-8 text-primary-500 mr-2 -mt-1" />
            {t.faqHeading}
          </h2>
          <p className="section-subheading">
            {t.faqSub}{" "}
            <a href={`${p}/contact`} className="text-primary-500 hover:underline">{t.contactUs}</a>.
          </p>
          <FAQSection faqs={faqs} />
        </div>
      </section>
    </>
  );
}
