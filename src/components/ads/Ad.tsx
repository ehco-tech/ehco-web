// src/components/Ad.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { adManager } from '@/lib/adManager';

type AdVariant = 'banner' | 'sidebar' | 'responsive';

interface AdProps {
  variant?: AdVariant;
  adKey?: string;
  width?: number;
  height?: number;
  // For responsive variant
  desktopAdKey?: string;
  mobileAdKey?: string;
  className?: string;
}

interface WindowWithAtOptions extends Window {
  atOptions?: {
    key: string;
    format: string;
    height: number;
    width: number;
    params: Record<string, unknown>;
  };
}

export default function Ad({
  variant = 'banner',
  adKey,
  width,
  height,
  desktopAdKey,
  mobileAdKey,
  className
}: AdProps) {
  const adRef = useRef<HTMLDivElement>(null);
  const scriptLoadedRef = useRef(false);
  const [isMobile, setIsMobile] = useState<boolean | null>(null);

  // Detect screen size for responsive variant
  useEffect(() => {
    if (variant !== 'responsive') return;

    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, [variant]);

  useEffect(() => {
    // For responsive variant, wait until we know the screen size
    if (variant === 'responsive' && isMobile === null) return;

    if (scriptLoadedRef.current || !adRef.current) return;

    // Copy ref to local variable for cleanup
    const currentAdRef = adRef.current;

    // Determine ad configuration based on variant
    let finalAdKey: string;
    let finalWidth: number;
    let finalHeight: number;

    if (variant === 'responsive') {
      if (!desktopAdKey || !mobileAdKey) {
        console.error('Responsive variant requires both desktopAdKey and mobileAdKey');
        return;
      }
      finalAdKey = isMobile ? mobileAdKey : desktopAdKey;
      finalWidth = isMobile ? 468 : 728;
      finalHeight = isMobile ? 60 : 90;
    } else {
      if (!adKey || width === undefined || height === undefined) {
        console.error('Banner and sidebar variants require adKey, width, and height');
        return;
      }
      finalAdKey = adKey;
      finalWidth = width;
      finalHeight = height;
    }

    const loadAd = () => {
      if (!currentAdRef) {
        adManager.markComplete();
        return;
      }

      // Create a unique container for this specific ad
      const adContainer = document.createElement('div');
      adContainer.id = `ad-container-${finalAdKey}`;

      // Set global atOptions
      (window as unknown as WindowWithAtOptions).atOptions = {
        'key': finalAdKey,
        'format': 'iframe',
        'height': finalHeight,
        'width': finalWidth,
        'params': {}
      };

      // Create invoke script
      const invokeScript = document.createElement('script');
      invokeScript.type = 'text/javascript';
      invokeScript.src = `https://www.highperformanceformat.com/${finalAdKey}/invoke.js`;

      // Wait for script to load before processing next ad
      invokeScript.onload = () => {
        setTimeout(() => {
          adManager.markComplete();
        }, 100);
      };

      invokeScript.onerror = () => {
        console.error(`Failed to load ad: ${finalAdKey}`);
        adManager.markComplete();
      };

      currentAdRef.appendChild(adContainer);
      adContainer.appendChild(invokeScript);

      scriptLoadedRef.current = true;
    };

    // Add to shared queue
    adManager.enqueue(loadAd);

    return () => {
      // Cleanup on unmount using the copied ref
      if (currentAdRef) {
        currentAdRef.innerHTML = '';
      }
      scriptLoadedRef.current = false;
    };
  }, [variant, adKey, width, height, desktopAdKey, mobileAdKey, isMobile]);

  // Get container style and className based on variant
  const getContainerProps = () => {
    if (variant === 'responsive') {
      // Don't render anything until we know the screen size
      if (isMobile === null) {
        return {
          className: 'w-full flex justify-center',
          style: { minHeight: '90px', width: '728px', maxWidth: '100%' }
        };
      }

      return {
        className: 'w-full flex justify-center overflow-x-auto',
        children: (
          <div
            ref={adRef}
            className="flex justify-center"
            style={{
              minHeight: `${isMobile ? 60 : 90}px`,
              width: `${isMobile ? 468 : 728}px`,
              maxWidth: '100%'
            }}
          />
        )
      };
    }

    if (variant === 'sidebar') {
      return {
        className: className || 'flex justify-center',
        style: { minHeight: `${height}px`, minWidth: `${width}px` }
      };
    }

    // Default banner variant
    return {
      className,
      style: { minHeight: `${height}px`, minWidth: `${width}px` }
    };
  };

  const containerProps = getContainerProps();

  // For responsive variant with nested structure
  if (variant === 'responsive' && containerProps.children) {
    return (
      <div className={containerProps.className} style={containerProps.style}>
        {containerProps.children}
      </div>
    );
  }

  // For banner and sidebar variants
  return (
    <div
      ref={adRef}
      className={containerProps.className}
      style={containerProps.style}
    />
  );
}

// Convenience exports for backward compatibility
export const AdBanner = (props: Omit<AdProps, 'variant'>) => <Ad {...props} variant="banner" />;
export const AdSidebar = (props: Omit<AdProps, 'variant'>) => <Ad {...props} variant="sidebar" />;
export const AdBannerResponsive = (props: Omit<AdProps, 'variant' | 'adKey' | 'width' | 'height'>) => <Ad {...props} variant="responsive" />;
