import type { Metadata } from "next";
import { HelpForm } from "@/components/HelpForm";

export const metadata: Metadata = {
  title: "Get help - Tourly",
  description:
    "Refunds, re-cuts and questions about your tour. Send a message and we will get back to you.",
  robots: { index: false, follow: true },
};

/**
 * The support channel the emails point at.
 *
 * Exists because there is no monitored inbox: messages go to Telegram, which
 * reaches a phone in seconds. Every "reply to this email" the nurture sequence
 * used to say now links here instead, so the refund guarantee has somewhere
 * real to land.
 */
export default function HelpPage() {
  return (
    <div className="tourly flex min-h-screen flex-col bg-cream text-ink">
      <div className="mx-auto w-full max-w-[520px] px-5 py-14">
        <p className="font-display text-[21px] font-bold tracking-[-0.02em]">
          Tourly
        </p>

        <h1 className="font-display mt-7 text-[30px] font-bold leading-[1.12] tracking-[-0.02em]">
          Need a hand?
        </h1>
        <p className="mt-3 text-[15px] leading-[1.55] text-ink-soft">
          Refunds, re-cuts, or anything that came back looking wrong. Send it
          here and it reaches a person, not a ticket queue.
        </p>

        <HelpForm />

        <div className="mt-10 border-t border-line pt-6">
          <p className="text-[13.5px] leading-[1.55] text-ink-soft">
            <strong className="text-ink">Want a refund?</strong> Say so and
            you&rsquo;ll get one, within 30 days of your order, no questions.
            You keep the files either way.
          </p>
          <p className="mt-3 text-[13.5px] leading-[1.55] text-ink-soft">
            <strong className="text-ink">Not happy with the cut?</strong> Say
            what looked wrong and we&rsquo;ll re-run it from your photos at no
            charge.
          </p>
        </div>
      </div>
    </div>
  );
}
