import { PromoBar } from "@/components/desktop/PromoBar";
import { Nav } from "@/components/desktop/Nav";
import { Footer } from "@/components/desktop/Footer";
import { Hero } from "@/components/desktop/Hero";
import { BeforeAfter } from "@/components/desktop/BeforeAfter";
import { HowItWorks } from "@/components/desktop/HowItWorks";
import { Sample } from "@/components/desktop/Sample";
import { ValueStack } from "@/components/desktop/ValueStack";
import { Guarantee } from "@/components/desktop/Guarantee";
import { Pricing } from "@/components/desktop/Pricing";
import { Faq } from "@/components/desktop/Faq";

export function DesktopLanding() {
  return (
    <>
      <PromoBar />
      <Nav />
      <main>
        <Hero />
        <BeforeAfter />
        <HowItWorks />
        <Sample />
        <ValueStack />
        <Guarantee />
        <Pricing />
        <Faq />
      </main>
      <Footer />
    </>
  );
}
