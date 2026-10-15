import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { ApplyLink, Eyebrow, SiteShell, ctaPrimary } from "@/components/site/SiteChrome";
import { supabase } from "@/integrations/supabase/client";
import { publicPageHead } from "@/lib/seo";

export const Route = createFileRoute("/contact")({
  head: () =>
    publicPageHead({
      path: "/contact",
      title: "Speak with MotherlandMatch — Contact",
      description:
        "Send a private note to the MotherlandMatch team. This is not an application; it is a direct line to staff.",
      ogDescription: "A direct, private line to the MotherlandMatch team.",
    }),
  component: ContactPage,
});

const fieldClass =
  "h-[56px] w-full rounded-[10px] border border-sand-deep bg-white px-4 text-[17px] text-charcoal outline-none transition-colors placeholder:text-taupe focus:border-burgundy focus:ring-2 focus:ring-burgundy/25";

function ContactPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (fullName.trim().length < 1) return setError("Please tell us your name.");
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError("Please enter a valid email address.");
    if (message.trim().length < 5) return setError("Please write a short message.");

    setSending(true);
    const { error: insertError } = await supabase.from("contact_messages").insert({
      full_name: fullName.trim(),
      email: email.trim(),
      phone: phone.trim() ? phone.trim() : null,
      message: message.trim(),
    });
    setSending(false);

    if (insertError) {
      setError("We could not send your message just now. Please try again in a moment.");
      return;
    }
    setSent(true);
  }

  return (
    <SiteShell>
      <section className="mx-auto max-w-[1200px] px-6 py-20 sm:py-28">
        <div className="grid gap-14 lg:grid-cols-[0.95fr_1.05fr] lg:gap-24">
          <div>
            <Eyebrow>Contact</Eyebrow>
            <h1 className="mt-7 max-w-[18ch] font-display text-[44px] leading-[1.07] font-semibold text-charcoal sm:text-[58px]">
              Speak with MotherlandMatch.
            </h1>
            <p className="mt-7 max-w-[52ch] text-[18px] leading-relaxed text-charcoal">
              This is a direct line to our team — for questions about the service, about privacy, or
              about whether MotherlandMatch is right for you.
            </p>
            <p className="mt-5 max-w-[52ch] text-[17px] leading-relaxed text-taupe">
              This is not an application. If you are ready to be considered, the application asks
              far more of you — and it is the only route into the matchmaking process.
            </p>
            <div className="mt-9">
              <ApplyLink className={ctaPrimary}>Begin your application</ApplyLink>
            </div>
          </div>

          <div className="rounded-[16px] border border-sand-deep/80 bg-white px-6 py-10 sm:px-10 sm:py-12">
            {sent ? (
              <div>
                <h2 className="font-display text-[30px] font-semibold text-charcoal">
                  Your message has reached us.
                </h2>
                <p className="mt-4 text-[17px] leading-relaxed text-charcoal">
                  A member of the MotherlandMatch team will read it and reply to{" "}
                  <span className="font-medium">{email.trim()}</span>.
                </p>
                <p className="mt-4 text-[16px] text-taupe">
                  Messages are handled privately by MotherlandMatch.
                </p>
              </div>
            ) : (
              <form onSubmit={submit} noValidate className="space-y-7">
                <div>
                  <label htmlFor="c-name" className="block text-[16px] font-medium text-charcoal">
                    Your name
                  </label>
                  <input
                    id="c-name"
                    className={`${fieldClass} mt-2.5`}
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    autoComplete="name"
                  />
                </div>

                <div>
                  <label htmlFor="c-email" className="block text-[16px] font-medium text-charcoal">
                    Email
                  </label>
                  <input
                    id="c-email"
                    type="email"
                    className={`${fieldClass} mt-2.5`}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                  />
                </div>

                <div>
                  <label htmlFor="c-phone" className="block text-[16px] font-medium text-charcoal">
                    Phone
                  </label>
                  <input
                    id="c-phone"
                    type="tel"
                    className={`${fieldClass} mt-2.5`}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    autoComplete="tel"
                  />
                  <p className="mt-2 text-[14px] text-taupe">Optional.</p>
                </div>

                <div>
                  <label
                    htmlFor="c-message"
                    className="block text-[16px] font-medium text-charcoal"
                  >
                    Message
                  </label>
                  <textarea
                    id="c-message"
                    rows={6}
                    className="mt-2.5 w-full rounded-[10px] border border-sand-deep bg-white px-4 py-3 text-[17px] leading-relaxed text-charcoal outline-none transition-colors placeholder:text-taupe focus:border-burgundy focus:ring-2 focus:ring-burgundy/25"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                  />
                </div>

                {error && <p className="text-[15px] font-medium text-wine-red">{error}</p>}

                <button type="submit" disabled={sending} className={`${ctaPrimary} w-full sm:w-auto`}>
                  {sending ? "Sending…" : "Send message"}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
