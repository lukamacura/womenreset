import { Suspense } from "react";
import MagicLinkClient from "./MagicLinkClient";

export const dynamic = "force-dynamic";

export default function Page({
  params: _params,
  searchParams: _searchParams,
}: {
  params?: Promise<Record<string, string | string[]>>;
  searchParams?: Promise<Record<string, string | string[]>>;
}) {
  return (
    <Suspense fallback={<main className="mx-auto max-w-md p-6 sm:p-8">Učitavanje…</main>}>
      <MagicLinkClient />
    </Suspense>
  );
}