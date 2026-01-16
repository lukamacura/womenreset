# Landing Page Component Refactoring Plan

## Overview
Refactor three landing page components (HowItWorksSteps, FeatureTheater, ChaosToClarity) to fix UX issues, simplify design, eliminate animation bugs, and improve visibility. Focus on Stripe-level polish with clean, minimal design.

## Component 1: HowItWorksSteps (Priority: First)

### Current Issues
- Three cards look cluttered
- Phone mockups unclear
- Content inside phones not visible enough
- Lisa chat preview too small
- Auto-advance is distracting

### Refactoring Plan

**File:** `components/landing/HowItWorksSteps.tsx`

1. **Simplify Card Design**
   - Remove icon circles (visual noise)
   - Clean cream background: `bg-[#FFF9E6]`
   - Subtle shadow: `shadow-sm`
   - Gradient number badge in top-left corner (not centered)
   - Remove active step scaling animation (too distracting)
   - Remove auto-advance - show all steps simultaneously

2. **Stripe-Style Phone Frame (Consistent across all 3 steps)**
   - Dark mode frame: `bg-[#1a1a1a]` with thin border
   - Rounded corners: `rounded-2xl` or `rounded-3xl`
   - White background inside: `bg-white`
   - Inner shadow for depth
   - Consistent size: `w-64 h-[500px]` (or responsive equivalent)

3. **Step 1 - Track Your Symptoms**
   - Phone shows symptom entry form
   - Large colorful tags: "Hot Flash" (pink bg `bg-pink-100`), "Mild" (orange bg `bg-orange-100`)
   - Add finger tap icon (Hand icon from lucide) that pulses on "+ Add symptom" button
   - Animation: Tag appears with scale + fade when step enters viewport
   - Text sizes: `text-base` minimum for readability

4. **Step 2 - See Patterns Emerge**
   - Phone shows mini calendar grid
   - Calendar dots in pink `#FF6B9D` - large enough to see (`w-3 h-3` minimum)
   - Animation: Dots appear one by one (200ms delay each)
   - Connecting line draws between pattern days after dots appear
   - Keep simple: 7-8 dots max in a 2-row grid

5. **Step 3 - Get Clear Answers**
   - Phone shows Lisa chat interface
   - Chat bubble: Light pink background `bg-pink-50`, dark text `text-gray-800`
   - "Lisa" label above with small avatar (pink circle `bg-[#FF6B9D]` with white "L")
   - Animation: Typing indicator (3 dots bounce), then message slides up
   - Message text: "I noticed your hot flashes occur every 3-4 days..." - use `text-base` for readability
   - Make chat bubble larger and more prominent

6. **Animation Improvements**
   - Use `useInView` with `threshold: 0.3` for scroll trigger
   - Spring physics: `{ type: "spring", damping: 20, stiffness: 100 }`
   - Remove auto-advance completely
   - Each step's phone animation triggers independently when in view
   - Use `AnimatePresence` for mount/unmount animations
   - Add `will-change: transform` during animations only

## Component 2: FeatureTheater (Priority: Second)

### Current Issues
- Auto-cycling is disorienting
- Phone mockup too small
- Content unclear
- No user control

### Refactoring Plan

**File:** `components/landing/FeatureTheater.tsx`

1. **Remove Auto-Cycle**
   - Remove `useEffect` interval completely
   - User controls via clickable tabs
   - Initial state: "Quick Tracking" selected (index 0)

2. **Layout Restructure**
   - Center: Large phone mockup (same Stripe style as HowItWorks)
   - Right side: 4 clickable feature tabs, vertically stacked
   - Remove feature label section (title/description) - tabs are self-explanatory
   - Remove indicator dots below phone

3. **Feature Tabs**
   - Vertical stack on right side
   - Each tab: Icon + Title
   - Active tab: Pink background `bg-[#FF6B9D]`, white text `text-white`
   - Inactive tabs: Cream background `bg-[#FFF9E6]`, gray text `text-gray-700`
   - Hover state: Lift effect `translateY(-2px)` + shadow
   - Padding: `p-4` for comfortable click target
   - Icons: Zap, TrendingUp, MessageCircle, FileText

4. **Phone Screen Content**
   - Use AnimatePresence for transitions
   - Exit: Fade out + slide left (`x: -20, opacity: 0`)
   - Enter: Fade in + slide right from right (`x: 20 → 0, opacity: 0 → 1`)
   - Duration: `300ms`
   - Each feature shows clear, colorful UI:
     - **Tracking**: Symptom entry form with visible tags (pink/orange)
     - **Patterns**: Graph with pink line chart (simple line going up)
     - **Answers**: Lisa chat with readable messages (text-base)
     - **Reports**: PDF preview mockup (document icon + text)

