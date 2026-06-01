import { getApprovedReviews } from "@/app/actions/reviews";
import { getGlobalStats } from "@/app/actions/user";
import { HomeHero } from "@/components/home/hero";
import { LogoCloud } from "@/components/home/logo-cloud";
import { HomeFeatures } from "@/components/home/features";
import { HomeStats } from "@/components/home/stats";
import { HomeNews } from "@/components/home/news-preview";
import { HomeTestimonials } from "@/components/home/testimonials";
import { HomeCTA } from "@/components/home/cta";
import { HowItWorks } from "@/components/home/how-it-works";
import { MashSpotlight } from "@/components/home/mash-spotlight";
import { SubjectCoverage } from "@/components/home/subject-coverage";
import { HomeNewsletter } from "@/components/home/newsletter";
import { AbstractAnimation } from "@/components/home/abstract-animation";

// Server Component — fetches real data on every request
export default async function HomePage() {
  // Run all data fetches in parallel
  const [reviews, stats] = await Promise.all([
    getApprovedReviews(),
    getGlobalStats(),
  ]);

  return (
    <div className="flex flex-col overflow-hidden bg-background">
      <HomeHero />
      <LogoCloud />
      <HomeFeatures />
      <HomeStats stats={stats} />
      <HomeNews />
      <HomeTestimonials initialReviews={reviews} />
      <HomeCTA />
      <AbstractAnimation />
      <HomeNewsletter />
      {/* New sections below CTA */}
      <HowItWorks />
      <MashSpotlight />
      <SubjectCoverage />
    </div>
  );
}
