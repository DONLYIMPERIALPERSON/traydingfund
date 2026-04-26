import Hero from "../components/Hero";
import Pricing from "../components/Pricing";
import TrustHighlights from "../components/TrustHighlights";
import CTA from "../components/CTA";
import FAQ from "../components/FAQ";
import { useEffect } from "react";
import { ArrowRightIcon } from 'lucide-react';

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
                <section className="px-4 py-8 md:py-10">
                    <div className="mx-auto max-w-6xl rounded-[2rem] border border-[#7fe7f7]/20 bg-gradient-to-r from-[#0c2f39] via-[#0b2530] to-[#071c22] p-6 shadow-[0_20px_70px_rgba(0,0,0,0.22)] md:p-8">
                        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                            <div className="max-w-3xl">
                                <span className="inline-flex items-center rounded-full border border-[#7fe7f7]/30 bg-[#7fe7f7]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-[#7fe7f7]">
                                    New
                                </span>
                                <h2 className="mt-4 text-2xl font-bold text-white md:text-4xl">
                                    Start Trading Instantly with the NGN Breezy Accounts.
                                </h2>
                                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/72 md:text-base">
                                    No Challenges. No daily drawdown. Just trade freely and earn up to 100% of your profits. A flexible modal designed for disciplined traders who want real payouts without pressure.
                                </p>
                            </div>

                            <a
                                href="/breezy-accounts"
                                className="inline-flex items-center justify-center gap-2 self-start rounded-full bg-white px-6 py-3 text-sm font-semibold text-black transition hover:bg-gray-100 md:self-center"
                            >
                                See Breezy Accounts
                                <ArrowRightIcon className="size-4" />
                            </a>
                        </div>
                    </div>
                </section>
                <Pricing />
                <TrustHighlights />
                <FAQ limit={3} showReadMore />
                <CTA />
            </div>
        </main>
    )
}
