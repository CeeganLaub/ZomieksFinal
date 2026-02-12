import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import {
  SparklesIcon,
  RocketLaunchIcon,
  HeartIcon,
  GlobeAltIcon,
  ArrowRightIcon,
  EnvelopeIcon,
} from '@heroicons/react/24/outline';

export default function CareersPage() {
  return (
    <div>
      {/* Hero */}
      <section className="relative py-20 bg-gradient-to-b from-background to-muted/30">
        <div className="container max-w-4xl text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
            <RocketLaunchIcon className="h-4 w-4" />
            Careers at Zomieks
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            Help us build the future of freelancing
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            We're on a mission to empower South Africa's freelance economy. Join our team and make an impact.
          </p>
        </div>
      </section>

      {/* Why Work Here */}
      <section className="py-20">
        <div className="container max-w-5xl">
          <h2 className="text-3xl font-bold text-center mb-12">Why work at Zomieks?</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: RocketLaunchIcon,
                title: 'High Impact',
                desc: 'Your work directly helps freelancers earn a living and businesses find great talent across South Africa.',
              },
              {
                icon: GlobeAltIcon,
                title: 'Remote-First',
                desc: 'We believe great work happens anywhere. Our team works remotely across South Africa and beyond.',
              },
              {
                icon: SparklesIcon,
                title: 'Modern Stack',
                desc: 'React, TypeScript, Cloudflare Workers, D1 — we use cutting-edge technology to build a world-class platform.',
              },
              {
                icon: HeartIcon,
                title: 'Great Culture',
                desc: 'We value openness, ownership, and continuous learning. Every voice matters and every contribution counts.',
              },
              {
                icon: SparklesIcon,
                title: 'Growth Opportunities',
                desc: 'As an early-stage company, there\'s huge opportunity for career growth and taking on new challenges.',
              },
              {
                icon: GlobeAltIcon,
                title: 'Local Mission',
                desc: 'We\'re proudly South African and passionate about creating economic opportunity in our communities.',
              },
            ].map((item, i) => (
              <div key={i} className="p-6 rounded-2xl border bg-background">
                <div className="p-2.5 rounded-xl bg-primary/10 w-fit mb-4">
                  <item.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-bold text-lg mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Open Positions */}
      <section className="py-20 bg-muted/30">
        <div className="container max-w-3xl text-center">
          <h2 className="text-3xl font-bold mb-4">Open Positions</h2>
          <p className="text-lg text-muted-foreground mb-8">
            We don't have any open positions right now, but we're always looking for exceptional people.
          </p>
          <div className="p-8 rounded-2xl border bg-background">
            <EnvelopeIcon className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
            <h3 className="font-semibold text-lg mb-2">No open roles at the moment</h3>
            <p className="text-muted-foreground mb-6">
              Interested in joining the team? Send your CV and a short intro to{' '}
              <a href="mailto:careers@zomieks.com" className="text-primary hover:underline">
                careers@zomieks.com
              </a>{' '}
              and we'll keep you in mind for future opportunities.
            </p>
            <Link to="/about">
              <Button variant="outline">
                Learn more about us
                <ArrowRightIcon className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
