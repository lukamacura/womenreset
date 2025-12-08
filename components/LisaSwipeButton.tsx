"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowBigRight } from "lucide-react";

export default function LisaSwipeButton() {
  const router = useRouter();
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dragStartRef = useRef(0);
  const dragOffsetRef = useRef(0);
  const SWIPE_THRESHOLD = 80; // Minimum swipe distance to trigger

  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    setIsDragging(true);
    const startY = e.touches[0].clientY;
    dragStartRef.current = startY;
    setDragOffset(0);
    dragOffsetRef.current = 0;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    const currentY = e.touches[0].clientY;
    const diff = dragStartRef.current - currentY; // Positive when swiping up
    
    // Only allow swiping up (positive diff)
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
    const startY = e.clientY;
    dragStartRef.current = startY;
    setDragOffset(0);
    dragOffsetRef.current = 0;
  };

  // Handle mouse events for desktop
  useEffect(() => {
    if (!isDragging) return;
    
    const handleMouseMoveWrapper = (e: MouseEvent) => {
      e.preventDefault();
      const currentY = e.clientY;
      const diff = dragStartRef.current - currentY; // Positive when swiping up
      
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
  }, [isDragging, router]);

  // Click handler as fallback
  const handleClick = () => {
    // Only navigate if we didn't just complete a drag
    if (dragOffsetRef.current === 0 && !isDragging) {
      router.push("/chat/lisa");
    }
  };

  // Calculate progress for color transition (0 to 1)
  const swipeProgress = Math.min(dragOffset / SWIPE_THRESHOLD, 1);
  
  // Interpolate between pink-500 and pink-700 based on swipe progress
  const getBackgroundColor = () => {
    if (swipeProgress === 0) return "bg-pink-500";
    if (swipeProgress < 0.5) return "bg-pink-600";
    return "bg-pink-700";
  };

  return (
    <button
      ref={buttonRef}
      onClick={handleClick}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      className="fixed bottom-0 left-1/2 z-50 flex items-center group mb-4 sm:mb-6 select-none"
      style={{ 
        transform: `translateX(-50%) translateY(${-dragOffset}px)`,
        WebkitTransform: `translateX(-50%) translateY(${-dragOffset}px)`,
        transition: isDragging ? 'none' : 'transform 0.3s ease-out'
      }}
      aria-label="Swipe to open Lisa"
    >
      {/* Button Container */}
      <div className="flex items-center bg-gray-900 rounded-full shadow-lg overflow-hidden min-w-[280px] sm:min-w-[320px]">
        {/* Circular Button */}
        <div 
          className={`flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 transition-all duration-200 ${getBackgroundColor()} ${swipeProgress > 0.5 ? 'scale-110' : ''}`}
          style={{
            backgroundColor: swipeProgress > 0 
              ? `rgb(${236 - Math.floor(swipeProgress * 20)}, ${72 - Math.floor(swipeProgress * 10)}, ${153 - Math.floor(swipeProgress * 20)})`
              : undefined
          }}
        >
          <ArrowBigRight 
            className="h-6 w-6 sm:h-7 sm:w-7 text-white transition-transform duration-200"
            style={{
              transform: `translateX(${swipeProgress * 10}px)`,
            }}
          />
        </div>
        
        {/* Text Label */}
        <div className="px-5 pr-7 py-4 flex-1">
          <span className="text-sm sm:text-base font-medium text-gray-200 whitespace-nowrap">
            Swipe to open Lisa
          </span>
        </div>
      </div>
    </button>
  );
}

