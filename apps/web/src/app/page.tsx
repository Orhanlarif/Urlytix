import dynamic from 'next/dynamic';
import { LandingHero, LandingNav } from '@/components/landing';

const LandingTrust = dynamic(
  () =>
    import('@/components/landing/landing-trust').then((m) => m.LandingTrust),
  { ssr: true },
);
const LandingHowItWorks = dynamic(
  () =>
    import('@/components/landing/landing-how-it-works').then(
      (m) => m.LandingHowItWorks,
    ),
  { ssr: true },
);
const LandingFeatures = dynamic(
  () =>
    import('@/components/landing/landing-features').then(
      (m) => m.LandingFeatures,
    ),
  { ssr: true },
);
const LandingShowcase = dynamic(
  () =>
    import('@/components/landing/landing-showcase').then(
      (m) => m.LandingShowcase,
    ),
  { ssr: true },
);
const LandingFinalCta = dynamic(
  () =>
    import('@/components/landing/landing-final-cta').then(
      (m) => m.LandingFinalCta,
    ),
  { ssr: true },
);
const LandingFooter = dynamic(
  () =>
    import('@/components/landing/landing-footer').then((m) => m.LandingFooter),
  { ssr: true },
);

export default function HomePage() {
  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[var(--background)] text-[var(--foreground)]">
      <div className="pointer-events-none absolute inset-0 overflow-hidden lg:fixed">
        <div className="absolute left-1/2 top-0 h-[32rem] w-[32rem] -translate-x-1/2 rounded-full bg-[var(--accent)]/10 blur-3xl" />
        <div className="absolute bottom-1/4 right-0 h-[28rem] w-[28rem] rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/4 h-72 w-72 rounded-full bg-[var(--accent)]/5 blur-3xl" />
      </div>

      <LandingNav />
      <LandingHero />
      <LandingTrust />
      <LandingHowItWorks />
      <LandingFeatures />
      <LandingShowcase />
      <LandingFinalCta />
      <LandingFooter />
    </main>
  );
}
