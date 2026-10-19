import Script from "next/script";

// Google Analytics 4, only when NEXT_PUBLIC_GA_ID (e.g. "G-XXXXXXXXXX") is set at build time.
// Loaded after the page is interactive so it never slows the first paint (Core Web Vitals).
const GA_ID = process.env.NEXT_PUBLIC_GA_ID?.trim();

export function GoogleAnalytics() {
  if (!GA_ID || !/^G-[A-Z0-9]+$/.test(GA_ID)) return null;
  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
      <Script id="ga-init" strategy="afterInteractive">
        {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_ID}',{anonymize_ip:true});`}
      </Script>
    </>
  );
}
