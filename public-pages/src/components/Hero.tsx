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

                @keyframes pulseLine {
                    0%, 100% {
                        opacity: 0.45;
                        transform: scaleX(0.94);
                    }
                    50% {
                        opacity: 0.95;
                        transform: scaleX(1);
                    }
                }
            `}</style>
            <section id="home" className="relative z-10">
                <div className="pointer-events-none absolute inset-x-0 top-20 md:top-28 mx-auto flex max-w-6xl flex-col gap-6 px-6 opacity-95">
                    <div
                        className="h-px w-40 md:w-64 bg-linear-to-r from-transparent via-[#ffd700] to-transparent shadow-[0_0_18px_rgba(255,215,0,0.55)]"
                        style={{ animation: 'pulseLine 5s ease-in-out infinite' }}
                    />
                    <div className="flex justify-end">
                        <div
                            className="h-px w-32 md:w-52 bg-linear-to-r from-transparent via-white/90 to-transparent shadow-[0_0_16px_rgba(255,255,255,0.35)]"
                            style={{ animation: 'pulseLine 6.5s ease-in-out infinite 0.8s' }}
                        />
                    </div>
                    <div
                        className="ml-8 md:ml-16 h-px w-24 md:w-40 bg-linear-to-r from-transparent via-[#00c2df] to-transparent shadow-[0_0_16px_rgba(0,194,223,0.45)]"
                        style={{ animation: 'pulseLine 5.8s ease-in-out infinite 1.2s' }}
                    />
                </div>

                <div className="pointer-events-none absolute inset-x-0 top-1/2 mx-auto hidden max-w-6xl -translate-y-1/2 justify-between px-4 md:flex opacity-90">
                    <div className="space-y-4">
                        <div
                            className="h-px w-16 bg-linear-to-r from-transparent via-[#ffd700] to-transparent shadow-[0_0_16px_rgba(255,215,0,0.5)]"
                            style={{ animation: 'pulseLine 4.8s ease-in-out infinite 0.2s' }}
                        />
                        <div
                            className="ml-6 h-px w-24 bg-linear-to-r from-transparent via-white/90 to-transparent shadow-[0_0_14px_rgba(255,255,255,0.3)]"
                            style={{ animation: 'pulseLine 6s ease-in-out infinite 1s' }}
                        />
                    </div>
                    <div className="space-y-4 pt-10">
                        <div
                            className="ml-auto h-px w-24 bg-linear-to-r from-transparent via-[#00c2df] to-transparent shadow-[0_0_14px_rgba(0,194,223,0.35)]"
                            style={{ animation: 'pulseLine 5.4s ease-in-out infinite 0.6s' }}
                        />
                        <div
                            className="ml-auto h-px w-16 bg-linear-to-r from-transparent via-[#ffd700] to-transparent shadow-[0_0_16px_rgba(255,215,0,0.45)]"
                            style={{ animation: 'pulseLine 6.8s ease-in-out infinite 1.3s' }}
                        />
                    </div>
                </div>

                <div className="pointer-events-none absolute inset-x-0 bottom-14 md:bottom-20 mx-auto flex max-w-5xl justify-between px-10 opacity-80">
                    <div
                        className="h-px w-20 md:w-28 bg-linear-to-r from-transparent via-white/85 to-transparent shadow-[0_0_14px_rgba(255,255,255,0.3)]"
                        style={{ animation: 'pulseLine 6.2s ease-in-out infinite 0.4s' }}
                    />
                    <div
                        className="h-px w-32 md:w-44 bg-linear-to-r from-transparent via-[#ffd700] to-transparent shadow-[0_0_18px_rgba(255,215,0,0.5)]"
                        style={{ animation: 'pulseLine 7s ease-in-out infinite 1.4s' }}
                    />
                </div>

                <div className="max-w-5xl mx-auto px-4 min-h-[80vh] md:min-h-[74vh] max-md:w-screen max-md:overflow-hidden pt-20 md:pt-32 flex items-center justify-center">
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
                                    Your Trading Journey
                                </span>
                            </h1>

                            <p className="text-gray-200 text-lg md:text-2xl font-semibold max-w-3xl mb-10">
                                MacheFunded empowers traders with clear objectives, consistent growth, and real rewards as you progress.
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