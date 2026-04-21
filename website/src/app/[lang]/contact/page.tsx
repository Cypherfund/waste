import { getDictionary } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";
import ContactForm from "@/components/ContactForm";
import { Mail, Phone, MapPin, Clock, MessageSquare } from "lucide-react";

export default async function ContactPage({ params }: { params: { lang: Locale } }) {
  const dict = await getDictionary(params.lang);
  const t = dict.contact;

  return (
    <>
      {/* Header */}
      <section className="bg-gradient-to-br from-primary-50 via-white to-primary-50 py-16 md:py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold text-neutral-900">
            {t.heading} <span className="text-primary-500">{t.headingHighlight}</span>
          </h1>
          <p className="mt-4 text-lg text-neutral-600 max-w-2xl mx-auto">{t.subheading}</p>
        </div>
      </section>

      {/* Contact Content */}
      <section className="py-16 md:py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-5 gap-12">
            {/* Contact Info */}
            <div className="md:col-span-2">
              <h2 className="text-2xl font-bold text-neutral-900">{t.infoTitle}</h2>
              <p className="mt-3 text-sm text-neutral-600 leading-relaxed">{t.infoDesc}</p>

              <div className="mt-8 space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center shrink-0">
                    <Mail className="h-5 w-5 text-primary-500" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-neutral-900">{t.email}</p>
                    <a href="mailto:hello@kmertrash.cm" className="text-sm text-primary-500 hover:underline">
                      hello@kmertrash.cm
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center shrink-0">
                    <Phone className="h-5 w-5 text-primary-500" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-neutral-900">{t.phone}</p>
                    <p className="text-sm text-neutral-600">+237 6XX XXX XXX</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center shrink-0">
                    <MapPin className="h-5 w-5 text-primary-500" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-neutral-900">{t.office}</p>
                    <p className="text-sm text-neutral-600">Douala, Cameroon</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center shrink-0">
                    <Clock className="h-5 w-5 text-primary-500" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-neutral-900">{t.hours}</p>
                    <p className="text-sm text-neutral-600">{t.monFri}</p>
                    <p className="text-sm text-neutral-600">{t.sat}</p>
                  </div>
                </div>
              </div>

              <div className="mt-8 p-4 bg-primary-50 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <MessageSquare className="h-4 w-4 text-primary-500" />
                  <p className="text-sm font-semibold text-primary-700">{t.inAppSupport}</p>
                </div>
                <p className="text-xs text-primary-600">{t.inAppDesc}</p>
              </div>
            </div>

            {/* Contact Form */}
            <div className="md:col-span-3">
              <ContactForm dict={t} />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
