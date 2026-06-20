import { AcceptClient } from "./accept-client";

export const metadata = { title: "Accept invitation — Edyfra Institutions" };

export default async function AcceptPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const params = await searchParams;
  return <AcceptClient token={params.token ?? null} />;
}
