"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { Settings as SettingsIcon, Bell, ArrowRight } from "lucide-react";

export default function SettingsPage() {
  const router = useRouter();

  const settingsSections = [
    {
      title: "Notifications",
      description: "Manage when and how you receive reminders",
      href: "/dashboard/settings/notifications",
      icon: Bell,
    },
  ];

  return (
    <div className="mx-auto max-w-4xl p-6 sm:p-8">
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground mb-2 sm:mb-3">
          Settings
        </h1>
        <p className="text-base sm:text-lg text-muted-foreground">
          Manage your account preferences and notifications
        </p>
      </div>

      <div className="space-y-4">
        {settingsSections.map((section) => {
          const Icon = section.icon;
          return (
            <Link
              key={section.href}
              href={section.href}
              className="group relative overflow-hidden block rounded-2xl border border-border/30 bg-card backdrop-blur-lg p-6 shadow-xl transition-all duration-300 hover:shadow-2xl hover:scale-[1.01]"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl shadow-md" style={{ background: 'linear-gradient(135deg, #ff74b1 0%, #d85a9a 100%)' }}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-foreground mb-1">
                      {section.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {section.description}
                    </p>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-primary transition-transform group-hover:translate-x-1" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
