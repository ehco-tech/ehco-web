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
                        Every fact verified. Every source transparent. Every update immediate.
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
                                    Our systems monitor official sources, news outlets, and social media 24/7 for updates about public figures.
                                </p>
                                <div className="bg-white dark:bg-[#1d1d1f] rounded-lg p-6 border border-gray-200 dark:border-gray-800">
                                    <h4 className="font-bold mb-2 text-gray-900 dark:text-white">EXAMPLE SOURCES</h4>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                        Official Instagram posts, press releases, entertainment news sites, agency statements, interview transcripts
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
                                    Our team of editors verifies each piece of information against multiple sources and checks for accuracy.
                                </p>
                                <div className="bg-white dark:bg-[#1d1d1f] rounded-lg p-6 border border-gray-200 dark:border-gray-800">
                                    <h4 className="font-bold mb-2 text-gray-900 dark:text-white">VERIFICATION CHECKLIST</h4>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                        Source credibility, cross-reference multiple outlets, fact-check against official statements, verify dates and
                                        details
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
                                    Verified information is added to the celebrity&apos;s timeline with clear source attribution and verification status.
                                </p>
                                <div className="bg-white dark:bg-[#1d1d1f] rounded-lg p-6 border border-gray-200 dark:border-gray-800">
                                    <h4 className="font-bold mb-2 text-gray-900 dark:text-white">WHAT GETS ADDED</h4>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                        Career milestones, project announcements, awards, collaborations, official statements, and verified
                                        personal updates
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
                                    Information is continuously monitored and updated. If new sources contradict existing information, we
                                    investigate and update accordingly.
                                </p>
                                <div className="bg-white dark:bg-[#1d1d1f] rounded-lg p-6 border border-gray-200 dark:border-gray-800">
                                    <h4 className="font-bold mb-2 text-gray-900 dark:text-white">LIVE UPDATES</h4>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                        Rumors become verified facts, disputed claims get clarified, new developments are added within hours
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
                        How we label different types of information
                    </p>

                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
                        {/* Verified */}
                        <div className="text-center">
                            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full mb-4">
                                <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
                            </div>
                            <h3 className="font-bold text-xl mb-2 text-gray-900 dark:text-white">Verified</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                                Confirmed by official sources or
                                multiple credible outlets
                            </p>
                            <div className="bg-gray-50 dark:bg-[#1d1d1f] rounded-lg p-4 border-l-4 border-green-600 dark:border-green-400">
                                <p className="text-sm text-left text-gray-900 dark:text-gray-300">
                                    &ldquo;Netflix confirms Queen of
                                    Tears reached #1 globally&rdquo;
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
                                Reported by credible sources but
                                awaiting official confirmation
                            </p>
                            <div className="bg-gray-50 dark:bg-[#1d1d1f] rounded-lg p-4 border-l-4 border-blue-600 dark:border-blue-400">
                                <p className="text-sm text-left text-gray-900 dark:text-gray-300">
                                    &ldquo;Reports suggest BLACKPINK
                                    will headline Coachella 2025&rdquo;
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
                                Circulating online but not
                                confirmed by reliable sources
                            </p>
                            <div className="bg-gray-50 dark:bg-[#1d1d1f] rounded-lg p-4 border-l-4 border-yellow-600 dark:border-yellow-400">
                                <p className="text-sm text-left text-gray-900 dark:text-gray-300">
                                    &ldquo;Social media speculation
                                    about BTS reunion dates&rdquo;
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
                                Conflicting reports or officially denied claims
                            </p>
                            <div className="bg-gray-50 dark:bg-[#1d1d1f] rounded-lg p-4 border-l-4 border-red-600 dark:border-red-400">
                                <p className="text-sm text-left text-gray-900 dark:text-gray-300">
                                    &ldquo;Dating rumors denied by both agencies&rdquo;
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
                        See how a story develops from rumor to verified fact
                    </p>

                    <div className="bg-white dark:bg-[#1d1d1f] rounded-lg p-8 border border-gray-200 dark:border-gray-800">
                        <h3 className="font-bold text-xl mb-8 text-gray-900 dark:text-white">Example: Kim Soo-hyun Drama Announcement</h3>

                        <div className="space-y-6">
                            {/* Timeline Item 1 */}
                            <div className="flex gap-4">
                                <div className="flex-shrink-0 w-1 bg-yellow-400"></div>
                                <div className="flex-1 pb-6">
                                    <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">March 1, 2024</div>
                                    <p className="text-gray-700 dark:text-gray-300 mb-2">
                                        Social media buzz about Kim Soo-hyun&apos;s potential return to television after military service.
                                    </p>
                                    <span className="inline-block px-3 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 text-xs rounded-full">
                                        ? Rumoured
                                    </span>
                                </div>
                            </div>

                            {/* Timeline Item 2 */}
                            <div className="flex gap-4">
                                <div className="flex-shrink-0 w-1 bg-green-400"></div>
                                <div className="flex-1 pb-6">
                                    <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">March 7, 2024</div>
                                    <p className="text-gray-700 dark:text-gray-300 mb-2">
                                        Kim Soo-hyun officially confirms &ldquo;Queen of Tears&rdquo; drama at press conference with co-star Kim Ji-won.
                                    </p>
                                    <span className="inline-block px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 text-xs rounded-full">
                                        ✓ Verified
                                    </span>
                                </div>
                            </div>

                            {/* Timeline Item 3 */}
                            <div className="flex gap-4">
                                <div className="flex-shrink-0 w-1 bg-red-400"></div>
                                <div className="flex-1">
                                    <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">March 15, 2024</div>
                                    <p className="text-gray-700 dark:text-gray-300 mb-2">
                                        Reports of on-set romance between leads denied by both actors&apos; representatives.
                                    </p>
                                    <span className="inline-block px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 text-xs rounded-full">
                                        ! Disputed
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Our Sources Section */}
            <section className="py-16 bg-white dark:bg-[#1c1c1e]">
                <div className="max-w-6xl mx-auto px-4 ">
                    <h2 className="text-3xl font-bold text-center mb-4 text-gray-900 dark:text-white">Our Sources</h2>
                    <p className="text-center text-gray-600 dark:text-gray-400 mb-16">
                        Where we get our information
                    </p>

                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-12">
                        {/* Official Sources */}
                        <div className='flex flex-col justify-center items-center border border-gray-200 dark:border-gray-800 p-4 rounded-lg'>
                            <h3 className="font-bold text-lg mb-4 text-gray-900 dark:text-white">Official Sources</h3>
                            <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                                <li><span className='text-key-color'>•</span> Agency press releases</li>
                                <li><span className='text-key-color'>•</span> Official social media accounts</li>
                                <li><span className='text-key-color'>•</span> Government records</li>
                                <li><span className='text-key-color'>•</span> Court documents</li>
                                <li><span className='text-key-color'>•</span> Company statements</li>
                            </ul>
                        </div>

                        {/* Media Outlets */}
                        <div className='flex flex-col justify-center items-center border border-gray-200 dark:border-gray-800 p-4 rounded-lg'>
                            <h3 className="font-bold text-lg mb-4 text-gray-900 dark:text-white">Media Outlets</h3>
                            <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                                <li><span className='text-key-color'>•</span> Major entertainment news</li>
                                <li><span className='text-key-color'>•</span> Mainstream newspapers</li>
                                <li><span className='text-key-color'>•</span> Trade publications</li>
                                <li><span className='text-key-color'>•</span> Interview transcripts</li>
                                <li><span className='text-key-color'>•</span> Press conference recordings</li>
                            </ul>
                        </div>

                        {/* Industry Data */}
                        <div className='flex flex-col justify-center items-center border border-gray-200 dark:border-gray-800 p-4 rounded-lg'>
                            <h3 className="font-bold text-lg mb-4 text-gray-900 dark:text-white">Industry Data</h3>
                            <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                                <li><span className='text-key-color'>•</span> Chart performance data</li>
                                <li><span className='text-key-color'>•</span> Box office numbers</li>
                                <li><span className='text-key-color'>•</span> Streaming statistics</li>
                                <li><span className='text-key-color'>•</span> Award show results</li>
                                <li><span className='text-key-color'>•</span> Industry databases</li>
                            </ul>
                        </div>

                        {/* What We Don't Use */}
                        <div className='flex flex-col justify-center items-center border border-gray-200 dark:border-gray-800 p-4 rounded-lg'>
                            <h3 className="font-bold text-lg mb-4 text-gray-900 dark:text-white">What We Don&apos;t Use</h3>
                            <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                                <li><span className='text-key-color'>•</span> Anonymous gossip</li>
                                <li><span className='text-key-color'>•</span> Unverified social media</li>
                                <li><span className='text-key-color'>•</span> Tabloid speculation</li>
                                <li><span className='text-key-color'>•</span> Fan rumors</li>
                                <li><span className='text-key-color'>•</span> Clickbait headlines</li>
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
                        Start discovering verified information about your favorite public figures
                    </p>
                    <div className="flex gap-4 justify-center">
                        <Link href="/all-figures">
                            <button className="flex justify-center items-center px-8 py-3 bg-key-color text-white rounded-lg font-semibold hover:bg-pink-700 transition">
                                Search Figures →
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