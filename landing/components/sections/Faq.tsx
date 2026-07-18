import { Container } from "@/components/site/Container";

const FAQS = [
  {
    q: "What photos work best?",
    a: "Bright, in-focus listing photos — the same ones you'd put on the MLS. Upload 10–30 and put them in the order you want the tour to flow.",
  },
  {
    q: "How long does it take?",
    a: "About 2 minutes. Upload your photos, and your finished tour is ready to download right away.",
  },
  {
    q: "Can I use the video commercially and on the MLS?",
    a: "Yes — the tour is yours to post on the MLS, Instagram, TikTok, YouTube, Facebook, or anywhere else you market the listing.",
  },
  {
    q: "What formats do I get?",
    a: "Both a vertical cut for Reels and TikTok and a horizontal cut for YouTube and the MLS — branded with your logo and contact info.",
  },
  {
    q: "Do I need any software or editing skills?",
    a: "None. If you can upload photos, you can make a tour. There's nothing to install and nothing to edit.",
  },
  {
    q: "What if I don't like it?",
    a: "Then you don't pay — request a refund from the checkout receipt and we return every cent. You keep the tour anyway.",
  },
];

export function Faq() {
  return (
    <section id="faq" className="border-t border-line bg-paper py-20">
      <Container className="max-w-2xl">
        <div className="text-center">
          <h2 className="font-display text-3xl font-semibold text-ink sm:text-4xl">
            Questions, answered
          </h2>
        </div>

        <div className="mt-10 divide-y divide-line border-y border-line">
          {FAQS.map((item) => (
            <details key={item.q} className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-lg font-medium text-ink">
                {item.q}
                <span className="shrink-0 text-2xl text-ink-soft transition-transform group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="mt-3 leading-7 text-ink-soft">{item.a}</p>
            </details>
          ))}
        </div>
      </Container>
    </section>
  );
}
