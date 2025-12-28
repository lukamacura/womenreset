'use client';

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import MenopauseResetHero from "@/components/MenopauseResetHero";
import MenoLisaHero from "@/components/Hero";
import HomeSwipeButton from "@/components/HomeSwipeButton";

export default function Home() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Handle Supabase auth errors that redirect to home page
  useEffect(() => {
    const error = searchParams.get("error");
    const errorCode = searchParams.get("error_code");
    const errorDescription = searchParams.get("error_description");

    if (error || errorCode) {
      let errorMessage = "Authentication failed. Please try again.";
      
      if (errorCode === "otp_expired") {
        errorMessage = "The email link has expired. Please request a new magic link.";
      } else if (errorCode === "access_denied") {
        errorMessage = errorDescription 
          ? decodeURIComponent(errorDescription)
          : "Access denied. Please try again.";
      } else if (errorDescription) {
        errorMessage = decodeURIComponent(errorDescription);
      }

      // Redirect to login with error message
      router.replace(`/login?error=auth_callback_error&message=${encodeURIComponent(errorMessage)}`);
    }
  }, [searchParams, router]);

  return (
    <main className="relative overflow-hidden p-0 m-0">
      <MenoLisaHero/>
      <MenopauseResetHero/>
      <HomeSwipeButton />
    </main>
  );
}
