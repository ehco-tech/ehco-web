// src/components/home/HeroStats.tsx

import React from 'react';
import { Loader2 } from 'lucide-react';

interface HeroStatsProps {
  statsData: {
    totalFigures: number;
    totalFacts: number;
  };
  statsLoading: boolean;
}

export const HeroStats: React.FC<HeroStatsProps> = ({ statsData, statsLoading }) => {
  return (
    <section className="mb-12">
      <div className="flex flex-wrap justify-center gap-8 mb-6">
        <div className="text-center">
          <div className="text-2xl font-bold text-key-color">
            {statsLoading ? (
              <Loader2 className="animate-spin inline-block" size={24} />
            ) : (
              `${statsData.totalFacts.toLocaleString()}`
            )}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Facts</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-key-color">
            {statsLoading ? (
              <Loader2 className="animate-spin inline-block" size={24} />
            ) : (
              statsData.totalFigures.toLocaleString()
            )}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Figures</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-key-color">
            {statsLoading ? (
              <Loader2 className="animate-spin inline-block" size={24} />
            ) : (
              '96%'
            )}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Accuracy</div>
        </div>
      </div>
    </section>
  );
};
