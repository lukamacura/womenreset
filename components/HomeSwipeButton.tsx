"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowBigRight } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

export default function HomeSwipeButton() {
  const router = useRouter();
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dragStartRef = useRef(0);
  const dragOffsetRef = useRef(0);
  const SWIPE_THRESHOLD = 80; // Minimum swipe distance to trigger

  // Check authentication status
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setIsAuthenticated(!!user);
    };

    checkAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session?.user);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    setIsDragging(true);
    const startX = e.touches[0].clientX;
    dragStartRef.current = startX;
    setDragOffset(0);
    dragOffsetRef.current = 0;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    const currentX = e.touches[0].clientX;
    const diff = currentX - dragStartRef.current; // Positive when swiping right
    
    // Only allow swiping right (positive diff)
    if (diff > 0) {
      const newOffset = Math.min(diff, 200); // Cap at 200px
      setDragOffset(newOffset);
      dragOffsetRef.current = newOffset;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault();
    const finalOffset = dragOffsetRef.current;
    if (finalOffset >= SWIPE_THRESHOLD) {
      // Swipe successful - navigate based on auth status
      if (isAuthenticated) {
        router.push("/dashboard");
      } else {
        router.push("/register");
      }
    }
    setIsDragging(false);
    setDragOffset(0);
    dragOffsetRef.current = 0;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    const startX = e.clientX;
    dragStartRef.current = startX;
    setDragOffset(0);
    dragOffsetRef.current = 0;
  };

  // Aggressive glow animation state
  const [isGlowing, setIsGlowing] = useState(false);

  // Inject aggressive glow animation styles
  useEffect(() => {
    const styleId = 'home-swipe-button-glow-styles';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      @keyframes smoothGlow {
        0% {
          box-shadow: 0 0 20px rgba(255, 116, 177, 0.3),
                      0 0 40px rgba(255, 116, 177, 0.2),
                      0 0 60px rgba(255, 116, 177, 0.15);
          transform: translateX(0);
        }
        50% {
          box-shadow: 0 0 50px rgba(255, 116, 177, 0.7),
                      0 0 80px rgba(255, 116, 177, 0.5),
                      0 0 120px rgba(255, 116, 177, 0.4);
          transform: translateX(8px);
        }
        100% {
          box-shadow: 0 0 20px rgba(255, 116, 177, 0.3),
                      0 0 40px rgba(255, 116, 177, 0.2),
                      0 0 60px rgba(255, 116, 177, 0.15);
          transform: translateX(0);
        }
      }
    `;
    document.head.appendChild(style);

    return () => {
      const existingStyle = document.getElementById(styleId);
      if (existingStyle) {
        existingStyle.remove();
      }
    };
  }, []);

  // Trigger aggressive glow animation every 5 seconds
  useEffect(() => {
    // Trigger immediately on mount, then every 5 seconds
    const triggerGlow = () => {
      if (!isDragging) {
        // Reset glow state first
        setIsGlowing(false);
        // Then trigger aggressive glow on next frame to ensure restart
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setIsGlowing(true);
            // Reset after animation completes (1.5s for smooth glow)
            setTimeout(() => setIsGlowing(false), 1500);
          });
        });
      }
    };

    // Initial trigger
    const initialTimeout = setTimeout(triggerGlow, 100);
    
    // Then repeat every 5 seconds
    const interval = setInterval(triggerGlow, 5000);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [isDragging]);

  // Handle mouse events for desktop
  useEffect(() => {
    if (!isDragging) return;
    
    const handleMouseMoveWrapper = (e: MouseEvent) => {
      e.preventDefault();
      const currentX = e.clientX;
      const diff = currentX - dragStartRef.current; // Positive when swiping right
      
      if (diff > 0) {
        const newOffset = Math.min(diff, 200);
        setDragOffset(newOffset);
        dragOffsetRef.current = newOffset;
      }
    };
    
    const handleMouseUpWrapper = (e: MouseEvent) => {
      e.preventDefault();
      const finalOffset = dragOffsetRef.current;
      if (finalOffset >= SWIPE_THRESHOLD) {
        // Navigate based on auth status
        if (isAuthenticated) {
          router.push("/dashboard");
        } else {
          router.push("/register");
        }
      }
      setIsDragging(false);
      setDragOffset(0);
      dragOffsetRef.current = 0;
    };
    
    document.addEventListener("mousemove", handleMouseMoveWrapper, { passive: false });
    document.addEventListener("mouseup", handleMouseUpWrapper, { passive: false });
    return () => {
      document.removeEventListener("mousemove", handleMouseMoveWrapper);
      document.removeEventListener("mouseup", handleMouseUpWrapper);
    };
  }, [isDragging, router, isAuthenticated]);

  // Click handler as fallback
  const handleClick = () => {
    // Only navigate if we didn't just complete a drag
    if (dragOffsetRef.current === 0 && !isDragging) {
      if (isAuthenticated) {
        router.push("/dashboard");
      } else {
        router.push("/register");
      }
    }
  };

  // Calculate progress for color transition (0 to 1)
  const swipeProgress = Math.min(dragOffset / SWIPE_THRESHOLD, 1);
  
  // Interpolate between primary colors based on swipe progress
  const getBackgroundColor = () => {
    if (swipeProgress === 0) return "bg-primary";
    if (swipeProgress < 0.5) return "bg-primary-dark";
    return "bg-primary-dark";
  };

  // Calculate glow intensity based on swipe progress and drag state
  const getGlowStyle = () => {
    if (isDragging && swipeProgress > 0) {
      // Intense glow when dragging with progress
      const intensity = Math.min(swipeProgress * 1.5, 1);
      const baseOpacity = 0.6 + (intensity * 0.4);
      const spread1 = 30 + (intensity * 50);
      const spread2 = 60 + (intensity * 100);
      const spread3 = 90 + (intensity * 150);
      const spread4 = 120 + (intensity * 200);
      
      return {
        boxShadow: `0 0 ${spread1}px rgba(255, 116, 177, ${baseOpacity}), 0 0 ${spread2}px rgba(255, 116, 177, ${baseOpacity * 0.8}), 0 0 ${spread3}px rgba(255, 116, 177, ${baseOpacity * 0.6}), 0 0 ${spread4}px rgba(255, 116, 177, ${baseOpacity * 0.4})`,
        animation: 'none' as const
      };
    }
    
    // Smooth glow animation with subtle movement when triggered (every 5 seconds)
    if (isGlowing && !isDragging) {
      return {
        animation: 'smoothGlow 1.5s ease-in-out',
        boxShadow: undefined
      };
    }
    
    // Default subtle glow when idle
    return {
      boxShadow: '0 0 20px rgba(255, 116, 177, 0.3), 0 0 40px rgba(255, 116, 177, 0.2)'
    };
  };

  // Determine label text based on auth status
  const getLabelText = () => {
    if (isAuthenticated === null) {
      return "Swipe to get started";
    }
    return isAuthenticated 
      ? "Swipe to see your overview" 
      : "Swipe to start free trial";
  };

  return (
    <div className="fixed bottom-0 left-1/2 -translate-x-1/2 z-20 mb-4 sm:mb-6 select-none">
      {/* Outer Container - Fixed and Centered */}
      <div className="flex items-center bg-gray-900 justify-center bg-navy rounded-full shadow-lg overflow-visible min-w-[280px] sm:min-w-[320px] px-5 pr-7 py-4 gap-4">
          {/* Swipeable Circular Button */}
          <button
            ref={buttonRef}
            onClick={handleClick}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onMouseDown={handleMouseDown}
            className="flex items-center justify-center focus:outline-none group"
            style={{ 
              transform: `translateX(${dragOffset}px)`,
              WebkitTransform: `translateX(${dragOffset}px)`,
              transition: isDragging ? 'none' : 'transform 0.3s ease-out'
            }}
            aria-label={getLabelText()}
          >
            <div 
              className={`flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-full transition-all duration-200 ${getBackgroundColor()} ${swipeProgress > 0.5 ? 'scale-110' : ''} group-hover:scale-105`}
              style={{
                backgroundColor: swipeProgress > 0 
                  ? `rgb(${255 - Math.floor(swipeProgress * 28)}, ${123 - Math.floor(swipeProgress * 25)}, ${156 - Math.floor(swipeProgress * 28)})`
                  : undefined,
                transition: isDragging 
                  ? 'background-color 0.1s ease-out, box-shadow 0.1s ease-out' 
                  : isGlowing
                    ? 'background-color 0.3s ease-out, box-shadow 0.3s ease-out'
                    : 'background-color 0.3s ease-out, transform 0.3s ease-out, box-shadow 0.3s ease-out',
                ...getGlowStyle()
              }}
            >
              <ArrowBigRight 
                className="h-6 w-6 sm:h-7 sm:w-7 text-white transition-transform duration-200 relative z-10"
                style={{
                  transform: `translateX(${swipeProgress * 10}px)`,
                  transition: isDragging ? 'transform 0.1s ease-out' : 'transform 0.3s ease-out',
                  filter: swipeProgress > 0.5 ? 'drop-shadow(0 0 8px rgba(255, 255, 255, 0.6))' : 'none'
                }}
              />
            </div>
          </button>
          
          {/* Text Label - Fixed in place */}
          <span className="text-sm sm:text-base font-medium text-white whitespace-nowrap">
            {getLabelText()}
          </span>
        </div>
      </div>
  );
}

