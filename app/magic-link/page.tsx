import { Suspense } from "react";
import MagicLinkClient from "./MagicLinkClient";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <Suspense fallback={<main className="mx-auto max-w-md p-6 sm:p-8">Učitavanje…</main>}>
      <MagicLinkClient />
    </Suspense>
  );
}
