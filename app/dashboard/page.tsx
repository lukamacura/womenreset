"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export const dynamic = "force-dynamic";

/**
 * Dashboard root: redirect to Home (symptoms page).
 * Home = symptoms; My Overview = /dashboard/overview.
 */
export default function DashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const checkout = searchParams.get("checkout");
    const target = checkout === "success"
      ? "/dashboard/symptoms?checkout=success"
      : "/dashboard/symptoms";
    router.replace(target);
  }, [router, searchParams]);

  return null;
}
