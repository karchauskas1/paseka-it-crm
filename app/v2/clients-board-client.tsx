"use client";

import { useState, useCallback } from "react";

type ClientStatus = "ACTIVE" | "INACTIVE" | "ARCHIVED";

interface ClientProject {
  id: string;
  name: string;
  status: string;
}

interface Client {
  id: string;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  status: ClientStatus;
  source: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  projects: ClientProject[];
  _count: {
    projects: number;
    communications: number;
  };
}

const STATUS_CONFIG: Record<ClientStatus, { label: string; color: string; bgLight: string; bgDark: string }> = {
  ACTIVE: {
    label: "Активные",
    color: "var(--v2-status-active)",
    bgLight: "rgba(34, 197, 94, 0.08)",
    bgDark: "rgba(34, 197, 94, 0.12)",
  },
  INACTIVE: {
    label: "Неактивные",
    color: "var(--v2-status-inactive)",
    bgLight: "rgba(245, 158, 11, 0.08)",
    bgDark: "rgba(245, 158, 11, 0.12)",
  },
  ARCHIVED: {
    label: "Архив",
    color: "var(--v2-status-archived)",
    bgLight: "rgba(148, 163, 184, 0.08)",
    bgDark: "rgba(148, 163, 184, 0.12)",
  },
};

const STATUSES: ClientStatus[] = ["ACTIVE", "INACTIVE", "ARCHIVED"];

interface ClientsBoardClientProps {
  initialClients: Client[];
  workspaceId: string;
}

