import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { getApprovedReviews } from "@/app/actions/reviews";
import { unstable_cache } from "next/cache";
import { HomeHero } from "@/components/home/hero";
import { HomeFeatures } from "@/components/home/features";

// Below-the-fold sections are code-split so their JS only loads after the
// hero has painted. Each has a lightweight skeleton while its chunk streams in.
const HomeNews = dynamic(() => import("@/components/home/news-preview").then((m) => m.HomeNews), {
  loading: () => <div className="py-32 md:py-48" aria-hidden="true" />,
});
const HomeTestimonials = dynamic(() => import("@/components/home/testimonials").then((m) => m.HomeTestimonials), {
  loading: () => <div className="py-32 md:py-48 bg-secondary/30" aria-hidden="true" />,
});
const HomeCTA = dynamic(() => import("@/components/home/cta").then((m) => m.HomeCTA), {
  loading: () => <div className="h-screen max-h-[900px] min-h-[600px]" aria-hidden="true" />,
});
const AbstractAnimation = dynamic(() => import("@/components/home/abstract-animation").then((m) => m.AbstractAnimation), {
  loading: () => <div className="h-[400px] md:h-[500px]" aria-hidden="true" />,
});
const HomeNewsletter = dynamic(() => import("@/components/home/newsletter").then((m) => m.HomeNewsletter), {
  loading: () => <div className="py-16" aria-hidden="true" />,
});
const HowItWorks = dynamic(() => import("@/components/home/how-it-works").then((m) => m.HowItWorks), {
  loading: () => <div className="py-32 md:py-48" aria-hidden="true" />,
});
const MashSpotlight = dynamic(() => import("@/components/home/mash-spotlight").then((m) => m.MashSpotlight), {
  loading: () => <div className="py-32 md:py-48" aria-hidden="true" />,
});
const SubjectCoverage = dynamic(() => import("@/components/home/subject-coverage").then((m) => m.SubjectCoverage), {
  loading: () => <div className="py-32 md:py-40" aria-hidden="true" />,
});

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
      <HomeFeatures />
      <HowItWorks />
      <SubjectCoverage />
      <HomeNews />
      <HomeTestimonials initialReviews={reviews} />
      <MashSpotlight />
      <HomeCTA />
      <AbstractAnimation />
      <HomeNewsletter />
    </div>
  );
}