'use client';

import { useEffect, useRef } from 'react';
import { adManager } from '@/lib/adManager';

interface AdSidebarProps {
  adKey: string;
  width: number;
  height: number;
}

export default function AdSidebar({ adKey, width, height }: AdSidebarProps) {
  const adRef = useRef<HTMLDivElement>(null);
  const scriptLoadedRef = useRef(false);

  useEffect(() => {
    if (scriptLoadedRef.current || !adRef.current) return;

    // Copy ref to local variable for cleanup
    const currentAdRef = adRef.current;

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
  }, [adKey, width, height]);

  return <div ref={adRef} className="flex justify-center" style={{ minHeight: `${height}px`, minWidth: `${width}px` }} />;
}
