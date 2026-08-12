import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FinGame - Educação Financeira Gamificada",
  description: "Web App gamificado de Educação Financeira para dinâmica de estagiários",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="dark">
      <body className="antialiased selection:bg-emerald-500/30 selection:text-emerald-200">
        {children}
      </body>
    </html>
  );
}
