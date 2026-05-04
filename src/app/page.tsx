"use client";

import { HomeHero } from "@/components/home/hero";
import { LogoCloud } from "@/components/home/logo-cloud";
import { HomeFeatures } from "@/components/home/features";
import { HomeStats } from "@/components/home/stats";
import { HomeNews } from "@/components/home/news-preview";
import { HomeTestimonials } from "@/components/home/testimonials";
import { HomeCTA } from "@/components/home/cta";
import { motion } from "framer-motion";

export default function HomePage() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col overflow-hidden bg-background"
    >
      <HomeHero />
      <LogoCloud />
      <HomeFeatures />
      <HomeStats />
      <HomeNews />
      <HomeTestimonials />
      <HomeCTA />
    </motion.div>
  );
}
