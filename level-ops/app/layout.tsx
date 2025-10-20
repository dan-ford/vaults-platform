import type { Metadata } from "next";
import "./globals.css";
import "@copilotkit/react-ui/styles.css";
import { Providers } from "./providers";
import { APP_NAME } from "@/lib/config/branding";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: APP_NAME,
  description: "Secure workspaces for founders and investors. Create your free profile, then buy a Vault for each organization.",
  icons: {
    icon: "/favicon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <Providers>{children}</Providers>
        <Toaster position="top-right" />
      </body>
    </html>
  );
}
