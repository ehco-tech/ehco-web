// src/app/layout.tsx
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Header from '@/components/Header';
import { Analytics } from '@vercel/analytics/next';
import AnalyticsProvider from './AnalyticsProvider';
import JsonLd from '@/components/JsonLd';
import Link from 'next/link';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Providers } from './providers';
import ScrollToTop from '@/components/ScrollToTop';
import Script from 'next/script';
import AdBanner from '@/components/AdBanner';
import AdSidebar from '@/components/AdSidebar';

const queryClient = new QueryClient();

const inter = Inter({ subsets: ['latin'] });

// Separate viewport export
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  // ...any other viewport settings you need
}

export const metadata: Metadata = {
  metadataBase: new URL('https://www.ehco.ai'),
  title: {
    default: 'EHCO - K-Pop Facts & Timeline',
    template: '%s | EHCO'
  },
  description: 'Real-time verified facts and timeline about Korean celebrities. Latest K-Pop news with accurate fact-checking.',
  keywords: [
    // English Keywords
    'Korean celebrity news',
    'K-pop idol news',
    'Korean actor updates',
    'K-drama actor news',
    'Korean entertainment facts',
    'Korean celebrity timeline',
    'K-pop idol timeline',
    'Korean celebrity fact check',
    'IU latest news',
    'Kim Soo Hyun updates',
    'Han So Hee news',
    // Korean Keywords
    '한국 연예인 뉴스',
    '케이팝 아이돌 소식',
    '한류 스타 새소식',
    '연예인 타임라인',
    '연예뉴스 팩트체크'
  ],
  authors: [{ name: 'EHCO' }],
  creator: 'EHCO',
  publisher: 'EHCO',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
  manifest: '/site.webmanifest',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    title: 'EHCO - Real-time K-Entertainment Timeline',
    description: 'Accurate, real-time timeline and fact-checking for Korean celebrities. Latest verified news and updates.',
    url: 'https://ehco.ai',
    siteName: 'EHCO',
    locale: 'en_US',
    alternateLocale: 'ko_KR',
    type: 'website',
    images: [{
      url: 'https://ehco.ai/og-image.jpg',
      width: 1200,
      height: 630,
      alt: 'EHCO - K-Entertainment Timeline'
    }]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'EHCO - K-Entertainment Timeline',
    description: 'Real-time verified updates about Korean celebrities',
    images: ['https://ehco.ai/twitter-image.jpg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "EHCO - K-Entertainment Facts & Timeline",
    "url": "https://ehco.ai",
    "potentialAction": {
      "@type": "SearchAction",
      "target": "https://ehco.ai/search?q={search_term_string}",
      "query-input": "required name=search_term_string"
    }
  };

  return (
    <html lang="en">
      <head>
        <meta name="google-adsense-account" content="ca-pub-1952429442154119" />
        <meta name="referrer" content="no-referrer" />
        <meta name="yandex-verification" content="d95a704c62f53c58" />
        <meta name="naver-site-verification" content="264ce0fdcec0f8516f15473b626bad62bc29202e" />
        <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1708240738390806"
          crossOrigin="anonymous"></script>
      </head>
      <body className={inter.className}>
        <Script
          src="https://pl28337917.effectivegatecpm.com/43cb9ad4088581450e0265e080cc75ec/invoke.js"
          strategy="afterInteractive"
          async
          data-cfasync="false"
        />
        <Providers>
          <ScrollToTop />
          <div className="fixed top-0 left-0 right-0 z-50 shadow-md">
            <Header />
          </div>

          {/* Horizontal Banner Ad - Below Header (320x50) */}
          <div className="pt-16 bg-gray-50 dark:bg-black">
            <div className="flex justify-center items-center py-3 dark:bg-[#1d1d1f]">
              <AdBanner
                adKey="4b77689bf7394b9ee645a2a752c04a33"
                width={320}
                height={50}
              />
            </div>
          </div>

          {/* Main Content with Sidebar Layout */}
          <div className="min-h-screen bg-gray-50 dark:bg-black">
            <div className="flex flex-col lg:flex-row max-w-[1400px] mx-auto">
              {/* Main Content */}
              <main className="flex-1 w-full lg:w-auto">
                {children}
                <JsonLd data={websiteSchema} />
              </main>

              {/* Right Sidebar Ad - Desktop Only (160x300) */}
              <aside className="hidden lg:block w-[180px] sticky self-start p-4" style={{ top: 'calc(4rem + 70px)' }}>
                <AdSidebar
                  adKey="b6fd012836d0efc4358182fcf429e9f4"
                  width={160}
                  height={300}
                />
              </aside>
            </div>
          </div>

          {/* Footer - white background with only copyright and links */}
          <footer className="mt-0 bg-white dark:bg-[#1d1d1f] border-t border-gray-200 dark:border-gray-800 py-8">
            <div className="w-[90%] md:w-[80%] mx-auto px-4">
              <div className="text-center">
                <p className="text-xs md:text-sm mb-4 text-gray-600 dark:text-gray-400">© 2025 EHCO. All rights reserved.</p>
                <div className="flex flex-col mb-5 md:flex-row flex-wrap justify-center items-center gap-3 md:gap-4 text-xs md:text-sm text-gray-600 dark:text-gray-400">
                  <Link
                    href="/about-ehco"
                    className='hover:underline'
                  >
                    About Ehco
                  </Link>

                  {/* MODIFIED: This separator is hidden on mobile */}
                  <span className="hidden md:block">|</span>

                  <Link
                    href="/contact-us"
                    className='hover:underline'
                  >
                    Contact Us
                  </Link>

                  {/* MODIFIED: This separator is hidden on mobile */}
                  <span className="hidden md:block">|</span>

                  <Link
                    href="/terms-of-service"
                    className='hover:underline'
                  >
                    Terms of Service
                  </Link>

                  {/* MODIFIED: This separator is hidden on mobile */}
                  <span className="hidden md:block">|</span>

                  <Link
                    href="/privacy-policy"
                    className='hover:underline'
                  >
                    Privacy Policy
                  </Link>
                </div>
                {/* Ad Container */}
                <div id="container-43cb9ad4088581450e0265e080cc75ec" className="mb-4"></div>
              </div>
            </div>
          </footer>

          <Analytics />
          <AnalyticsProvider />
        </Providers>
      </body>
    </html>
  )
}