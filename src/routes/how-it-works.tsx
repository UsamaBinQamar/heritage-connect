import { createFileRoute, Link } from "@tanstack/react-router";

import {
  ApplyLink,
  Eyebrow,
  SiteShell,
  ctaPrimary,
  ctaQuietLight,
} from "@/components/site/SiteChrome";
import { publicPageHead } from "@/lib/seo";

export const Route = createFileRoute("/how-it-works")({
  head: () =>
    publicPageHead({
      path: "/how-it-works",
      title: "How It Works — MotherlandMatch Private Matchmaking",
      description:
        "Six steps: apply privately, a matchmaker reviews you, we search thoughtfully, an introduction is proposed, you both decide, you meet and give feedback.",
      ogDescription:
        "From private application to a proposed introduction — the process, step by step.",
    }),
  component: HowItWorksPage,
});

const STEPS = [
  {
    n: "01",
    title: "Apply privately",
    body: "Tell us about yourself and what you are looking for. Your application is not published anywhere and is not browsable by other members.",
  },
  {
    n: "02",
    title: "Your application is reviewed",
    body: "A MotherlandMatch matchmaker reviews the person, not a score. Nothing moves forward until that review has happened.",
  },
  {
    n: "03",
    title: "We search thoughtfully",
    body: "The matchmaker uses your structured preferences, the priorities you set, and professional judgment about who is actually worth considering.",
  },
  {
    n: "04",
    title: "An introduction is proposed",
    body: "You receive only the information appropriate to that stage — enough to make a considered decision, and no more.",
  },
  {
    n: "05",
    title: "You both decide",
    body: "No contact is exchanged simply because the matchmaker proposes someone. The introduction proceeds only when both people agree to it.",
  },
  {
    n: "06",
    title: "Meet and give feedback",
    body: "After you meet, you tell the matchmaker how it went. Feedback helps the matchmaker understand what to consider next.",
  },
];

function HowItWorksPage() {
  return (
    <SiteShell>
      <section className="bg-wine">
        <div className="mx-auto max-w-[1200px] px-6 py-24 sm:py-32">
          <Eyebrow>The process</Eyebrow>
          <h1 className="mt-7 max-w-[20ch] font-display text-[46px] leading-[1.06] font-semibold text-ivory sm:text-[64px]">
            Six steps, each one decided by a person.
          </h1>
          <p className="mt-7 max-w-[56ch] text-[19px] leading-relaxed text-ivory/90">
            There is no matching engine, no queue of profiles and no discovery feed. There is an
            application, a matchmaker, and an introduction proposed on purpose.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-[1100px] px-6 py-20 sm:py-28">
        <ol className="space-y-14 sm:space-y-16">
          {STEPS.map((step, i) => (
            <li
              key={step.n}
              className={`grid gap-6 border-t border-sand-deep/80 pt-8 sm:grid-cols-[7rem_1fr] sm:gap-10 ${
                i % 2 === 1 ? "lg:ml-16" : ""
              }`}
            >
              <span className="font-display text-[34px] leading-none text-gold">{step.n}</span>
              <div>
                <h2 className="font-display text-[32px] leading-tight font-semibold text-charcoal sm:text-[38px]">
                  {step.title}
                </h2>
                <p className="mt-4 max-w-[58ch] text-[18px] leading-relaxed text-charcoal">
                  {step.body}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="border-y border-sand-deep/70 bg-sand">
        <div className="mx-auto grid max-w-[1200px] gap-10 px-6 py-20 sm:py-24 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20">
          <Eyebrow>What we do not do</Eyebrow>
          <div className="space-y-4 text-[18px] leading-relaxed text-charcoal">
            <p>There is no public profile and no member directory.</p>
            <p>There is no swiping, no browsing and no messaging between strangers.</p>
            <p>There is no compatibility percentage, because a number cannot hold a life.</p>
          </div>
        </div>
      </section>

      <section className="bg-wine">
        <div className="mx-auto max-w-[1200px] px-6 py-24 sm:py-28">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
            <h2 className="max-w-[22ch] font-display text-[36px] leading-tight font-semibold text-ivory sm:text-[46px]">
              Step one is yours.
            </h2>
            <div className="flex flex-wrap gap-4">
              <ApplyLink className={ctaPrimary}>Begin your application</ApplyLink>
              <Link to="/contact" className={ctaQuietLight}>
                Speak with MotherlandMatch
              </Link>
            </div>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