export function ClientsBoardClient({ initialClients, workspaceId }: ClientsBoardClientProps) {
  const [clients, setClients] = useState<Client[]>(initialClients);
  const [search, setSearch] = useState("");
  const [dragOverStatus, setDragOverStatus] = useState<ClientStatus | null>(null);
  const [draggedClient, setDraggedClient] = useState<string | null>(null);
  const [expandedClient, setExpandedClient] = useState<string | null>(null);
  const [statusMenuClient, setStatusMenuClient] = useState<string | null>(null);

  const filteredClients = clients.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.company?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.phone?.toLowerCase().includes(q)
    );
  });

  const getClientsByStatus = (status: ClientStatus) =>
    filteredClients.filter((c) => c.status === status);

  const updateClientStatus = useCallback(
    async (clientId: string, newStatus: ClientStatus) => {
      // Optimistic update
      setClients((prev) =>
        prev.map((c) => (c.id === clientId ? { ...c, status: newStatus } : c))
      );
      setStatusMenuClient(null);

      try {
        const res = await fetch(`/api/clients/${clientId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        });
        if (!res.ok) throw new Error("Failed to update");
      } catch {
        // Revert on error
        setClients(initialClients);
      }
    },
    [initialClients]
  );

  // Drag & Drop
  const handleDragStart = (clientId: string) => {
    setDraggedClient(clientId);
  };

  const handleDragOver = (e: React.DragEvent, status: ClientStatus) => {
    e.preventDefault();
    setDragOverStatus(status);
  };

  const handleDragLeave = () => {
    setDragOverStatus(null);
  };

  const handleDrop = (status: ClientStatus) => {
    if (draggedClient) {
      updateClientStatus(draggedClient, status);
    }
    setDraggedClient(null);
    setDragOverStatus(null);
  };

  const handleDragEnd = () => {
    setDraggedClient(null);
    setDragOverStatus(null);
  };

  return (
    <div style={{ padding: "32px 40px", maxWidth: 1400, margin: "0 auto" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 32,
          animation: "v2-fadeIn 0.4s ease both",
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 28,
              fontWeight: 600,
              color: "var(--v2-text-primary)",
              margin: 0,
              fontFamily: "Space Grotesk, sans-serif",
              letterSpacing: "-0.5px",
            }}
          >
            Клиенты
          </h1>
          <p
            style={{
              fontSize: 14,
              color: "var(--v2-text-secondary)",
              margin: "4px 0 0",
              fontFamily: "Space Grotesk, sans-serif",
            }}
          >
            {clients.length} {clients.length === 1 ? "клиент" : "клиентов"}
          </p>
        </div>

        {/* Search */}
        <div style={{ position: "relative" }}>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--v2-text-muted)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }}
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Поиск клиентов..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: 260,
              padding: "10px 14px 10px 36px",
              border: "1px solid var(--v2-border-input)",
              borderRadius: 10,
              fontSize: 14,
              fontFamily: "Space Grotesk, sans-serif",
              background: "var(--v2-bg-card)",
              color: "var(--v2-text-primary)",
              outline: "none",
              transition: "border-color 0.2s, box-shadow 0.2s",
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "var(--v2-accent)";
              e.currentTarget.style.boxShadow = "0 0 0 3px rgba(232, 93, 58, 0.1)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "var(--v2-border-input)";
              e.currentTarget.style.boxShadow = "none";
            }}
          />
        </div>
      </div>

      {/* Columns */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 24,
          animation: "v2-fadeIn 0.5s ease 0.1s both",
        }}
      >
        {STATUSES.map((status) => {
          const config = STATUS_CONFIG[status];
          const statusClients = getClientsByStatus(status);
          const isDragOver = dragOverStatus === status;

          return (
            <div
              key={status}
              onDragOver={(e) => handleDragOver(e, status)}
              onDragLeave={handleDragLeave}
              onDrop={() => handleDrop(status)}
              style={{
                background: isDragOver ? config.bgLight : "transparent",
                borderRadius: 16,
                padding: isDragOver ? 12 : 0,
                transition: "background 0.2s, padding 0.2s",
                minHeight: 200,
              }}
            >
              {/* Column header */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 16,
                  padding: isDragOver ? "0 4px" : 0,
                }}
              >
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: config.color,
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: "var(--v2-text-primary)",
                    fontFamily: "Space Grotesk, sans-serif",
                    letterSpacing: "0.5px",
                  }}
                >
                  {config.label}
                </span>
                <span
                  style={{
                    fontSize: 12,
                    color: "var(--v2-text-muted)",
                    fontFamily: "Space Grotesk, sans-serif",
                    background: "var(--v2-bg-hover)",
                    padding: "2px 8px",
                    borderRadius: 6,
                  }}
                >
                  {statusClients.length}
                </span>
              </div>

              {/* Cards */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {statusClients.map((client, idx) => (
                  <ClientCard
                    key={client.id}
                    client={client}
                    index={idx}
                    isDragged={draggedClient === client.id}
                    isExpanded={expandedClient === client.id}
                    showStatusMenu={statusMenuClient === client.id}
                    onToggleExpand={() =>
                      setExpandedClient(expandedClient === client.id ? null : client.id)
                    }
                    onToggleStatusMenu={() =>
                      setStatusMenuClient(statusMenuClient === client.id ? null : client.id)
                    }
                    onStatusChange={(newStatus) => updateClientStatus(client.id, newStatus)}
                    onDragStart={() => handleDragStart(client.id)}
                    onDragEnd={handleDragEnd}
                    statusColor={config.color}
                  />
                ))}

                {statusClients.length === 0 && (
                  <div
                    style={{
                      padding: "40px 20px",
                      textAlign: "center",
                      color: "var(--v2-text-muted)",
                      fontSize: 13,
                      fontFamily: "Space Grotesk, sans-serif",
                      border: "1px dashed var(--v2-border)",
                      borderRadius: 12,
                    }}
                  >
                    {search ? "Ничего не найдено" : "Пусто"}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Client Card ── */

interface ClientCardProps {
  client: Client;
  index: number;
  isDragged: boolean;
  isExpanded: boolean;
  showStatusMenu: boolean;
  onToggleExpand: () => void;
  onToggleStatusMenu: () => void;
  onStatusChange: (status: ClientStatus) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  statusColor: string;
}

function ClientCard({
  client,
  index,
  isDragged,
  isExpanded,
  showStatusMenu,
  onToggleExpand,
  onToggleStatusMenu,
  onStatusChange,
  onDragStart,
  onDragEnd,
  statusColor,
}: ClientCardProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onToggleExpand}
      style={{
        background: "var(--v2-bg-card)",
        borderRadius: 12,
        padding: "16px 18px",
        border: `1px solid ${hovered ? statusColor : "var(--v2-border-light)"}`,
        cursor: "grab",
        opacity: isDragged ? 0.4 : 1,
        transform: hovered && !isDragged ? "translateY(-2px)" : "translateY(0)",
        boxShadow: hovered
          ? "var(--v2-shadow-md)"
          : "var(--v2-shadow-sm)",
        transition: "transform 0.2s, box-shadow 0.2s, border-color 0.2s, opacity 0.2s",
        animation: `v2-slideInCard 0.35s ease ${index * 0.04}s both`,
        position: "relative",
      }}
    >
      {/* Top row: Name + Status button */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: "var(--v2-text-primary)",
              fontFamily: "Space Grotesk, sans-serif",
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
                color: "var(--v2-text-secondary)",
                fontFamily: "Space Grotesk, sans-serif",
                marginTop: 2,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {client.company}
            </div>
          )}
        </div>

        {/* Status change button */}
        <div style={{ position: "relative" }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleStatusMenu();
            }}
            style={{
              width: 28,
              height: 28,
              border: "none",
              borderRadius: 8,
              background: hovered ? "var(--v2-bg-hover)" : "transparent",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "background 0.2s",
              flexShrink: 0,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--v2-text-muted)" strokeWidth="2">
              <circle cx="12" cy="5" r="1" />
              <circle cx="12" cy="12" r="1" />
              <circle cx="12" cy="19" r="1" />
            </svg>
          </button>

          {/* Status dropdown */}
          {showStatusMenu && (
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                position: "absolute",
                top: "100%",
                right: 0,
                marginTop: 4,
                background: "var(--v2-bg-card)",
                border: "1px solid var(--v2-border)",
                borderRadius: 10,
                padding: 4,
                boxShadow: "var(--v2-shadow-lg)",
                zIndex: 50,
                minWidth: 160,
                animation: "v2-fadeInScale 0.15s ease both",
              }}
            >
              {STATUSES.map((s) => {
                const cfg = STATUS_CONFIG[s];
                const isCurrentStatus = client.status === s;
                return (
                  <button
                    key={s}
                    onClick={() => onStatusChange(s)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      width: "100%",
                      padding: "8px 12px",
                      border: "none",
                      borderRadius: 8,
                      background: isCurrentStatus ? "var(--v2-bg-hover)" : "transparent",
                      cursor: "pointer",
                      fontFamily: "Space Grotesk, sans-serif",
                      fontSize: 13,
                      color: "var(--v2-text-primary)",
                      transition: "background 0.15s",
                      textAlign: "left",
                    }}
                    onMouseEnter={(e) => {
                      if (!isCurrentStatus) (e.currentTarget as HTMLElement).style.background = "var(--v2-bg-hover)";
                    }}
                    onMouseLeave={(e) => {
                      if (!isCurrentStatus) (e.currentTarget as HTMLElement).style.background = "transparent";
                    }}
                  >
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: cfg.color,
                        flexShrink: 0,
                      }}
                    />
                    <span>{cfg.label}</span>
                    {isCurrentStatus && (
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="var(--v2-accent)"
                        strokeWidth="2.5"
                        style={{ marginLeft: "auto" }}
                      >
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

      {/* Metadata row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginTop: 12,
          flexWrap: "wrap",
        }}
      >
        {client._count.projects > 0 && (
          <span
            style={{
              fontSize: 12,
              color: "var(--v2-text-muted)",
              fontFamily: "Space Grotesk, sans-serif",
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
            </svg>
            {client._count.projects}
          </span>
        )}
        {client._count.communications > 0 && (
          <span
            style={{
              fontSize: 12,
              color: "var(--v2-text-muted)",
              fontFamily: "Space Grotesk, sans-serif",
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            {client._count.communications}
          </span>
        )}
        {client.source && (
          <span
            style={{
              fontSize: 11,
              color: "var(--v2-text-muted)",
              fontFamily: "Space Grotesk, sans-serif",
              background: "var(--v2-bg-hover)",
              padding: "2px 6px",
              borderRadius: 4,
              textTransform: "lowercase",
            }}
          >
            {client.source}
          </span>
        )}
      </div>

      {/* Expanded details */}
      {isExpanded && (
        <div
          style={{
            marginTop: 14,
            paddingTop: 14,
            borderTop: "1px solid var(--v2-border-light)",
            animation: "v2-fadeIn 0.2s ease both",
          }}
        >
          {client.email && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--v2-text-muted)" strokeWidth="2">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
              <span style={{ fontSize: 13, color: "var(--v2-text-secondary)", fontFamily: "Space Grotesk, sans-serif" }}>
                {client.email}
              </span>
            </div>
          )}
          {client.phone && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--v2-text-muted)" strokeWidth="2">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
              </svg>
              <span style={{ fontSize: 13, color: "var(--v2-text-secondary)", fontFamily: "Space Grotesk, sans-serif" }}>
                {client.phone}
              </span>
            </div>
          )}

          {/* Projects */}
          {client.projects.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--v2-text-muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px", fontFamily: "Space Grotesk, sans-serif" }}>
                Проекты
              </div>
              {client.projects.map((p) => (
                <div
                  key={p.id}
                  style={{
                    fontSize: 13,
                    color: "var(--v2-text-secondary)",
                    fontFamily: "Space Grotesk, sans-serif",
                    padding: "4px 0",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <div
                    style={{
                      width: 4,
                      height: 4,
                      borderRadius: "50%",
                      background: "var(--v2-text-muted)",
                      flexShrink: 0,
                    }}
                  />
                  {p.name}
                </div>
              ))}
            </div>
          )}

          {client.notes && (
            <div
              style={{
                marginTop: 10,
                fontSize: 12,
                color: "var(--v2-text-muted)",
                fontFamily: "Space Grotesk, sans-serif",
                fontStyle: "italic",
                lineHeight: 1.5,
              }}
            >
              {client.notes}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
