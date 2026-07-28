import type { Metadata } from "next";
import { changelog } from "@/data/changelog";
import { ChangelogClient } from "./changelog-client";

export const metadata: Metadata = {
  title: "Changelog — Edyfra",
  description: "Every update, improvement, and fix — handcrafted for you. See what's new on Edyfra.",
};

// Revalidate once per hour so git-generated changelog sidecars update quickly
export const revalidate = 3600;

export default function ChangelogPage() {
  return <ChangelogClient entries={changelog} />;
}
