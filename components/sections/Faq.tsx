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
    q: "Can I use it on the MLS?",
    a: "Yes — the tour is yours to post on the MLS, Instagram, TikTok, YouTube, Facebook, or anywhere else you market the listing.",
  },
  {
    q: "What formats do I get?",
    a: "Both a vertical cut for Reels and TikTok and a horizontal cut for YouTube and the MLS.",
  },
  {
    q: "What if I don't like it?",
    a: "Then you don't pay — request a refund from the checkout receipt and we return every cent. You keep the tour anyway.",
  },
];

export function Faq() {
  return (
    <section id="faq" className="border-t border-line bg-paper px-5 py-11">
      <h2 className="font-display text-center text-2xl font-semibold text-ink">
        Questions, answered
      </h2>

      <div className="mt-[22px] border-t border-line">
        {FAQS.map((item) => (
          <details key={item.q} className="group border-b border-line">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 py-4 text-[15px] font-medium text-ink">
              {item.q}
              <span className="shrink-0 text-[22px] text-ink-soft transition-transform group-open:rotate-45">
                +
              </span>
            </summary>
            <p className="mb-4 text-sm leading-[1.6] text-ink-soft">{item.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
