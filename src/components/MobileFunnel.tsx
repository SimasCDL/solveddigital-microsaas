import { PromoBar } from "@/components/site/PromoBar";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { Hero } from "@/components/sections/Hero";
import { BeforeAfter } from "@/components/sections/BeforeAfter";
import { InstantBuy } from "@/components/sections/InstantBuy";
import { HowItWorks } from "@/components/sections/HowItWorks";
import { Sample } from "@/components/sections/Sample";
import { ValueStack } from "@/components/sections/ValueStack";
import { Guarantee } from "@/components/sections/Guarantee";
import { Pricing } from "@/components/sections/Pricing";
import { Faq } from "@/components/sections/Faq";
import { StickyBuyBar } from "@/components/sections/StickyBuyBar";

const HERO_BG =
  "linear-gradient(180deg,#d8ede7 0%,#e6f4ef 20%,#f0f8f4 52%,var(--color-cream) 100%)";

export function MobileFunnel() {
  return (
    <>
      <div className="mx-auto w-full max-w-[440px] overflow-hidden bg-cream">
        {/* Mint top: promo, nav, hero and the before/after carousel share it. */}
        <div style={{ background: HERO_BG }}>
          <PromoBar />
          <Nav />
          <Hero />
          <BeforeAfter />
          <div className="h-5" />
        </div>

        <main>
          <InstantBuy />
          <HowItWorks />
          <Sample />
          <ValueStack />
          <Pricing />
          <Guarantee />
          <Faq />
        </main>

        <Footer />
      </div>

      <StickyBuyBar />
    </>
  );
}
