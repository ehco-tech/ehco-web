import React from 'react';
import { CheckCircle, AlertCircle, XCircle, Clock } from 'lucide-react';
import Link from 'next/link';

const HowWeWork: React.FC = () => {
    return (
        <div className="min-h-screen bg-white dark:bg-black">
            {/* Hero Section */}
            <section className="py-20 text-center">
                <div className="max-w-4xl mx-auto px-4">
                    <h1 className="text-5xl font-bold mb-4 text-gray-900 dark:text-white">How We Work</h1>
                    <p className="text-xl text-gray-600 dark:text-gray-400">
                        Every Claim. Verified. Every source is transparent. Every update immediate.
                    </p>
                </div>
            </section>

            {/* Our Process Section */}
            <section className="py-16 bg-gray-50 dark:bg-[#1c1c1e]">
                <div className="max-w-4xl mx-auto px-4">
                    <h2 className="text-3xl font-bold text-center mb-4 text-gray-900 dark:text-white">Our Process</h2>
                    <p className="text-center text-gray-600 dark:text-gray-400 mb-16">
                        How we turn unverified information into verified timelines
                    </p>

                    {/* Process Steps */}
                    <div className="space-y-12">
                        {/* Step 1: AI Monitoring */}
                        <div className="flex gap-6">
                            <div className="flex-shrink-0">
                                <div className="w-12 h-12 bg-key-color text-white rounded-full flex items-center justify-center text-xl font-bold">
                                    1
                                </div>
                            </div>
                            <div className="flex-1">
                                <h3 className="text-2xl font-bold mb-3 text-gray-900 dark:text-white">AI Monitoring</h3>
                                <p className="text-gray-600 dark:text-gray-400 mb-4">
                                    We process thousands of news claims, and we make them 24/7 to capture even small signals.
                                </p>
                                <div className="bg-white dark:bg-[#1d1d1f] rounded-lg p-6 border border-gray-200 dark:border-gray-800">
                                    <h4 className="font-bold mb-2 text-gray-900 dark:text-white">EXAMPLE SOURCES</h4>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                        Media feeds from X (with smart filters), associated news sites, official ministries, briefing statements from government officials or organizations
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Step 2: Human Verification */}
                        <div className="flex gap-6">
                            <div className="flex-shrink-0">
                                <div className="w-12 h-12 bg-key-color text-white rounded-full flex items-center justify-center text-xl font-bold">
                                    2
                                </div>
                            </div>
                            <div className="flex-1">
                                <h3 className="text-2xl font-bold mb-3 text-gray-900 dark:text-white">Human Verification</h3>
                                <p className="text-gray-600 dark:text-gray-400 mb-4">
                                    All steps of claims verification are done by information specialists include sources are checked for accuracy.
                                </p>
                                <div className="bg-white dark:bg-[#1d1d1f] rounded-lg p-6 border border-gray-200 dark:border-gray-800">
                                    <h4 className="font-bold mb-2 text-gray-900 dark:text-white">VERIFICATION CHECKLIST</h4>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                        Sources: is new verified statement made?, fact check against other credible and reliable sources from fact checks and public records
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Step 3: Timeline Integration */}
                        <div className="flex gap-6">
                            <div className="flex-shrink-0">
                                <div className="w-12 h-12 bg-key-color text-white rounded-full flex items-center justify-center text-xl font-bold">
                                    3
                                </div>
                            </div>
                            <div className="flex-1">
                                <h3 className="text-2xl font-bold mb-3 text-gray-900 dark:text-white">Timeline Integration</h3>
                                <p className="text-gray-600 dark:text-gray-400 mb-4">
                                    Human specialists group updates into a plant within our source timelines per significant status.
                                </p>
                                <div className="bg-white dark:bg-[#1d1d1f] rounded-lg p-6 border border-gray-200 dark:border-gray-800">
                                    <h4 className="font-bold mb-2 text-gray-900 dark:text-white">WHAT GETS ADDED</h4>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                        Major developments: significant updates, official announcements, like a scheduled, what started, project launched
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Step 4: Continuous Updates */}
                        <div className="flex gap-6">
                            <div className="flex-shrink-0">
                                <div className="w-12 h-12 bg-key-color text-white rounded-full flex items-center justify-center text-xl font-bold">
                                    4
                                </div>
                            </div>
                            <div className="flex-1">
                                <h3 className="text-2xl font-bold mb-3 text-gray-900 dark:text-white">Continuous Updates</h3>
                                <p className="text-gray-600 dark:text-gray-400 mb-4">
                                    As new information emerges we update the timelines with source information references. As corrections are made is ongoing.
                                </p>
                                <div className="bg-white dark:bg-[#1d1d1f] rounded-lg p-6 border border-gray-200 dark:border-gray-800">
                                    <h4 className="font-bold mb-2 text-gray-900 dark:text-white">LIVE UPDATES</h4>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                        Revisions available within 1hr to updated looking sources (via stringers) as given detail turns
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Verification Levels Section */}
            <section className="py-16">
                <div className="max-w-6xl mx-auto px-4">
                    <h2 className="text-3xl font-bold text-center mb-4 text-gray-900 dark:text-white">Verification Levels</h2>
                    <p className="text-center text-gray-600 dark:text-gray-400 mb-16">
                        How we rate different types of information
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                        {/* Verified */}
                        <div className="text-center">
                            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full mb-4">
                                <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
                            </div>
                            <h3 className="font-bold text-xl mb-2 text-gray-900 dark:text-white">Verified</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                                Information backed by reliable sources or primary documents
                            </p>
                            <div className="bg-gray-50 dark:bg-[#1d1d1f] rounded-lg p-4 border-l-4 border-green-600 dark:border-green-400">
                                <p className="text-sm text-left text-gray-900 dark:text-gray-300">
                                    Has 2+ credible sources or official source or primary document
                                </p>
                            </div>
                        </div>

                        {/* Likely */}
                        <div className="text-center">
                            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full mb-4">
                                <Clock className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                            </div>
                            <h3 className="font-bold text-xl mb-2 text-gray-900 dark:text-white">Likely</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                                Reported but lacks full backing - we include because it&apos;s notable
                            </p>
                            <div className="bg-gray-50 dark:bg-[#1d1d1f] rounded-lg p-4 border-l-4 border-blue-600 dark:border-blue-400">
                                <p className="text-sm text-left text-gray-900 dark:text-gray-300">
                                    Requires support by 2-3 large but trustable sources (not official)
                                </p>
                            </div>
                        </div>

                        {/* Rumoured */}
                        <div className="text-center">
                            <div className="inline-flex items-center justify-center w-16 h-16 bg-yellow-100 dark:bg-yellow-900/30 rounded-full mb-4">
                                <AlertCircle className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
                            </div>
                            <h3 className="font-bold text-xl mb-2 text-gray-900 dark:text-white">Rumoured</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                                Still being confirmed but worth noting due to credibility or relevance
                            </p>
                            <div className="bg-gray-50 dark:bg-[#1d1d1f] rounded-lg p-4 border-l-4 border-yellow-600 dark:border-yellow-400">
                                <p className="text-sm text-left text-gray-900 dark:text-gray-300">
                                    Sourced using appropriate level 1 mainstream source
                                </p>
                            </div>
                        </div>

                        {/* Disputed */}
                        <div className="text-center">
                            <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full mb-4">
                                <XCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
                            </div>
                            <h3 className="font-bold text-xl mb-2 text-gray-900 dark:text-white">Disputed</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                                Contradicting statements or information in question
                            </p>
                            <div className="bg-gray-50 dark:bg-[#1d1d1f] rounded-lg p-4 border-l-4 border-red-600 dark:border-red-400">
                                <p className="text-sm text-left text-gray-900 dark:text-gray-300">
                                    Contradicting claims by two notable sources
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Information Evolution Section */}
            <section className="py-16 bg-gray-50 dark:bg-black">
                <div className="max-w-4xl mx-auto px-4">
                    <h2 className="text-3xl font-bold text-center mb-4 text-gray-900 dark:text-white">Information Evolution</h2>
                    <p className="text-center text-gray-600 dark:text-gray-400 mb-16">
                        How from a story develops from claim to verified fact
                    </p>

                    <div className="bg-white dark:bg-[#1d1d1f] rounded-lg p-8 border border-gray-200 dark:border-gray-800">
                        <h3 className="font-bold text-xl mb-8 text-gray-900 dark:text-white">Example: Kim Seo-hyun Drama Announcement</h3>

                        <div className="space-y-6">
                            {/* Timeline Item 1 */}
                            <div className="flex gap-4">
                                <div className="flex-shrink-0 w-1 bg-yellow-400"></div>
                                <div className="flex-1 pb-6">
                                    <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">March 1, 2025</div>
                                    <p className="text-gray-700 dark:text-gray-300 mb-2">
                                        Social media post about Kim Seo-hyun&apos;s possible new TV series role after agency confirms.
                                    </p>
                                    <span className="inline-block px-3 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 text-xs rounded-full">
                                        Rumoured
                                    </span>
                                </div>
                            </div>

                            {/* Timeline Item 2 */}
                            <div className="flex gap-4">
                                <div className="flex-shrink-0 w-1 bg-blue-400"></div>
                                <div className="flex-1 pb-6">
                                    <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">March 3, 2025</div>
                                    <p className="text-gray-700 dark:text-gray-300 mb-2">
                                        Kim team up with critically applaud director, however it hasn&apos;t been a press conference nor a deal.
                                    </p>
                                    <span className="inline-block px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 text-xs rounded-full">
                                        Likely
                                    </span>
                                </div>
                            </div>

                            {/* Timeline Item 3 */}
                            <div className="flex gap-4">
                                <div className="flex-shrink-0 w-1 bg-green-400"></div>
                                <div className="flex-1">
                                    <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">March 5, 2025</div>
                                    <p className="text-gray-700 dark:text-gray-300 mb-2">
                                        Reports on official network press network news about the role in the project announcement
                                    </p>
                                    <span className="inline-block px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 text-xs rounded-full">
                                        Verified
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Our Sources Section */}
            <section className="py-16">
                <div className="max-w-6xl mx-auto px-4">
                    <h2 className="text-3xl font-bold text-center mb-4 text-gray-900 dark:text-white">Our Sources</h2>
                    <p className="text-center text-gray-600 dark:text-gray-400 mb-16">
                        Where we get our information
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
                        {/* Official Sources */}
                        <div className='flex flex-col justify-center items-center'>
                            <h3 className="font-bold text-lg mb-4 text-gray-900 dark:text-white">Official Sources</h3>
                            <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                                <li>• Legal/court records</li>
                                <li>• Government websites</li>
                                <li>• Official agency posts</li>
                                <li>• Public documents</li>
                                <li>• Press briefings</li>
                            </ul>
                        </div>

                        {/* Media Outlets */}
                        <div className='flex flex-col justify-center items-center'>
                            <h3 className="font-bold text-lg mb-4 text-gray-900 dark:text-white">Media Outlets</h3>
                            <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                                <li>• Major newswire sites</li>
                                <li>• National media</li>
                                <li>• Entertainment news</li>
                                <li>• Reputable magazines</li>
                                <li>• Trade publications</li>
                            </ul>
                        </div>

                        {/* Industry Data */}
                        <div className='flex flex-col justify-center items-center'>
                            <h3 className="font-bold text-lg mb-4 text-gray-900 dark:text-white">Industry Data</h3>
                            <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                                <li>• Film databases (like IMDb)</li>
                                <li>• Production filings</li>
                                <li>• Award ceremonies</li>
                                <li>• Festival databases</li>
                                <li>• Box-office trackers</li>
                            </ul>
                        </div>

                        {/* What We Don't Use */}
                        <div className='flex flex-col justify-center items-center'>
                            <h3 className="font-bold text-lg mb-4 text-gray-900 dark:text-white">What We Don&apos;t Use</h3>
                            <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                                <li>• Anonymous sources</li>
                                <li>• Personal blog posts</li>
                                <li>• Tabloid rumors</li>
                                <li>• Social chatter</li>
                                <li>• Unverified posts</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-20 text-center bg-gray-50 dark:bg-black">
                <div className="max-w-3xl mx-auto px-4">
                    <h2 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white">Ready to Explore?</h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-8">
                        Dive into verified timelines of projects, people, and trends - all backed by transparent sources.
                    </p>
                    <div className="flex gap-4 justify-center">
                        <Link href="/all-figures">
                            <button className="flex justify-center items-center px-8 py-3 bg-key-color text-white rounded-lg font-semibold hover:bg-pink-700 transition">
                                Explore Timelines →
                            </button>
                        </Link>
                        <Link href="/about-ehco">
                            <button className="flex justify-center items-center px-8 py-3 border border-gray-300 dark:border-gray-700 rounded-lg font-semibold hover:bg-gray-50 dark:hover:bg-gray-900 transition text-gray-900 dark:text-white">
                                Learn About Us →
                            </button>
                        </Link>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default HowWeWork;