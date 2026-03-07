import { ArrowRightIcon, PlayIcon } from 'lucide-react';
import { PrimaryButton, GhostButton } from './Buttons';


export default function Hero() {
    const trustedLogosText = [
        {
            title: 'Rewards',
            subtitle: 'Fast and easy rewards withdrawals',
        },
        {
            title: 'Advanced Support',
            subtitle: 'Dedicated support via Live chat, email, or WhatsApp',
        },
        {
            title: 'Tools & Services',
            subtitle: 'Tailored tools & services to support your growth',
        },
        {
            title: 'Free Trial',
            subtitle: 'As many Free Trials as you need',
        },
    ];

    return (
        <>
            <style>{`
                @keyframes floatUp {
                    0% {
                        opacity: 1;
                        transform: translateY(0px) scale(1);
                    }
                    50% {
                        opacity: 0.8;
                        transform: translateY(-20px) scale(1.1);
                    }
                    100% {
                        opacity: 0;
                        transform: translateY(-40px) scale(0.8);
                    }
                }
            `}</style>
            <section id="home" className="relative z-10">
                <div className="max-w-5xl mx-auto px-4 min-h-screen md:min-h-[74vh] max-md:w-screen max-md:overflow-hidden pt-24 md:pt-32 flex items-center justify-center">
                    <div className="flex flex-col items-center text-center gap-10">
                        <div className="flex flex-col items-center text-center">
                            <a href="/#" className="inline-flex items-center px-5 py-2 rounded-full bg-white/10 mb-8 justify-center">
                                <span className="text-sm md:text-base text-gray-200/90 font-semibold tracking-wide">
                                    Modern Prop Trading - Easy Rules
                                </span>
                            </a>

                            <h1 className="text-5xl md:text-7xl font-extrabold leading-tight mb-8 max-w-4xl">
                                Grow &amp; Monetize <br />
                                <span className="bg-clip-text text-transparent bg-linear-to-r from-[#ffd700] to-[#caa200]">
                                    Your Demo Trading
                                </span>
                            </h1>

                            <p className="text-gray-200 text-lg md:text-2xl font-semibold max-w-3xl mb-10">
                                Sharpen your trading skills on our simulated platform and earn real rewards as you progress.
                            </p>

                            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10 w-full">
                                <a href="/#pricing" className="w-full sm:w-auto">
                                    <PrimaryButton className="max-sm:w-full py-4 px-10 text-base md:text-lg">
                                        Start a Challenge
                                        <ArrowRightIcon className="size-4" />
                                    </PrimaryButton>
                                </a>

                                <a href="/#how-it-works" className="w-full sm:w-auto">
                                    <GhostButton className="max-sm:w-full max-sm:justify-center py-4 px-8 text-base md:text-lg">
                                        <PlayIcon className="size-4" />
                                        How it works
                                    </GhostButton>
                                </a>
                            </div>

                        </div>
                    </div>
                </div>
            </section>

            {/* LOGO MARQUEE */}
            <section className="border-y border-white/6 bg-white/1 max-md:mt-4">
                <div className="max-w-6xl mx-auto px-6">
                    <div className="w-full overflow-hidden py-6">
                        <div className="flex gap-14 items-center justify-center animate-marquee whitespace-nowrap">
                            {trustedLogosText.concat(trustedLogosText).map((logo, i) => (
                                <span
                                    key={i}
                                    className="mx-8 inline-flex items-start gap-2 text-left text-base md:text-lg font-semibold text-white tracking-wide transition-colors"
                                >
                                    <span className="inline-block size-2 rounded-full bg-[#ffd700]" />
                                    <span className="flex flex-col">
                                        <span className="font-semibold text-white">
                                            {logo.title}
                                        </span>
                                        <span className="text-sm md:text-base font-medium text-white/85">
                                            {logo.subtitle}
                                        </span>
                                    </span>
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            </section>
        </>
    );
};