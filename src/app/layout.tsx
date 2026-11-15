
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { NavigationLoader } from "@/components/navigation-loader";

export const metadata: Metadata = {
  title: {
    default: "DEVKAZZU — Developer Raju",
    template: "%s | DEVKAZZU",
  },

  description:
    "Building ideas into digital reality. Projects, applications, tools and experiments by Raju Mahato.",

  applicationName: "DEVKAZZU",

  verification: {
    google: "FGUGfBbbp3Nlmlh7sbm6hjtnFce3Kpg3a_r6UAr7K3U",
  },

  robots: {
    index: true,
    follow: true,
  },

  icons: {
    icon: "/icon.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#090910",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main-content">
          Skip to content
        </a>

        <NavigationLoader />

        {children}
      </body>
    </html>
  );
}
