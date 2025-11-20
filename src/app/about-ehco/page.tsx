import { Metadata } from 'next';
import AboutPageContent from './about-page-content';

export const metadata: Metadata = {
    title: 'Understanding Over Judgment | About EHCO',
    description: "Discover EHCO's mission to provide verified, real-time facts and timelines for Korean celebrities. Learn more about your trusted source for K-entertainment news.",
};

export default function AboutPage() {
    return <AboutPageContent />;
}