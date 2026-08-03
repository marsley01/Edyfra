import type { Metadata } from "next";
import { Scale, UserCheck, AlertTriangle, ShieldCheck, FileText, Gavel } from "lucide-react";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "Edyfra's terms of service — the rules that keep our study platform safe, fair, and useful for every student and tutor in Kenya.",
  robots: { index: true, follow: true },
  openGraph: {
    title: "Terms of Service — Edyfra",
    description:
      "The rules that keep Edyfra safe, fair, and useful for every student. Read our code of conduct, your responsibilities, and service terms.",
  },
};

export default function TermsPage() {
  return (
    <div className="bg-background pt-32 pb-48">
      <div className="container-max max-w-4xl space-y-16">
        <div className="space-y-6">
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary">Our Rules</p>
          <h1 className="text-6xl font-black tracking-tightest text-foreground">Terms of <span className="text-muted-foreground">Service.</span></h1>
          <p className="text-xl text-muted-foreground font-medium">The rules that keep Edyfra safe, fair, and useful for every student.</p>
          <p className="text-sm text-muted-foreground">Last updated: August 2026</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pb-16 border-b border-border">
          {[
            { icon: Scale, title: "Fair Use", desc: "Respect other people's work and ideas." },
            { icon: UserCheck, title: "Be Real", desc: "Use your real name and info to build trust." },
            { icon: AlertTriangle, title: "Stay Honest", desc: "No cheating, no plagiarism — simple." },
          ].map((item, i) => (
            <div key={i} className="p-6 bg-secondary rounded-2xl space-y-4">
              <item.icon className="h-6 w-6 text-primary" />
              <h3 className="font-black text-sm uppercase tracking-widest">{item.title}</h3>
              <p className="text-xs text-muted-foreground font-medium leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>

        <div className="prose prose-invert max-w-none space-y-16">
          <section className="space-y-6">
            <h2 className="text-3xl font-black tracking-tight flex items-center gap-4">
              <span className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary text-sm">01</span>
              Agreement to Terms
            </h2>
            <div className="space-y-4 text-muted-foreground leading-relaxed font-medium">
              <p>
                By accessing or using Edyfra, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our platform.
              </p>
              <p>
                Your continued use of Edyfra after any changes to these terms constitutes acceptance of those changes.
              </p>
            </div>
          </section>

          <section className="space-y-6">
            <h2 className="text-3xl font-black tracking-tight flex items-center gap-4">
              <span className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary text-sm">02</span>
              The Service
            </h2>
            <div className="space-y-4 text-muted-foreground leading-relaxed font-medium">
              <p>
                Edyfra is an educational platform that connects students with tutors and study resources. We provide AI-assisted learning tools, study rooms, booking services, and community features.
              </p>
              <p>
                We reserve the right to modify, suspend, or discontinue any part of the service at any time. We will provide reasonable notice of significant changes.
              </p>
            </div>
          </section>

          <section className="space-y-6">
            <h2 className="text-3xl font-black tracking-tight flex items-center gap-4">
              <span className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary text-sm">03</span>
              Eligibility
            </h2>
            <div className="space-y-4 text-muted-foreground leading-relaxed font-medium">
              <p>
                You must be at least 13 years old to use Edyfra. If you are under 18, you represent that you have your parent or guardian's permission to use the platform.
              </p>
              <p>
                By using Edyfra, you represent that all information you provide is accurate and complete, and that you will keep your account information updated.
              </p>
            </div>
          </section>

          <section className="space-y-6">
            <h2 className="text-3xl font-black tracking-tight flex items-center gap-4">
              <span className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary text-sm">04</span>
              Account Responsibilities
            </h2>
            <div className="space-y-4 text-muted-foreground leading-relaxed font-medium">
              <p>
                You are responsible for maintaining the confidentiality of your account credentials and for all activities under your account. Notify us immediately of any unauthorized use.
              </p>
              <p>
                We may suspend or terminate accounts that violate these terms, engage in fraudulent activity, or harm other users.
              </p>
            </div>
          </section>

          <section className="space-y-6">
            <h2 className="text-3xl font-black tracking-tight flex items-center gap-4">
              <span className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary text-sm">05</span>
              Acceptable Use
            </h2>
            <div className="space-y-4 text-muted-foreground leading-relaxed font-medium">
              <p>You agree not to:</p>
              <ul className="list-disc pl-6 space-y-2 marker:text-primary">
                <li>Use Edyfra for any illegal or unauthorized purpose</li>
                <li>Cheat, plagiarize, or use the platform to complete academic work dishonestly</li>
                <li>Harass, abuse, or harm other users</li>
                <li>Upload malicious content or attempt to compromise platform security</li>
                <li>Use bots, scrapers, or automated tools to access the platform</li>
                <li>Impersonate another person or entity</li>
              </ul>
            </div>
          </section>

          <section className="space-y-6">
            <h2 className="text-3xl font-black tracking-tight flex items-center gap-4">
              <span className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary text-sm">06</span>
              Your Content
            </h2>
            <div className="space-y-4 text-muted-foreground leading-relaxed font-medium">
              <p>
                You retain ownership of all content you create and upload to Edyfra. By submitting content, you grant us a limited license to use, store, and process it solely to provide and improve the service.
              </p>
            </div>
          </section>

          <section className="space-y-6">
            <h2 className="text-3xl font-black tracking-tight flex items-center gap-4">
              <span className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary text-sm">07</span>
              Generated Content
            </h2>
            <div className="space-y-4 text-muted-foreground leading-relaxed font-medium">
              <p>
                Edyfra uses artificial intelligence, including Mash AI, to generate educational content, summaries, and study assistance. You own the content you create using our AI tools.
              </p>
              <p>
                AI-generated content may be inaccurate or incomplete. You are responsible for verifying any AI-generated content before relying on it for academic or professional purposes.
              </p>
            </div>
          </section>

          <section className="space-y-6">
            <h2 className="text-3xl font-black tracking-tight flex items-center gap-4">
              <span className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary text-sm">08</span>
              AI Disclaimer
            </h2>
            <div className="space-y-4 text-muted-foreground leading-relaxed font-medium">
              <p>
                Mash AI and other AI features on Edyfra are educational tools designed to assist learning. AI responses are probabilistic and may contain errors, hallucinations, or incomplete information.
              </p>
              <p>
                Always verify AI-generated content with authoritative sources. Edyfra is not responsible for academic or professional decisions made based on AI-generated content.
              </p>
            </div>
          </section>

          <section className="space-y-6">
            <h2 className="text-3xl font-black tracking-tight flex items-center gap-4">
              <span className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary text-sm">09</span>
              Third-Party Services
            </h2>
            <div className="space-y-4 text-muted-foreground leading-relaxed font-medium">
              <p>
                Edyfra integrates with third-party services including Google Calendar, Stream Chat, Supabase, and payment processors. Your use of these services is subject to their respective terms and privacy policies.
              </p>
              <p>
                We are not responsible for the availability, accuracy, or practices of third-party services.
              </p>
            </div>
          </section>

          <section className="space-y-6">
            <h2 className="text-3xl font-black tracking-tight flex items-center gap-4">
              <span className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary text-sm">10</span>
              Service Availability
            </h2>
            <div className="space-y-4 text-muted-foreground leading-relaxed font-medium">
              <p>
                We strive to keep Edyfra available 24/7, but we do not guarantee uninterrupted access. We may need to take the service offline for maintenance, updates, or emergencies.
              </p>
              <p>
                We are not liable for any loss, inconvenience, or missed opportunities resulting from service interruptions.
              </p>
            </div>
          </section>

          <section className="space-y-6">
            <h2 className="text-3xl font-black tracking-tight flex items-center gap-4">
              <span className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary text-sm">11</span>
              Intellectual Property
            </h2>
            <div className="space-y-4 text-muted-foreground leading-relaxed font-medium">
              <p>
                Edyfra's name, logo, design, and technology are our exclusive property. You may not copy, modify, or distribute them without our written permission.
              </p>
            </div>
          </section>

          <section className="space-y-6">
            <h2 className="text-3xl font-black tracking-tight flex items-center gap-4">
              <span className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary text-sm">12</span>
              Termination
            </h2>
            <div className="space-y-4 text-muted-foreground leading-relaxed font-medium">
              <p>
                We may suspend or terminate your access to Edyfra at our discretion, without notice, for conduct that violates these terms or is harmful to other users or the platform.
              </p>
              <p>
                You may delete your account at any time through your account settings.
              </p>
            </div>
          </section>

          <section className="space-y-6">
            <h2 className="text-3xl font-black tracking-tight flex items-center gap-4">
              <span className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary text-sm">13</span>
              Disclaimer of Warranties
            </h2>
            <div className="space-y-4 text-muted-foreground leading-relaxed font-medium">
              <p className="uppercase tracking-widest text-xs font-black">
                EDYFRA IS PROVIDED ON AN "AS-IS" AND "AS-AVAILABLE" BASIS. WE MAKE NO WARRANTIES, EXPRESS OR IMPLIED, ABOUT THE RELIABILITY, ACCURACY, OR AVAILABILITY OF THE SERVICE.
              </p>
            </div>
          </section>

          <section className="space-y-6">
            <h2 className="text-3xl font-black tracking-tight flex items-center gap-4">
              <span className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary text-sm">14</span>
              Limitation of Liability
            </h2>
            <div className="space-y-4 text-muted-foreground leading-relaxed font-medium">
              <p>
                To the maximum extent permitted by law, Edyfra shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of profits, data, or goodwill.
              </p>
              <p>
                Some jurisdictions do not allow the exclusion of certain warranties or liability, so the above limitations may not apply to you in full.
              </p>
            </div>
          </section>

          <section className="space-y-6">
            <h2 className="text-3xl font-black tracking-tight flex items-center gap-4">
              <span className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary text-sm">15</span>
              Indemnification
            </h2>
            <div className="space-y-4 text-muted-foreground leading-relaxed font-medium">
              <p>
                You agree to indemnify and hold harmless Edyfra and its affiliates from any claims, damages, or expenses arising from your use of the platform or violation of these terms.
              </p>
            </div>
          </section>

          <section className="space-y-6">
            <h2 className="text-3xl font-black tracking-tight flex items-center gap-4">
              <span className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary text-sm">16</span>
              Governing Law
            </h2>
            <div className="space-y-4 text-muted-foreground leading-relaxed font-medium">
              <p>
                These terms are governed by the laws of Kenya. Any disputes shall be resolved in the courts of Nairobi, Kenya, unless you are an EEA user, in which case you may also bring claims in your local jurisdiction.
              </p>
            </div>
          </section>

          <section className="space-y-6">
            <h2 className="text-3xl font-black tracking-tight flex items-center gap-4">
              <span className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary text-sm">17</span>
              Changes to Terms
            </h2>
            <div className="space-y-4 text-muted-foreground leading-relaxed font-medium">
              <p>
                We may update these terms from time to time. We will notify users of significant changes via email or in-app notification. Continued use of Edyfra after changes are posted constitutes acceptance.
              </p>
            </div>
          </section>

          <section className="space-y-6">
            <h2 className="text-3xl font-black tracking-tight flex items-center gap-4">
              <span className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary text-sm">18</span>
              Contact
            </h2>
            <div className="space-y-4 text-muted-foreground leading-relaxed font-medium">
              <p>
                For questions about these Terms, please contact us at:
              </p>
              <p>
                <strong>Email:</strong> legal@edyfra.com<br />
                <strong>Address:</strong> Nairobi, Kenya
              </p>
              <p className="text-xs italic bg-secondary p-4 rounded-xl border border-border">
                For copyright or DMCA complaints, use the same contact above with subject line "DMCA Complaint".
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
