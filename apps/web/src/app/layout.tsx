import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { CartProvider } from "@/components/CartProvider";
import { AuthProvider } from "@/components/AuthProvider";
import { WishProvider } from "@/components/WishProvider";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { CartDrawer } from "@/components/CartDrawer";
import { getSettings } from "@/lib/data";
import { SITE } from "@goalai/core/lib/site";
import "@goalai/core/styles.css";

const display = localFont({
  src: [{ path: "../fonts/Fraunces.woff2", style: "normal", weight: "100 900" }, { path: "../fonts/Fraunces-Italic.woff2", style: "italic", weight: "100 900" }],
  variable: "--f-display", display: "swap",
});
const body = localFont({ src: [{ path: "../fonts/Manrope.woff2", weight: "200 800" }], variable: "--f-body", display: "swap" });
const tamil = localFont({ src: [{ path: "../fonts/NotoSansTamil.woff2", weight: "100 900" }], variable: "--f-tamil", display: "swap", preload: false });

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: "Goalai — Organic nuts, groceries & trusted services | Kodungaiyur, Chennai", template: "%s · Goalai" },
  description: SITE.description,
  openGraph: { type: "website", siteName: "Goalai", locale: "en_IN", images: [{ url: "/brand/goalai-logo.svg" }] },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = { themeColor: "#D81B60", width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSettings();
  return (
    <html lang="en-IN" className={`${display.variable} ${body.variable} ${tamil.variable}`}>
      <body>
        <a className="skip" href="#main">Skip to content</a>
        <AuthProvider>
        <CartProvider>
        <WishProvider>
          <div className="announce">100% organic · Free delivery in Kodungaiyur above ₹{settings.freeAbove} · Order online · pay on WhatsApp chat</div>
          <Header />
          <main id="main">{children}</main>
          <Footer whatsapp={settings.whatsapp} />
          <CartDrawer settings={settings} />
        </WishProvider>
        </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
