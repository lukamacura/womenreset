# WomenReset Animation System Guide

## Overview
This guide documents the comprehensive animation system implemented across the WomenReset dashboard. All animations are optimized for performance, smoothness, and accessibility.

## Core Animation Components

### Location
All reusable animation components are located in: `/components/ui/AnimatedComponents.tsx`

### Available Components

#### 1. `AnimatedCard`
**Purpose**: Smooth fade-in and slide-up animation for card components

**Usage**:
```tsx
import { AnimatedCard } from "@/components/ui/AnimatedComponents";

<AnimatedCard index={0} delay={100} duration={500}>
  <YourCardContent />
</AnimatedCard>
```

**Props**:
- `index` (number): For staggered animations (multiplied by 40ms)
- `delay` (number): Initial delay in milliseconds
- `duration` (number): Animation duration in milliseconds (default: 500)
- `className` (string): Additional CSS classes

**Performance Features**:
- Uses IntersectionObserver for viewport detection
- GPU-accelerated with `translate3d`
- Automatically removes `willChange` after animation completes
- Unobserves element after animation triggers

---

#### 2. `AnimatedListItem`
**Purpose**: Fast animations for list items with staggered delays

**Usage**:
```tsx
import { AnimatedListItem } from "@/components/ui/AnimatedComponents";

{items.map((item, index) => (
  <AnimatedListItem key={item.id} index={index}>
    <ItemContent />
  </AnimatedListItem>
))}
```

**Props**:
- `index` (number): Required - determines stagger delay (50ms per index)
- `duration` (number): Animation duration (default: 400ms)
- `className` (string): Additional CSS classes

**Best For**:
- Lists with many items
- Recent logs/entries
- Navigation menus

---

#### 3. `AnimatedSection`
**Purpose**: Smooth fade-in for large content sections

**Usage**:
```tsx
import { AnimatedSection } from "@/components/ui/AnimatedComponents";

<AnimatedSection delay={100} duration={600}>
  <LargeContentSection />
</AnimatedSection>
```

**Props**:
- `delay` (number): Initial delay in milliseconds
- `duration` (number): Animation duration (default: 600ms)
- `className` (string): Additional CSS classes

**Best For**:
- Page sections
- Analytics blocks
- Chart containers

---

#### 4. `Skeleton`
**Purpose**: Enhanced loading state with shimmer effect

**Usage**:
```tsx
import { Skeleton } from "@/components/ui/AnimatedComponents";

{loading ? (
  <Skeleton className="h-20 w-full" />
) : (
  <ActualContent />
)}
```

**Features**:
- Built-in shimmer animation (2s infinite)
- Respects staggered delays via inline styles
- GPU-accelerated

**Example with Stagger**:
```tsx
{[1, 2, 3].map((i) => (
  <Skeleton
    key={i}
    className="h-20"
    style={{ animationDelay: `${i * 100}ms` }}
  />
))}
```

---

#### 5. `AnimatedText`
**Purpose**: Letter-by-letter text reveal animation

**Usage**:
```tsx
import { AnimatedText } from "@/components/ui/AnimatedComponents";

<AnimatedText
  text="Your message here"
  delay={400}
  letterDelay={30}
  onComplete={() => console.log("Animation finished")}
/>
```

**Props**:
- `text` (string): The text to animate
- `delay` (number): Initial delay before animation starts
- `letterDelay` (number): Delay between each letter (default: 30ms)
- `onComplete` (function): Optional callback when animation finishes
- `className` (string): CSS classes applied to wrapper

**Best For**:
- Milestone celebrations
- Success messages
- Important notifications

---

#### 6. `AnimatedModal`
**Purpose**: Smooth modal entrance/exit with scale and fade

**Usage**:
```tsx
import { AnimatedModal } from "@/components/ui/AnimatedComponents";

<AnimatedModal isOpen={isModalOpen}>
  <ModalContent />
</AnimatedModal>
```

**Props**:
- `isOpen` (boolean): Controls visibility
- `className` (string): Additional CSS classes

**Features**:
- 300ms transition duration
- Scale + translate effect
- Pointer events automatically managed

---

#### 7. `AnimatedGrid`
**Purpose**: Grid container with staggered child animations

