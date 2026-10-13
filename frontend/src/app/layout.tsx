import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Distribution Operations AI Root Cause Analysis (RCA) Copilot",
  description: "Enterprise Human-in-the-Loop RCA Platform for Warehouse Operations (SAP -> EAI -> Acumax -> Pick/Pack/Ship/Truck Close)",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-100/60 antialiased text-slate-900 selection:bg-sky-200">
        {children}
      </body>
    </html>
  );
}
