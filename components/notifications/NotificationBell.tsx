"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { useUnreadCount } from "@/hooks/useUnreadCount";

export default function NotificationBell() {
  const { count } = useUnreadCount();

  return (
    <Link
      href="/dashboard/notifications"
      prefetch={false}
      className="relative flex items-center justify-center p-2 rounded-lg hover:bg-foreground/5 transition-colors duration-200"
      aria-label={`Notifications${count > 0 ? ` (${count} unread)` : ""}`}
    >
      {count > 0 ? (
        <>
          <Bell className="h-5 w-5 text-foreground fill-current" />
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center text-[10px] font-bold text-white rounded-full bg-red-500">
            {count > 9 ? "9+" : count}
          </span>
        </>
      ) : (
        <Bell className="h-5 w-5 text-foreground fill-current" />
      )}
    </Link>
  );
}

