// app/terms-of-service/page.tsx

import { Metadata } from "next";
import { AdBannerResponsive } from "@/components/ads/Ad";

export const metadata: Metadata = {
    title: 'Terms of Service',
    description: 'Read the official Terms of Service for using EHCO. This page outlines the rules and user agreement for accessing our K-entertainment data and services.',
};

export default function TermsOfService() {
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-black">
            <div className="max-w-3xl mx-auto px-4 py-8 text-black dark:text-white">
                <h1 className="text-3xl font-bold text-center mb-8 text-key-color">Terms of Service</h1>

                <p className="text-gray-600 dark:text-gray-400 mb-8">Last Updated: May 4, 2025</p>

                <div className="prose max-w-none">
                    <p className="mb-4 text-gray-700 dark:text-gray-300">
                        Welcome to EHCO! Our mission is to provide accessible, transparent, and neutral information about public figures,
                        organized into comprehensive journeys that offer clear context.
                        We aggregate, structure, and summarize publicly available information to help you understand how narratives develop over time.
                    </p>
                    <p className="mb-6 text-gray-700 dark:text-gray-300">
                        By accessing or using the EHCO service (the &ldquo;Service&rdquo;), you agree to be bound by these Terms of Service (&ldquo;ToS&rdquo;)
                        and our accompanying Copyright and Attribution Policy, which is incorporated herein by reference.
                        Please read both documents carefully.
                    </p>


                    <h2 className="text-xl font-bold text-key-color mt-8 mb-4">1. Service Description</h2>
                    <p className="mb-6 text-gray-700 dark:text-gray-300">
                        EHCO provides structured timelines and summaries derived from publicly available information,
                        primarily reputable news sources. We utilize Artificial Intelligence (AI) technology to assist in the aggregation,
                        categorization, and summarization process. This AI operates under human oversight to prioritize neutrality and accuracy.
                        Our service aims to provide context and track the evolution of information, always linking back to original sources where possible.
                    </p>


                    <h2 className="text-xl font-bold text-key-color mt-8 mb-4">2. Use of the Service</h2>
                    <p className="mb-4 text-gray-700 dark:text-gray-300"> <span className="font-bold">Permitted Use:</span>
                        You may use the Service for your personal, non-commercial informational purposes. You are permitted to:
                    </p>
                    <ul className="list-disc ml-6 mb-4 text-gray-700 dark:text-gray-300">
                        <li>View content displayed at this Service.</li>
                        <li>Search for information about specific individuals</li>
                        <li>Note that accessing the service is not a license provided for EHCO, provides you guys proper attribution to EHCO
                            link, where applicable, the original source.</li>
                    </ul>
                    <p className="mb-4 text-gray-700 dark:text-gray-300"><span className="font-bold">Prohibited Use:</span> You agree not to:</p>
                    <ul className="list-disc ml-6 mb-6 text-gray-700 dark:text-gray-300">
                        <li>Use the Service for any commercial purpose without obtaining explicit prior written permission from EHCO.</li>
                        <li>Systematically scrape, copy, or reproduce EHCO&apos;s structured timelines, database, or proprietary organization of content.</li>
                        <li>Create derivative works based on EHCO&apos;s unique content structure or presentation.</li>
                        <li>Use the Service in any manner that could damage, disable, overburden, or impair the Service or interfere with
                            any other party&apos;s use of the Service.</li>
                    </ul>


                    <h2 className="text-xl font-bold text-key-color mt-8 mb-4">3. Content and Intellectual Property</h2>
                    <p className="mb-4 text-gray-700 dark:text-gray-300"><span className="font-bold">Third-Party Content:</span>
                        The Service displays limited excerpts of content from third-party sources (e.g., news articles)
                        under the principles of fair use for purposes such as reporting, commentary, education, and historical documentation.
                        We are committed to providing clear attribution for all sourced content, including the source name, publication date,
                        and a direct link to the original source whenever available.
                    </p>
                    <p className="mb-4 text-gray-700 dark:text-gray-300"><span className="font-bold">EHCO Content:</span>
                        The unique organization, structure, and presentation of information on the Service are
                        the proprietary intellectual property of EHCO. All rights are reserved.
                    </p>
                    <p className="mb-6 text-gray-700 dark:text-gray-300"><span className="font-bold">Copyright and Attribution Policy:</span>
                        Your use of the Service is subject to our <span></span>
                        <a
                            href="#ads"
                            className="text-key-color underline cursor-pointer hover:text-pink-600 dark:hover:text-pink-400"
                        >
                            Copyright and Attribution Policy
                        </a>
                        , which details our approach to fair use, source attribution, DMCA compliance, and content usage rights.
                        Please review this policy carefully.
                    </p>


                    <h2 className="text-xl font-bold text-key-color mt-8 mb-4">4. Accuracy and Corrections</h2>
                    <p className="mb-4 text-gray-700 dark:text-gray-300">
                        EHCO strives for accuracy and neutrality in the information presented.
                        However, given the dynamic nature of news and public information, we cannot guarantee the absolute accuracy
                        or completeness of all content at all times. We provide links to original sources for verification.
                    </p>
                    <p className="mb-6 text-gray-700 dark:text-gray-300">
                        We are committed to correcting factual errors promptly. If you believe any information on the Service is inaccurate,
                        please contact us using the information provided below or via our Contact Us page. Corrections will be made transparently.
                    </p>


                    <h2 className="text-xl font-bold text-key-color mt-8 mb-4">5. Disclaimers</h2>
                    <p className="mb-4 text-gray-700 dark:text-gray-300">
                        Informational Purposes Only: The content provided on the Service is for general informational purposes only.
                        It does not constitute legal, financial, medical, or any other type of professional advice.
                        You should consult with qualified professionals for advice specific to your circumstances.
                    </p>
                    <p className="mb-4 text-gray-700 dark:text-gray-300">
                        Limitation of Liability: EHCO is not liable for any decisions made or actions taken based on the information provided
                        through the Service. Your use of the Service and reliance on its content is solely at your own risk.
                    </p>
                    <p className="mb-6 text-gray-700 dark:text-gray-300">
                        No Endorsement: References to any third-party sources, individuals, products, or services
                        do not constitute an endorsement or affiliation unless explicitly stated.
                    </p>


                    <h2 className="text-xl font-bold text-key-color mt-8 mb-4">6. Individual Rights and Defamation</h2>
                    <p className="mb-6 text-gray-700 dark:text-gray-300">
                        EHCO is committed to presenting information neutrally and factually, respecting the rights and reputations of individuals,
                        including public figures. We report only on publicly available information from reputable sources
                        and do not create original news or engage in sensationalism. If any individual believes their portrayal on the Service
                        is inaccurate or unfair, they may contact us for a review.
                    </p>


                    <h2 className="text-xl font-bold text-key-color mt-8 mb-4">7. Changes to the Service and Terms</h2>
                    <p className="mb-6 text-gray-700 dark:text-gray-300">
                        EHCO reserves the right to modify or discontinue the Service (or any portion thereof) at any time, with or without notice,
                        and without liability to you. We also reserve the right to update or modify these ToS periodically.
                        Any changes will be posted on this page, and your continued use of the Service after such changes
                        constitutes your acceptance of the new terms. We encourage you to review these ToS regularly.
                    </p>


                    <h2 className="text-xl font-bold text-key-color mt-8 mb-4">8. Privacy</h2>
                    <p className="mb-6 text-gray-700 dark:text-gray-300">
                        Your use of the Service is also governed by our Privacy Policy, which explains how we collect, use, and protect your information.
                        Please review our Privacy Policy for more details. (Link to Privacy Policy to be added here.)
                    </p>


                    <h2 className="text-xl font-bold text-key-color mt-8 mb-4">9. User Conduct</h2>
                    <p className="mb-4 text-gray-700 dark:text-gray-300">
                        You agree that you will not use the Service to:
                    </p>
                    <ul className="list-disc ml-6 mb-6 text-gray-700 dark:text-gray-300">
                        <li>Engage in any activity that is unlawful, harmful, abusive, defamatory, libelous, threatening, harassing,
                            or otherwise objectionable.</li>
                        <li>Attempt to gain unauthorized access to any portion of the Service, to other accounts,
                            computer systems, or networks connected to the Service.</li>
                        <li>Interfere with or disrupt the integrity or performance of the Service or the data contained therein.</li>
                        <li>Collect, harvest, or store personal data about other users without their express consent.</li>
                    </ul>


                    <h2 className="text-xl font-bold text-key-color mt-8 mb-4">10. External Links</h2>
                    <p className="mb-6 text-gray-700 dark:text-gray-300">
                        The Service may contain links to third-party websites or resources, including the original news sources we aggregate information from.
                        EHCO is not responsible for the availability, accuracy, or content of such external sites or resources.
                        Inclusion of any link does not imply endorsement by EHCO. You access these external sites at your own risk.
                    </p>


                    <h2 className="text-xl font-bold text-key-color mt-8 mb-4">11. Indemnification</h2>
                    <p className="mb-6 text-gray-700 dark:text-gray-300">
                        You agree to indemnify, defend, and hold harmless EHCO, its affiliates, officers, directors, employees, and agents from and against
                        any and all claims, damages, losses, liabilities, costs, and expenses (including reasonable attorneys&apos; fees)
                        arising out of or related to your use of the Service, your violation of these ToS,
                        or your violation of any rights of a third party.
                    </p>


                    <h2 className="text-xl font-bold text-key-color mt-8 mb-4">12. Disclaimers of Warranties</h2>
                    <p className="mb-4 text-gray-700 dark:text-gray-300">
                        The Service is provided on an &ldquo;AS IS&rdquo; and &ldquo;AS AVAILABLE&rdquo; basis. EHCO makes no representations or warranties of any kind,
                        express or implied, as to the operation of the Service, or the information, content, materials, or products included on the Service.
                    </p>
                    <p className="mb-6 text-gray-700 dark:text-gray-300">
                        To the fullest extent permitted by applicable law, EHCO disclaims all warranties, express or implied,
                        including but not limited to implied warranties of merchantability and fitness for a particular purpose.
                        EHCO does not warrant that the Service, its servers, or e-mails sent from EHCO are free of viruses or other harmful components.
                    </p>


                    <h2 className="text-xl font-bold text-key-color mt-8 mb-4">13. Limitation of Liability</h2>
                    <p className="mb-6 text-gray-700 dark:text-gray-300">
                        In no event shall EHCO, its affiliates, or their licensors, service providers, employees, agents, officers, or directors
                        be liable for damages of any kind, under any legal theory, arising out of or in connection with your use,
                        or inability to use, the Service, including any direct, indirect, special, incidental, consequential, or punitive damages,
                        including but not limited to, personal injury, pain and suffering, emotional distress, loss of revenue, loss of profits,
                        loss of business or anticipated savings, loss of use, loss of goodwill, loss of data,
                        and whether caused by tort (including negligence), breach of contract, or otherwise,
                        even if foreseeable, and even if EHCO has been advised of the possibility of such damages.
                    </p>


                    <h2 className="text-xl font-bold text-key-color mt-8 mb-4">14. Governing Law and Dispute Resolution</h2>
                    <p className="mb-4 text-gray-700 dark:text-gray-300">
                        These ToS and your use of the Service shall be governed by and construed in accordance with the laws of [Insert Jurisdiction],
                        without regard to its conflict of law provisions.
                    </p>
                    <p className="mb-6 text-gray-700 dark:text-gray-300">
                        Any disputes arising out of or relating to these ToS or your use of the Service shall be resolved through [Insert dispute resolution method,
                        e.g., binding arbitration in accordance with the rules of (specific arbitration body), or litigation in the courts of (specific jurisdiction)].
                    </p>


                    <h2 className="text-xl font-bold text-key-color mt-8 mb-4">15. Entire Agreement and Severability</h2>
                    <p className="mb-4 text-gray-700 dark:text-gray-300">
                        These ToS, together with the Copyright and Attribution Policy and our Privacy Policy,
                        constitute the entire agreement between you and EHCO regarding your use of the Service and supersede all prior or contemporaneous
                        understandings and agreements, whether written or oral, regarding the Service.
                    </p>
                    <p className="mb-6 text-gray-700 dark:text-gray-300">
                        If any provision of these ToS is deemed invalid, illegal, or unenforceable by a court of competent jurisdiction,
                        the remaining provisions shall continue in full force and effect.
                    </p>


                    <h2 className="text-xl font-bold text-key-color mt-8 mb-4">16. Contact Us</h2>
                    <p className="mb-6 text-gray-700 dark:text-gray-300">
                        If you have any questions about these Terms of Service, please contact us at: <br />
                        Email: <span className="underline">info@ehco.com</span>
                    </p>


                    <hr id="ads" className="border-gray-300 dark:border-gray-700" />

                    {/* Ad Banner - Responsive (728x90 desktop, 468x60 mobile) */}
                    <div className="py-8 -mx-4 px-4 overflow-hidden">
                        <AdBannerResponsive
                            desktopAdKey="3fa73f7563d87b7c0f5d250844483399"
                            mobileAdKey="30047d82f39b4acbb2048058f41436aa"
                        />
                    </div>

                    <h1 className="text-3xl font-bold text-center mb-8 text-key-color">Copyright and Attribution Policy</h1>

                    <p className="text-gray-600 dark:text-gray-400 mb-8">Last Updated: May 4, 2025</p>

                    <h2 className="text-xl font-bold text-key-color mt-8 mb-4">1. Overview</h2>
                    <p className="mb-6 text-gray-700 dark:text-gray-300">
                        EHCO is committed to respecting intellectual property rights and providing transparent attribution for all third-party content we summarize or reference. This policy outlines how we handle copyrighted material, ensure proper attribution, and comply with relevant laws, including the Digital Millennium Copyright Act (DMCA).
                    </p>


                    <h2 className="text-xl font-bold text-key-color mt-8 mb-4">2. Fair Use and Journalistic Context</h2>
                    <p className="mb-4 text-gray-700 dark:text-gray-300">
                        EHCO operates under the principle of fair use, which permits limited use of copyrighted material without permission from the copyright holder. Specifically, EHCO:
                    </p>
                    <ul className="list-disc ml-6 mb-4 text-gray-700 dark:text-gray-300">
                        <li>Aggregates, summarizes, and contextualizes publicly available news and information</li>
                        <li>Provides transformative value by organizing and presenting facts in structured timelines</li>
                        <li>Focuses on factual reporting, not creative or artistic expression, which strengthens fair use claims</li>
                        <li>Always links back to original sources, promoting user engagement with primary content</li>
                    </ul>
                    <p className="mb-6 text-gray-700 dark:text-gray-300">
                        Our use of excerpts from third-party sources is strictly limited to journalistic purposes, including reporting, commentary, historical documentation, and education. We do not reproduce full articles and always provide proper attribution and linkage to original sources.
                    </p>


                    <h2 className="text-xl font-bold text-key-color mt-8 mb-4">3. Source Attribution and Transparency</h2>
                    <p className="mb-4 text-gray-700 dark:text-gray-300">
                        Every fact, event, or summary presented on EHCO is attributed to the original source. For each reference, we provide:
                    </p>
                    <ul className="list-disc ml-6 mb-6 text-gray-700 dark:text-gray-300">
                        <li>Source name (e.g., news outlet, publication, official statement)</li>
                        <li>Publication date (when available)</li>
                        <li>A direct hyperlink to the original article or source</li>
                    </ul>


                    <h2 className="text-xl font-bold text-key-color mt-8 mb-4">4. User Responsibilities and Permissions</h2>

                    <h3 className="font-bold text-key-color mt-4 mb-4">4.1 Permitted Uses</h3>

                    <p className="mb-4 text-gray-700 dark:text-gray-300">
                        Users may:
                    </p>
                    <ul className="list-disc ml-6 mb-6 text-gray-700 dark:text-gray-300">
                        <li>View content for personal, non-commercial use</li>
                        <li>Share EHCO content via links</li>
                        <li>Quote limited portions with proper attribution</li>
                    </ul>
                    <p className="mb-4 text-gray-700 dark:text-gray-300">
                        Users may not:
                    </p>
                    <ul className="list-disc ml-6 mb-6 text-gray-700 dark:text-gray-300">
                        <li>Scrape or reproduce EHCO&apos;s structured timelines and database</li>
                        <li>Use EHCO content for commercial purposes without explicit permission</li>
                        <li>Create derivative works based on EHCO&apos;s unique content organization</li>
                    </ul>


                    <h2 className="text-xl font-bold text-key-color mt-8 mb-4">5. Defamation, Publicity Rights, and Individual Protections</h2>

                    <h3 className="font-bold text-key-color mt-4 mb-4">5.1 Responsible Reporting and Reputation Protection</h3>

                    <p className="mb-4 text-gray-700 dark:text-gray-300">
                        EHCO is committed to presenting neutral, verifiable information while respecting individuals&apos; rights, including those of public figures. We follow these key principles:
                    </p>
                    <ul className="list-disc ml-6 mb-4 text-gray-700 dark:text-gray-300">
                        <li>No original news creation – We summarize only from reputable sources</li>
                        <li>No sensationalism – Our AI and editors focus on factual representation</li>
                        <li>No defamatory content – We do not knowingly publish false or misleading information</li>
                    </ul>
                    <p className="mb-6 text-gray-700 dark:text-gray-300">
                        If any individual believes that EHCO has presented inaccurate or misleading information, they may contact us for review, and we will take corrective action as necessary.
                    </p>

                    <h3 className="font-bold text-key-color mt-4 mb-4">5.2 Public Figures and Right of Publicity</h3>

                    <p className="mb-4 text-gray-700 dark:text-gray-300">
                        Public figures, including celebrities and high-profile individuals, are frequently covered in media. EHCO:
                    </p>
                    <ul className="list-disc ml-6 mb-4 text-gray-700 dark:text-gray-300">
                        <li>Reports on publicly available information relevant to newsworthy events</li>
                        <li>Does not imply endorsement or commercial affiliation unless explicitly stated</li>
                        <li>Uses images and names only in journalistic and factual contexts</li>
                    </ul>
                    <p className="mb-6 text-gray-700 dark:text-gray-300">
                        We acknowledge that public figures have legitimate concerns over their portrayal in the media.
                        If an individual or their representative has a concern regarding their depiction on EHCO,
                        they may submit a formal request, which we will review in accordance with applicable standards.
                    </p>


                    <h2 className="text-xl font-bold text-key-color mt-8 mb-4">6. DMCA Compliance and Takedown Requests</h2>

                    <h3 className="font-bold text-key-color mt-4 mb-4">6.1 Copyright Infringement Claims</h3>

                    <p className="mb-4 text-gray-700 dark:text-gray-300">
                        EHCO respects intellectual property rights. If you believe that copyrighted material has been improperly used on our platform, you may submit a DMCA takedown request, including:
                    </p>
                    <ul className="list-disc ml-6 mb-6 text-gray-700 dark:text-gray-300">
                        <li>Identification of the copyrighted work</li>
                        <li>Identification of the material claimed to be infringing (URL or other details)</li>
                        <li>Your contact information</li>
                        <li>A statement of good faith belief that the use is unauthorized</li>
                        <li>A statement, under penalty of perjury, that you are authorized to act on behalf of the copyright owner</li>
                    </ul>

                    <h3 className="font-bold text-key-color mt-4 mb-4">6.2 Counter-Notification Procedure</h3>

                    <p className="mb-4 text-gray-700 dark:text-gray-300">
                        If you believe that content was removed in error, you may submit a counter-notification including:
                    </p>
                    <ul className="list-disc ml-6 mb-4 text-gray-700 dark:text-gray-300">
                        <li>Identification of the material removed and its former location</li>
                        <li>Statement under penalty of perjury that the removal was mistaken</li>
                        <li>Your contact information</li>
                        <li>Statement of consent to the jurisdiction of relevant legal authorities</li>
                    </ul>
                    <p className="mb-6 text-gray-700 dark:text-gray-300">
                        DMCA notices and counter-notifications may be sent to: <br />
                        Email: <span className="underline">info@ehco.com</span>
                    </p>


                    <h2 className="text-xl font-bold text-key-color mt-8 mb-4">7. Content Corrections and Accuracy Standards</h2>
                    <p className="mb-4 text-gray-700 dark:text-gray-300">
                        EHCO is committed to accuracy and accountability. If factual errors are identified:
                    </p>
                    <ul className="list-disc ml-6 mb-6 text-gray-700 dark:text-gray-300">
                        <li>Corrections will be issued and timestamped</li>
                        <li>Historical changes will be transparently logged</li>
                        <li>Users can report inaccuracies via <span className="underline">info@ehco.com</span></li>
                    </ul>


                    <h2 className="text-xl font-bold text-key-color mt-8 mb-4">8. General Disclaimer</h2>
                    <p className="mb-4 text-gray-700 dark:text-gray-300">
                        Informational Purposes Only: All content on EHCO is provided for informational purposes only and does not constitute legal, financial, or personal advice. Users should consult professionals for guidance related to their specific circumstances.
                    </p>
                    <p className="mb-4 text-gray-700 dark:text-gray-300">
                        Liability Limitation: EHCO assumes no liability for decisions made based on the information presented on our platform. While we strive for accuracy, users acknowledge that news evolves, and updates may occur over time.
                    </p>
                    <p className="mb-6 text-gray-700 dark:text-gray-300">
                        No Endorsement: Any references to third parties, including sources, public figures, or advertisers, do not constitute an endorsement or affiliation unless explicitly stated.
                    </p>


                    <h2 className="text-xl font-bold text-key-color mt-8 mb-4">9. Policy Updates and Contact Information</h2>
                    <p className="mb-4 text-gray-700 dark:text-gray-300">
                        EHCO reserves the right to update this policy periodically. The latest version will be posted on this page. Continued use of our platform constitutes acceptance of any modifications.
                    </p>
                    <p className="mb-6 text-gray-700 dark:text-gray-300">
                        For inquiries, please contact us at: <br />
                        Email: <span className="underline">info@ehco.com</span>
                    </p>

                    <p className="text-center text-gray-500 dark:text-gray-400 mt-12">© EHCO 2025</p>
                </div>
            </div>
        </div>
    );
}