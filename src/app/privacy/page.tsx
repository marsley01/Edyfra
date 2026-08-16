import type { Metadata } from "next";
import { ShieldCheck, Lock, Eye, Cookie, Server, Globe } from "lucide-react";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Edyfra takes your privacy seriously. Learn how we collect, use, and protect your personal data as a student or tutor on our platform.",
  robots: { index: true, follow: true },
  openGraph: {
    title: "Privacy Policy — Edyfra",
    description:
      "How Edyfra collects, uses, and protects your personal data. No ads, no trackers, no data brokers.",
  },
};

export default function PrivacyPage() {
  return (
    <div className="bg-background pt-32 pb-48">
      <div className="container-max max-w-4xl space-y-16">
        <div className="space-y-6">
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary">Your Privacy Matters</p>
          <h1 className="text-6xl font-black tracking-tightest">Privacy <span className="text-muted-foreground">Policy.</span></h1>
          <p className="text-xl text-muted-foreground font-medium">How we collect, use, and protect your personal data.</p>
          <p className="text-sm text-muted-foreground">Last updated: August 2026</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pb-16 border-b border-border">
          {[
            { icon: Lock, title: "Encryption", desc: "Your data is protected with enterprise-grade security." },
            { icon: Eye, title: "Transparency", desc: "You own your data — we just help you learn." },
            { icon: ShieldCheck, title: "Protection", desc: "We never share your info with third parties." },
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
              Who We Are
            </h2>
            <div className="space-y-4 text-muted-foreground leading-relaxed font-medium">
              <p>
                Edyfra is an educational technology platform based in Nairobi, Kenya. We provide AI-assisted learning, tutor matching, study rooms, and community features for students and tutors.
              </p>
              <p>
                <strong>Contact:</strong> privacy@edyfra.com<br />
                <strong>Address:</strong> Nairobi, Kenya
              </p>
            </div>
          </section>

          <section className="space-y-6">
            <h2 className="text-3xl font-black tracking-tight flex items-center gap-4">
              <span className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary text-sm">02</span>
              What the Service Does
            </h2>
            <div className="space-y-4 text-muted-foreground leading-relaxed font-medium">
              <p>
                Edyfra connects students with tutors and study resources. We use AI to personalize learning, generate study content, and provide real-time academic assistance. Our platform includes study rooms, booking systems, community forums, and progress tracking.
              </p>
            </div>
          </section>

          <section className="space-y-6">
            <h2 className="text-3xl font-black tracking-tight flex items-center gap-4">
              <span className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary text-sm">03</span>
              Information We Collect
            </h2>
            <div className="space-y-4 text-muted-foreground leading-relaxed font-medium">
              <p>We collect only the information necessary to provide and improve our service:</p>
              <ul className="list-disc pl-6 space-y-2 marker:text-primary">
                <li><strong>Account information:</strong> Email, name, phone number, education level, and subjects</li>
                <li><strong>Usage data:</strong> Study sessions, progress, interactions with tutors and AI</li>
                <li><strong>Content:</strong> Messages, notes, and materials you create or upload</li>
                <li><strong>Payment information:</strong> Processed securely by our payment providers (M-Pesa, Paystack). We do not store full card details.</li>
                <li><strong>Device and log data:</strong> IP address, browser type, and access times for security and analytics</li>
              </ul>
              <p className="text-xs italic bg-secondary p-4 rounded-xl border border-border">
                <strong>What we DON'T collect:</strong> We do not collect unnecessary personal data, sell your information, or use ad trackers.
              </p>
            </div>
          </section>

          <section className="space-y-6">
            <h2 className="text-3xl font-black tracking-tight flex items-center gap-4">
              <span className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary text-sm">04</span>
              How We Use Your Data
            </h2>
            <div className="space-y-4 text-muted-foreground leading-relaxed font-medium">
              <p>We use your data to:</p>
              <ul className="list-disc pl-6 space-y-2 marker:text-primary">
                <li>Provide and improve the Edyfra platform</li>
                <li>Match you with suitable tutors and study partners</li>
                <li>Power AI features like Mash AI for personalized learning</li>
                <li>Send important notifications about your account and sessions</li>
                <li>Ensure platform safety and prevent abuse</li>
              </ul>
              <p className="text-xs italic bg-secondary p-4 rounded-xl border border-border">
                <strong>AI Training:</strong> We do not use your personal data or study content to train AI models. Your data is processed only to provide you with personalized educational assistance.
              </p>
            </div>
          </section>

          <section className="space-y-6">
            <h2 className="text-3xl font-black tracking-tight flex items-center gap-4">
              <span className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary text-sm">05</span>
              Cookies
            </h2>
            <div className="space-y-4 text-muted-foreground leading-relaxed font-medium">
              <p>We use essential cookies to keep you logged in and maintain your preferences. We also use analytics cookies to understand how the platform is used.</p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border border-border rounded-xl">
                  <thead>
                    <tr className="bg-secondary">
                      <th className="p-3 text-left font-black uppercase tracking-widest">Cookie</th>
                      <th className="p-3 text-left font-black uppercase tracking-widest">Purpose</th>
                      <th className="p-3 text-left font-black uppercase tracking-widest">Duration</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    <tr>
                      <td className="p-3 font-mono">session_id</td>
                      <td className="p-3">Keep you logged in</td>
                      <td className="p-3">Session</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-mono">preferences</td>
                      <td className="p-3">Store your settings</td>
                      <td className="p-3">30 days</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-mono">_ga / _ga_*</td>
                      <td className="p-3">Google Analytics</td>
                      <td className="p-3">14 months</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <section className="space-y-6">
            <h2 className="text-3xl font-black tracking-tight flex items-center gap-4">
              <span className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary text-sm">06</span>
              Third-Party Processors
            </h2>
            <div className="space-y-4 text-muted-foreground leading-relaxed font-medium">
              <p>We work with trusted service providers to operate Edyfra:</p>
              <ul className="list-disc pl-6 space-y-2 marker:text-primary">
                <li><strong>Supabase</strong> — database and authentication (Privacy Policy)</li>
                <li><strong>Google Cloud / Firebase</strong> — hosting, AI, and messaging (Privacy Policy)</li>
                <li><strong>Stream</strong> — chat and video infrastructure (Privacy Policy)</li>
                <li><strong>M-Pesa / Paystack</strong> — payment processing (Privacy Policy)</li>
                <li><strong>Resend</strong> — email delivery (Privacy Policy)</li>
                <li><strong>Vercel</strong> — hosting and deployment (Privacy Policy)</li>
              </ul>
            </div>
          </section>

          <section className="space-y-6">
            <h2 className="text-3xl font-black tracking-tight flex items-center gap-4">
              <span className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary text-sm">07</span>
              Data Retention
            </h2>
            <div className="space-y-4 text-muted-foreground leading-relaxed font-medium">
              <p>We retain your data only as long as necessary:</p>
              <ul className="list-disc pl-6 space-y-2 marker:text-primary">
                <li><strong>Account data:</strong> Retained until you delete your account</li>
                <li><strong>Study sessions:</strong> Retained for your learning history and progress tracking</li>
                <li><strong>Analytics logs:</strong> Retained for up to 30 days for security and debugging</li>
                <li><strong>Payment records:</strong> Retained as required by law (7 years)</li>
              </ul>
              <p>You can request deletion of your account and associated data at any time.</p>
            </div>
          </section>

          <section className="space-y-6">
            <h2 className="text-3xl font-black tracking-tight flex items-center gap-4">
              <span className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary text-sm">08</span>
              Your Rights
            </h2>
            <div className="space-y-4 text-muted-foreground leading-relaxed font-medium">
              <p>Depending on your location, you may have the following rights:</p>
              <ul className="list-disc pl-6 space-y-2 marker:text-primary">
                <li><strong>Access:</strong> Request a copy of your personal data</li>
                <li><strong>Correction:</strong> Update or correct your information</li>
                <li><strong>Deletion:</strong> Request deletion of your account and data</li>
                <li><strong>Portability:</strong> Export your data in a usable format</li>
                <li><strong>Objection:</strong> Object to certain processing activities</li>
              </ul>
              <p>To exercise these rights, contact us at privacy@edyfra.com.</p>
            </div>
          </section>

          <section className="space-y-6">
            <h2 className="text-3xl font-black tracking-tight flex items-center gap-4">
              <span className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary text-sm">09</span>
              International Transfers
            </h2>
            <div className="space-y-4 text-muted-foreground leading-relaxed font-medium">
              <p>
                Your data may be transferred to and processed in Kenya and other countries where our service providers operate. We ensure appropriate safeguards are in place for international transfers.
              </p>
            </div>
          </section>

          <section className="space-y-6">
            <h2 className="text-3xl font-black tracking-tight flex items-center gap-4">
              <span className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary text-sm">10</span>
              Children's Privacy
            </h2>
            <div className="space-y-4 text-muted-foreground leading-relaxed font-medium">
              <p>
                Edyfra is designed for students aged 13 and above. If you are under 18, you must have parental consent to use the platform. We do not knowingly collect personal information from children under 13.
              </p>
            </div>
          </section>

          <section className="space-y-6">
            <h2 className="text-3xl font-black tracking-tight flex items-center gap-4">
              <span className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary text-sm">11</span>
              Security
            </h2>
            <div className="space-y-4 text-muted-foreground leading-relaxed font-medium">
              <p>
                We implement industry-standard security measures including encryption, Row Level Security (RLS), and regular security audits. However, no system is completely secure, and we cannot guarantee absolute security.
              </p>
            </div>
          </section>

          <section className="space-y-6">
            <h2 className="text-3xl font-black tracking-tight flex items-center gap-4">
              <span className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary text-sm">12</span>
              Changes to This Policy
            </h2>
            <div className="space-y-4 text-muted-foreground leading-relaxed font-medium">
              <p>
                We may update this Privacy Policy from time to time. We will notify you of significant changes via email or in-app notification. The "Last updated" date at the top indicates when the policy was last revised.
              </p>
            </div>
          </section>

          <section className="space-y-6">
            <h2 className="text-3xl font-black tracking-tight flex items-center gap-4">
              <span className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary text-sm">13</span>
              Contact
            </h2>
            <div className="space-y-4 text-muted-foreground leading-relaxed font-medium">
              <p>
                For privacy-related questions or requests, contact us at:
              </p>
              <p>
                <strong>Email:</strong> privacy@edyfra.com<br />
                <strong>Address:</strong> Nairobi, Kenya
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
