import { Space_Grotesk } from "next/font/google";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { V2LayoutClient } from "./v2-layout-client";
import "./v2.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin", "latin-ext"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-space-grotesk",
});

export default async function V2Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  return (
    <div className={`${spaceGrotesk.variable} v2-root`}>
      <V2LayoutClient
        userName={user.name || user.email}
        userRole={user.role}
      >
        {children}
      </V2LayoutClient>
    </div>
  );
}