**Usage**:
```tsx
import { AnimatedGrid } from "@/components/ui/AnimatedComponents";

<AnimatedGrid staggerDelay={50}>
  <div>Item 1</div>
  <div>Item 2</div>
  <div>Item 3</div>
</AnimatedGrid>
```

**Props**:
- `staggerDelay` (number): Delay between items (default: 50ms)
- `className` (string): Grid CSS classes

---

## Notification System

### `AnimatedNotification`
**Purpose**: Toast notifications with letter animations

**Usage**:
```tsx
import AnimatedNotification from "@/components/ui/AnimatedNotification";

<AnimatedNotification
  message="Success! Your data has been saved."
  type="success"
  duration={5000}
  onClose={() => console.log("Notification closed")}
  showLetterAnimation={true}
/>
```

**Props**:
- `message` (string): The notification text
- `type` ("success" | "error" | "info" | "warning"): Visual style
- `duration` (number): Auto-dismiss time in ms (0 = manual close only)
- `onClose` (function): Callback when notification closes
- `showLetterAnimation` (boolean): Enable letter-by-letter reveal

**Types & Styles**:
- **Success**: Green with CheckCircle icon
- **Error**: Red with AlertCircle icon
- **Info**: Blue with Info icon
- **Warning**: Yellow with AlertTriangle icon

---

### `useNotification` Hook
**Purpose**: Manage multiple notifications programmatically

**Usage**:
```tsx
import { useNotification } from "@/components/ui/AnimatedNotification";

function MyComponent() {
  const { showNotification } = useNotification();

  const handleSuccess = () => {
    showNotification({
      message: "Changes saved successfully!",
      type: "success",
      duration: 4000,
    });
  };

  return <button onClick={handleSuccess}>Save</button>;
}
```

---

## Global CSS Animations

### Available Keyframes

#### `@keyframes shimmer`
- **Duration**: 2s infinite
- **Effect**: Translates gradient left to right
- **Used By**: Skeleton component

#### `@keyframes fadeInScale`
- **Effect**: Opacity 0→1 + Scale 0.96→1 + TranslateY 8px→0
- **Used By**: Modals, celebration overlays

#### `@keyframes slideInRight`
- **Effect**: Opacity 0→1 + TranslateX 100%→0
- **Used By**: Notifications, toasts

#### `@keyframes fadeIn`
- **Effect**: Simple opacity 0→1
- **Used By**: Overlays, backdrops

#### `@keyframes float`
- **Duration**: 3s infinite
- **Effect**: Gentle up-down movement (8px)
- **Used By**: CTA buttons, floating action buttons

#### `@keyframes fadeInDown`
- **Effect**: Opacity 0→1 + TranslateY -20px→0
- **Used By**: Page headers

#### `@keyframes fadeInUp`
- **Effect**: Opacity 0→1 + TranslateY 20px→0
- **Used By**: Cards, content blocks

#### `@keyframes scaleIn`
- **Effect**: Opacity 0→1 + Scale 0.95→1
- **Used By**: Icons, badges

---

## Page-Specific Implementations

### Dashboard Page (`/app/dashboard/page.tsx`)

**Animation Strategy**:
1. Header fades in immediately
2. Trial card animates first (0ms delay)
3. Overview cards stagger in (50ms between each)
4. Recent activity sections stagger (350ms+ delays)

**Components Used**:
- `AnimatedCard` for all overview and recent cards
- `AnimatedListItem` for individual log entries
- `Skeleton` for loading states

**Performance Notes**:
- Uses custom `AnimatedCard` and `AnimatedListItem` components (local to page)
- All animations use `translate3d` for GPU acceleration
- `willChange` property cleaned up after animations

---

### Symptoms Page (`/app/dashboard/symptoms/page.tsx`)

**Animation Strategy**:
1. Header fades down (600ms)
2. Symptom cards appear in grid with stagger (70ms per card)
3. Analytics sections fade in as user scrolls
4. Each section uses IntersectionObserver

**Components Used**:
- Custom `AnimatedSection` (local implementation)
- Staggered grid animations via inline styles
- `MilestoneCelebration` with letter animations

**Special Features**:
- Milestone modals use `AnimatedText` for titles
- Icon scales in with delay
- Button fades up last

---

### Nutrition Page (`/app/dashboard/nutrition/page.tsx`)

**Animation Strategy**:
1. Header (0ms delay)
2. Week Summary & Hydration (100ms delay)
3. Analytics (150ms delay)
4. Stats, Charts, Lists (scroll-triggered, 0ms delay each)

