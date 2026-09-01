// pages/_document.tsx
import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="es">
      <Head>
        <meta
          name="google-site-verification"
          content="Ri29ZJgVeeFa0iaSh0C2F2TOLEDNt-2u5TVUFCt_8QU"
        />
        <link rel="sitemap" type="application/xml" href="/sitemap.xml" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/logo.svg" type="image/svg+xml" />
        <link
          rel="icon"
          href="/favicon-48.png"
          sizes="48x48"
          type="image/png"
        />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/site.webmanifest" />
        <meta name="theme-color" content="#0b0b0b" />
        {/* Google Fonts: Inter + Notable */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin=""
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;700&family=Notable&display=swap"
          rel="stylesheet"
        />
      </Head>
      <body className="min-h-screen bg-white antialiased">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
