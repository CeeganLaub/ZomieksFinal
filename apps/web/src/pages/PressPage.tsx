import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import {
  NewspaperIcon,
  EnvelopeIcon,
  ArrowRightIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';

export default function PressPage() {
  return (
    <div>
      {/* Hero */}
      <section className="relative py-20 bg-gradient-to-b from-background to-muted/30">
        <div className="container max-w-4xl text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
            <NewspaperIcon className="h-4 w-4" />
            Press & News
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            Zomieks in the news
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Stay up to date with the latest announcements, milestones, and media coverage.
          </p>
        </div>
      </section>

      {/* About Zomieks */}
      <section className="py-20">
        <div className="container max-w-4xl">
          <div className="grid md:grid-cols-2 gap-12">
            <div>
              <h2 className="text-3xl font-bold mb-4">About Zomieks</h2>
              <p className="text-muted-foreground mb-4">
                Zomieks is South Africa's leading freelance marketplace, connecting skilled
                professionals with businesses and individuals who need their services. The
                platform offers service listings, online courses, BioLink storefronts, and
                secure escrow-protected payments.
              </p>
              <p className="text-muted-foreground">
                Founded with the mission to empower South Africa's growing freelance economy,
                Zomieks provides the tools freelancers need to build their brands, grow their
                client base, and earn a sustainable income.
              </p>
            </div>
            <div>
              <h2 className="text-3xl font-bold mb-4">Key Facts</h2>
              <ul className="space-y-4">
                {[
                  { label: 'Headquarters', value: 'South Africa' },
                  { label: 'Industry', value: 'Freelance Marketplace / Technology' },
                  { label: 'Platform', value: 'Web-based (zomieks.com)' },
                  { label: 'Services', value: 'Freelance services, online courses, BioLink storefronts' },
                  { label: 'Payments', value: 'PayFast & OZOW with escrow protection' },
                ].map((fact, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <SparklesIcon className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                    <div>
                      <span className="font-semibold">{fact.label}:</span>{' '}
                      <span className="text-muted-foreground">{fact.value}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Media Contact */}
      <section className="py-20 bg-muted/30">
        <div className="container max-w-3xl text-center">
          <EnvelopeIcon className="h-12 w-12 text-primary mx-auto mb-4" />
          <h2 className="text-3xl font-bold mb-4">Media Enquiries</h2>
          <p className="text-lg text-muted-foreground mb-6">
            For press enquiries, interviews, or media assets, please contact our press team.
          </p>
          <a href="mailto:press@zomieks.com">
            <Button size="lg">
              Contact Press Team
              <ArrowRightIcon className="h-5 w-5 ml-2" />
            </Button>
          </a>
          <p className="text-sm text-muted-foreground mt-4">
            press@zomieks.com
          </p>
        </div>
      </section>
    </div>
  );
}
