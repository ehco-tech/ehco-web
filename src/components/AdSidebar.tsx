'use client';

import { useEffect, useRef } from 'react';

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

    // Create a unique container for this specific ad
    const adContainer = document.createElement('div');
    adContainer.id = `ad-container-${adKey}`;

    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.async = true;

    // Create the ad configuration inline in the script
    script.innerHTML = `
      atOptions = {
        'key': '${adKey}',
        'format': 'iframe',
        'height': ${height},
        'width': ${width},
        'params': {}
      };
    `;

    // Create second script to load the ad
    const invokeScript = document.createElement('script');
    invokeScript.type = 'text/javascript';
    invokeScript.src = `https://www.highperformanceformat.com/${adKey}/invoke.js`;
    invokeScript.async = true;

    if (adRef.current) {
      adRef.current.appendChild(adContainer);
      adContainer.appendChild(script);
      adContainer.appendChild(invokeScript);
    }

    scriptLoadedRef.current = true;

    return () => {
      // Cleanup on unmount
      if (adRef.current) {
        adRef.current.innerHTML = '';
      }
      scriptLoadedRef.current = false;
    };
  }, [adKey, width, height]);

  return <div ref={adRef} className="flex justify-center" style={{ minHeight: `${height}px`, minWidth: `${width}px` }} />;
}