**Components Used**:
- `AnimatedSection` for all major sections
- `Skeleton` with staggered delays for loading
- Gradient background applied to page container

**Recent Updates**:
- ✅ Enhanced skeleton loading with shimmer
- ✅ All sections now animate smoothly on scroll
- ✅ Button hover states improved (200ms transitions)

---

## Performance Best Practices

### 1. GPU Acceleration
✅ All transforms use `translate3d(x, y, 0)` instead of `translate(x, y)`
✅ Scale and opacity changes are GPU-accelerated

### 2. willChange Property
✅ Set to `transform, opacity` during animation
✅ Reset to `auto` after animation completes
✅ Prevents long-term performance degradation

### 3. IntersectionObserver
✅ Elements only animate when entering viewport
✅ Observers unobserve after animation triggers
✅ Reduces unnecessary JavaScript execution

### 4. Staggered Animations
✅ Use consistent delays (40-80ms between items)
✅ Avoid animating too many items at once
✅ Cap list animations at ~10 items for best performance

### 5. Animation Durations
✅ Cards: 500-600ms
✅ List items: 400-500ms
✅ Sections: 600-700ms
✅ Text letters: 25-40ms per letter
✅ Modals: 300-400ms

---

## Accessibility Considerations

### Respecting User Preferences
```css
@media (prefers-reduced-motion: reduce) {
  /* All animations should respect this */
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

**Note**: Add this to `globals.css` if not already present.

### Focus Management
- Modals trap focus when open
- Animations don't interfere with keyboard navigation
- Color contrast maintained during all animation states

---

## Common Patterns

### Pattern 1: Staggered Card Grid
```tsx
<div className="grid grid-cols-3 gap-4">
  {items.map((item, index) => (
    <AnimatedCard key={item.id} index={index} delay={100}>
      <Card {...item} />
    </AnimatedCard>
  ))}
</div>
```

### Pattern 2: List with Scroll Animations
```tsx
<AnimatedSection delay={0}>
  <div className="space-y-3">
    {logs.map((log, index) => (
      <AnimatedListItem key={log.id} index={index}>
        <LogItem {...log} />
      </AnimatedListItem>
    ))}
  </div>
</AnimatedSection>
```

### Pattern 3: Loading State
```tsx
{isLoading ? (
  <div className="space-y-3">
    {[1, 2, 3, 4, 5].map((i) => (
      <Skeleton
        key={i}
        className="h-20"
        style={{ animationDelay: `${i * 100}ms` }}
      />
    ))}
  </div>
) : (
  <ActualContent />
)}
```

### Pattern 4: Success Notification
```tsx
const handleSave = async () => {
  try {
    await saveData();
    showNotification({
      message: "Your changes have been saved successfully!",
      type: "success",
      duration: 4000,
      showLetterAnimation: true,
    });
  } catch (error) {
    showNotification({
      message: "Failed to save changes. Please try again.",
      type: "error",
      duration: 6000,
    });
  }
};
```

---

## Troubleshooting

### Animation Not Triggering
1. Check if element is in viewport (IntersectionObserver threshold)
2. Verify `isVisible` state is updating
3. Ensure parent has proper height/width

### Janky Performance
1. Check if too many elements animating simultaneously
2. Verify `willChange` is being cleaned up
3. Use browser DevTools Performance tab
4. Consider reducing animation duration or stagger delay

### Skeleton Not Shimmer-ing
1. Ensure `@keyframes shimmer` is in globals.css
2. Check that Skeleton component is imported from `/components/ui/AnimatedComponents`
3. Verify no conflicting CSS animations

---

## Future Enhancements

### Planned Improvements
- [ ] Add `prefers-reduced-motion` support globally
- [ ] Create AnimatedButton component with micro-interactions
- [ ] Implement page transition animations
- [ ] Add AnimatedNumber for counting animations
- [ ] Create AnimatedChart for data visualizations

### Experimental Features
- [ ] Spring-based physics animations
- [ ] Gesture-driven animations
- [ ] Parallax scroll effects
- [ ] Morphing shape transitions

---

## Credits
Animation system designed and implemented for WomenReset dashboard by Claude (Anthropic).
Optimized for performance, accessibility, and user delight.

Last Updated: 2025-12-29
