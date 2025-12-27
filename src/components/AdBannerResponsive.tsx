'use client';

import { useEffect, useRef, useState } from 'react';
import { adManager } from '@/lib/adManager';

interface AdBannerResponsiveProps {
  desktopAdKey: string;
  mobileAdKey: string;
}

export default function AdBannerResponsive({ desktopAdKey, mobileAdKey }: AdBannerResponsiveProps) {
  const adRef = useRef<HTMLDivElement>(null);
  const scriptLoadedRef = useRef(false);
  const [isMobile, setIsMobile] = useState<boolean | null>(null);

  // Detect screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    // Don't load ad until we know the screen size
    if (isMobile === null || scriptLoadedRef.current || !adRef.current) return;

    // Copy ref to local variable for cleanup
    const currentAdRef = adRef.current;

    // Determine which ad to load based on screen size
    const adKey = isMobile ? mobileAdKey : desktopAdKey;
    const width = isMobile ? 468 : 728;
    const height = isMobile ? 60 : 90;

    const loadAd = () => {
      if (!currentAdRef) {
        adManager.markComplete();
        return;
      }

      // Create a unique container for this specific ad
      const adContainer = document.createElement('div');
      adContainer.id = `ad-container-${adKey}`;

      // Set global atOptions - using interface extension instead of any
      interface WindowWithAtOptions extends Window {
        atOptions?: {
          key: string;
          format: string;
          height: number;
          width: number;
          params: Record<string, unknown>;
        };
      }

      (window as unknown as WindowWithAtOptions).atOptions = {
        'key': adKey,
        'format': 'iframe',
        'height': height,
        'width': width,
        'params': {}
      };

      // Create invoke script
      const invokeScript = document.createElement('script');
      invokeScript.type = 'text/javascript';
      invokeScript.src = `https://www.highperformanceformat.com/${adKey}/invoke.js`;

      // Wait for script to load before processing next ad
      invokeScript.onload = () => {
        // Small delay to ensure ad renders before loading next one
        setTimeout(() => {
          adManager.markComplete();
        }, 100);
      };

      invokeScript.onerror = () => {
        console.error(`Failed to load ad: ${adKey}`);
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
  }, [isMobile, desktopAdKey, mobileAdKey]);

  // Don't render anything until we know the screen size
  if (isMobile === null) {
    return (
      <div className="w-full flex justify-center">
        <div style={{ minHeight: '90px', width: '728px', maxWidth: '100%' }} />
      </div>
    );
  }

  return (
    <div className="w-full flex justify-center overflow-x-auto">
      <div
        ref={adRef}
        className="flex justify-center"
        style={{
          minHeight: `${isMobile ? 60 : 90}px`,
          width: `${isMobile ? 468 : 728}px`,
          maxWidth: '100%'
        }}
      />
    </div>
  );
}