5. **Phone Frame**
   - Same Stripe style: `bg-[#1a1a1a]`, white inner, rounded corners
   - Size: `w-80 h-[600px]` or larger for visibility
   - Consistent with HowItWorks component

6. **Accessibility**
   - Add ARIA labels: `aria-label="Switch to {feature} feature"`
   - Keyboard navigation support
   - Focus states on tabs

## Component 3: ChaosToClarity (Priority: Third)

### Current Issues
- Symptom bubbles too small and hard to read
- Animation feels chaotic, not purposeful
- Text card competes with animation

### Refactoring Plan

**File:** `components/landing/ChaosToClarity.tsx`

1. **Background**
   - Clean soft purple gradient: `linear-gradient(135deg, #F5E6FF 0%, #E6D5FF 100%)`
   - Remove complex gradients

2. **Symptom Pills (Not Bubbles)**
   - 6-8 large symptom pills with clear labels
   - Labels: "Hot Flashes", "Headaches", "Insomnia", "Mood Swings", "Anxiety", "Brain Fog", "Sleep Issues", "Fatigue"
   - Pills: Cream background `bg-[#FFF9E6]`, dark gray text `text-gray-800`
   - Size: `px-6 py-3` minimum, `text-base` font
   - Rounded: `rounded-full` for pill shape
   - Shadow: Subtle `shadow-md`

3. **Initial State**
   - Pills scattered randomly across screen using absolute positioning
   - Use percentage-based positions for responsive layout
   - Opacity: `0.7` initially

4. **Animation Sequence**
   - On scroll into view (`useInView` with `once: true, threshold: 0.3`):
     * Pills smoothly move to organized grid (2x3 or 3x3 layout)
     * Use spring physics: `{ type: "spring", damping: 20, stiffness: 100 }`
     * Stagger by 100ms between pills
     * SVG connecting lines fade in between related symptoms (after pills settle)
   - Add `will-change: transform` to pills during animation
   - Remove `will-change` after animation completes

5. **Text Overlay**
   - Bottom center position (not center overlay)
   - Simple text: "Understanding replaces confusion"
   - NO separate card - text overlays animation directly
   - Large, readable: `text-3xl sm:text-4xl font-bold`
   - Color: `text-gray-900` with high contrast
   - Fade in after pills organize (delay: 1.5s)

6. **Connecting Lines**
   - SVG lines between related symptoms
   - Fade in after pills reach final positions
   - Pink gradient: `#FF6B9D` to `#FFA07A`
   - Stroke width: `2px` for visibility
   - Opacity: `0.6` for subtlety

## Global Improvements

1. **Performance**
   - Lazy load heavy animations
   - Use CSS containment: `contain: layout style paint` on containers
   - Add `will-change` only during active animations
   - Remove `will-change` after animations complete (use `useEffect` cleanup)

2. **Accessibility**
   - Add `prefers-reduced-motion` support (already implemented, verify)
   - All interactive elements keyboard accessible
   - Proper ARIA labels on tabs in FeatureTheater
   - Ensure color contrast ratio > 4.5:1

3. **Responsive Design**
   - Mobile: Reduce phone mockup sizes
   - Stack everything vertically on mobile
   - Adjust pill grid: 2 columns on mobile, 3 on desktop
   - Test on various screen sizes

4. **Animation Best Practices**
   - Use Framer Motion variants for consistency
   - Test on scroll: `useInView` with `threshold: 0.3`
   - Use `transform` and `opacity` only (no width/height animations)
   - Ensure no layout shift during animations
   - Use `AnimatePresence` for mount/unmount animations

## Implementation Order

1. **HowItWorksSteps** (biggest issues)
   - Simplify cards
   - Create Stripe-style phone frame component
   - Redesign Step 1 (symptom tracking)
   - Redesign Step 2 (calendar patterns)
   - Redesign Step 3 (chat interface)
   - Remove auto-advance
   - Fix animations

2. **FeatureTheater** (user control issues)
   - Remove auto-cycle
   - Restructure layout (phone + tabs)
   - Create tab navigation
   - Redesign phone screen content for each feature
   - Add smooth transitions
   - Add accessibility

3. **ChaosToClarity** (visual clarity)
   - Simplify background
   - Redesign pills (larger, clearer)
   - Fix animation sequence
   - Move text to bottom
   - Improve connecting lines

## Testing Checklist

- [ ] All animations smooth at 60fps
- [ ] No layout shifts during animations
- [ ] All text readable (minimum text-base)
- [ ] Phone mockups consistent across components
- [ ] Mobile responsive (stacks properly)
- [ ] Reduced motion works correctly
- [ ] Keyboard navigation works
- [ ] Color contrast meets WCAG standards
- [ ] No animation bugs or jank
- [ ] will-change removed after animations complete
