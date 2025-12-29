"use client";

import { useEffect, useState } from "react";
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from "lucide-react";
import { AnimatedText } from "./AnimatedComponents";

export type NotificationType = "success" | "error" | "info" | "warning";

export interface NotificationProps {
  message: string;
  type?: NotificationType;
  duration?: number;
  onClose?: () => void;
  showLetterAnimation?: boolean;
}

const notificationStyles = {
  success: {
    bg: "bg-success/10 border-success/30",
    text: "text-success-dark",
    icon: CheckCircle,
    iconColor: "text-success",
  },
  error: {
    bg: "bg-error/10 border-error/30",
    text: "text-error",
    icon: AlertCircle,
    iconColor: "text-error",
  },
  info: {
    bg: "bg-info/10 border-info/30",
    text: "text-info-dark",
    icon: Info,
    iconColor: "text-info",
  },
  warning: {
    bg: "bg-warning/10 border-warning/30",
    text: "text-warning",
    icon: AlertTriangle,
    iconColor: "text-warning",
  },
};

/**
 * Animated notification component with smooth slide-in and letter animations
 * Perfect for toast notifications and success messages
 */
export default function AnimatedNotification({
  message,
  type = "info",
  duration = 5000,
  onClose,
  showLetterAnimation = true,
}: NotificationProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [shouldRender, setShouldRender] = useState(true);
  const style = notificationStyles[type];
  const Icon = style.icon;

  useEffect(() => {
    // Trigger entrance animation
    setIsVisible(true);

    // Auto-dismiss after duration
    if (duration > 0) {
      const timer = setTimeout(() => {
        handleClose();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [duration]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      setShouldRender(false);
      onClose?.();
    }, 300); // Match exit animation duration
  };

  if (!shouldRender) return null;

  return (
    <div
      className={`fixed top-4 right-4 z-50 max-w-md w-full transition-all duration-300 ease-out ${
        isVisible
          ? "opacity-100 translate-x-0"
          : "opacity-0 translate-x-full"
      }`}
      style={{
        animation: isVisible ? "slideInRight 0.4s ease-out" : undefined,
      }}
    >
      <div
        className={`rounded-xl border backdrop-blur-lg p-4 shadow-xl ${style.bg}`}
      >
        <div className="flex items-start gap-3">
          <Icon className={`h-5 w-5 mt-0.5 shrink-0 ${style.iconColor}`} />
          <div className="flex-1 min-w-0">
            {showLetterAnimation ? (
              <AnimatedText
                text={message}
                className={`text-base font-medium ${style.text}`}
                delay={200}
                letterDelay={25}
              />
            ) : (
              <p className={`text-base font-medium ${style.text}`}>{message}</p>
            )}
          </div>
          <button
            onClick={handleClose}
            className={`shrink-0 p-1 rounded-lg hover:bg-white/20 transition-colors duration-200 ${style.text}`}
            aria-label="Close notification"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Hook for managing notifications
 * Usage:
 * const { showNotification } = useNotification();
 * showNotification({ message: "Success!", type: "success" });
 */
export function useNotification() {
  const [notifications, setNotifications] = useState<
    Array<NotificationProps & { id: string }>
  >([]);

  const showNotification = (props: NotificationProps) => {
    const id = Math.random().toString(36).substring(7);
    setNotifications((prev) => [...prev, { ...props, id }]);
  };

  const removeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  return {
    notifications,
    showNotification,
    removeNotification,
  };
}

/**
 * Notification container component
 * Place this in your layout to display notifications
 */
export function NotificationContainer() {
  const { notifications, removeNotification } = useNotification();

  return (
    <div className="fixed top-4 right-4 z-50 space-y-3 max-w-md w-full pointer-events-none">
      {notifications.map((notification, index) => (
        <div
          key={notification.id}
          className="pointer-events-auto"
          style={{
            transform: `translateY(${index * 8}px)`,
            transition: "transform 0.3s ease-out",
          }}
        >
          <AnimatedNotification
            {...notification}
            onClose={() => removeNotification(notification.id)}
          />
        </div>
      ))}
    </div>
  );
}
