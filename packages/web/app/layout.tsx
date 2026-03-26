import "./globals.css";
import Sidebar from "../components/Sidebar";
import { ToastProvider } from "../components/Toast";
import Topbar from "../components/Topbar";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body className="min-h-full">
        <ToastProvider>
          <div className="app-shell flex min-h-screen">
            <Sidebar />
            <main className="flex-1">
              <Topbar />
              <div className="p-6">{children}</div>
            </main>
          </div>
          <div id="portal-root" />
        </ToastProvider>
      </body>
    </html>
  );
}
