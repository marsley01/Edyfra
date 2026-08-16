import type { Metadata } from "next";
import { APIKeyManager } from "@/components/admin/APIKeyManager";

export const metadata: Metadata = {
  title: "API Keys | Edyfra Admin",
  description: "Manage external API keys for the Edyfra API Gateway.",
};

export default function AdminApiKeysPage() {
  return <APIKeyManager />;
}