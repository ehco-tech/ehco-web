'use client';

import { Info } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';

export default function AboutPageContent() {
    // State for stats counters
    const [statsData, setStatsData] = useState<{ totalFigures: number; totalFacts: number; totalArticles: number }>({
        totalFigures: 0,
        totalFacts: 0,
        totalArticles: 0
    });
    const [statsLoading, setStatsLoading] = useState<boolean>(true);

    // Fetch stats counters
    useEffect(() => {
        const fetchStats = async () => {
            try {
                setStatsLoading(true);
                const response = await fetch('/api/stats');

                if (!response.ok) {
                    throw new Error('Failed to fetch stats');
                }

                const data = await response.json();
                setStatsData({
                    totalFigures: data.totalFigures || 0,
                    totalFacts: data.totalFacts || 0,
                    totalArticles: data.totalArticles || 0
                });
            } catch (error) {
                console.error('Error fetching stats:', error);
                // Keep default values (0) on error
            } finally {
                setStatsLoading(false);
            }
        };

        fetchStats();
    }, []);

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-black">
            {/* Hero Section */}
            <section className="bg-white dark:bg-black py-20 px-4">
                <div className="max-w-4xl mx-auto text-center">
                    <h1 className="text-5xl md:text-6xl font-bold mb-6 text-gray-900 dark:text-white">
                        Understanding Over <span className="text-key-color">Judgment</span>
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 text-lg max-w-2xl mx-auto">
                        We believe everyone deserves accurate information about the people they care about
                    </p>
                </div>
            </section>

            {/* Our Story Section */}
            <section className="py-16 px-4">
                <div className="max-w-4xl mx-auto">
                    <h2 className="text-4xl font-bold text-center mb-4 text-gray-900 dark:text-white">Our Story</h2>
                    <p className="text-center text-gray-500 dark:text-gray-400 mb-12">Why EHCO exists</p>

                    <div className="bg-white dark:bg-[#1d1d1f] rounded-lg p-8 md:p-12 shadow-sm border border-gray-200 dark:border-gray-800">
                        <p className="text-gray-700 dark:text-gray-300 mb-6 leading-relaxed">
                            The internet is full of information about public figures. But how much of it is actually true? When a fan
                            wants to learn about their favorite artist, or a journalist needs to fact-check a claim, they&apos;re faced with
                            <span className='text-key-color'> scattered rumors, outdated wikis, and contradictory sources.</span>
                        </p>
                        <p className="text-gray-700 dark:text-gray-300 mb-6 leading-relaxed">
                            We built EHCO because we believe there&apos;s a better way. A place where every fact is verified, every
                            source is transparent, and every update happens in real-time. Not to fuel gossip, but to
                            <span className='text-key-color'> foster understanding.</span>
                        </p>
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                            EHCO isn&apos;t about judgment. It&apos;s about giving you the complete picture—backed by sources you can trust
                            —so you can form your own understanding of the people who shape our culture.
                        </p>
                    </div>
                </div>
            </section>

            {/* What We Stand For Section */}
            <section className="py-16 px-4 bg-white dark:bg-black">
                <div className="max-w-6xl mx-auto">
                    <h2 className="text-4xl font-bold text-center mb-4 text-gray-900 dark:text-white">What We Stand For</h2>
                    <p className="text-center text-gray-500 dark:text-gray-400 mb-16">Our core principles</p>

                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
                        {/* Truth First */}
                        <div className="text-center border border-gray-200 dark:border-gray-800 p-4 rounded-lg">
                            <div className="w-16 h-16 mx-auto mb-6 flex items-center justify-center">
                                <div className="w-12 h-12 bg-pink-100 dark:bg-pink-900/30 rounded-lg flex items-center justify-center">
                                    <svg className="w-6 h-6 text-key-color" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                            </div>
                            <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Truth First</h3>
                            <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                                Every fact on EHCO is
                                verified against multiple
                                credible sources. No
                                speculation, no gossip—just
                                information you can trust.
                            </p>
                        </div>

                        {/* Total Transparency */}
                        <div className="text-center border border-gray-200 dark:border-gray-800 p-4 rounded-lg">
                            <div className="w-16 h-16 mx-auto mb-6 flex items-center justify-center">
                                <div className="w-12 h-12 bg-pink-100 dark:bg-pink-900/30 rounded-lg flex items-center justify-center">
                                    <svg className="w-6 h-6 text-key-color dark:text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                    </svg>
                                </div>
                            </div>
                            <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Total Transparency</h3>
                            <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                                We show our sources for
                                everything. You don&apos;t have to
                                trust us blindly—you can
                                verify every claim yourself.
                            </p>
                        </div>

                        {/* Real-Time Updates */}
                        <div className="text-center border border-gray-200 dark:border-gray-800 p-4 rounded-lg">
                            <div className="w-16 h-16 mx-auto mb-6 flex items-center justify-center">
                                <div className="w-12 h-12 bg-pink-100 dark:bg-pink-900/30 rounded-lg flex items-center justify-center">
                                    <svg className="w-6 h-6 text-key-color dark:text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                            </div>
                            <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Real-Time Updates</h3>
                            <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                                News moves fast. Our AI
                                monitors thousands of
                                sources 24/7, with human
                                editors verifying every update
                                within hours.
                            </p>
                        </div>

                        {/* Real-Time Updates */}
                        <div className="text-center border border-gray-200 dark:border-gray-800 p-4 rounded-lg">
                            <div className="w-16 h-16 mx-auto mb-6 flex items-center justify-center">
                                <div className="w-12 h-12 bg-pink-100 dark:bg-pink-900/30 rounded-lg flex items-center justify-center">
                                    <svg className="w-6 h-6 text-key-color dark:text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                            </div>
                            <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Respect & Context</h3>
                            <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                                Public figures are people. We
                                present facts with context
                                and nuance, never
                                sensationalizing or reducing
                                them to headlines.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* What Makes Us Different Section */}
            <section className="py-16 px-4 bg-key-color text-white">
                <div className="max-w-4xl mx-auto">
                    <h2 className="text-4xl font-bold text-center mb-4">What Makes Us Different</h2>
                    <p className="text-center text-pink-100 mb-16">The only platform that covers the latest accuracy updates</p>

                    <div className="grid md:grid-cols-4 gap-8 mb-8">
                        <div className="text-center">
                            <div className="text-5xl font-bold mb-2">&lt;45min</div>
                            <p className="text-pink-100 text-sm">Average time from live</p>
                        </div>
                        <div className="text-center">
                            <div className="text-5xl font-bold mb-2">96%</div>
                            <p className="text-pink-100 text-sm">Accuracy rate</p>
                        </div>
                        <div className="text-center">
                            <div className="text-5xl font-bold mb-2">
                                {statsData.totalArticles >= 1000 ? `${(statsData.totalArticles / 1000).toFixed(0)}K+` : statsData.totalArticles}
                            </div>
                            <p className="text-pink-100 text-sm">Content articles</p>
                        </div>
                        <div className="text-center">
                            <div className="text-5xl font-bold mb-2">100%</div>
                            <p className="text-pink-100 text-sm">Source verified</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Our Impact Section */}
            <section className="py-16 px-4">
                <div className="max-w-4xl mx-auto">
                    <h2 className="text-4xl font-bold text-center mb-4 text-gray-900 dark:text-white">Our Impact</h2>
                    <p className="text-center text-gray-500 dark:text-gray-400 mb-16">Building trust through transparency</p>

                    <div className="grid md:grid-cols-3 gap-8 mb-8">
                        <div className="text-center bg-white dark:bg-[#1d1d1f] p-8 rounded-lg border border-gray-200 dark:border-gray-800">
                            <div className="text-4xl font-bold text-key-color mb-2">
                                {statsData.totalFigures.toLocaleString()}
                            </div>
                            <p className="text-gray-600 dark:text-gray-400 text-sm">Total Figures</p>
                            <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">across all profiles</p>
                        </div>
                        <div className="text-center bg-white dark:bg-[#1d1d1f] p-8 rounded-lg border border-gray-200 dark:border-gray-800">
                            <div className="text-4xl font-bold text-key-color mb-2">
                                {statsData.totalFacts >= 1000 ? `${(statsData.totalFacts / 1000).toFixed(0)}K+` : statsData.totalFacts}
                            </div>
                            <p className="text-gray-600 dark:text-gray-400 text-sm">verified facts</p>
                            <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">in our database</p>
                        </div>
                        <div className="text-center bg-white dark:bg-[#1d1d1f] p-8 rounded-lg border border-gray-200 dark:border-gray-800">
                            <div className="text-4xl font-bold text-key-color mb-2">24/7</div>
                            <p className="text-gray-600 dark:text-gray-400 text-sm">Monitoring</p>
                            <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">round-the-clock tracking</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* How We Work Section */}
            {/* <section className="py-16 px-4">
                <div className="max-w-4xl mx-auto">
                    <h2 className="text-4xl font-bold text-center mb-4 text-gray-900 dark:text-white">How We Work</h2>
                    <p className="text-center text-gray-500 dark:text-gray-400 mb-16">Each accuracy update is validated through multiple verification levels and credible representatives</p>

                    <div className="grid md:grid-cols-2 gap-8 mb-8">
                        <div className="bg-white dark:bg-[#1d1d1f] p-8 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800">
                            <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">Research</h3>
                            <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                                Every piece of data originates from established media outlets and public records.
                            </p>
                        </div>
                        <div className="bg-white dark:bg-[#1d1d1f] p-8 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800">
                            <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">Curated Context</h3>
                            <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                                Our curation team highlights and organizes related events and sources for comprehensive narratives.
                            </p>
                        </div>
                        <div className="bg-white dark:bg-[#1d1d1f] p-8 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800">
                            <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">Execution</h3>
                            <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                                Automated tools speed up retrieval, but final presentation is always verified to ensure clarity.
                            </p>
                        </div>
                        <div className="bg-white dark:bg-[#1d1d1f] p-8 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800">
                            <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">Continuous Learning</h3>
                            <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                                We refine our methods based on user feedback and new developments in the media landscape.
                            </p>
                        </div>
                    </div>
                </div>
            </section> */}

            {/* Our Journey Section */}
            <section className="py-16 px-4 bg-white dark:bg-black">
                <div className="max-w-4xl mx-auto">
                    <h2 className="text-4xl font-bold text-center mb-4 text-gray-900 dark:text-white">Our Journey</h2>
                    <p className="text-center text-gray-500 dark:text-gray-400 mb-16">From idea to platform</p>

                    <div className="space-y-12">
                        <div className="flex gap-8">
                            <div className="text-key-color font-bold text-lg min-w-[80px]">2024</div>
                            <div>
                                <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">The Beginning</h3>
                                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                                    Started out with a simple question: &quot;Who is Taeil?&quot; It led to the realization that people often can&apos;t trust what they see and need a verified, comprehensive source for public figure information.
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-8">
                            <div className="text-key-color font-bold text-lg min-w-[80px]">Early 2025</div>
                            <div>
                                <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">Expanding Coverage</h3>
                                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                                    Grew the platform to cover thousands of public figures, implementing automated fact-checking systems while maintaining human oversight for quality and accuracy.
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-8">
                            <div className="text-key-color font-bold text-lg min-w-[80px]">Today</div>
                            <div>
                                <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">Building the Future</h3>
                                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                                    Continuously improving our platform with real-time updates, enhanced transparency features, and expanding our coverage to serve users seeking truth in an age of information overload.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-20 px-4">
                <div className="max-w-4xl mx-auto text-center">
                    <h2 className="text-4xl font-bold mb-6 text-gray-900 dark:text-white">Join Us in Building Trust</h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-8 text-lg">
                        Get a trusted and verified information about the celebrities you care about
                    </p>
                    <div className="flex gap-4 justify-center flex-wrap">
                        <Link
                            href="/all-figures"
                            className="bg-key-color flex justify-center items-center text-white px-8 py-3 rounded-lg font-semibold hover:bg-red-700 transition-colors"
                        >
                            Start Exploring
                        </Link>
                        <Link
                            href="/how-we-work"
                            className="flex justify-center items-center border-2 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-white px-8 py-3 rounded-lg font-semibold hover:border-gray-400 dark:hover:border-gray-600 transition-colors"
                        >
                            How it works
                        </Link>
                    </div>
                </div>
            </section>
        </div>
    );
}