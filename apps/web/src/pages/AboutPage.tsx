import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import {
  SparklesIcon,
  GlobeAltIcon,
  UserGroupIcon,
  ShieldCheckIcon,
  ArrowRightIcon,
  HeartIcon,
  RocketLaunchIcon,
  LightBulbIcon,
} from '@heroicons/react/24/outline';

export default function AboutPage() {
  return (
    <div>
      {/* Hero */}
      <section className="relative py-20 bg-gradient-to-b from-background to-muted/30">
        <div className="container max-w-4xl text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
            <SparklesIcon className="h-4 w-4" />
            About Zomieks
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            Empowering South Africa's freelance economy
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Zomieks is South Africa's leading freelance marketplace — connecting talented
            professionals with businesses that need their skills.
          </p>
        </div>
      </section>

      {/* Mission */}
      <section className="py-20">
        <div className="container max-w-5xl">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-4">Our Mission</h2>
              <p className="text-lg text-muted-foreground mb-6">
                We believe every South African deserves the opportunity to earn a living
                doing what they love. Zomieks was built to make that possible — by providing
                a trusted, modern platform where freelancers can showcase their skills,
                sell services, create courses, and build their brands.
              </p>
              <p className="text-lg text-muted-foreground">
                For businesses, we offer access to a curated community of verified, skilled
                freelancers — with secure payments, escrow protection, and a seamless
                hiring experience.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: GlobeAltIcon, label: 'South African Focus', desc: 'Built for local talent and businesses' },
                { icon: ShieldCheckIcon, label: 'Secure Platform', desc: 'Escrow-protected payments' },
                { icon: UserGroupIcon, label: 'Growing Community', desc: 'Freelancers across every industry' },
                { icon: RocketLaunchIcon, label: 'Always Improving', desc: 'New features shipped regularly' },
              ].map((item, i) => (
                <div key={i} className="p-5 rounded-2xl border bg-background">
                  <item.icon className="h-6 w-6 text-primary mb-3" />
                  <h3 className="font-semibold text-sm mb-1">{item.label}</h3>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-20 bg-muted/30">
        <div className="container max-w-5xl">
          <h2 className="text-3xl font-bold text-center mb-12">Our Values</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: HeartIcon,
                title: 'People First',
                desc: 'Everything we build is designed to help real people earn, learn, and grow. Our freelancers and buyers are at the heart of every decision.',
              },
              {
                icon: ShieldCheckIcon,
                title: 'Trust & Transparency',
                desc: 'We believe in fair fees, honest communication, and a platform where both buyers and sellers feel safe and respected.',
              },
              {
                icon: LightBulbIcon,
                title: 'Innovation',
                desc: 'From BioLink storefronts to integrated courses, we continuously build tools that give freelancers a competitive edge.',
              },
              {
                icon: GlobeAltIcon,
                title: 'Local Impact',
                desc: 'We are proudly South African, focused on empowering local talent and creating economic opportunities in our communities.',
              },
              {
                icon: UserGroupIcon,
                title: 'Community',
                desc: 'Zomieks is more than a marketplace — it\'s a community of creators, entrepreneurs, and innovators supporting one another.',
              },
              {
                icon: RocketLaunchIcon,
                title: 'Excellence',
                desc: 'We hold ourselves and our sellers to a high standard. Quality work, timely delivery, and professional conduct are non-negotiable.',
              },
            ].map((value, i) => (
              <div key={i} className="p-6 rounded-2xl border bg-background">
                <div className="p-2.5 rounded-xl bg-primary/10 w-fit mb-4">
                  <value.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-bold text-lg mb-2">{value.title}</h3>
                <p className="text-sm text-muted-foreground">{value.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="container max-w-3xl text-center">
          <h2 className="text-3xl font-bold mb-4">Join the Zomieks community</h2>
          <p className="text-lg text-muted-foreground mb-8">
            Whether you're a freelancer looking to grow your career or a business in need
            of top talent — Zomieks is the place for you.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register">
              <Button size="lg">
                Sign Up Free
                <ArrowRightIcon className="h-5 w-5 ml-2" />
              </Button>
            </Link>
            <Link to="/become-seller">
              <Button size="lg" variant="outline">
                Become a Seller
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
