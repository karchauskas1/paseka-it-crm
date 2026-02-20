"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { useIsMobile } from "@/lib/v2/useIsMobile";
import { useV2Store } from "@/lib/v2/store";

const NAV_ITEMS = [
  { label: "Клиенты", href: "/v2" },
  { label: "Проекты", href: "/v2/projects" },
  { label: "Задачи", href: "/v2/tasks" },
  { label: "Касания", href: "/v2/touches" },
  { label: "Чат", href: "/v2/chat" },
  { label: "Календарь", href: "/v2/calendar" },
];

interface SidebarProps {
  userName?: string;
  userRole?: string;
}

export function V2Sidebar({ userName = "User", userRole = "Member" }: SidebarProps) {
  const pathname = usePathname();
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const theme = useV2Store((s) => s.theme);
  const setTheme = useV2Store((s) => s.setTheme);

  // Close drawer on route change
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (open && isMobile) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open, isMobile]);

  const isActive = (href: string) => {
    if (href === "/v2") return pathname === "/v2";
    return pathname.startsWith(href);
  };

  const sidebarContent = (
    <>
      <div style={{ display: "flex", flexDirection: "column", gap: 48 }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span
              style={{
                color: "#FFFFFF",
                fontFamily: "Space Grotesk, sans-serif",
                fontSize: 16,
                fontWeight: 300,
                letterSpacing: "1px",
              }}
            >
              PASEKA
            </span>
            <span
              style={{
                color: "#FFFFFF",
                fontFamily: "Space Grotesk, sans-serif",
                fontSize: 16,
                fontWeight: 700,
                letterSpacing: "1px",
              }}
            >
              CRM
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            {/* Theme toggle */}
            <button
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
              style={{
                background: "rgba(255,255,255,0.08)",
                border: "none",
                borderRadius: 8,
                width: 32,
                height: 32,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                transition: "background 0.2s",
                flexShrink: 0,
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.15)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.08)";
              }}
              title={theme === "light" ? "Dark theme" : "Light theme"}
            >
              {theme === "light" ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFD700" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="5"/>
                  <line x1="12" y1="1" x2="12" y2="3"/>
                  <line x1="12" y1="21" x2="12" y2="23"/>
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                  <line x1="1" y1="12" x2="3" y2="12"/>
                  <line x1="21" y1="12" x2="23" y2="12"/>
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
                </svg>
              )}
            </button>
            {isMobile && (
              <button
                onClick={() => setOpen(false)}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--v2-text-sidebar-muted)",
                  fontSize: 22,
                  cursor: "pointer",
                  padding: "4px 8px",
                  lineHeight: 1,
                }}
              >
                &times;
              </button>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => isMobile && setOpen(false)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 14px",
                  background: active ? "rgba(255,255,255,0.1)" : "transparent",
                  borderRadius: 10,
                  transition: "background 0.3s cubic-bezier(0.4, 0, 0.2, 1), transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                  textDecoration: "none",
                }}
                onMouseEnter={(e) => {
                  if (!active) {
                    (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)";
                    (e.currentTarget as HTMLElement).style.transform = "translateX(2px)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    (e.currentTarget as HTMLElement).style.background = "transparent";
                    (e.currentTarget as HTMLElement).style.transform = "translateX(0)";
                  }
                }}
              >
                <span
                  style={{
                    fontSize: 15,
                    color: active ? "#FFFFFF" : "#555555",
                    fontWeight: active ? 500 : 400,
                    lineHeight: 1.5,
                    fontFamily: "Space Grotesk, sans-serif",
                  }}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* Link to old CRM */}
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 16 }}>
          <Link
            href="/dashboard"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 14px",
              background: "transparent",
              borderRadius: 10,
              transition: "background 0.3s, transform 0.2s",
              textDecoration: "none",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)";
              (e.currentTarget as HTMLElement).style.transform = "translateX(2px)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = "transparent";
              (e.currentTarget as HTMLElement).style.transform = "translateX(0)";
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
            <span style={{ fontSize: 13, color: "#555555", fontFamily: "Space Grotesk, sans-serif" }}>
              Old CRM
            </span>
          </Link>
        </div>
      </div>

      {/* Profile */}
      <div>
        <Link
          href="/v2/settings"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "10px 14px",
            textDecoration: "none",
            background: "transparent",
            transition: "background 0.3s cubic-bezier(0.4, 0, 0.2, 1), transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
            borderRadius: 12,
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)";
            (e.currentTarget as HTMLElement).style.transform = "translateX(2px)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = "transparent";
            (e.currentTarget as HTMLElement).style.transform = "translateX(0)";
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              background: "var(--v2-accent)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              fontSize: 14,
              fontWeight: 600,
              color: "#FFF",
              fontFamily: "Space Grotesk, sans-serif",
            }}
          >
            {userName.charAt(0).toUpperCase()}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: "var(--v2-text-white)", fontFamily: "Space Grotesk, sans-serif" }}>
              {userName}
            </span>
            <span style={{ fontSize: 11, color: "var(--v2-text-sidebar-muted)", fontFamily: "Space Grotesk, sans-serif" }}>
              {userRole}
            </span>
          </div>
        </Link>
      </div>
    </>
  );

  // Desktop sidebar
  if (!isMobile) {
    return (
      <aside
        style={{
          width: 240,
          flexShrink: 0,
          height: "100%",
          background: "var(--v2-bg-sidebar)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "40px 28px",
        }}
      >
        {sidebarContent}
      </aside>
    );
  }

  // Mobile: hamburger + drawer
  return (
    <>
      {/* Hamburger */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          style={{
            position: "fixed",
            top: 14,
            left: 14,
            zIndex: 1100,
            width: 40,
            height: 40,
            background: "var(--v2-bg-sidebar)",
            border: "none",
            cursor: "pointer",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 5,
            padding: 0,
            boxShadow: "0 2px 10px rgba(0,0,0,0.15)",
            borderRadius: 10,
            transition: "transform 0.2s",
          }}
        >
          <span style={{ width: 18, height: 1.5, background: "#fff", display: "block" }} />
          <span style={{ width: 18, height: 1.5, background: "#fff", display: "block" }} />
          <span style={{ width: 12, height: 1.5, background: "#fff", display: "block", alignSelf: "flex-start", marginLeft: 11 }} />
        </button>
      )}

      {/* Overlay */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.4)",
            zIndex: 1200,
            animation: "v2-overlayIn 0.35s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        />
      )}

      {/* Drawer */}
      <aside
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          bottom: 0,
          width: 260,
          background: "var(--v2-bg-sidebar)",
          zIndex: 1300,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "32px 24px",
          transform: open ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 0.4s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
          boxShadow: open ? "8px 0 32px rgba(0,0,0,0.15)" : "none",
        }}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
