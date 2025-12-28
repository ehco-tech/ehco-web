// src/components/hero/GroupMembersDisplay.tsx
'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { getInitials } from '@/lib/utils/colorUtils';

interface Member {
    name: string;
    profilePic?: string;
}

interface GroupMembersDisplayProps {
    members: Member[];
    primaryColor: string;
    textColor: string;
}

const GroupMembersDisplay: React.FC<GroupMembersDisplayProps> = ({
    members,
    primaryColor,
    textColor
}) => {
    const [showAllMembers, setShowAllMembers] = useState(false);

    if (!members || members.length === 0) return null;

    return (
        <div className="flex flex-wrap justify-center gap-2 sm:gap-0 sm:-space-x-3 max-w-lg mx-auto">
            {members.slice(0, showAllMembers ? members.length : 12).map((member, index) => (
                <div
                    key={index}
                    className="relative w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-full overflow-hidden border-2 sm:border-3 md:border-4 border-white shadow-lg"
                    title={member.name}
                >
                    {member.profilePic ? (
                        <Image
                            src={member.profilePic}
                            alt={member.name}
                            sizes='(max-width: 640px) 48px, (max-width: 768px) 56px, 64px'
                            fill
                            className="object-cover"
                            quality={100}
                        />
                    ) : (
                        <div
                            className="w-full h-full bg-primary flex items-center justify-center text-white text-xs sm:text-sm font-bold"
                            style={{ backgroundColor: primaryColor, color: textColor }}
                        >
                            {getInitials(member.name)}
                        </div>
                    )}
                </div>
            ))}
            {members.length > 12 && !showAllMembers && (
                <button
                    onClick={() => setShowAllMembers(true)}
                    className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-full bg-gray-300 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300 text-xs sm:text-sm font-bold border-2 sm:border-3 md:border-4 border-white shadow-lg hover:bg-gray-400 dark:hover:bg-gray-600 transition-colors cursor-pointer"
                    title={`Show ${members.length - 12} more members`}
                >
                    +{members.length - 12}
                </button>
            )}
            {showAllMembers && members.length > 12 && (
                <button
                    onClick={() => setShowAllMembers(false)}
                    className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-full bg-gray-300 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300 text-xs sm:text-sm font-bold border-2 sm:border-3 md:border-4 border-white shadow-lg hover:bg-gray-400 dark:hover:bg-gray-600 transition-colors cursor-pointer"
                    title="Show less"
                >
                    −
                </button>
            )}
        </div>
    );
};

export default GroupMembersDisplay;
