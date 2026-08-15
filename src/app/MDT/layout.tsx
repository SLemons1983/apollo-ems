import "./mdt.css";
import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Apollo MDT | ApolloEMS",
  description: "ApolloEMS mobile data terminal",
  manifest: "/MDT/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Apollo MDT" },
  icons: { icon: "/apollo-logo.png", apple: "/apollo-logo.png" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#071c31",
};

export default function MdtLayout({ children }: { children: React.ReactNode }) {
  return children;
}
