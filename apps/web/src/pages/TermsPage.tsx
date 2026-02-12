export default function TermsPage() {
  return (
    <div className="py-20">
      <div className="container max-w-3xl">
        <h1 className="text-4xl font-bold mb-2">Terms of Service</h1>
        <p className="text-muted-foreground mb-10">Last updated: 12 February 2026</p>

        <div className="prose prose-gray dark:prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-bold mb-3">1. Introduction</h2>
            <p className="text-muted-foreground leading-relaxed">
              Welcome to Zomieks ("we", "us", "our"). These Terms of Service ("Terms") govern
              your access to and use of the Zomieks website at zomieks.com and all related
              services (collectively, the "Platform"). By creating an account or using the
              Platform, you agree to be bound by these Terms. If you do not agree, please do
              not use the Platform.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-3">2. Eligibility</h2>
            <p className="text-muted-foreground leading-relaxed">
              You must be at least 18 years old and legally capable of entering into contracts to use
              Zomieks. By registering, you represent and warrant that you meet these requirements. Zomieks
              is primarily intended for users in South Africa, though the Platform may be accessed from
              other jurisdictions.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-3">3. Accounts</h2>
            <p className="text-muted-foreground leading-relaxed">
              You are responsible for maintaining the confidentiality of your account credentials
              and for all activity that occurs under your account. You must provide accurate and
              complete information during registration and keep your profile up to date. You may
              not create multiple accounts, impersonate another person, or transfer your account
              to anyone else without our written permission.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-3">4. Services & Orders</h2>
            <p className="text-muted-foreground leading-relaxed">
              Zomieks is a marketplace that connects buyers with freelance sellers. We do not
              perform the services ourselves. Sellers are independent contractors, not employees
              of Zomieks. When you place an order, you enter into a direct agreement with the
              seller. Zomieks facilitates the transaction, holds payment in escrow, and provides
              tools for communication and dispute resolution.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-3">5. Payments & Fees</h2>
            <p className="text-muted-foreground leading-relaxed">
              All payments are processed securely through our payment partners (PayFast and
              OZOW). Prices are listed in South African Rand (ZAR). Buyers pay the full listed
              price at checkout. Sellers receive their earnings minus the applicable platform
              commission: 8% on service orders and 20% on course sales. The Zomieks Pro
              subscription costs R399/month and is billed monthly. All fees are subject to change
              with 30 days' notice.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-3">6. Escrow & Refunds</h2>
            <p className="text-muted-foreground leading-relaxed">
              Buyer payments are held in escrow until the buyer approves the delivery. If the
              seller fails to deliver, or if the delivery does not meet the agreed specifications,
              the buyer may open a dispute. Refunds are issued at Zomieks' discretion after
              reviewing the dispute. Courses are covered by a 24-hour money-back guarantee from
              the time of purchase.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-3">7. Seller Obligations</h2>
            <p className="text-muted-foreground leading-relaxed">
              Sellers must deliver work that matches their service descriptions and package
              specifications. Sellers are responsible for the quality, originality, and
              timeliness of their deliveries. Sellers may not deliver plagiarised content,
              infringe intellectual property rights, or engage in behaviour that violates these
              Terms or applicable law.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-3">8. Intellectual Property</h2>
            <p className="text-muted-foreground leading-relaxed">
              Upon final delivery and full payment, intellectual property rights for custom
              work are transferred from the seller to the buyer, unless otherwise agreed in
              the service description. Course content remains the intellectual property of the
              course creator; buyers receive a personal, non-transferable licence to access and
              view the content. The Zomieks brand, logo, and platform design are the property
              of Zomieks.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-3">9. Prohibited Conduct</h2>
            <p className="text-muted-foreground leading-relaxed">
              You may not use the Platform to: engage in fraud or deception; post spam or
              misleading content; harass, threaten, or abuse other users; circumvent the payment
              system or attempt to transact off-platform; upload harmful software or interfere
              with the Platform's operation; or violate any applicable law or regulation.
              Violation of these rules may result in account suspension or termination.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-3">10. Limitation of Liability</h2>
            <p className="text-muted-foreground leading-relaxed">
              Zomieks is provided "as is" without warranties of any kind. We are not liable
              for the quality, safety, or legality of services sold on the Platform, nor for
              any disputes between buyers and sellers beyond our dispute resolution process.
              To the maximum extent permitted by law, Zomieks shall not be liable for any
              indirect, incidental, or consequential damages arising from your use of the
              Platform.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-3">11. Termination</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may suspend or terminate your account at any time if you violate these Terms
              or engage in activity that harms the Platform or other users. You may close your
              account at any time through your settings. Upon termination, any pending orders
              will be handled according to our escrow and refund policies.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-3">12. Changes to These Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update these Terms from time to time. If we make material changes, we
              will notify you by email or through the Platform. Continued use of the Platform
              after changes take effect constitutes acceptance of the updated Terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-3">13. Governing Law</h2>
            <p className="text-muted-foreground leading-relaxed">
              These Terms are governed by the laws of the Republic of South Africa. Any disputes
              arising from these Terms or your use of the Platform shall be subject to the
              exclusive jurisdiction of the courts of South Africa.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-3">14. Contact</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you have any questions about these Terms, please contact us at{' '}
              <a href="mailto:legal@zomieks.com" className="text-primary hover:underline">legal@zomieks.com</a>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
