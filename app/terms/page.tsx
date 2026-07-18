import type { Metadata } from "next";
import { LegalShell } from "@/components/site/LegalShell";
import { BRAND, LEGAL_ENTITY, CONTACT_EMAIL, GOVERNING_LAW } from "@/lib/legal";

export const metadata: Metadata = {
  title: `Terms of Service — ${BRAND}`,
  description: `The terms that govern your use of ${BRAND}.`,
  robots: { index: true, follow: true },
};

export default function TermsPage() {
  return (
    <LegalShell title="Terms of Service">
      <p>
        These Terms of Service (“Terms”) are a binding agreement between you and{" "}
        {LEGAL_ENTITY} (“{BRAND}”, “we”, “us” or “our”) and govern your access
        to and use of the {BRAND} website, application, and services
        (collectively, the “Service”). By accessing or using the Service,
        creating an order, or clicking to accept these Terms, you agree to be
        bound by them. If you do not agree, do not use the Service.
      </p>

      <h2>1. The Service</h2>
      <p>
        {BRAND} uses automated and artificial-intelligence tools to generate
        video tours and related media from listing photos and other inputs you
        provide. The Service produces <strong>AI-generated content</strong>.
        Output is inherently probabilistic and may vary in style, accuracy, and
        quality between generations. We do not warrant that any specific result,
        appearance, timing, or outcome will be achieved.
      </p>

      <h2>2. Eligibility</h2>
      <p>
        You must be at least 18 years old and able to form a binding contract to
        use the Service. By using the Service you represent that you meet these
        requirements and that you are using the Service for lawful,
        business-related purposes.
      </p>

      <h2>3. Your content and the rights you grant</h2>
      <p>
        “Your Content” means the photos, images, text, branding, and other
        materials you upload or submit. You retain ownership of Your Content.
        You represent and warrant that:
      </p>
      <ul>
        <li>
          you own Your Content or have all rights, licenses, and permissions
          necessary to submit it and to have it processed by the Service;
        </li>
        <li>
          Your Content, and our processing of it, does not and will not infringe
          or violate the rights of any third party (including intellectual
          property, privacy, publicity, or contractual rights); and
        </li>
        <li>
          you have the right to depict any property, person, or trademark shown
          in Your Content.
        </li>
      </ul>
      <p>
        You grant {BRAND} a worldwide, non-exclusive, royalty-free license to
        host, store, reproduce, modify, and process Your Content solely to
        operate, provide, secure, and improve the Service and to create the
        output you request. We do not claim ownership of Your Content.
      </p>

      <h2>4. Output and ownership</h2>
      <p>
        Subject to your full payment and to your compliance with these Terms, we
        assign to you the rights we hold in the specific video tour delivered to
        you (the “Output”), so that you may use it to market the associated
        listing across the MLS, social platforms, and your own channels. We
        retain all rights in the Service itself, including our software, models,
        templates, and underlying technology. Because AI systems can produce
        similar results for different users, we do not guarantee that Output is
        unique, and you may not claim exclusive rights over generic or
        commonplace elements of it.
      </p>

      <h2>5. AI-generated media and your responsibilities</h2>
      <p>
        The Output is a stylized, AI-generated visualization — not a factual
        photographic record of a property. You are solely responsible for how
        you use the Output, including ensuring that it:
      </p>
      <ul>
        <li>
          does not misrepresent the condition, features, size, or location of
          any property;
        </li>
        <li>
          complies with all applicable laws and rules governing real-estate
          advertising, your local MLS and association rules, fair-housing laws,
          and platform policies; and
        </li>
        <li>
          includes any disclosure that AI-generated or digitally altered content
          is present where such disclosure is required.
        </li>
      </ul>
      <p>
        You — not {BRAND} — are the advertiser and publisher of the Output and
        are responsible for its accuracy and compliance.
      </p>

      <h2>6. Acceptable use</h2>
      <p>You agree not to use the Service to:</p>
      <ul>
        <li>
          upload content that is illegal, infringing, defamatory, obscene, or
          that you lack the rights to use;
        </li>
        <li>
          create content intended to deceive, defraud, or mislead, or that
          violates fair-housing or advertising laws;
        </li>
        <li>
          reverse engineer, scrape, overload, or interfere with the Service, or
          attempt to access it by unauthorized means; or
        </li>
        <li>
          resell or provide the Service to third parties except as permitted.
        </li>
      </ul>
      <p>
        We may refuse, remove, or suspend any content or account that we
        believe, in our sole discretion, violates these Terms or applicable law.
      </p>

      <h2>7. Orders, pricing, and taxes</h2>
      <p>
        The Service is offered as one-time purchases at the prices shown at
        checkout. Prices, packages, and features may change at any time, but
        changes will not affect orders already placed. You are responsible for
        any applicable taxes. Payments are processed by our third-party payment
        provider; by purchasing, you also agree to that provider’s terms.
      </p>

      <h2>8. Refunds and money-back guarantee</h2>
      <p>
        If you are not satisfied with your Output, you may request a refund
        through the receipt provided at checkout or by contacting us at{" "}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. Approved
        refunds return the amount you paid for the affected order. Refunds are
        provided at our reasonable discretion and may be limited or declined in
        cases of abuse, fraud, or repeated refund requests. Except where
        required by law, refunds are your sole and exclusive remedy for
        dissatisfaction with the Output.
      </p>

      <h2>9. Third-party services</h2>
      <p>
        The Service relies on third-party providers for payments, hosting,
        content generation, and analytics. We are not responsible for the acts,
        omissions, or availability of these providers, and your use of features
        that depend on them may be subject to their terms.
      </p>

      <h2>10. Disclaimer of warranties</h2>
      <p>
        THE SERVICE AND ALL OUTPUT ARE PROVIDED “AS IS” AND “AS AVAILABLE”
        WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS, IMPLIED, OR STATUTORY,
        INCLUDING ANY IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
        PARTICULAR PURPOSE, TITLE, ACCURACY, AND NON-INFRINGEMENT. WE DO NOT
        WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR SECURE,
        OR THAT OUTPUT WILL MEET YOUR EXPECTATIONS OR REQUIREMENTS. Some
        jurisdictions do not allow the exclusion of certain warranties, so some
        of the above may not apply to you.
      </p>

      <h2>11. Limitation of liability</h2>
      <p>
        TO THE MAXIMUM EXTENT PERMITTED BY LAW, {BRAND.toUpperCase()} AND ITS
        OWNERS, EMPLOYEES, AND SUPPLIERS WILL NOT BE LIABLE FOR ANY INDIRECT,
        INCIDENTAL, SPECIAL, CONSEQUENTIAL, EXEMPLARY, OR PUNITIVE DAMAGES, OR
        FOR ANY LOSS OF PROFITS, REVENUE, DATA, GOODWILL, OR BUSINESS
        OPPORTUNITY, ARISING OUT OF OR RELATED TO THE SERVICE OR OUTPUT, EVEN IF
        ADVISED OF THE POSSIBILITY OF SUCH DAMAGES. OUR TOTAL AGGREGATE
        LIABILITY FOR ALL CLAIMS RELATING TO THE SERVICE WILL NOT EXCEED THE
        GREATER OF THE AMOUNT YOU PAID US FOR THE ORDER GIVING RISE TO THE CLAIM
        OR USD $100.
      </p>

      <h2>12. Indemnification</h2>
      <p>
        You agree to defend, indemnify, and hold harmless {LEGAL_ENTITY} and its
        owners, employees, and suppliers from and against any claims, damages,
        liabilities, losses, and expenses (including reasonable legal fees)
        arising out of or related to: (a) Your Content; (b) your use of the
        Output, including any real-estate, advertising, fair-housing, or
        disclosure violation; (c) your breach of these Terms; or (d) your
        violation of any law or third-party right.
      </p>

      <h2>13. Termination</h2>
      <p>
        We may suspend or terminate your access to the Service at any time, with
        or without notice, if we believe you have violated these Terms or to
        protect the Service. Sections that by their nature should survive
        termination — including ownership, disclaimers, limitation of liability,
        indemnification, and dispute resolution — will survive.
      </p>

      <h2>14. Changes to the Service and Terms</h2>
      <p>
        We may modify or discontinue any part of the Service, and we may update
        these Terms from time to time. Changes are effective when posted with an
        updated date. Your continued use of the Service after changes take
        effect constitutes acceptance of the revised Terms.
      </p>

      <h2>15. Governing law and dispute resolution</h2>
      <p>
        These Terms are governed by the laws of {GOVERNING_LAW}, without regard
        to its conflict-of-laws rules. Before filing any claim, you agree to
        first contact us at{" "}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> and attempt to
        resolve the dispute informally for at least 30 days. Any dispute that
        cannot be resolved informally will be resolved by final and binding
        individual arbitration, and{" "}
        <strong>
          you and {BRAND} waive any right to a jury trial and to participate in
          a class or representative action
        </strong>
        , to the extent permitted by applicable law. If this waiver is found
        unenforceable, the dispute will be heard by the courts located in the
        jurisdiction named above.
      </p>

      <h2>16. Miscellaneous</h2>
      <p>
        These Terms, together with our Privacy Policy, are the entire agreement
        between you and {BRAND} regarding the Service. If any provision is found
        unenforceable, the remaining provisions remain in effect. Our failure to
        enforce a provision is not a waiver. You may not assign these Terms
        without our consent; we may assign them in connection with a merger,
        acquisition, or sale of assets.
      </p>

      <h2>17. Contact</h2>
      <p>
        Questions about these Terms? Contact us at{" "}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>
    </LegalShell>
  );
}
