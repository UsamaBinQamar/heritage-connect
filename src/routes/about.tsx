import { createFileRoute, Link } from "@tanstack/react-router";

import aboutPortrait from "@/assets/about-portrait.jpg";
import {
  ApplyLink,
  Eyebrow,
  SiteShell,
  ctaPrimary,
  ctaQuietDark,
} from "@/components/site/SiteChrome";
import { publicPageHead } from "@/lib/seo";

export const Route = createFileRoute("/about")({
  head: () =>
    publicPageHead({
      path: "/about",
      title: "About MotherlandMatch — A Private Matchmaking House",
      description:
        "What MotherlandMatch believes, why the service exists, and who it primarily serves: Africans, people of African descent, and the global African diaspora.",
      ogDescription: "Why a human-led matchmaking house exists for the African diaspora.",
    }),
  component: AboutPage,
});


function AboutPage() {
  return (
    <SiteShell>
      <section className="border-b border-sand-deep/70">
        <div className="mx-auto max-w-[1200px] px-6 pt-24 pb-8 sm:pt-32 sm:pb-10">
          <Eyebrow>About</Eyebrow>
          <h1 className="mt-7 max-w-[22ch] font-display text-[46px] leading-[1.06] font-semibold text-charcoal sm:text-[62px]">
            Marriage deserves more care than a feed can give it.
          </h1>
        </div>
      </section>

      <section className="mx-auto max-w-[1200px] px-6 pt-12 pb-20 sm:pt-14 sm:pb-28">
        <div className="grid gap-14 lg:grid-cols-[1.1fr_0.9fr] lg:gap-20">
          <div className="space-y-16">
            <div>
              <Eyebrow>What we believe</Eyebrow>
              <p className="mt-5 max-w-[60ch] text-[19px] leading-relaxed text-charcoal">
                That a marriage-minded person should not have to perform for strangers. That privacy
                is not a feature but a precondition. And that the decision about who two people are
                introduced to belongs to a person who has read both of their stories — never to a
                score.
              </p>
            </div>

            <div>
              <Eyebrow>Why the service exists</Eyebrow>
              <p className="mt-5 max-w-[60ch] text-[19px] leading-relaxed text-charcoal">
                Serious people across the diaspora keep describing the same problem: the platforms
                are loud, public, and indifferent to intent. Faith, family, language, country, the
                question of where you will build — the things that actually decide a marriage — are
                the first things a feed discards. MotherlandMatch exists to put them back at the
                centre and to keep the search off the public internet.
              </p>
            </div>

            <div>
              <Eyebrow>Human matchmaking</Eyebrow>
              <p className="mt-5 max-w-[60ch] text-[19px] leading-relaxed text-charcoal">
                Technology organises the work: applications, preferences, priorities, the record of
                every introduction. Matchmakers make the decisions. They read the person, weigh what
                you said matters most, propose one introduction at a time with a reason, and listen
                to your feedback before considering the next.
              </p>
              <p className="mt-5 max-w-[60ch] text-[19px] leading-relaxed text-charcoal">
                Nothing is exchanged simply because a match looks plausible. Both people decide.
              </p>
            </div>

            <div>
              <Eyebrow>Who we serve</Eyebrow>
              <p className="mt-5 max-w-[60ch] text-[19px] leading-relaxed text-charcoal">
                Africans on the continent, people of African descent, and the global African
                diaspora who are looking for marriage — not for an audience. We are culturally
                specific on purpose, because heritage, faith and family expectation are not details
                to be smoothed over.
              </p>
            </div>
          </div>

          <div className="lg:pt-4">
            <img
              src={aboutPortrait}
              alt="A couple photographed closely together against a brown studio backdrop, both faces visible"
              width={1591}
              height={1920}
              loading="lazy"
              decoding="async"
              className="w-full rounded-[16px] object-cover object-top"
            />
            <p className="mt-4 max-w-[34ch] text-[15px] text-taupe">
              Applications are handled privately by MotherlandMatch.
            </p>
          </div>
        </div>
      </section>

      <section className="border-t border-sand-deep/70 bg-sand">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-8 px-6 py-20 sm:py-24 lg:flex-row lg:items-center lg:justify-between">
          <h2 className="max-w-[24ch] font-display text-[34px] leading-tight font-semibold text-charcoal sm:text-[42px]">
            The next step is an application, not a subscription.
          </h2>
          <div className="flex flex-wrap gap-4">
            <ApplyLink className={ctaPrimary}>Begin your application</ApplyLink>
            <Link to="/how-it-works" className={ctaQuietDark}>
              How it works
            </Link>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
