'use client';

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import LandingHero from "@/components/landing/LandingHero";
import LandingProblem from "@/components/landing/LandingProblem";
import LandingWhyDifferent from "@/components/landing/LandingWhyDifferent";
import LandingFeatures from "@/components/landing/LandingFeatures";
import LandingSocialProof from "@/components/landing/LandingSocialProof";
import LandingPricing from "@/components/landing/LandingPricing";
import LandingFAQ from "@/components/landing/LandingFAQ";
import LandingFinalCTA from "@/components/landing/LandingFinalCTA";
import LandingFooter from "@/components/landing/LandingFooter";
import HomeSwipeButton from "@/components/HomeSwipeButton";

export default function Home() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Inject floating bubbles styles for entire page
  useEffect(() => {
    const styleId = 'page-bubbles-styles'
    if (document.getElementById(styleId)) return

    const style = document.createElement('style')
    style.id = styleId
    style.textContent = `
      .glassy-bubble {
        position: absolute;
        border-radius: 50%;
        background: linear-gradient(
          135deg,
          rgba(255, 182, 193, 0.7) 0%,
          rgba(255, 218, 185, 0.6) 30%,
          rgba(233, 213, 255, 0.65) 70%,
          rgba(255, 255, 255, 0.4) 100%
        );
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        border: 2px solid rgba(255, 255, 255, 0.6);
        box-shadow: 
          0 12px 48px rgba(236, 72, 153, 0.2),
          0 4px 16px rgba(219, 39, 119, 0.15),
          inset 0 2px 30px rgba(255, 255, 255, 0.5),
          inset 0 -2px 15px rgba(0, 0, 0, 0.05);
        pointer-events: none;
        opacity: 0.95;
      }
      
      .animate-float-1 {
        animation: float-1 20s ease-in-out infinite;
      }
      
      .animate-float-2 {
        animation: float-2 18s ease-in-out infinite;
      }
      
      .animate-float-3 {
        animation: float-3 15s ease-in-out infinite;
      }
      
      .animate-float-1-slow {
        animation: float-1 25s ease-in-out infinite;
      }
      
      .animate-float-2-medium {
        animation: float-2 14s ease-in-out infinite;
      }
      
      .animate-float-3-fast {
        animation: float-3 12s ease-in-out infinite;
      }
      
      .animate-float-1-fast {
        animation: float-1 10s ease-in-out infinite;
      }
      
      .animate-float-3-slow {
        animation: float-3 22s ease-in-out infinite;
      }
      
      @keyframes float-1 {
        0%, 100% {
          transform: translate(0, 0) scale(1);
        }
        25% {
          transform: translate(40px, -50px) scale(1.08);
        }
        50% {
          transform: translate(-25px, -80px) scale(1);
        }
        75% {
          transform: translate(50px, -35px) scale(0.95);
        }
      }
      
      @keyframes float-2 {
        0%, 100% {
          transform: translate(0, 0);
        }
        33% {
          transform: translate(-60px, -70px);
        }
        66% {
          transform: translate(40px, -100px);
        }
      }
      
      @keyframes float-3 {
        0%, 100% {
          transform: translateY(0) translateX(0);
          opacity: 0.9;
        }
        50% {
          transform: translateY(-70px) translateX(30px);
          opacity: 1;
        }
      }
      
      @media (prefers-reduced-motion: reduce) {
        .glassy-bubble {
          animation: none !important;
        }
      }
    `
    document.head.appendChild(style)

    return () => {
      const existingStyle = document.getElementById(styleId)
      if (existingStyle) {
        existingStyle.remove()
      }
    }
  }, [])

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
    <main 
      className="relative overflow-hidden min-h-screen"
      style={{
        background: `linear-gradient(
          135deg,
          #FDF2F8 0%,
          #FCE7F3 25%,
          #F5D0FE 50%,
          #E9D5FF 75%,
          #FDF2F8 100%
        )`
      }}
    >
      {/* Subtle Radial Spotlights */}
      <div 
        className="fixed inset-0 -z-10 pointer-events-none"
        style={{
          background: `
            radial-gradient(
              ellipse at 30% 50%,
              rgba(252, 231, 243, 0.8) 0%,
              transparent 50%
            ),
            radial-gradient(
              ellipse at 80% 30%,
              rgba(233, 213, 255, 0.6) 0%,
              transparent 40%
            )
          `,
          filter: 'blur(80px)'
        }}
      />

      {/* Glassy Bubbles - Page-wide, 40% smaller */}
      <div className="fixed inset-0 z-5 pointer-events-none overflow-hidden">
        {/* Large bubble - top right */}
        <div
          className="glassy-bubble animate-float-1-slow"
          style={{
            width: '108px',
            height: '108px',
            top: '10%',
            right: '20%',
            animationDelay: '0s'
          }}
        />

        {/* Medium bubble - top left */}
        <div
          className="glassy-bubble animate-float-2"
          style={{
            width: '84px',
            height: '84px',
            top: '20%',
            left: '10%',
            animationDelay: '2s'
          }}
        />

        {/* Small bubble - left side middle */}
        <div
          className="glassy-bubble animate-float-3-fast"
          style={{
            width: '42px',
            height: '42px',
            top: '50%',
            left: '5%',
            animationDelay: '5s'
          }}
        />

        {/* Medium bubble - bottom left */}
        <div
          className="glassy-bubble animate-float-1"
          style={{
            width: '96px',
            height: '96px',
            bottom: '25%',
            left: '15%',
            animationDelay: '3s'
          }}
        />

        {/* Small bubble - right side */}
        <div
          className="glassy-bubble animate-float-2-medium"
          style={{
            width: '54px',
            height: '54px',
            top: '35%',
            right: '8%',
            animationDelay: '7s'
          }}
        />

        {/* Large bubble - top center */}
        <div
          className="glassy-bubble animate-float-3-slow"
          style={{
            width: '90px',
            height: '90px',
            top: '8%',
            left: '45%',
            animationDelay: '1s'
          }}
        />

        {/* Medium bubble - bottom right */}
        <div
          className="glassy-bubble animate-float-1-fast"
          style={{
            width: '66px',
            height: '66px',
            bottom: '40%',
            right: '25%',
            animationDelay: '4s'
          }}
        />

        {/* Additional bubble - center right */}
        <div
          className="glassy-bubble animate-float-2"
          style={{
            width: '78px',
            height: '78px',
            top: '60%',
            right: '15%',
            animationDelay: '6s'
          }}
        />

        {/* Additional bubbles for better coverage */}
        <div
          className="glassy-bubble animate-float-3"
          style={{
            width: '60px',
            height: '60px',
            top: '75%',
            left: '30%',
            animationDelay: '8s'
          }}
        />

        <div
          className="glassy-bubble animate-float-1"
          style={{
            width: '72px',
            height: '72px',
            top: '30%',
            left: '70%',
            animationDelay: '9s'
          }}
        />

        <div
          className="glassy-bubble animate-float-2"
          style={{
            width: '48px',
            height: '48px',
            bottom: '10%',
            left: '50%',
            animationDelay: '10s'
          }}
        />
      </div>

      <div className="relative z-10">
        <LandingHero />
        <LandingProblem />
        <LandingWhyDifferent />
        <LandingSocialProof />
        <LandingFeatures />
        <LandingPricing />
        <LandingFAQ />
        <LandingFinalCTA />
        <LandingFooter />
        <HomeSwipeButton />
      </div>
    </main>
  );
}
