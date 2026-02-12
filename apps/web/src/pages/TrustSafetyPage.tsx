import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import {
  ShieldCheckIcon,
  LockClosedIcon,
  EyeIcon,
  ScaleIcon,
  ExclamationTriangleIcon,
  CheckBadgeIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline';

export default function TrustSafetyPage() {
  return (
    <div>
      {/* Hero */}
      <section className="relative py-20 bg-gradient-to-b from-background to-muted/30">
        <div className="container max-w-4xl text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
            <ShieldCheckIcon className="h-4 w-4" />
            Trust & Safety
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            Your safety is our priority
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Learn how Zomieks protects buyers and sellers with secure payments, verified accounts,
            and fair dispute resolution.
          </p>
        </div>
      </section>

      {/* Pillars */}
      <section className="py-20">
        <div className="container max-w-5xl">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: LockClosedIcon,
                title: 'Escrow Protection',
                desc: 'Every payment is held securely in escrow until the buyer confirms they\'re satisfied with the delivery. This means sellers always get paid for completed work, and buyers never pay for undelivered orders.',
              },
              {
                icon: CheckBadgeIcon,
                title: 'Verified Sellers',
                desc: 'All sellers go through a verification process before they can list services. We check identities and monitor performance to ensure a high standard of quality across the platform.',
              },
              {
                icon: EyeIcon,
                title: 'Transparent Reviews',
                desc: 'Genuine reviews from real buyers help you make informed decisions. All reviews are verified and tied to actual orders — no fake reviews allowed.',
              },
              {
                icon: ScaleIcon,
                title: 'Fair Dispute Resolution',
                desc: 'If something goes wrong, our support team steps in to mediate. We review evidence from both sides and aim for a fair outcome. Unresolved disputes may result in a full refund to the buyer.',
              },
              {
                icon: ShieldCheckIcon,
                title: 'Secure Payments',
                desc: 'We partner with PayFast and OZOW — trusted South African payment providers — to process all transactions. Your financial information is never stored on our servers.',
              },
              {
                icon: ExclamationTriangleIcon,
                title: 'Fraud Prevention',
                desc: 'Our systems monitor for suspicious activity around the clock. Accounts engaging in fraud, spam, or abuse are suspended immediately to protect the community.',
              },
            ].map((pillar, i) => (
              <div key={i} className="p-6 rounded-2xl border bg-background">
                <div className="p-2.5 rounded-xl bg-primary/10 w-fit mb-4">
                  <pillar.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-bold text-lg mb-2">{pillar.title}</h3>
                <p className="text-sm text-muted-foreground">{pillar.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How Escrow Works */}
      <section className="py-20 bg-muted/30">
        <div className="container max-w-4xl">
          <h2 className="text-3xl font-bold text-center mb-12">How escrow works</h2>
          <div className="grid md:grid-cols-4 gap-6">
            {[
              { step: '1', title: 'Order Placed', desc: 'Buyer selects a service package and makes a payment.' },
              { step: '2', title: 'Funds Held', desc: 'Payment is held securely in escrow by Zomieks.' },
              { step: '3', title: 'Work Delivered', desc: 'Seller completes the work and delivers it to the buyer.' },
              { step: '4', title: 'Funds Released', desc: 'Buyer approves delivery and the seller gets paid.' },
            ].map((s, i) => (
              <div key={i} className="text-center">
                <div className="w-12 h-12 rounded-full bg-primary text-white font-bold text-lg flex items-center justify-center mx-auto mb-4">
                  {s.step}
                </div>
                <h3 className="font-semibold mb-2">{s.title}</h3>
                <p className="text-sm text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Community Guidelines */}
      <section className="py-20">
        <div className="container max-w-3xl">
          <h2 className="text-3xl font-bold text-center mb-8">Community Guidelines</h2>
          <div className="rounded-2xl border bg-background p-8 space-y-6">
            {[
              { title: 'Be Professional', desc: 'Communicate respectfully, deliver work on time, and maintain a high standard of quality.' },
              { title: 'Be Honest', desc: 'Provide accurate service descriptions, honest portfolio samples, and truthful profile information.' },
              { title: 'Respect Intellectual Property', desc: 'Only deliver original work or work you have the rights to. Never plagiarise or use stolen assets.' },
              { title: 'No Spam or Fraud', desc: 'Don\'t create fake accounts, post spam, manipulate reviews, or engage in any form of fraud.' },
              { title: 'Keep Transactions on Platform', desc: 'All payments must go through Zomieks to ensure escrow protection for both parties.' },
            ].map((rule, i) => (
              <div key={i} className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <CheckBadgeIcon className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">{rule.title}</h3>
                  <p className="text-sm text-muted-foreground">{rule.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Report */}
      <section className="py-16 bg-muted/30">
        <div className="container max-w-3xl text-center">
          <h2 className="text-2xl font-bold mb-4">Report a concern</h2>
          <p className="text-muted-foreground mb-6">
            If you encounter behaviour that violates our guidelines or you feel unsafe, please
            report it immediately. All reports are reviewed within 24 hours.
          </p>
          <a href="mailto:safety@zomieks.com">
            <Button>
              Report an Issue
              <ArrowRightIcon className="h-4 w-4 ml-2" />
            </Button>
          </a>
        </div>
      </section>
    </div>
  );
}
