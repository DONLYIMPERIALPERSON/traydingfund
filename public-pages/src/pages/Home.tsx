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
        <>
            <Hero />
            <Pricing />
            <TrustHighlights />
            <FAQ limit={3} showReadMore />
            <CTA />
        </>
    )
}
