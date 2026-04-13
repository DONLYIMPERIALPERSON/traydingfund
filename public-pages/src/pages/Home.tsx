import Hero from "../components/Hero";
import Pricing from "../components/Pricing";
import TrustHighlights from "../components/TrustHighlights";
import CTA from "../components/CTA";
import FAQ from "../components/FAQ";
import { useEffect } from "react";

export default function Home() {
    useEffect(() => {
        // Handle hash navigation after component mounts
        const hash = window.location.hash;
        if (hash) {
            const sectionId = hash.substring(1); // Remove the '#'
            // Small delay to ensure DOM is fully rendered
            setTimeout(() => {
                const element = document.getElementById(sectionId);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth' });
                }
            }, 100);
        }
    }, []);

    return (
        <main className="relative overflow-hidden">
            <div className="pointer-events-none absolute inset-0">
                <div className="absolute inset-x-0 top-0 h-[30rem] bg-[radial-gradient(circle_at_top,rgba(8,128,149,0.22),transparent_66%)]" />
                <div className="absolute left-[-10rem] top-24 h-[24rem] w-[24rem] rounded-full bg-cyan-500/10 blur-3xl" />
                <div className="absolute right-[-8rem] top-[22rem] h-[22rem] w-[22rem] rounded-full bg-teal-400/10 blur-3xl" />
                <div className="absolute inset-x-0 bottom-0 h-[26rem] bg-[linear-gradient(180deg,transparent,rgba(3,20,26,0.16),rgba(2,12,16,0.34))]" />
            </div>

            <div className="relative z-10">
                <Hero />
                <Pricing />
                <TrustHighlights />
                <FAQ limit={3} showReadMore />
                <CTA />
            </div>
        </main>
    )
}
