import "./globals.css";
import Sidebar from "../components/Sidebar";
import { ToastProvider } from "../components/Toast";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const link = (href: string, label: string) => (
    <a href={href} className="block rounded-md px-3 py-2 text-slate-200 hover:bg-slate-700 hover:text-white">
      {label}
    </a>
  );
  return (
    <html lang="tr">
      <body className="min-h-full">
        <ToastProvider>
          <div className="flex min-h-screen">
            <Sidebar />
            <main className="flex-1 bg-slate-50 p-6">{children}</main>
          </div>
          <div id="portal-root" />
        </ToastProvider>
      </body>
    </html>
  );
}
