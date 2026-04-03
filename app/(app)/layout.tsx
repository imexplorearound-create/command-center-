import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";

export const dynamic = "force-dynamic";

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <Sidebar />
      <div className="cc-content" style={{ marginLeft: 230, minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        <Topbar />
        <div className="cc-main">{children}</div>
      </div>
    </>
  );
}
