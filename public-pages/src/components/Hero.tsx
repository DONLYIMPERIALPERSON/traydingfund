import { ArrowRightIcon, PlayIcon, ZapIcon, CheckIcon } from 'lucide-react';
import { PrimaryButton, GhostButton } from './Buttons';
import { useEffect, useState, useRef } from 'react';

const BACKEND_BASE_URL = import.meta.env.VITE_BACKEND_URL;

const HERO_STATS_CACHE_KEY = 'nairatrader_public_hero_stats_v1';
const HERO_STATS_CACHE_TTL_MS = 1000 * 60 * 15;

type HeroStats = {
    total_paid_out: string;
    paid_this_month: string;
    paid_today: string;
    trusted_traders: string;
};

const defaultHeroStats: HeroStats = {
    total_paid_out: '1000000000',
    paid_this_month: '97999480',
    paid_today: '11551014',
    trusted_traders: '50000',
};

type CachedHeroStats = {
    timestamp: number;
    stats: HeroStats;
};

const formatNaira = (value: string) => {
    const clean = value.replace(/^₦\s*/i, '').replace(/,/g, '').trim();
    const asNumber = Number(clean);

    if (!Number.isFinite(asNumber)) {
        return `₦${clean || '0'}`;
    }

    const hasDecimal = clean.includes('.');
    const formatted = asNumber.toLocaleString('en-US', {
        minimumFractionDigits: hasDecimal ? 2 : 0,
        maximumFractionDigits: 2,
    });

    return `₦${formatted}`;
};

const formatNairaBillionFriendly = (value: string) => {
    const clean = value.replace(/^₦\s*/i, '').replace(/,/g, '').trim();
    const asNumber = Number(clean);
    if (!Number.isFinite(asNumber)) return formatNaira(value);

    if (asNumber >= 1_000_000_000) {
        const inBillions = asNumber / 1_000_000_000;
        const display = Number.isInteger(inBillions) ? String(inBillions) : inBillions.toFixed(1);
        return `₦${display} Billion`;
    }

    return formatNaira(value);
};

const formatCountWithCommas = (value: string) => {
    const clean = value.replace(/,/g, '').trim();
    const asNumber = Number(clean);
    if (!Number.isFinite(asNumber)) return value;
    return asNumber.toLocaleString('en-US', { maximumFractionDigits: 0 });
};

