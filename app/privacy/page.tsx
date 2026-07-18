import type { Metadata } from "next";
import { LegalShell } from "@/components/site/LegalShell";
import { BRAND, LEGAL_ENTITY, CONTACT_EMAIL } from "@/lib/legal";

export const metadata: Metadata = {
  title: `Privacy Policy — ${BRAND}`,
  description: `How ${BRAND} collects, uses, and protects your information.`,
  robots: { index: true, follow: true },
};

export default function PrivacyPage() {
  return (
    <LegalShell title="Privacy Policy">
      <p>
        This Privacy Policy explains how {LEGAL_ENTITY} (“{BRAND}”, “we”, “us”
        or “our”) collects, uses, shares, and protects information when you use
        our website and services (the “Service”). By using the Service, you
        agree to this Policy.
      </p>

      <h2>1. Information we collect</h2>
      <ul>
        <li>
          <strong>Content you upload.</strong> The photos, images, branding, and
          any text you submit to generate a video tour, along with the Output we
          create for you.
        </li>
        <li>
          <strong>Order and contact details.</strong> Your name, email address,
          and information you provide when you contact us or place an order.
        </li>
        <li>
          <strong>Payment information.</strong> Payments are processed by our
          payment provider (Stripe). We do not store your full card details; we
          receive limited transaction data such as confirmation and the last
          digits of your card.
        </li>
        <li>
          <strong>Usage and device data.</strong> Log data, IP address, browser
          and device type, and interactions with the Service, collected through
          standard analytics and server logs.
        </li>
      </ul>

      <h2>2. How we use your information</h2>
      <ul>
        <li>to provide, operate, and deliver the Service and your Output;</li>
        <li>to process payments, issue receipts, and handle refunds;</li>
        <li>to respond to your requests and provide support;</li>
        <li>
          to secure, maintain, troubleshoot, and improve the Service and prevent
          fraud and abuse; and
        </li>
        <li>to comply with legal obligations and enforce our Terms.</li>
      </ul>
      <p>
        We do <strong>not</strong> sell your personal information, and we do not
        use the photos you upload to train foundation models beyond what is
        necessary to produce your requested Output.
      </p>

      <h2>3. Service providers and sharing</h2>
      <p>
        We share information with trusted third parties only as needed to run
        the Service. These currently include providers for hosting and content
        delivery, payment processing (Stripe), AI/video generation, and
        analytics. These providers process data on our behalf under their own
        terms and safeguards. We may also disclose information if required by
        law, to protect our rights, or in connection with a business transfer.
      </p>

      <h2>4. International data transfers</h2>
      <p>
        We and our providers may process and store information in the United
        States and other countries whose data-protection laws may differ from
        those in your country. Where required, such transfers are made under
        appropriate safeguards (such as Standard Contractual Clauses). By using
        the Service, you understand your information may be transferred outside
        your country of residence.
      </p>

      <h2>5. Data retention</h2>
      <p>
        We keep the photos you upload and the Output we generate only as long as
        needed to provide the Service, deliver and re-download your Output, and
        for a reasonable period afterward for support and record-keeping. We
        retain order and transaction records as required for legal, tax, and
        accounting purposes. You may request deletion of your content as
        described below.
      </p>

      <h2>6. Cookies and analytics</h2>
      <p>
        We use essential cookies to operate the Service and may use analytics to
        understand how it is used. You can control cookies through your browser
        settings; disabling some cookies may affect functionality.
      </p>

      <h2>7. Your rights and choices</h2>
      <p>
        Depending on where you live, you may have rights to access, correct,
        export, or delete your personal data, to object to or restrict certain
        processing, and to withdraw consent. This includes rights under the
        EU/UK GDPR and the California Consumer Privacy Act (CCPA/CPRA). To
        exercise any of these rights — including requesting a copy or deletion
        of your data — contact us at{" "}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. We will respond
        within the timeframe required by applicable law and will not
        discriminate against you for exercising your rights.
      </p>

      <h2>8. Security</h2>
      <p>
        We use reasonable technical and organizational measures to protect your
        information. No method of transmission or storage is completely secure,
        however, and we cannot guarantee absolute security.
      </p>

      <h2>9. Children</h2>
      <p>
        The Service is intended for business users and is not directed to
        children under 18. We do not knowingly collect personal information from
        children. If you believe a child has provided us information, contact us
        and we will delete it.
      </p>

      <h2>10. Changes to this Policy</h2>
      <p>
        We may update this Policy from time to time. Material changes will be
        posted here with an updated date. Your continued use of the Service
        after changes take effect constitutes acceptance of the revised Policy.
      </p>

      <h2>11. Contact</h2>
      <p>
        For any privacy question or request, contact us at{" "}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>
    </LegalShell>
  );
}
