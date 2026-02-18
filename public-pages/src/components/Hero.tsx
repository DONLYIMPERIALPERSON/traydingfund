import { ArrowRightIcon, PlayIcon, ZapIcon, CheckIcon } from 'lucide-react';
import { PrimaryButton, GhostButton } from './Buttons';

export default function Hero() {

    const trustedUserImages = [
        '/trusted-user-images/09527d0d-f2d0-45f4-8610-1e81ef095a6b.jpg',
        '/trusted-user-images/9720027.jpg',
        '/trusted-user-images/11475208.jpg'
    ];

    const heroImages = [
        '/hero1.png',
        '/hero2.png',
        '/hero3.png',
    ];

    const trustedLogosText = [
        'Rewards',
        'Advanced Support',
        'Tools & Servics'
    ];

    return (
        <>
            <section id="home" className="relative z-10">
                <div className="max-w-6xl mx-auto px-4 min-h-screen md:min-h-[74vh] max-md:w-screen max-md:overflow-hidden pt-32 md:pt-32 flex items-center md:items-start justify-center">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
                        <div className="text-left">
                            <a href="https://prebuiltui.com/tailwind-templates?ref=pixel-forge" className="inline-flex items-center gap-3 pl-3 pr-4 py-1.5 rounded-full bg-white/10 mb-6 justify-start">
                                <div className="flex -space-x-2">
                                    {trustedUserImages.map((src, i) => (
                                        <img
                                            key={i}
                                            src={src}
                                            alt={`Client ${i + 1}`}
                                            className="size-6 rounded-full border border-black/50"
                                            width={40}
                                            height={40}
                                        />
                                    ))}
                                </div>
                                <span className="text-xs text-gray-200/90">
                                    Trusted by 50,000+ Traders
                                </span>
                            </a>

                            <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-6 max-w-xl">
                                Over ₦1Billion <br />
                                <span className="bg-clip-text text-transparent bg-linear-to-r from-yellow-300 to-yellow-500">
                                    Paid Out
                                </span>
                            </h1>

                            <p className="text-gray-300 max-w-lg mb-8">
                                Get funded with the <br />
                                first naira based prop firm
                            </p>

                            <div className="flex flex-col sm:flex-row items-center gap-4 mb-8">
                                <a href="/#pricing" className="w-full sm:w-auto">
                                    <PrimaryButton className="max-sm:w-full py-3 px-7">
                                        Start a Challenge
                                        <ArrowRightIcon className="size-4" />
                                    </PrimaryButton>
                                </a>

                                <a href="/#how-it-works" className="w-full sm:w-auto">
                                    <GhostButton className="max-sm:w-full max-sm:justify-center py-3 px-5">
                                        <PlayIcon className="size-4" />
                                        How it works
                                    </GhostButton>
                                </a>
                            </div>

                            <div className="flex sm:inline-flex overflow-hidden items-center max-sm:justify-center text-sm text-gray-200 bg-white/10 rounded">
                                <div className="flex items-center gap-2 p-2 px-3 sm:px-6.5 hover:bg-white/3 transition-colors">
                                    <ZapIcon className="size-4 text-yellow-400" />
                                    <div>
                                        <div>Paid this month</div>
                                        <div className="text-xs text-gray-400">
                                            ₦97,994,480
                                        </div>
                                    </div>
                                </div>

                                <div className="hidden sm:block h-6 w-px bg-white/6" />

                                <div className="flex items-center gap-2 p-2 px-3 sm:px-6.5 hover:bg-white/3 transition-colors">
                                    <CheckIcon className="size-4 text-yellow-400" />
                                    <div>
                                        <div>Paid today</div>
                                        <div className="text-xs text-gray-400">
                                            ₦11,551,014
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right: modern mockup card */}
                        <div className="mx-auto w-full max-w-lg">
                            <div className="rounded-3xl overflow-hidden border border-white/6 shadow-2xl bg-linear-to-b from-yellow-400/35 via-yellow-300/10 to-transparent">
                                <div className="relative aspect-16/10 bg-linear-to-br from-yellow-500/30 via-yellow-400/15 to-black/40">
                                    <img
                                        src={heroImages[0]}
                                        alt="Hero visual"
                                        className="w-full h-full object-cover object-center"
                                    />

                                    <div className="absolute left-4 top-4 px-3 py-1 rounded-full bg-black/15 backdrop-blur-sm text-xs">
                                        Fast Payouts • Easy Rules • Growth
                                    </div>

                                    <div className="absolute right-4 bottom-4">
                                        <button className="inline-flex items-center gap-2 rounded-full px-4 py-2 bg-white/6 backdrop-blur-sm hover:bg-white/10 transition focus:outline-none">
                                            <PlayIcon className="size-4" />
                                            <span className="text-xs">Start a challenge</span>
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-4 flex gap-3 items-center justify-start flex-wrap">
                                {heroImages.slice(1).map((src, i) => (
                                    <div
                                        key={i}
                                        className="w-20 h-12 rounded-lg overflow-hidden border border-white/10"
                                    >
                                        <img
                                            src={src}
                                            alt={`hero-thumbnail-${i + 1}`}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                ))}
                                <div className="text-sm text-gray-400 ml-2 flex items-center gap-2">
                                    <div className="relative flex h-3.5 w-3.5 items-center justify-center">
                                        <span className="absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75 animate-ping duration-300" />

                                        <span className="relative inline-flex size-2 rounded-full bg-yellow-500" />
                                    </div>
                                    Built for Naira traders and fast funded growth
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* LOGO MARQUEE */}
            <section className="border-y border-white/6 bg-white/1 max-md:mt-10">
                <div className="max-w-6xl mx-auto px-6">
                    <div className="w-full overflow-hidden py-6">
                        <div className="flex gap-14 items-center justify-center animate-marquee whitespace-nowrap">
                            {trustedLogosText.concat(trustedLogosText).map((logo, i) => (
                                <span
                                    key={i}
                                    className="mx-6 inline-flex items-center gap-2 text-sm md:text-base font-semibold text-gray-400 hover:text-gray-300 tracking-wide transition-colors"
                                >
                                    <span className="inline-block size-2 rounded-full bg-yellow-400" />
                                    {logo}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            </section>
        </>
    );
};