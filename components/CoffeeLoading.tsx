"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Coffee, 
  Sparkles, 
  Heart, 
  Lightbulb, 
  BookOpen, 
  Brain, 
  Flower2, 
  Sun,
  Moon,
  Star,
  Feather,
  Leaf
} from "lucide-react";

interface LoadingMessage {
  text: string;
  icon: typeof Coffee;
  color: string;
}

const LOADING_MESSAGES: LoadingMessage[] = [
  { text: "Taking a mindful moment...", icon: Heart, color: "#EC4899" },
  { text: "Gathering some wisdom for you...", icon: BookOpen, color: "#8B6F47" },
  { text: "Brewing up thoughtful insights...", icon: Coffee, color: "#8B6F47" },
  { text: "Let me sit with this for a moment...", icon: Moon, color: "#6B7280" },
  { text: "Connecting the dots...", icon: Sparkles, color: "#A855F7" },
  { text: "Finding the perfect words...", icon: Feather, color: "#10B981" },
  { text: "Crafting a thoughtful response...", icon: Lightbulb, color: "#F59E0B" },
  { text: "Reflecting on your question...", icon: Brain, color: "#6366F1" },
  { text: "Nurturing this conversation...", icon: Flower2, color: "#EC4899" },
  { text: "Bringing clarity to light...", icon: Sun, color: "#F59E0B" },
  { text: "Weaving insights together...", icon: Star, color: "#A855F7" },
  { text: "Growing understanding...", icon: Leaf, color: "#10B981" },
];

interface CoffeeLoadingProps {
  className?: string;
}

export default function CoffeeLoading({ className = "" }: CoffeeLoadingProps) {
  // Initialize with a random message
  const getInitialMessage = (): LoadingMessage => {
    const randomIndex = Math.floor(Math.random() * LOADING_MESSAGES.length);
    return LOADING_MESSAGES[randomIndex];
  };

  const [currentMessage, setCurrentMessage] = useState<LoadingMessage>(getInitialMessage);
  // Track used message indices to avoid immediate repeats (used via setState callback)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [usedIndices, setUsedIndices] = useState<Set<number>>(() => {
    const initialMsg = getInitialMessage();
    const initialIndex = LOADING_MESSAGES.findIndex(m => m.text === initialMsg.text);
    return new Set([initialIndex >= 0 ? initialIndex : 0]);
  });

  // Rotate messages every 1 second with random selection
  useEffect(() => {
    const interval = setInterval(() => {
      setUsedIndices((prev) => {
        // If we've used all messages, reset
        if (prev.size >= LOADING_MESSAGES.length) {
          const randomIndex = Math.floor(Math.random() * LOADING_MESSAGES.length);
          setCurrentMessage(LOADING_MESSAGES[randomIndex]);
          return new Set([randomIndex]);
        }
        
        // Get available indices
        const availableIndices = LOADING_MESSAGES
          .map((_, idx) => idx)
          .filter(idx => !prev.has(idx));
        
        // Pick random from available
        const randomIndex = availableIndices[Math.floor(Math.random() * availableIndices.length)];
        setCurrentMessage(LOADING_MESSAGES[randomIndex]);
        return new Set([...prev, randomIndex]);
      });
    }, 1000); // Change every 1 second

    return () => clearInterval(interval);
  }, []);

  const IconComponent = currentMessage.icon;

  return (
    <motion.div 
      className={`flex items-center gap-3 ${className}`} 
      style={{ 
        padding: '0.75rem 0',
      }}
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      {/* Dynamic Icon with Smooth Animation */}
      <motion.div
        key={currentMessage.text}
        initial={{ scale: 0.8, opacity: 0, rotate: -10 }}
        animate={{ scale: 1, opacity: 1, rotate: 0 }}
        exit={{ scale: 0.8, opacity: 0, rotate: 10 }}
        transition={{
          duration: 0.5,
          ease: [0.34, 1.56, 0.64, 1], // Elastic ease for smooth bounce
        }}
        style={{
          filter: `drop-shadow(0 2px 6px ${currentMessage.color}20)`,
        }}
      >
        <motion.div
          animate={{
            scale: [1, 1.05, 1],
            rotate: [0, 2, -2, 0],
          }}
          transition={{
            duration: 2.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <IconComponent 
            className="h-5 w-5 sm:h-6 sm:w-6" 
            style={{ 
              color: currentMessage.color,
              strokeWidth: 2.5,
            }} 
          />
        </motion.div>
      </motion.div>

      {/* Rotating Message with Smooth Fade Transition */}
      <div className="flex items-center gap-2 min-w-0">
        <AnimatePresence mode="wait">
          <motion.span
            key={currentMessage.text}
            initial={{ opacity: 0, x: -8, filter: "blur(4px)" }}
            animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, x: 8, filter: "blur(4px)" }}
            transition={{ 
              duration: 0.5,
              ease: [0.4, 0, 0.2, 1],
            }}
            style={{
              fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
              fontSize: '0.9375rem',
              color: currentMessage.color,
              fontWeight: 500,
              letterSpacing: '0.01em',
              whiteSpace: 'nowrap',
            }}
          >
            {currentMessage.text}
          </motion.span>
        </AnimatePresence>

        {/* Typing Dots Indicator - Smooth Pulse */}
        <div className="flex items-center gap-1" style={{ paddingTop: '2px', flexShrink: 0 }}>
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              animate={{
                opacity: [0.3, 1, 0.3],
                y: [0, -3, 0],
                scale: [1, 1.2, 1],
              }}
              transition={{
                duration: 1.2,
                delay: i * 0.15,
                repeat: Infinity,
                ease: [0.4, 0, 0.6, 1],
              }}
              style={{
                width: '4px',
                height: '4px',
                borderRadius: '50%',
                backgroundColor: currentMessage.color,
                opacity: 0.6,
              }}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}
