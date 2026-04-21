import type { Metadata } from "next";
import { Leaf, Heart, Lightbulb, Recycle, ShieldCheck, Users } from "lucide-react";
import { getDictionary } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";

export async function generateMetadata({ params }: { params: { lang: Locale } }): Promise<Metadata> {
  const dict = await getDictionary(params.lang);
  return { title: dict.about.metaTitle, description: dict.about.metaDesc };
}

export default async function AboutPage({ params }: { params: { lang: Locale } }) {
  const dict = await getDictionary(params.lang);
  const t = dict.about;

  const values = [
    { icon: Heart, title: t.communityTitle, description: t.communityDesc },
    { icon: Lightbulb, title: t.innovationTitle, description: t.innovationDesc },
    { icon: Recycle, title: t.sustainTitle, description: t.sustainDesc },
    { icon: ShieldCheck, title: t.qualityTitle, description: t.qualityDesc },
  ];

  const team = [
    { name: t.member1Name, role: t.member1Role, bio: t.member1Bio },
    { name: t.member2Name, role: t.member2Role, bio: t.member2Bio },
    { name: t.member3Name, role: t.member3Role, bio: t.member3Bio },
  ];

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

      {/* Story */}
      <section className="py-16 md:py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="section-heading">{t.storyHeading}</h2>
          <div className="mt-8 space-y-5 text-neutral-600 leading-relaxed">
            <p>{t.storyP1}</p>
            <p>{t.storyP2}</p>
            <p>{t.storyP3}</p>
          </div>
          <p className="mt-6 text-sm text-primary-500 font-medium">{t.since}</p>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="py-16 md:py-20 bg-neutral-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-white rounded-2xl border border-neutral-200 p-8">
              <div className="w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center mb-4">
                <Leaf className="h-6 w-6 text-primary-500" />
              </div>
              <h3 className="text-xl font-bold text-neutral-900">{t.missionTitle}</h3>
              <p className="mt-3 text-neutral-600 leading-relaxed">{t.missionDesc}</p>
            </div>
            <div className="bg-white rounded-2xl border border-neutral-200 p-8">
              <div className="w-12 h-12 bg-accent-50 rounded-xl flex items-center justify-center mb-4">
                <Lightbulb className="h-6 w-6 text-accent-500" />
              </div>
              <h3 className="text-xl font-bold text-neutral-900">{t.visionTitle}</h3>
              <p className="mt-3 text-neutral-600 leading-relaxed">{t.visionDesc}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-16 md:py-20 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="section-heading">
            {t.valuesHeading} <span className="text-primary-500">{t.valuesHighlight}</span>
          </h2>
          <div className="mt-12 grid sm:grid-cols-2 gap-8">
            {values.map((v) => (
              <div key={v.title} className="flex gap-4">
                <div className="w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center shrink-0">
                  <v.icon className="h-6 w-6 text-primary-500" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-neutral-900">{v.title}</h3>
                  <p className="mt-1 text-sm text-neutral-600 leading-relaxed">{v.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="py-16 md:py-20 bg-neutral-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="section-heading">
            {t.teamHeading} <span className="text-primary-500">{t.teamHighlight}</span>
          </h2>
          <p className="section-subheading">{t.teamSubheading}</p>
          <div className="mt-12 grid sm:grid-cols-3 gap-8">
            {team.map((member) => (
              <div key={member.name} className="bg-white rounded-2xl border border-neutral-200 p-6 text-center">
                <div className="w-20 h-20 bg-primary-100 rounded-full mx-auto flex items-center justify-center mb-4">
                  <Users className="h-10 w-10 text-primary-500" />
                </div>
                <h3 className="text-lg font-bold text-neutral-900">{member.name}</h3>
                <p className="text-sm text-primary-500 font-medium">{member.role}</p>
                <p className="mt-3 text-sm text-neutral-600 leading-relaxed">{member.bio}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
