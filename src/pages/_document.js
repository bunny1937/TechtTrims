// src/pages/_document.js
import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* ✅ Preconnect to critical domains */}

        {/* Veldman */}
        <link
          rel="preload"
          href="/fonts/veldman.otf"
          as="font"
          type="font/otf"
          crossOrigin="anonymous"
        />

        <link
          rel="preload"
          href="/fonts/ZTNature-Bold.otf"
          as="font"
          type="font/otf"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          as="image"
          href="https://ik.imagekit.io/m1qb6qo6qv/admin/general/heroimage_by5odOwuF.webp?tr=w-600,h-400,q-80,f-webp"
          fetchpriority="high"
        />
        {/* ✅ DNS prefetch */}
        <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
        <link rel="dns-prefetch" href="https://ik.imagekit.io" />

        {/* ✅ CRITICAL: Async font loading - Reduced from 9 to 3 weights! */}
        <link
          rel="preload"
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Inter:wght@400;600;700&display=swap"
          as="style"
          onLoad="this.onload=null;this.rel='stylesheet'"
        />
        <noscript>
          <link
            rel="stylesheet"
            href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Inter:wght@400;600;700&display=swap"
          />
        </noscript>
        {/* ✅ Favicon */}
        <link rel="icon" href="/favicon.ico" />

        {/* ✅ Meta tags */}
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />
        <meta name="theme-color" content="#1a1a1a" />

        {/* ✅ INLINE CRITICAL CSS - Prevents FOUC */}
        <style
          dangerouslySetInnerHTML={{
            __html: `
              *{box-sizing:border-box;margin:0;padding:0}
              :root{
                --primary:#c38f0a;
                --background-primary:#faf6ef;
                --text-primary:#2c1600;
                --font-display:"Playfair Display",serif;
                --font-body:"Inter",sans-serif;
              }
              body{
                margin:0;
                font-family:var(--font-body),-apple-system,BlinkMacSystemFont,sans-serif;
                background:var(--background-primary);
                color:var(--text-primary);
                -webkit-font-smoothing:antialiased;
                -moz-osx-font-smoothing:grayscale;
                overflow-x:hidden;
              }
              img{max-width:100%;height:auto;display:block}
            `,
          }}
        />
      </Head>
      <body>
        <Main />
        <NextScript />

        {/* ✅ Defer service worker */}
        {process.env.NODE_ENV === "production" && (
          <script
            defer
            dangerouslySetInnerHTML={{
              __html: `
                if('serviceWorker' in navigator){
                  window.addEventListener('load',()=>{
                    navigator.serviceWorker.register('/sw.js')
                      .catch(err=>console.error('SW:',err));
                  });
                }
              `,
            }}
          />
        )}
      </body>
    </Html>
  );
}
