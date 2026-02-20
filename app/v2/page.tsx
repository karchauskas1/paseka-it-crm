import { redirect } from "next/navigation";
import { getCurrentUser, getUserWorkspace } from "@/lib/auth";
import { db } from "@/lib/db";
import { ClientsBoardClient } from "./clients-board-client";

export default async function V2ClientsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const workspace = await getUserWorkspace(user.id);
  if (!workspace) redirect("/login");

  const clients = await db.client.findMany({
    where: { workspaceId: workspace.id },
    orderBy: { updatedAt: "desc" },
    include: {
      projects: {
        select: {
          id: true,
          name: true,
          status: true,
        },
        orderBy: { updatedAt: "desc" },
        take: 3,
      },
      _count: {
        select: {
          projects: true,
          communications: true,
        },
      },
    },
  });

  return (
    <ClientsBoardClient
      initialClients={JSON.parse(JSON.stringify(clients))}
      workspaceId={workspace.id}
    />
  );
}
