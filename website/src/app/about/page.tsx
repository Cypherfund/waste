"use client";

import { Heart, Lightbulb, Leaf, ShieldCheck } from "lucide-react";
import { useDictionary } from "@/i18n/DictionaryProvider";

export default function AboutPage() {
  const { dict } = useDictionary();
  const t = dict.about;

  const values = [
    { icon: Heart, title: t.communityTitle, desc: t.communityDesc },
    { icon: Lightbulb, title: t.innovationTitle, desc: t.innovationDesc },
    { icon: Leaf, title: t.sustainTitle, desc: t.sustainDesc },
    { icon: ShieldCheck, title: t.qualityTitle, desc: t.qualityDesc },
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
          <h2 className="text-2xl md:text-3xl font-extrabold text-neutral-900 mb-6">{t.storyHeading}</h2>
          <div className="space-y-4 text-neutral-600 leading-relaxed">
            <p>{t.storyP1}</p>
            <p>{t.storyP2}</p>
            <p>{t.storyP3}</p>
          </div>
          <p className="mt-6 text-sm text-primary-500 font-medium">{t.since}</p>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="py-16 md:py-20 bg-neutral-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-white rounded-2xl p-8 border border-neutral-200">
              <h3 className="text-xl font-bold text-neutral-900 mb-3">{t.missionTitle}</h3>
              <p className="text-neutral-600 leading-relaxed">{t.missionDesc}</p>
            </div>
            <div className="bg-white rounded-2xl p-8 border border-neutral-200">
              <h3 className="text-xl font-bold text-neutral-900 mb-3">{t.visionTitle}</h3>
              <p className="text-neutral-600 leading-relaxed">{t.visionDesc}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-16 md:py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl md:text-3xl font-extrabold text-neutral-900 text-center mb-12">
            {t.valuesHeading} <span className="text-primary-500">{t.valuesHighlight}</span>
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((v) => (
              <div key={v.title} className="text-center p-6">
                <div className="w-14 h-14 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <v.icon className="h-7 w-7 text-primary-500" />
                </div>
                <h3 className="text-lg font-bold text-neutral-900">{v.title}</h3>
                <p className="mt-2 text-sm text-neutral-600">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="py-16 md:py-20 bg-neutral-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-extrabold text-neutral-900">
              {t.teamHeading} <span className="text-primary-500">{t.teamHighlight}</span>
            </h2>
            <p className="mt-3 text-neutral-600">{t.teamSubheading}</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {team.map((m) => (
              <div key={m.name} className="bg-white rounded-2xl p-6 border border-neutral-200 text-center">
                <div className="w-20 h-20 bg-primary-100 rounded-full mx-auto mb-4 flex items-center justify-center text-primary-600 text-2xl font-bold">
                  {m.name.split(" ").map((n: string) => n[0]).join("")}
                </div>
                <h3 className="text-lg font-bold text-neutral-900">{m.name}</h3>
                <p className="text-sm text-primary-500 font-medium">{m.role}</p>
                <p className="mt-3 text-sm text-neutral-600">{m.bio}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
