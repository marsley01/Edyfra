"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  ArrowRight,
  Loader2,
  CheckCircle,
  ChevronLeft,
  School,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import Link from "next/link";
import { submitInstitutionApplication } from "@/app/actions/institution-auth";

export default function InstitutionApply() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [institutionName, setInstitutionName] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData();
    formData.append("name", name);
    formData.append("email", email);
    formData.append("institutionName", institutionName);
    if (phone) formData.append("phone", phone);
    if (message) formData.append("message", message);

    const result = await submitInstitutionApplication(formData);

    if (result?.error) {
      toast.error(result.error);
      setLoading(false);
    } else {
      setSubmitted(true);
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex flex-col justify-center py-12 sm:px-6 lg:px-8 selection:bg-indigo-500/30">
        <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center border border-emerald-500/20">
              <CheckCircle className="h-8 w-8 text-emerald-400" />
            </div>
          </div>
          <h2 className="mt-6 text-3xl font-black tracking-tight text-foreground">
            Application Submitted
          </h2>
          <p className="mt-3 text-muted-foreground max-w-sm mx-auto">
            Thank you for your interest. Our team will review your application
            and get back to you within 1-2 business days.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Button variant="outline" onClick={() => router.push("/institution/login")}>
              Sign in
            </Button>
            <Button onClick={() => router.push("/")}>
              Back to Home
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center py-12 sm:px-6 lg:px-8 selection:bg-indigo-500/30">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-indigo-500/10 rounded-2xl flex items-center justify-center border border-indigo-500/20">
            <School className="h-8 w-8 text-indigo-400" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-black tracking-tight text-foreground">
          Register Your Institution
        </h2>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          Submit an application &mdash; our team will review and set up your school&apos;s private network
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-secondary/50 py-8 px-4 shadow-2xl sm:rounded-3xl sm:px-10 border border-border relative overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-50" />

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-muted-foreground">
                Your Full Name <span className="text-red-400">*</span>
              </label>
              <Input
                id="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 h-12"
                placeholder="Dr. Jane Doe"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-muted-foreground">
                Your Email <span className="text-red-400">*</span>
              </label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 h-12"
                placeholder="jane@school.ac.ke"
              />
            </div>

            <div>
              <label htmlFor="institutionName" className="block text-sm font-medium text-muted-foreground">
                Institution Name <span className="text-red-400">*</span>
              </label>
              <Input
                id="institutionName"
                required
                value={institutionName}
                onChange={(e) => setInstitutionName(e.target.value)}
                className="mt-1 h-12"
                placeholder="Nairobi High School"
              />
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-muted-foreground">
                Phone Number <span className="text-muted-foreground/50">(optional)</span>
              </label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-1 h-12"
                placeholder="+254 700 000 000"
              />
            </div>

            <div>
              <label htmlFor="message" className="block text-sm font-medium text-muted-foreground">
                Additional Information <span className="text-muted-foreground/50">(optional)</span>
              </label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="mt-1"
                rows={3}
                placeholder="Any details you'd like to share about your institution..."
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 text-sm font-bold"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  Submit Application
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <Link href="/institution/login" className="text-sm text-muted-foreground hover:text-indigo-400 inline-flex items-center gap-1">
              <ChevronLeft className="h-3 w-3" />
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
