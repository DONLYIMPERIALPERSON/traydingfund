import { ArrowRightIcon, PlayIcon, ZapIcon, CheckIcon } from 'lucide-react';
import { PrimaryButton, GhostButton } from './Buttons';
import { useEffect, useState } from 'react';

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
        '/hero1.png',
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
                        <div className="mx-auto w-full max-w-lg">
                            <div className="rounded-3xl overflow-hidden border border-white/6 shadow-2xl bg-linear-to-b from-yellow-300/35 via-yellow-300/10 to-transparent">
                                <div className="relative aspect-16/10 bg-linear-to-br from-yellow-300/30 via-yellow-300/15 to-black/40">
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