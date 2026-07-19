import { Container } from "@/components/site/Container";

export function Guarantee() {
  return (
    <section className="bg-night py-24 text-cream sm:py-28">
      <Container className="max-w-3xl text-center">
        <p className="eyebrow text-cream/50">Zero-risk guarantee</p>
        <h2 className="font-display mt-5 text-4xl leading-tight sm:text-6xl">
          Love your tour, or it&apos;s free.
        </h2>
        <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-cream/70">
          Make your first tour. If you don&apos;t love it, you don&apos;t pay —
          and you keep it anyway. No forms, no hoops. Just email us and we
          refund every cent. The risk is entirely on us.
        </p>
      </Container>
    </section>
  );
}
