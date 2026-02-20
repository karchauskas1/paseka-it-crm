"use client";

import { useState, useCallback, useEffect, useRef } from "react";

type ClientStatus = "ACTIVE" | "INACTIVE" | "ARCHIVED";
type FilterTab = "ALL" | ClientStatus;

interface Client {
  id: string;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  status: ClientStatus;
  source: string | null;
  createdAt: string;
  updatedAt: string;
  projects: { id: string; name: string; status: string }[];
  _count: { projects: number; communications: number };
}

const STATUS_CONFIG: Record<ClientStatus, { label: string; color: string }> = {
  ACTIVE: { label: "Активный", color: "#22C55E" },
  INACTIVE: { label: "Неактивный", color: "#F59E0B" },
  ARCHIVED: { label: "Архив", color: "#94A3B8" },
};

const TABS: { key: FilterTab; label: string }[] = [
  { key: "ALL", label: "Все" },
  { key: "ACTIVE", label: "Активные" },
  { key: "INACTIVE", label: "Неактивные" },
  { key: "ARCHIVED", label: "Архив" },
];

const STATUSES: ClientStatus[] = ["ACTIVE", "INACTIVE", "ARCHIVED"];

interface Props {
  initialClients: Client[];
  workspaceId: string;
}

export function ClientsBoardClient({ initialClients }: Props) {
  const [clients, setClients] = useState<Client[]>(initialClients);
  const [filter, setFilter] = useState<FilterTab>("ALL");
  const [search, setSearch] = useState("");
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    };
    if (openMenu) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [openMenu]);

  const filtered = clients.filter((c) => {
    if (filter !== "ALL" && c.status !== filter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.company?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q)
    );
  });

  const updateStatus = useCallback(
    async (id: string, status: ClientStatus) => {
      setClients((prev) => prev.map((c) => (c.id === id ? { ...c, status } : c)));
      setOpenMenu(null);
      try {
        const res = await fetch(`/api/clients/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        });
        if (!res.ok) throw new Error();
      } catch {
        setClients(initialClients);
      }
    },
    [initialClients]
  );

  const f = "Space Grotesk, sans-serif";

  return (
    <div style={{ padding: "40px 48px", maxWidth: 900, margin: "0 auto" }}>
      {/* Title */}
      <h1
        style={{
          fontSize: 24,
          fontWeight: 600,
          color: "var(--v2-text-primary)",
          margin: 0,
          fontFamily: f,
          letterSpacing: "-0.3px",
          animation: "v2-fadeIn 0.4s ease both",
        }}
      >
        Клиенты
      </h1>

      {/* Tabs + Search row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: 24,
          gap: 16,
          animation: "v2-fadeIn 0.4s ease 0.05s both",
        }}
      >
        {/* Tabs */}
        <div style={{ display: "flex", gap: 2, background: "var(--v2-bg-hover)", borderRadius: 10, padding: 3 }}>
          {TABS.map((tab) => {
            const active = filter === tab.key;
            const count = tab.key === "ALL" ? clients.length : clients.filter((c) => c.status === tab.key).length;
            return (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                style={{
                  padding: "7px 16px",
                  border: "none",
                  borderRadius: 8,
                  background: active ? "var(--v2-bg-card)" : "transparent",
                  boxShadow: active ? "var(--v2-shadow-sm)" : "none",
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: active ? 500 : 400,
                  fontFamily: f,
                  color: active ? "var(--v2-text-primary)" : "var(--v2-text-secondary)",
                  transition: "all 0.2s",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                {tab.label}
                <span
                  style={{
                    fontSize: 11,
                    color: "var(--v2-text-muted)",
                    fontFamily: f,
                  }}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search */}
        <input
          type="text"
          placeholder="Поиск..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: 200,
            padding: "8px 14px",
            border: "1px solid var(--v2-border-input)",
            borderRadius: 10,
            fontSize: 13,
            fontFamily: f,
            background: "var(--v2-bg-card)",
            color: "var(--v2-text-primary)",
            outline: "none",
            transition: "border-color 0.2s, box-shadow 0.2s",
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = "var(--v2-accent)";
            e.currentTarget.style.boxShadow = "0 0 0 3px rgba(232, 93, 58, 0.08)";
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = "var(--v2-border-input)";
            e.currentTarget.style.boxShadow = "none";
          }}
        />
      </div>

      {/* Client list */}
      <div style={{ marginTop: 20 }}>
        {filtered.map((client, idx) => {
          const cfg = STATUS_CONFIG[client.status];
          const isMenuOpen = openMenu === client.id;

          return (
            <div
              key={client.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "14px 0",
                borderBottom: "1px solid var(--v2-border-light)",
                animation: `v2-fadeIn 0.3s ease ${idx * 0.03}s both`,
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = "var(--v2-bg-hover)";
                (e.currentTarget as HTMLElement).style.margin = "0 -16px";
                (e.currentTarget as HTMLElement).style.padding = "14px 16px";
                (e.currentTarget as HTMLElement).style.borderRadius = "10px";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = "transparent";
                (e.currentTarget as HTMLElement).style.margin = "0";
                (e.currentTarget as HTMLElement).style.padding = "14px 0";
                (e.currentTarget as HTMLElement).style.borderRadius = "0";
              }}
            >
              {/* Left: name + company */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 500,
                    color: "var(--v2-text-primary)",
                    fontFamily: f,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {client.name}
                </div>
                {client.company && (
                  <div
                    style={{
                      fontSize: 13,
                      color: "var(--v2-text-muted)",
                      fontFamily: f,
                      marginTop: 1,
                    }}
                  >
                    {client.company}
                  </div>
                )}
              </div>

              {/* Right: status pill */}
              <div style={{ position: "relative" }} ref={isMenuOpen ? menuRef : undefined}>
                <button
                  onClick={() => setOpenMenu(isMenuOpen ? null : client.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "5px 12px",
                    border: "1px solid var(--v2-border)",
                    borderRadius: 20,
                    background: "transparent",
                    cursor: "pointer",
                    fontFamily: f,
                    fontSize: 12,
                    fontWeight: 500,
                    color: "var(--v2-text-secondary)",
                    transition: "border-color 0.2s, background 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = cfg.color;
                  }}
                  onMouseLeave={(e) => {
                    if (!isMenuOpen) (e.currentTarget as HTMLElement).style.borderColor = "var(--v2-border)";
                  }}
                >
                  <div
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: "50%",
                      background: cfg.color,
                    }}
                  />
                  {cfg.label}
                </button>

                {/* Dropdown */}
                {isMenuOpen && (
                  <div
                    style={{
                      position: "absolute",
                      top: "calc(100% + 4px)",
                      right: 0,
                      background: "var(--v2-bg-card)",
                      border: "1px solid var(--v2-border)",
                      borderRadius: 10,
                      padding: 4,
                      boxShadow: "var(--v2-shadow-lg)",
                      zIndex: 50,
                      minWidth: 150,
                      animation: "v2-fadeInScale 0.12s ease both",
                    }}
                  >
                    {STATUSES.map((s) => {
                      const sc = STATUS_CONFIG[s];
                      const current = client.status === s;
                      return (
                        <button
                          key={s}
                          onClick={() => updateStatus(client.id, s)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            width: "100%",
                            padding: "8px 12px",
                            border: "none",
                            borderRadius: 7,
                            background: current ? "var(--v2-bg-hover)" : "transparent",
                            cursor: "pointer",
                            fontFamily: f,
                            fontSize: 13,
                            color: "var(--v2-text-primary)",
                            transition: "background 0.12s",
                            textAlign: "left",
                          }}
                          onMouseEnter={(e) => {
                            if (!current) (e.currentTarget as HTMLElement).style.background = "var(--v2-bg-hover)";
                          }}
                          onMouseLeave={(e) => {
                            if (!current) (e.currentTarget as HTMLElement).style.background = "transparent";
                          }}
                        >
                          <div style={{ width: 7, height: 7, borderRadius: "50%", background: sc.color }} />
                          {sc.label}
                          {current && (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--v2-accent)" strokeWidth="2.5" style={{ marginLeft: "auto" }}>
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div
            style={{
              padding: "60px 0",
              textAlign: "center",
              color: "var(--v2-text-muted)",
              fontSize: 14,
              fontFamily: f,
            }}
          >
            {search ? "Ничего не найдено" : "Нет клиентов"}
          </div>
        )}
      </div>
    </div>
  );
}
