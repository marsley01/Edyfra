import type { Metadata } from "next";
import { JsonLd } from "@/components/json-ld";
import ContactClient from "./ContactClient";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://edyfra-v2.vercel.app";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Get in touch with the Edyfra team. Have a question, feedback, or want to partner with us? Reach out — we'd love to hear from you.",
  openGraph: {
    title: "Contact Edyfra — We'd Love to Hear From You",
    description:
      "Got a question, feedback, or want to say hi? Drop us a message and we'll get back to you within a day.",
  },
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "How does Edyfra match me with a study partner?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "We look at your subject, level, and study preferences to find the best tutor or peer for you — in real time. Think of it as a smart study buddy finder.",
      },
    },
    {
      "@type": "Question",
      name: "Is Edyfra for high school students only?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Nope! Edyfra works for both High School (Form 1 to 4) and University students. Content is separated so everyone learns at the right level.",
      },
    },
    {
      "@type": "Question",
      name: "How do I become a tutor on Edyfra?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Just apply through the app! We'll review your academic background and credentials. Once approved, you can start earning by helping other students.",
      },
    },
    {
      "@type": "Question",
      name: "Can I use Edyfra without internet?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "You'll need an internet connection to use Edyfra since we match you with study partners and tutors in real time.",
      },
    },
  ],
};

export default function ContactPage() {
  return (
    <>
      <JsonLd data={faqJsonLd} />
      <ContactClient />
    </>
  );
}
