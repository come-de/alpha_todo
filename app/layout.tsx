import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Petit suivi — Tâches partagées",
  description: "Un tableau public et sans connexion pour suivre des tâches partagées avec responsables, dates, priorités, statuts et commentaires.",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
