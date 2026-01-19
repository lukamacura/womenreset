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
}

// Warm amber color palette for consistent, cozy feel
const WARM_COLORS = {
  amber: "#D97706",     // Amber-600 - icons & dots
  warmBrown: "#92400E", // Amber-800 - text
};

const LOADING_MESSAGES: LoadingMessage[] = [
  { text: "Taking a mindful moment...", icon: Heart },
  { text: "Gathering wisdom for you...", icon: BookOpen },
  { text: "Brewing thoughtful insights...", icon: Coffee },
  { text: "Sitting with this a moment...", icon: Moon },
  { text: "Connecting the dots...", icon: Sparkles },
  { text: "Finding the perfect words...", icon: Feather },
  { text: "Crafting a response...", icon: Lightbulb },
  { text: "Reflecting on your question...", icon: Brain },
  { text: "Nurturing this thought...", icon: Flower2 },
  { text: "Bringing clarity to light...", icon: Sun },
  { text: "Weaving insights together...", icon: Star },
  { text: "Growing understanding...", icon: Leaf },
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
        padding: '0.5rem 0',
        width: '280px', // Fixed width for consistent layout
        minWidth: '280px',
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      {/* Pulsing Icon */}
      <motion.div
        style={{
          filter: `drop-shadow(0 2px 6px ${WARM_COLORS.amber}40)`,
          flexShrink: 0,
        }}
      >
        <motion.div
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.8, 1, 0.8],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={currentMessage.text}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
            >
              <IconComponent 
                className="h-5 w-5" 
                style={{ 
                  color: WARM_COLORS.amber,
                  strokeWidth: 2.5,
                }} 
              />
            </motion.div>
          </AnimatePresence>
        </motion.div>
      </motion.div>

      {/* Fixed-width Text Container */}
      <div 
        className="flex-1 overflow-hidden"
        style={{ 
          height: '20px',
          position: 'relative',
        }}
      >
        <AnimatePresence mode="wait">
          <motion.span
            key={currentMessage.text}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ 
              duration: 0.3,
              ease: [0.4, 0, 0.2, 1],
            }}
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
              fontSize: '0.875rem',
              color: WARM_COLORS.warmBrown,
              fontWeight: 500,
              letterSpacing: '0.01em',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              width: '100%',
            }}
          >
            {currentMessage.text}
          </motion.span>
        </AnimatePresence>
      </div>

      {/* Typing Dots - Smooth Wave */}
      <div className="flex items-center gap-1" style={{ flexShrink: 0 }}>
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            animate={{
              opacity: [0.3, 1, 0.3],
              scale: [0.8, 1.2, 0.8],
            }}
            transition={{
              duration: 0.8,
              delay: i * 0.1,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            style={{
              width: '4px',
              height: '4px',
              borderRadius: '50%',
              backgroundColor: WARM_COLORS.amber,
            }}
          />
        ))}
      </div>
    </motion.div>
  );
}
