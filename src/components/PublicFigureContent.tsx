// src/components/PublicFigureContent.tsx
'use client';

import { useState, ReactNode } from 'react';
import TabNavigation, { Tab } from './TabNavigation';

interface PublicFigureContentProps {
    tabs: Tab[];
    children: {
        curation: ReactNode;
        timeline: ReactNode;
        discography?: ReactNode;
        filmography?: ReactNode;
    };
}

export default function PublicFigureContent({ tabs, children }: PublicFigureContentProps) {
    const [activeTab, setActiveTab] = useState(tabs[0]?.id || 'curation');

    return (
        <>
            {/* Sticky Tab Navigation */}
            <TabNavigation tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

            {/* Tab Content */}
            <div>
                {activeTab === 'curation' && children.curation}
                {activeTab === 'timeline' && children.timeline}
                {activeTab === 'discography' && children.discography}
                {activeTab === 'filmography' && children.filmography}
            </div>
        </>
    );
}
