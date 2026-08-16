import type { Metadata } from "next";
import { getApprovedReviews } from "@/app/actions/reviews";
import { unstable_cache } from "next/cache";
import { HomeHero } from "@/components/home/hero";
import { LogoCloud } from "@/components/home/logo-cloud";
import { HomeFeatures } from "@/components/home/features";
import { HomeNews } from "@/components/home/news-preview";
import { HomeTestimonials } from "@/components/home/testimonials";
import { HomeCTA } from "@/components/home/cta";
import { HowItWorks } from "@/components/home/how-it-works";
import { MashSpotlight } from "@/components/home/mash-spotlight";
import { SubjectCoverage } from "@/components/home/subject-coverage";
import { HomeNewsletter } from "@/components/home/newsletter";
import { AbstractAnimation } from "@/components/home/abstract-animation";

export const metadata: Metadata = {
  title: "Kenya's Institutional Study Platform",
  description:
    "Connect with verified tutors and elite peers across Kenya. AI-powered matching, live study rooms, and institutional analytics — built for the modern scholar.",
  openGraph: {
    title: "Edyfra — Kenya's Institutional Study Platform",
    description:
      "AI-powered tutor matching, live study rooms, and institutional analytics for Kenyan scholars. Find your study partner today.",
  },
};

// Cache the home page data for 60s — approved reviews only need to refresh every so often.
export const revalidate = 60;

const getCachedReviews = unstable_cache(
  async () => getApprovedReviews(),
  ['approved-reviews-home'],
  { revalidate: 3600 }
);

export default async function HomePage() {
  const reviews = await getCachedReviews();

  return (
    <div className="flex flex-col overflow-hidden bg-background">
      <HomeHero />
      <LogoCloud />
      <HomeFeatures />
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
