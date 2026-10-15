import { createFileRoute, Link } from "@tanstack/react-router";

import {
  ApplyLink,
  Eyebrow,
  SiteShell,
  ctaPrimary,
  ctaQuietDark,
} from "@/components/site/SiteChrome";
import { publicPageHead } from "@/lib/seo";

export const Route = createFileRoute("/membership")({
  head: () =>
    publicPageHead({
      path: "/membership",
      title: "Membership — MotherlandMatch",
      description:
        "Membership at MotherlandMatch is discussed after your application has been reviewed by a matchmaker. Apply first; the conversation follows.",
      ogDescription: "Membership is discussed after application review. Apply first.",
    }),
  component: MembershipPage,
});

function MembershipPage() {
  return (
    <SiteShell>
      <section className="border-b border-sand-deep/70">
        <div className="mx-auto max-w-[1200px] px-6 py-24 sm:py-32">
          <Eyebrow>Membership</Eyebrow>
          <h1 className="mt-7 max-w-[24ch] font-display text-[44px] leading-[1.07] font-semibold text-charcoal sm:text-[60px]">
            We do not sell membership to someone we have not met.
          </h1>
          <p className="mt-7 max-w-[58ch] text-[19px] leading-relaxed text-charcoal">
            Membership is discussed with you after a matchmaker has reviewed your application. That
            conversation is direct, private, and specific to your situation.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-[1200px] px-6 py-20 sm:py-28">
        <div className="grid gap-14 lg:grid-cols-[1fr_1fr] lg:gap-24">
          <div>
            <Eyebrow>Why it works this way</Eyebrow>
            <p className="mt-5 max-w-[56ch] text-[19px] leading-relaxed text-charcoal">
              A matchmaking house that takes payment before reading an application is selling access,
              not judgment. We review first and are honest about whether we can serve you well.
            </p>
            <p className="mt-5 max-w-[56ch] text-[19px] leading-relaxed text-charcoal">
              If we cannot, we will say so. If we can, a matchmaker will speak with you about
              membership before anything is agreed.
            </p>
          </div>

          <div className="border-t border-gold/60 pt-8">
            <h2 className="font-display text-[30px] font-semibold text-charcoal">
              What happens in order
            </h2>
            <ol className="mt-6 space-y-5 text-[18px] leading-relaxed text-charcoal">
              <li className="border-b border-sand-deep/80 pb-5">You apply privately.</li>
              <li className="border-b border-sand-deep/80 pb-5">
                A matchmaker reviews your application.
              </li>
              <li className="border-b border-sand-deep/80 pb-5">
                If we accept you, a matchmaker may begin considering introductions.
              </li>
              <li className="border-b border-sand-deep/80 pb-5">
                Membership is discussed with you directly. Terms are set in that conversation.
              </li>
            </ol>
            <p className="mt-6 max-w-[46ch] text-[16px] text-taupe">
              There is no public checkout. When payment is appropriate, MotherlandMatch will provide
              you with a secure payment link.
            </p>
          </div>
        </div>
      </section>

      <section className="border-t border-sand-deep/70 bg-sand">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-8 px-6 py-20 sm:py-24 lg:flex-row lg:items-center lg:justify-between">
          <h2 className="max-w-[26ch] font-display text-[34px] leading-tight font-semibold text-charcoal sm:text-[42px]">
            Apply first. Pricing comes later.
          </h2>
          <div className="flex flex-wrap gap-4">
            <ApplyLink className={ctaPrimary}>Begin your application</ApplyLink>
            <Link to="/contact" className={ctaQuietDark}>
              Ask a question
            </Link>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
