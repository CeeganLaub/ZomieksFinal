export default function PrivacyPolicyPage() {
  return (
    <div className="py-20">
      <div className="container max-w-3xl">
        <h1 className="text-4xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-muted-foreground mb-10">Last updated: 12 February 2026</p>

        <div className="space-y-8">
          <section>
            <h2 className="text-2xl font-bold mb-3">1. Introduction</h2>
            <p className="text-muted-foreground leading-relaxed">
              Zomieks ("we", "us", "our") respects your privacy and is committed to protecting
              your personal information. This Privacy Policy explains how we collect, use,
              store, and share your information when you use our platform at zomieks.com
              (the "Platform"). This policy applies to all users including buyers, sellers,
              and visitors.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-3">2. Information We Collect</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              We collect the following types of information:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li><strong>Account information:</strong> Name, email address, username, and password when you register.</li>
              <li><strong>Profile information:</strong> Bio, profile photo, skills, and other details you choose to add to your seller or buyer profile.</li>
              <li><strong>Transaction information:</strong> Order details, payment amounts, and service descriptions related to your purchases and sales.</li>
              <li><strong>Communications:</strong> Messages exchanged between buyers and sellers through the Platform.</li>
              <li><strong>Usage data:</strong> Pages visited, features used, browser type, IP address, and device information collected automatically.</li>
              <li><strong>Cookies:</strong> We use cookies and similar technologies to improve your experience. See our <a href="/cookies" className="text-primary hover:underline">Cookie Policy</a> for details.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-3">3. How We Use Your Information</h2>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li>To create and manage your account</li>
              <li>To process orders and payments</li>
              <li>To facilitate communication between buyers and sellers</li>
              <li>To improve and personalise the Platform</li>
              <li>To send important updates about your account and orders</li>
              <li>To send marketing communications (with your consent)</li>
              <li>To detect and prevent fraud, abuse, and security issues</li>
              <li>To comply with legal obligations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-3">4. How We Share Your Information</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              We do not sell your personal information. We may share your information with:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li><strong>Other users:</strong> Your public profile, service listings, and reviews are visible to other users.</li>
              <li><strong>Payment providers:</strong> PayFast and OZOW to process payments securely.</li>
              <li><strong>Service providers:</strong> Hosting, analytics, and email services that help us operate the Platform.</li>
              <li><strong>Law enforcement:</strong> When required by law or to protect the safety of our users and Platform.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-3">5. Data Storage & Security</h2>
            <p className="text-muted-foreground leading-relaxed">
              Your data is stored securely using industry-standard encryption and security
              measures. We use Cloudflare's global infrastructure for hosting, which provides
              DDoS protection and SSL encryption. Payment information is processed by our
              payment partners and is never stored on our servers. While we take reasonable
              steps to protect your information, no method of transmission or storage is 100%
              secure.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-3">6. Your Rights</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Under the Protection of Personal Information Act (POPIA) and other applicable
              laws, you have the right to:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li>Access the personal information we hold about you</li>
              <li>Request correction of inaccurate information</li>
              <li>Request deletion of your personal information</li>
              <li>Object to the processing of your information for marketing purposes</li>
              <li>Withdraw consent where processing is based on consent</li>
              <li>Lodge a complaint with the Information Regulator</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              To exercise any of these rights, contact us at{' '}
              <a href="mailto:privacy@zomieks.com" className="text-primary hover:underline">privacy@zomieks.com</a>.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-3">7. Data Retention</h2>
            <p className="text-muted-foreground leading-relaxed">
              We retain your personal information for as long as your account is active or as
              needed to provide services. After account deletion, we may retain certain
              information for a reasonable period to comply with legal obligations, resolve
              disputes, and enforce our agreements.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-3">8. Children's Privacy</h2>
            <p className="text-muted-foreground leading-relaxed">
              Zomieks is not intended for use by individuals under the age of 18. We do not
              knowingly collect personal information from children. If we become aware that
              we have collected information from a child, we will take steps to delete it.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-3">9. Changes to This Policy</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update this Privacy Policy from time to time. If we make significant
              changes, we will notify you by email or through the Platform. We encourage you
              to review this page periodically.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-3">10. Contact</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you have any questions about this Privacy Policy, please contact us at{' '}
              <a href="mailto:privacy@zomieks.com" className="text-primary hover:underline">privacy@zomieks.com</a>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
