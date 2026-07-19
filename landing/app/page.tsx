import { PromoBar } from "@/components/site/PromoBar";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { Hero } from "@/components/sections/Hero";
import { BeforeAfter } from "@/components/sections/BeforeAfter";
import { HowItWorks } from "@/components/sections/HowItWorks";
import { Sample } from "@/components/sections/Sample";
import { ValueStack } from "@/components/sections/ValueStack";
import { Guarantee } from "@/components/sections/Guarantee";
import { Pricing } from "@/components/sections/Pricing";
import { Faq } from "@/components/sections/Faq";

export default function Home() {
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
