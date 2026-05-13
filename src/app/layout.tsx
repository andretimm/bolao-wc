import type { Metadata } from "next";
import { Space_Grotesk, JetBrains_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { ptBR } from "@clerk/localizations";
import { readTheme } from "@/lib/theme";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Bolão da Copa 2026",
  description: "Bolão da Copa do Mundo 2026 — palpites, ranking e bracket completo.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const theme = await readTheme();

  return (
    <ClerkProvider
      localization={ptBR}
      appearance={{
        variables: {
          colorPrimary: "#d8ff3e",
          colorBackground: theme === "dark" ? "#08080a" : "#ffffff",
          colorInputBackground: theme === "dark" ? "#0e0e11" : "#ffffff",
          colorInputText: theme === "dark" ? "#f4f4f5" : "#0a0a0b",
          colorText: theme === "dark" ? "#f4f4f5" : "#0a0a0b",
          colorTextSecondary: theme === "dark" ? "#a8a8b3" : "#5a5a62",
          borderRadius: "10px",
          fontFamily: "var(--font-space-grotesk), sans-serif",
        },
      }}
    >
      <html
        lang="pt-BR"
        className={`${spaceGrotesk.variable} ${jetbrainsMono.variable} theme-${theme}`}
      >
        <body>{children}</body>
      </html>
    </ClerkProvider>
  );
}
