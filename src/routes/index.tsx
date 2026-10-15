import { createFileRoute, Link } from "@tanstack/react-router";

import heroCouple from "@/assets/hero-motherland-2.jpg";
import humanJudgment from "@/assets/human-judgment-3.jpg";
import midConversation from "@/assets/mid-conversation.jpg";
import {
  ApplyLink,
  Eyebrow,
  SiteShell,
  ctaPrimary,
  ctaQuietDark,
  ctaQuietLight,
} from "@/components/site/SiteChrome";
import { SITE_ORIGIN, publicPageHead } from "@/lib/seo";

export const Route = createFileRoute("/")({
  head: () => ({
    ...publicPageHead({
      path: "/",
      title: "MotherlandMatch — Private Matchmaking, Handpicked Not Swiped",
      description:
        "Private, human-led matchmaking for Africans, people of African descent, and the global African diaspora seeking marriage-minded partnership.",
      ogDescription:
        "Handpicked, not swiped. Human matchmakers, no public profiles, applications handled privately.",
    }),
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "MotherlandMatch",
          url: SITE_ORIGIN,
        }),
      },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  return (
    <SiteShell>
      {/* Hero — full bleed, dark burgundy, ivory type */}
      <section className="relative isolate overflow-hidden bg-wine lg:flex lg:min-h-[56.41vw] lg:items-center">
        <img
          src={heroCouple}
          alt="A couple seated close together on a burgundy sofa against a deep wine wall, the man looking toward the woman"
          width={1872}
          height={1056}
          loading="eager"
          fetchPriority="high"
          decoding="async"
          className="block h-auto w-full lg:absolute lg:inset-y-0 lg:right-0 lg:h-full lg:w-1/2 lg:object-cover lg:object-right"
        />
        {/* Soften the vertical join: narrow wine gradient on the photo's left edge only */}
        <div
          aria-hidden="true"
          className="pointer-events-none hidden lg:absolute lg:inset-y-0 lg:right-1/2 lg:block lg:w-[11%] bg-[linear-gradient(90deg,#3b101f_0%,rgba(59,16,31,0.55)_45%,rgba(59,16,31,0)_100%)]"
        />
        <div className="relative mx-auto grid w-full max-w-[1200px] px-6 py-12 sm:py-16 lg:grid-cols-2 lg:py-20">
          <div className="min-w-0 max-w-[46rem] lg:max-w-none lg:pr-8">
            <Eyebrow>Private matchmaking house</Eyebrow>
            <h1 className="mt-7 max-w-[13ch] font-display text-[36px] leading-[1.05] font-semibold hyphens-none text-ivory sm:max-w-[11ch] sm:text-[40px] lg:max-w-none lg:text-[40px] xl:text-[44px]">
              <span className="lg:whitespace-nowrap">Marriage-minded introductions,</span>{" "}
              <span className="lg:block">made by people who read</span>{" "}
              <span className="lg:block">your whole story.</span>
            </h1>
            <p className="mt-7 max-w-[52ch] text-[19px] leading-relaxed text-ivory/90">
              For Africans, people of African descent, and the global African diaspora. Handpicked,
              not swiped.
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <ApplyLink className="inline-flex h-[56px] items-center justify-center rounded-[10px] bg-burgundy px-8 text-[16px] font-semibold text-ivory transition-colors duration-300 hover:bg-wine">
                Begin your application
              </ApplyLink>
              <Link to="/how-it-works" className={ctaQuietLight}>
                How it works
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Proposition — asymmetric, no card */}
      <section className="mx-auto max-w-[1200px] px-6 py-28 sm:py-40">
        <div className="grid gap-10 lg:grid-cols-[0.72fr_1.28fr] lg:gap-24">
          <p className="max-w-[17ch] font-display text-[25px] leading-snug text-charcoal sm:text-[28px]">
            Why this house exists.
          </p>
          <div className="lg:border-l lg:border-sand-deep lg:pl-16">
            <p className="font-display text-[30px] leading-[1.3] text-charcoal sm:text-[38px]">
              Serious people are tired of proving themselves to strangers in a feed.
            </p>
            <p className="mt-6 max-w-[62ch] text-[19px] leading-relaxed text-charcoal">
              MotherlandMatch is a private matchmaking house, not an app. You tell us who you are and
              what you are looking for. A matchmaker reads it, considers it against the people we
              have already met, and introduces you deliberately — or not at all.
            </p>
            <p className="mt-6 max-w-[42ch] font-display text-[24px] leading-[1.3] text-charcoal sm:text-[30px]">
              You have built a life. The apps keep sending people who do not understand the world you come
              from. You need more than another profile.
            </p>
          </div>
        </div>
      </section>

      {/* Three promises — no icon tiles */}
      <section className="border-y border-sand-deep/70 bg-sand">
        <div className="mx-auto grid max-w-[1200px] gap-12 px-6 py-20 sm:py-28 md:grid-cols-3 md:gap-16">
          {[
            {
              title: "Private",
              body:
                "No public profiles, no browsing, no discovery grid. Your application is read by matchmakers, not by an audience.",
            },
            {
              title: "Reviewed",
              body:
                "Every application is reviewed by a person before anything else happens. There is no score deciding your worth.",
            },
            {
              title: "Handpicked",
              body:
                "Introductions are proposed one at a time, with a reason behind them, and only when both people agree to proceed.",
            },
          ].map((promise) => (
            <div key={promise.title} className="border-t border-sand-deep pt-6">
              <h2 className="font-display text-[30px] font-semibold text-charcoal">
                {promise.title}
              </h2>
              <p className="mt-3 max-w-[42ch] text-[17px] leading-relaxed text-charcoal">
                {promise.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Editorial still — adult diaspora courtship, mid-conversation */}
      <section className="bg-ivory pt-24 pb-16 sm:pt-32 sm:pb-24">
        <img
          src={midConversation}
          alt="Two well-dressed adults in quiet conversation across a dinner table"
          width={1872}
          height={1056}
          loading="lazy"
          decoding="async"
          className="block aspect-[5/4] w-full object-cover object-center sm:aspect-[16/10]"
        />
      </section>

      {/* How it works teaser */}
      <section className="mx-auto max-w-[1200px] px-6 pt-20 pb-28 sm:pt-28 sm:pb-40">
        <div className="grid items-start gap-16 lg:grid-cols-[1fr_0.82fr] lg:gap-28">
          <div>
            <Eyebrow>The short version</Eyebrow>
            <h2 className="mt-6 font-display text-[38px] leading-tight font-semibold text-charcoal sm:text-[48px]">
              Apply privately. A matchmaker reviews. An introduction is proposed.
            </h2>
            <p className="mt-6 max-w-[58ch] text-[18px] leading-relaxed text-charcoal">
              Nothing is exchanged automatically. You receive only the information appropriate to the
              stage you are at, and you decide at every step.
            </p>
            <Link to="/how-it-works" className={`${ctaQuietDark} mt-9`}>
              Read the full process
            </Link>
          </div>

          <ol className="space-y-7 lg:mt-3">
            {[
              ["01", "Apply privately"],
              ["02", "Your application is reviewed"],
              ["03", "We search thoughtfully"],
              ["04", "An introduction is proposed"],
            ].map(([n, label]) => (
              <li key={n} className="flex items-baseline gap-6 border-b border-sand-deep/80 pb-5">
                <span className="font-display text-[22px] text-gold">{n}</span>
                <span className="text-[20px] text-charcoal">{label}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Why human matchmaking — editorial, image left */}
      <section className="bg-sand mb-12">
        <div className="mx-auto flex max-w-none flex-col gap-0 lg:flex-row lg:items-end">
          <img
            src={humanJudgment}
            alt="A matchmaker seated at a wooden table, writing on a sheet of paper beside her phone"
            width={1792}
            height={1104}
            loading="lazy"
            decoding="async"
            className="block w-full aspect-[1792/1104] object-contain object-center lg:aspect-auto lg:h-[min(480px,27.7vw)] lg:w-auto xl:h-[min(480px,33.9vw)]"
          />
          <div className="flex flex-1 items-center px-6 py-12 sm:px-14 lg:px-20 lg:pb-0 lg:pt-12">
            <div className="max-w-[52ch]">
              <Eyebrow>Human judgment</Eyebrow>
              <h2 className="mt-6 font-display text-[36px] leading-tight font-semibold text-charcoal sm:text-[44px]">
                Software can sort. It cannot judge.
              </h2>
              <p className="mt-6 text-[18px] leading-relaxed text-charcoal">
                Faith, career, family, and where you will build a life can all decide whether an
                introduction is worth making. Some things are firm. Some things depend on the
                person. A form can write them down. It cannot decide how they fit.
              </p>
              <p className="mt-5 text-[18px] leading-relaxed text-charcoal">
                That is the work of our matchmakers. They look at what matters most to you, where
                you have flexibility, and how those things fit together.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Membership teaser — no prices, no plan cards */}
      <section className="border-t border-sand-deep/70">
        <div className="mx-auto grid max-w-[1200px] gap-10 px-6 py-28 sm:py-36 lg:grid-cols-[0.72fr_1.28fr] lg:gap-24">
          <p className="font-display text-[28px] leading-tight text-charcoal">Membership</p>
          <div className="max-w-[42rem] lg:border-l lg:border-sand-deep lg:pl-16">
            <h2 className="font-display text-[36px] leading-tight font-semibold text-charcoal sm:text-[44px]">
              Membership is discussed after your application is reviewed.
            </h2>
            <p className="mt-6 max-w-[58ch] text-[18px] leading-relaxed text-charcoal">
              We do not sell a plan to someone we have not met. Apply first; if we can serve you
              well, a matchmaker will talk through membership with you directly.
            </p>
            <Link to="/membership" className={`${ctaQuietDark} mt-9`}>
              About membership
            </Link>
          </div>
        </div>
      </section>

      {/* Final CTA — full bleed dark */}
      <section className="bg-wine">
        <div className="mx-auto max-w-[1200px] px-6 py-24 text-center sm:py-32">
          <h2 className="mx-auto max-w-[21ch] font-display text-[40px] leading-[1.08] font-semibold text-ivory sm:text-[54px]">
            You don't need more profiles.
            <span className="block">You need the right introduction.</span>
          </h2>
          <p className="mx-auto mt-6 max-w-[44ch] text-[18px] text-ivory/85">
            A private, considered path for people seeking marriage.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <ApplyLink className={ctaPrimary}>Begin your application</ApplyLink>
            <Link to="/contact" className={ctaQuietLight}>
              Speak with MotherlandMatch
            </Link>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
