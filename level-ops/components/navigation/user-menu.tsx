"use client";

import { useState, useEffect } from "react";
import { Building2, Bell, Settings, LogOut, Menu, X, Shield, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useOrganization } from "@/lib/context/organization-context";
import { cn } from "@/lib/utils";

export function UserMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const router = useRouter();
  const supabase = createClient();
  const { currentOrg } = useOrganization();

  useEffect(() => {
    checkPlatformAdmin();
    loadUnreadCount();

    // Subscribe to notification changes
    const channel = supabase
      .channel("notification-count-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
        },
        () => {
          loadUnreadCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const checkPlatformAdmin = async () => {
    try {
      const { data } = await supabase.rpc("is_platform_admin");
      setIsPlatformAdmin(data === true);
    } catch (error) {
      setIsPlatformAdmin(false);
    }
  };

  const loadUnreadCount = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { count, error } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .is("read_at", null);

      if (error) throw error;
      setUnreadCount(count || 0);
    } catch (error) {
      console.error("Error loading unread count:", error);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const menuItems = [
    {
      label: "Search",
      icon: Search,
      onClick: () => {
        router.push("/search");
        setIsOpen(false);
      },
      mobileOnly: true, // Only show on mobile
    },
    {
      label: "Organisation Profile",
      icon: Building2,
      onClick: () => {
        if (currentOrg?.id) {
          router.push(`/vaults/${currentOrg.id}/profile`);
        } else {
          router.push("/settings");
        }
        setIsOpen(false);
      },
    },
    {
      label: "Notifications",
      icon: Bell,
      onClick: () => {
        router.push("/notifications");
        setIsOpen(false);
      },
    },
    {
      label: "Settings",
      icon: Settings,
      onClick: () => {
        router.push("/settings");
        setIsOpen(false);
      },
    },
    ...(isPlatformAdmin
      ? [
          {
            label: "Vaults Admin",
            icon: Shield,
            onClick: () => {
              router.push("/admin");
              setIsOpen(false);
            },
            variant: "admin" as const,
          },
        ]
      : []),
    {
      label: "Logout",
      icon: LogOut,
      onClick: handleLogout,
      variant: "danger" as const,
    },
  ];

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-lg hover:bg-secondary/50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
        aria-label="User menu"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        {isOpen ? (
          <X className="h-5 w-5 text-foreground" aria-hidden="true" />
        ) : (
          <Menu className="h-5 w-5 text-foreground" aria-hidden="true" />
        )}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          <div
            className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50"
            role="menu"
            aria-orientation="vertical"
          >
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isNotifications = item.label === "Notifications";
              const isMobileOnly = "mobileOnly" in item && item.mobileOnly;

              return (
                <button
                  key={item.label}
                  onClick={item.onClick}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors text-left",
                    isMobileOnly && "md:hidden", // Hide mobile-only items on desktop
                    item.variant === "danger"
                      ? "text-destructive hover:bg-destructive/10"
                      : "text-foreground hover:bg-secondary/50"
                  )}
                  role="menuitem"
                >
                  <div className="relative">
                    <Icon className="h-[25px] w-[25px]" aria-hidden="true" />
                    {isNotifications && unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] text-[10px] font-bold text-white bg-primary rounded-full px-1">
                        {unreadCount > 99 ? "99+" : unreadCount}
                      </span>
                    )}
                  </div>
                  <span className="font-medium">{item.label}</span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
