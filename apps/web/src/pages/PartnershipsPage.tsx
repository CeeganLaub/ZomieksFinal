import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import {
  ArrowRightIcon,
  BuildingOfficeIcon,
  AcademicCapIcon,
  CurrencyDollarIcon,
  MegaphoneIcon,
  EnvelopeIcon,
} from '@heroicons/react/24/outline';

export default function PartnershipsPage() {
  return (
    <div>
      {/* Hero */}
      <section className="relative py-20 bg-gradient-to-b from-background to-muted/30">
        <div className="container max-w-4xl text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
            <BuildingOfficeIcon className="h-4 w-4" />
            Partnerships
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            Let's grow together
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Partner with Zomieks to reach South Africa's growing freelance community and
            create opportunities for talented professionals.
          </p>
        </div>
      </section>

      {/* Partnership Types */}
      <section className="py-20">
        <div className="container max-w-5xl">
          <h2 className="text-3xl font-bold text-center mb-12">Partnership Opportunities</h2>
          <div className="grid sm:grid-cols-2 gap-8">
            {[
              {
                icon: CurrencyDollarIcon,
                title: 'Payment Partners',
                desc: 'Integrate your payment solution with Zomieks. We work with PayFast and OZOW and are always looking for innovative payment partners to serve the South African market.',
              },
              {
                icon: AcademicCapIcon,
                title: 'Education Partners',
                desc: 'Collaborate on skills development programmes. Partner with us to upskill freelancers through workshops, certifications, and training initiatives.',
              },
              {
                icon: BuildingOfficeIcon,
                title: 'Corporate Partners',
                desc: 'Give your team access to South Africa\'s best freelancers. We offer enterprise solutions for businesses with ongoing freelance hiring needs.',
              },
              {
                icon: MegaphoneIcon,
                title: 'Affiliate & Marketing Partners',
                desc: 'Promote Zomieks to your audience and earn commissions. Our affiliate programme rewards partners who help grow the freelance community.',
              },
            ].map((type, i) => (
              <div key={i} className="p-8 rounded-2xl border bg-background hover:shadow-lg transition-shadow">
                <div className="p-3 rounded-xl bg-primary/10 w-fit mb-4">
                  <type.icon className="h-7 w-7 text-primary" />
                </div>
                <h3 className="font-bold text-xl mb-3">{type.title}</h3>
                <p className="text-muted-foreground">{type.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-muted/30">
        <div className="container max-w-3xl text-center">
          <EnvelopeIcon className="h-12 w-12 text-primary mx-auto mb-4" />
          <h2 className="text-3xl font-bold mb-4">Become a partner</h2>
          <p className="text-lg text-muted-foreground mb-6">
            Interested in partnering with Zomieks? We'd love to hear from you. Reach out to
            our partnerships team and let's explore how we can work together.
          </p>
          <a href="mailto:partners@zomieks.com">
            <Button size="lg">
              Get in Touch
              <ArrowRightIcon className="h-5 w-5 ml-2" />
            </Button>
          </a>
          <p className="text-sm text-muted-foreground mt-4">
            partners@zomieks.com
          </p>
        </div>
      </section>
    </div>
  );
}
