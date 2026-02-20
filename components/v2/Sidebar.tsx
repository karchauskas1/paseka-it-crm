"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { useIsMobile } from "@/lib/v2/useIsMobile";
import { useV2Store } from "@/lib/v2/store";

const NAV_ITEMS = [
  { label: "Клиенты", href: "/v2" },
];

const f = "Space Grotesk, sans-serif";

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

  useEffect(() => { setOpen(false); }, [pathname]);

  useEffect(() => {
    if (open && isMobile) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open, isMobile]);

  const isActive = (href: string) => {
    if (href === "/v2") return pathname === "/v2";
    return pathname.startsWith(href);
  };

  const sidebar = (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", justifyContent: "space-between" }}>
      {/* Top section */}
      <div>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 48 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 5 }}>
            <span style={{ color: "#FFF", fontFamily: f, fontSize: 18, fontWeight: 300, letterSpacing: "1.5px" }}>
              PASEKA
            </span>
            <span style={{ color: "#FFF", fontFamily: f, fontSize: 18, fontWeight: 700, letterSpacing: "1.5px" }}>
              CRM
            </span>
          </div>
          <button
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "none",
              borderRadius: 8,
              width: 34,
              height: 34,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              transition: "background 0.2s",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.12)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)"; }}
          >
            {theme === "light" ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFD700" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
              </svg>
            )}
          </button>
        </div>

        {/* Nav */}
        <nav style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "11px 16px",
                  background: active ? "rgba(255,255,255,0.1)" : "transparent",
                  borderRadius: 10,
                  transition: "background 0.25s, transform 0.2s",
                  textDecoration: "none",
                }}
                onMouseEnter={(e) => {
                  if (!active) {
                    (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)";
                    (e.currentTarget as HTMLElement).style.transform = "translateX(3px)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    (e.currentTarget as HTMLElement).style.background = "transparent";
                    (e.currentTarget as HTMLElement).style.transform = "translateX(0)";
                  }
                }}
              >
                <span style={{ fontSize: 15, color: active ? "#FFF" : "#666", fontWeight: active ? 500 : 400, fontFamily: f }}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom section */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {/* Old CRM link */}
        <Link
          href="/dashboard"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "9px 16px",
            background: "transparent",
            borderRadius: 10,
            transition: "background 0.25s, transform 0.2s",
            textDecoration: "none",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)";
            (e.currentTarget as HTMLElement).style.transform = "translateX(3px)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = "transparent";
            (e.currentTarget as HTMLElement).style.transform = "translateX(0)";
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          <span style={{ fontSize: 13, color: "#555", fontFamily: f }}>Old CRM</span>
        </Link>

        {/* Divider */}
        <div style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "0 8px" }} />

        {/* Profile */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "10px 12px",
            borderRadius: 12,
            transition: "background 0.25s",
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              background: "var(--v2-accent)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              fontSize: 15,
              fontWeight: 600,
              color: "#FFF",
              fontFamily: f,
            }}
          >
            {userName.charAt(0).toUpperCase()}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 500, color: "#FFF", fontFamily: f, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {userName}
            </div>
            <div style={{ fontSize: 11, color: "#666", fontFamily: f, marginTop: 1 }}>
              {userRole}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (!isMobile) {
    return (
      <aside style={{
        width: 260,
        flexShrink: 0,
        height: "100%",
        background: "var(--v2-bg-sidebar)",
        padding: "32px 24px",
        borderRight: "1px solid rgba(255,255,255,0.04)",
      }}>
        {sidebar}
      </aside>
    );
  }

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          style={{
            position: "fixed", top: 14, left: 14, zIndex: 1100,
            width: 40, height: 40, background: "var(--v2-bg-sidebar)",
            border: "none", cursor: "pointer", display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", gap: 5, padding: 0,
            boxShadow: "0 2px 10px rgba(0,0,0,0.15)", borderRadius: 10,
          }}
        >
          <span style={{ width: 18, height: 1.5, background: "#fff", display: "block" }} />
          <span style={{ width: 18, height: 1.5, background: "#fff", display: "block" }} />
          <span style={{ width: 12, height: 1.5, background: "#fff", display: "block", alignSelf: "flex-start", marginLeft: 11 }} />
        </button>
      )}
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
            zIndex: 1200, animation: "v2-overlayIn 0.35s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        />
      )}
      <aside style={{
        position: "fixed", top: 0, left: 0, bottom: 0, width: 280,
        background: "var(--v2-bg-sidebar)", zIndex: 1300, padding: "32px 24px",
        transform: open ? "translateX(0)" : "translateX(-100%)",
        transition: "transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
        boxShadow: open ? "8px 0 32px rgba(0,0,0,0.15)" : "none",
      }}>
        {sidebar}
      </aside>
    </>
  );
}
