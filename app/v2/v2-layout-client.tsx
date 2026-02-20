"use client";

import { V2Sidebar } from "@/components/v2/Sidebar";

interface V2LayoutClientProps {
  children: React.ReactNode;
  userName: string;
  userRole: string;
}

export function V2LayoutClient({ children, userName, userRole }: V2LayoutClientProps) {
  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>
      <V2Sidebar userName={userName} userRole={userRole} />
      <main
        style={{
          flex: 1,
          height: "100%",
          overflowY: "auto",
          overflowX: "hidden",
          background: "var(--v2-bg-page)",
        }}
      >
        {children}
      </main>
    </div>
  );
}
