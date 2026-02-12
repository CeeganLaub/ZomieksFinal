import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { useState } from 'react';
import {
  QuestionMarkCircleIcon,
  ShoppingCartIcon,
  UserGroupIcon,
  CurrencyDollarIcon,
  ShieldCheckIcon,
  AcademicCapIcon,
  ChevronDownIcon,
  EnvelopeIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline';

const faqSections = [
  {
    title: 'Buying on Zomieks',
    icon: ShoppingCartIcon,
    faqs: [
      {
        q: 'How do I place an order?',
        a: 'Browse services, select the package that fits your needs, and click "Order Now". You\'ll be guided through a secure checkout process using PayFast or OZOW. Your payment is held in escrow until you approve the delivery.',
      },
      {
        q: 'Is my payment protected?',
        a: 'Yes. All payments are held in escrow until you confirm you\'re satisfied with the delivery. If there\'s a dispute, our team will mediate to ensure a fair outcome.',
      },
      {
        q: 'Can I request revisions?',
        a: 'Absolutely. Most service packages include revisions. If the delivered work doesn\'t meet the agreed requirements, you can request changes from the seller.',
      },
      {
        q: 'How do I communicate with a seller?',
        a: 'You can message any seller directly through the built-in messaging system before placing an order. Once an order is placed, all communication happens in the order chat.',
      },
    ],
  },
  {
    title: 'Selling on Zomieks',
    icon: UserGroupIcon,
    faqs: [
      {
        q: 'How do I become a seller?',
        a: 'Click "Become a Seller" and complete your seller profile. You\'ll need to provide your details and submit for review. Once approved, you can start listing services immediately.',
      },
      {
        q: 'What fees does Zomieks charge?',
        a: 'Zomieks charges an 8% commission on service orders and a 20% platform fee on course sales. There are no monthly fees for the Starter plan. The Pro plan costs R399/month and unlocks BioLink pages, course creation, and priority search placement.',
      },
      {
        q: 'How do I get paid?',
        a: 'Earnings are released to your account after the buyer approves delivery. You can withdraw your balance through your preferred payment method. Payouts are processed regularly.',
      },
      {
        q: 'What is BioLink?',
        a: 'BioLink is your personal storefront page on Zomieks. It showcases all your services, courses, portfolio, and social links in one place. Share it on social media, WhatsApp, or email signatures. Available on the Pro plan.',
      },
    ],
  },
  {
    title: 'Payments & Billing',
    icon: CurrencyDollarIcon,
    faqs: [
      {
        q: 'What payment methods are accepted?',
        a: 'We accept payments via PayFast and OZOW, which support credit/debit cards, EFT, and other South African payment methods.',
      },
      {
        q: 'What is escrow and how does it work?',
        a: 'Escrow means your payment is held securely by Zomieks until the work is delivered and approved. This protects both buyers and sellers — buyers know their money is safe, and sellers know they\'ll be paid for completed work.',
      },
      {
        q: 'Can I get a refund?',
        a: 'If a seller fails to deliver or the work doesn\'t match what was agreed, you can open a dispute. Our team will review the case and process a refund if appropriate. Courses have a 24-hour money-back guarantee.',
      },
    ],
  },
  {
    title: 'Courses',
    icon: AcademicCapIcon,
    faqs: [
      {
        q: 'How do online courses work?',
        a: 'Sellers on the Pro plan can create and sell online courses with video lessons. Buyers purchase courses and get lifetime access to the content.',
      },
      {
        q: 'Is there a refund policy for courses?',
        a: 'Yes, courses come with a 24-hour money-back guarantee. If you\'re not satisfied within 24 hours of purchase, you can request a full refund.',
      },
    ],
  },
  {
    title: 'Trust & Safety',
    icon: ShieldCheckIcon,
    faqs: [
      {
        q: 'How does Zomieks ensure quality?',
        a: 'All sellers go through a verification process. We monitor reviews, track delivery times, and maintain quality standards across the platform. Sellers who consistently underperform may be suspended.',
      },
      {
        q: 'What if I have a dispute with a seller/buyer?',
        a: 'You can open a dispute through the order page. Our support team will review the case, mediate between both parties, and ensure a fair resolution.',
      },
    ],
  },
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b last:border-b-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-4 text-left hover:text-primary transition-colors"
      >
        <span className="font-medium pr-4">{q}</span>
        <ChevronDownIcon className={`h-5 w-5 shrink-0 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <p className="pb-4 text-muted-foreground text-sm leading-relaxed">
          {a}
        </p>
      )}
    </div>
  );
}

export default function HelpCenterPage() {
  return (
    <div>
      {/* Hero */}
      <section className="relative py-20 bg-gradient-to-b from-background to-muted/30">
        <div className="container max-w-4xl text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
            <QuestionMarkCircleIcon className="h-4 w-4" />
            Help Center
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            How can we help?
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Find answers to common questions about buying, selling, payments, and more.
          </p>
        </div>
      </section>

      {/* FAQ Sections */}
      <section className="py-20">
        <div className="container max-w-3xl">
          <div className="space-y-12">
            {faqSections.map((section, i) => (
              <div key={i}>
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2.5 rounded-xl bg-primary/10">
                    <section.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h2 className="text-2xl font-bold">{section.title}</h2>
                </div>
                <div className="rounded-2xl border bg-background p-6">
                  {section.faqs.map((faq, j) => (
                    <FAQItem key={j} q={faq.q} a={faq.a} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact */}
      <section className="py-20 bg-muted/30">
        <div className="container max-w-3xl text-center">
          <EnvelopeIcon className="h-12 w-12 text-primary mx-auto mb-4" />
          <h2 className="text-3xl font-bold mb-4">Still need help?</h2>
          <p className="text-lg text-muted-foreground mb-6">
            Can't find what you're looking for? Reach out to our support team and we'll get back to you as soon as possible.
          </p>
          <a href="mailto:support@zomieks.com">
            <Button size="lg">
              Contact Support
              <ArrowRightIcon className="h-5 w-5 ml-2" />
            </Button>
          </a>
          <p className="text-sm text-muted-foreground mt-4">
            support@zomieks.com
          </p>
        </div>
      </section>
    </div>
  );
}
