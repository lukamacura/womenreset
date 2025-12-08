"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowBigRight } from "lucide-react";
import { useTrialStatus } from "@/lib/useTrialStatus";

export default function LisaSwipeButton() {
  const router = useRouter();
  const trialStatus = useTrialStatus();
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dragStartRef = useRef(0);
  const dragOffsetRef = useRef(0);
  const SWIPE_THRESHOLD = 80; // Minimum swipe distance to trigger

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
    if (finalOffset >= SWIPE_THRESHOLD && !trialStatus.expired) {
      // Swipe successful - navigate to Lisa
      router.push("/chat/lisa");
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
      if (finalOffset >= SWIPE_THRESHOLD && !trialStatus.expired) {
        router.push("/chat/lisa");
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
  }, [isDragging, router, trialStatus.expired]);

  // Click handler as fallback
  const handleClick = () => {
    // Block navigation if trial is expired
    if (trialStatus.expired) {
      return;
    }
    // Only navigate if we didn't just complete a drag
    if (dragOffsetRef.current === 0 && !isDragging) {
      router.push("/chat/lisa");
    }
  };

  // Hide button if trial is expired
  if (trialStatus.expired) {
    return null;
  }

  // Calculate progress for color transition (0 to 1)
  const swipeProgress = Math.min(dragOffset / SWIPE_THRESHOLD, 1);
  
  // Interpolate between rose-500 and rose-700 based on swipe progress
  const getBackgroundColor = () => {
    if (swipeProgress === 0) return "bg-rose-500";
    if (swipeProgress < 0.5) return "bg-rose-600";
    return "bg-rose-700";
  };

  return (
    <div className="fixed bottom-0 left-1/2 -translate-x-1/2 z-20 mb-4 sm:mb-6 select-none">
      {/* Outer Container - Fixed and Centered */}
      <div className="flex items-center justify-center bg-gray-900 rounded-full shadow-lg overflow-hidden min-w-[280px] sm:min-w-[320px] px-5 pr-7 py-4 gap-4">
        {/* Swipeable Circular Button */}
        <button
          ref={buttonRef}
          onClick={handleClick}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleMouseDown}
          className="flex items-center justify-center focus:outline-none"
          style={{ 
            transform: `translateX(${dragOffset}px)`,
            WebkitTransform: `translateX(${dragOffset}px)`,
            transition: isDragging ? 'none' : 'transform 0.3s ease-out'
          }}
          aria-label="Swipe to open Lisa chat"
        >
          <div 
            className={`flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-full transition-all duration-200 ${getBackgroundColor()} ${swipeProgress > 0.5 ? 'scale-110' : ''}`}
            style={{
              backgroundColor: swipeProgress > 0 
                ? `rgb(${244 - Math.floor(swipeProgress * 54)}, ${63 - Math.floor(swipeProgress * 45)}, ${94 - Math.floor(swipeProgress * 34)})`
                : undefined,
              transition: isDragging ? 'background-color 0.1s ease-out, transform 0.1s ease-out' : 'background-color 0.3s ease-out, transform 0.3s ease-out'
            }}
          >
            <ArrowBigRight 
              className="h-6 w-6 sm:h-7 sm:w-7 text-white transition-transform duration-200"
              style={{
                transform: `translateX(${swipeProgress * 10}px)`,
                transition: isDragging ? 'transform 0.1s ease-out' : 'transform 0.3s ease-out'
              }}
            />
          </div>
        </button>
        
        {/* Text Label - Fixed in place */}
        <span className="text-sm sm:text-base font-medium text-gray-200 whitespace-nowrap">
          Swipe to open Lisa chat
        </span>
      </div>
    </div>
  );
}