export default function Hero() {
    const [heroStats, setHeroStats] = useState<HeroStats>(defaultHeroStats);
    const [floatingAmounts, setFloatingAmounts] = useState<Array<{id: number, amount: string, x: number, y: number}>>([]);
    const amountIdRef = useRef(0);

    useEffect(() => {
        const readFreshCache = (): HeroStats | null => {
            try {
                const raw = localStorage.getItem(HERO_STATS_CACHE_KEY);
                if (!raw) return null;

                const cached = JSON.parse(raw) as CachedHeroStats;
                const isFresh = Date.now() - cached.timestamp < HERO_STATS_CACHE_TTL_MS;
                if (!isFresh) return null;
                return cached.stats;
            } catch {
                return null;
            }
        };

        const writeCache = (stats: HeroStats) => {
            try {
                const payload: CachedHeroStats = {
                    timestamp: Date.now(),
                    stats,
                };
                localStorage.setItem(HERO_STATS_CACHE_KEY, JSON.stringify(payload));
            } catch {
                // ignore cache write errors
            }
        };

        const cached = readFreshCache();
        if (cached) {
            setHeroStats(cached);
            return;
        }

        const loadHeroStats = async () => {
            if (!BACKEND_BASE_URL) return;
            try {
                const response = await fetch(`${BACKEND_BASE_URL}/public/hero/stats`, { cache: 'no-store' });
                if (!response.ok) return;
                const payload = (await response.json()) as { stats?: HeroStats };
                if (!payload.stats) return;

                setHeroStats(payload.stats);
                writeCache(payload.stats);
            } catch {
                // keep default zeros on fetch failure
            }
        };

        void loadHeroStats();
    }, []);



    const trustedUserImages = [
        '/trusted-user-images/09527d0d-f2d0-45f4-8610-1e81ef095a6b.jpg',
        '/trusted-user-images/9720027.jpg',
        '/trusted-user-images/11475208.jpg'
    ];

    const heroImages = [
        '/hero2.png',
        '/hero3.png',
    ];

    const trustedLogosText = [
        'Everything Now Instant',
        'No Daily Loss Limit',
        'No KYC wahala',
        'No Consistency Rule',
        '80% Profit Split',
        '60secs Auto Payout Approval'
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
                <div className="max-w-6xl mx-auto px-4 min-h-screen md:min-h-[74vh] max-md:w-screen max-md:overflow-hidden pt-32 md:pt-32 flex items-center md:items-start justify-center">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
                        <div className="text-left">
                            <a href="/#" className="inline-flex items-center gap-3 pl-3 pr-4 py-1.5 rounded-full bg-white/10 mb-6 justify-start">
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
                                    Trusted by {formatCountWithCommas(heroStats.trusted_traders)}+ Traders
                                </span>
                            </a>

                            <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-6 max-w-xl">
                                Over {formatNairaBillionFriendly(heroStats.total_paid_out)} <br />
                                <span className="bg-clip-text text-transparent bg-linear-to-r from-yellow-300 to-yellow-500">
                                    Paid Out
                                </span>
                            </h1>

                            <p className="text-gray-300 max-w-lg mb-8">
                                80% profit split, 1min super-fast auto payout, instant phase activation, and automatic KYC. Join the first Naira Prop Firm now.
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
                                    <ZapIcon className="size-4 text-yellow-300" />
                                    <div>
                                        <div>Paid this month</div>
                                        <div className="text-xs text-gray-400">
                                            {formatNaira(heroStats.paid_this_month)}
                                        </div>
                                    </div>
                                </div>

                                <div className="hidden sm:block h-6 w-px bg-white/6" />

                                <div className="flex items-center gap-2 p-2 px-3 sm:px-6.5 hover:bg-white/3 transition-colors">
                                    <CheckIcon className="size-4 text-yellow-300" />
                                    <div>
                                        <div>Paid today</div>
                                        <div className="text-xs text-gray-400">
                                            {formatNaira(heroStats.paid_today)}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right: modern mockup card */}
                        <div className="mx-auto w-full max-w-xl">
                            <div className="rounded-3xl overflow-hidden border border-white/6 shadow-2xl bg-linear-to-b from-yellow-300/35 via-yellow-300/10 to-transparent">
                                <div className="relative aspect-16/10 bg-linear-to-br from-yellow-300/30 via-yellow-300/15 to-black/40">
                                    <div className="w-full h-full flex items-start relative overflow-hidden pt-8">
                                        {/* Background decorative elements */}
                                        <div className="absolute inset-0 opacity-10">
                                            <div className="absolute top-4 left-4 w-20 h-20 border border-yellow-300/30 rounded-full"></div>
                                            <div className="absolute bottom-4 right-4 w-16 h-16 border border-yellow-300/20 rounded-full"></div>
                                            <div className="absolute top-1/2 left-8 w-2 h-2 bg-yellow-300 rounded-full animate-pulse"></div>
                                            <div className="absolute bottom-8 right-8 w-3 h-3 bg-yellow-300/60 rounded-full animate-pulse delay-300"></div>
                                        </div>

                                        {/* Left side: Main content */}
                                        <div className="flex-1 flex flex-col justify-center items-start pl-8 relative z-10">
                                            {/* Main title with premium styling */}
                                            <div className="mb-6">
                                                <div className="relative">
                                                    <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-yellow-100 to-white mb-2 tracking-wider drop-shadow-lg">
                                                        AZA
                                                    </h2>
                                                    <div className="absolute -inset-2 bg-gradient-to-r from-yellow-400/20 via-yellow-300/10 to-yellow-400/20 rounded-lg blur-xl"></div>
                                                </div>
                                                <h3 className="text-3xl md:text-4xl font-bold text-yellow-300 tracking-widest uppercase">
                                                    shaker
                                                </h3>
                                            </div>

                                            {/* Simplified feature highlights */}
                                            <div className="flex items-center gap-4 md:gap-6 mb-4">
                                                <div className="flex flex-col items-center">
                                                    <div className="w-12 h-12 md:w-14 md:h-14 bg-yellow-300/20 rounded-xl flex items-center justify-center mb-2">
                                                        <ZapIcon className="w-6 h-6 md:w-7 md:h-7 text-yellow-300" />
                                                    </div>
                                                    <span className="text-xs text-white/90 text-center leading-tight">Fast<br/>Payouts</span>
                                                </div>

                                                <div className="flex flex-col items-center">
                                                    <div className="w-12 h-12 md:w-14 md:h-14 bg-yellow-300/20 rounded-xl flex items-center justify-center mb-2">
                                                        <svg className="w-6 h-6 md:w-7 md:h-7 text-yellow-300" fill="currentColor" viewBox="0 0 20 20">
                                                            <path d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z"/>
                                                        </svg>
                                                    </div>
                                                    <span className="text-xs text-white/90 text-center leading-tight">Premium<br/>Tools</span>
                                                </div>

                                                <div className="flex flex-col items-center">
                                                    <div className="w-12 h-12 md:w-14 md:h-14 bg-yellow-300/20 rounded-xl flex items-center justify-center mb-2">
                                                        <CheckIcon className="w-6 h-6 md:w-7 md:h-7 text-yellow-300" />
                                                    </div>
                                                    <span className="text-xs text-white/90 text-center leading-tight">High<br/>Success</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Right side: 3-step process illustration */}
                                        <div className="flex-1 flex flex-col justify-center items-center pr-4 md:pr-8 relative z-10">
                                            <div className="space-y-3 md:space-y-6 w-full max-w-xs">
                                                {/* Step 1 */}
                                                <div className="text-center">
                                                    <div className="text-white font-semibold text-xs md:text-sm mb-1">Start Challenge</div>
                                                    <div className="text-gray-400 text-xs">Choose your account size</div>
                                                </div>

                                                {/* Arrow down */}
                                                <div className="flex justify-center">
                                                    <ArrowRightIcon className="w-3 h-3 md:w-4 md:h-4 text-yellow-300 transform rotate-90" />
                                                </div>

                                                {/* Step 2 */}
                                                <div className="text-center">
                                                    <div className="text-white font-semibold text-xs md:text-sm mb-1">Meet Objectives</div>
                                                    <div className="text-gray-400 text-xs">Hit profit targets</div>
                                                </div>

                                                {/* Arrow down */}
                                                <div className="flex justify-center">
                                                    <ArrowRightIcon className="w-3 h-3 md:w-4 md:h-4 text-yellow-300 transform rotate-90" />
                                                </div>

                                                {/* Step 3 */}
                                                <div className="text-center">
                                                    <div className="text-white font-semibold text-xs md:text-sm mb-1">Get Paid Fast</div>
                                                    <div className="text-gray-400 text-xs">80% profit split in minutes</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>


                                </div>
                            </div>

                            <div className="mt-4 flex gap-3 items-center justify-start flex-wrap">
                                <div className="w-20 h-12 rounded-lg overflow-hidden border border-white/10">
                                    <img
                                        src="/nairatradergroup.jpg"
                                        alt="NairaTrader Group"
                                        className="w-full h-full object-cover object-center transform scale-110"
                                    />
                                </div>
                                <div className="text-sm text-gray-400 ml-2 flex items-center gap-2">
                                    <div className="relative flex h-3.5 w-3.5 items-center justify-center">
                                        <span className="absolute inline-flex h-full w-full rounded-full bg-yellow-300 opacity-75 animate-ping duration-300" />

                                        <span className="relative inline-flex size-2 rounded-full bg-yellow-300" />
                                    </div>
                                    Pioneer of the world's highest 20% max drawdown
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
                                    <span className="inline-block size-2 rounded-full bg-yellow-300" />
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