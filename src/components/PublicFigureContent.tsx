// src/components/PublicFigureContent.tsx
'use client';

import { ReactNode, useState, useEffect } from 'react';
import TabNavigation, { Tab } from './TabNavigation';
import AdSidebar from './AdSidebar';
import AdBanner from './AdBanner';

interface PublicFigureContentProps {
    tabs: Tab[];
    activeTab: string;
    children: {
        curation: ReactNode;
        timeline: ReactNode;
        discography?: ReactNode;
        filmography?: ReactNode;
    };
}

export default function PublicFigureContent({ tabs, activeTab: initialActiveTab, children }: PublicFigureContentProps) {
    const [activeTab, setActiveTab] = useState(initialActiveTab);

    // Listen for hash changes (browser back/forward)
    useEffect(() => {
        const handleHashChange = () => {
            const hash = window.location.hash.slice(1); // Remove the '#'
            if (hash && tabs.some(tab => tab.id === hash)) {
                setActiveTab(hash);
            }
        };

        // Check hash on mount
        const hash = window.location.hash.slice(1);
        if (hash && tabs.some(tab => tab.id === hash)) {
            setActiveTab(hash);
        }

        window.addEventListener('hashchange', handleHashChange);
        return () => window.removeEventListener('hashchange', handleHashChange);
    }, [tabs]);

    // Prevent scroll on hash change
    useEffect(() => {
        // This prevents the default scroll behavior when hash changes
        if ('scrollRestoration' in window.history) {
            window.history.scrollRestoration = 'manual';
        }

        return () => {
            if ('scrollRestoration' in window.history) {
                window.history.scrollRestoration = 'auto';
            }
        };
    }, []);

    const handleTabChange = (tabId: string) => {
        // Capture current scroll position
        const currentScrollY = window.scrollY;

        // Update state
        setActiveTab(tabId);

        // Update hash using replaceState
        window.history.replaceState(null, '', `#${tabId}`);

        // Force scroll position to stay the same
        // Use requestAnimationFrame to ensure this runs after any browser scroll
        requestAnimationFrame(() => {
            window.scrollTo(0, currentScrollY);
        });
    };

    return (
        <>
            {/* Mobile Ad Above Tab Navigation (468x60) - Mobile Only */}
            <div className="lg:hidden w-full overflow-hidden mb-4">
                <AdBanner
                    adKey="30047d82f39b4acbb2048058f41436aa"
                    width={468}
                    height={60}
                />
            </div>

            {/* Sticky Tab Navigation */}
            <TabNavigation tabs={tabs} activeTab={activeTab} onTabChange={handleTabChange} />

            {/* Tab Content with Sidebar Layout */}
            <div className="flex flex-col lg:flex-row max-w-[1400px] mx-auto">
                {/* Main Content Area */}
                <div className="flex-1 w-full lg:w-auto">
                    {activeTab === 'curation' && <div key="curation">{children.curation}</div>}
                    {activeTab === 'timeline' && <div key="timeline">{children.timeline}</div>}
                    {activeTab === 'discography' && <div key="discography">{children.discography}</div>}
                    {activeTab === 'filmography' && <div key="filmography">{children.filmography}</div>}
                </div>

                {/* Right Sidebar Ad - Desktop Only (160x600) */}
                <aside className="hidden lg:block w-[180px] sticky self-start p-4" style={{ top: 'calc(4rem + 70px)' }}>
                    <AdSidebar
                        adKey="f31d2a8f52b88e41424de632d40c9a67"
                        width={160}
                        height={600}
                    />
                </aside>
            </div>
        </>
    );
}
