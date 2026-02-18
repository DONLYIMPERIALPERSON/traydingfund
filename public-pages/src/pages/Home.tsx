import Hero from "../components/Hero";
import Features from "../components/Features";
import Pricing from "../components/Pricing";
import TrustHighlights from "../components/TrustHighlights";
import CTA from "../components/CTA";

export default function Home() {
    return (
        <>
            <Hero />
            <Features />
            <Pricing />
            <TrustHighlights />
            <CTA />
        </>
    )
}