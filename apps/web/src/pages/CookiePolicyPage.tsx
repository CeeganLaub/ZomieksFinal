export default function CookiePolicyPage() {
  return (
    <div className="py-20">
      <div className="container max-w-3xl">
        <h1 className="text-4xl font-bold mb-2">Cookie Policy</h1>
        <p className="text-muted-foreground mb-10">Last updated: 12 February 2026</p>

        <div className="space-y-8">
          <section>
            <h2 className="text-2xl font-bold mb-3">1. What Are Cookies?</h2>
            <p className="text-muted-foreground leading-relaxed">
              Cookies are small text files that are placed on your device when you visit a
              website. They are widely used to make websites work efficiently, improve user
              experience, and provide information to website operators. Zomieks uses cookies
              and similar technologies to operate and improve the Platform.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-3">2. How We Use Cookies</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              We use the following types of cookies:
            </p>
            <div className="space-y-4">
              {[
                {
                  type: 'Essential Cookies',
                  desc: 'These cookies are necessary for the Platform to function. They enable core features like user authentication, session management, and security. You cannot opt out of essential cookies.',
                  examples: 'Login sessions, security tokens, CSRF protection',
                },
                {
                  type: 'Functional Cookies',
                  desc: 'These cookies remember your preferences and settings to provide a personalised experience. They help us remember your language preferences, theme settings, and other customisations.',
                  examples: 'Theme preference (light/dark mode), language settings',
                },
                {
                  type: 'Analytics Cookies',
                  desc: 'These cookies help us understand how visitors interact with the Platform by collecting anonymous usage data. This helps us improve the user experience and identify areas that need attention.',
                  examples: 'Page views, feature usage patterns, error tracking',
                },
              ].map((cookie, i) => (
                <div key={i} className="p-5 rounded-xl border bg-background">
                  <h3 className="font-semibold mb-1">{cookie.type}</h3>
                  <p className="text-sm text-muted-foreground mb-2">{cookie.desc}</p>
                  <p className="text-xs text-muted-foreground">
                    <strong>Examples:</strong> {cookie.examples}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-3">3. Local Storage</h2>
            <p className="text-muted-foreground leading-relaxed">
              In addition to cookies, we use browser local storage to store certain
              preferences and application state. This works similarly to cookies but allows
              us to store more data locally on your device. We use local storage for features
              like keeping you logged in and remembering your user preferences.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-3">4. Third-Party Cookies</h2>
            <p className="text-muted-foreground leading-relaxed">
              Our payment partners (PayFast and OZOW) may set their own cookies when you
              make a payment. These cookies are governed by their respective privacy policies.
              We do not control third-party cookies.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-3">5. Managing Cookies</h2>
            <p className="text-muted-foreground leading-relaxed">
              Most web browsers allow you to manage cookies through their settings. You can
              choose to block or delete cookies, but please be aware that this may affect the
              functionality of the Platform. Essential cookies cannot be disabled without
              impacting core features like logging in and placing orders.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-3">
              To manage cookies in your browser:
            </p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground mt-2">
              <li><strong>Chrome:</strong> Settings → Privacy and Security → Cookies</li>
              <li><strong>Firefox:</strong> Settings → Privacy & Security → Cookies</li>
              <li><strong>Safari:</strong> Preferences → Privacy → Cookies</li>
              <li><strong>Edge:</strong> Settings → Cookies and site permissions</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-3">6. Changes to This Policy</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update this Cookie Policy from time to time. Changes will be posted on
              this page with an updated "Last updated" date.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-3">7. Contact</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you have questions about our use of cookies, please contact us at{' '}
              <a href="mailto:privacy@zomieks.com" className="text-primary hover:underline">privacy@zomieks.com</a>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
