import Title from './Title';
import { plansData } from '../assets/dummy-data';
import { Clock3, Layers, Percent, ShieldAlert, Target, TrendingUp } from 'lucide-react';
import { PrimaryButton } from './Buttons';
import { useEffect, useRef, useState } from 'react';

const BACKEND_BASE_URL = import.meta.env.VITE_BACKEND_URL;
const CHALLENGE_CONFIG_CACHE_KEY = 'nairatrader_public_challenge_config_v1';
const CHALLENGE_CONFIG_CACHE_TTL_MS = 1000 * 60 * 15; // 15 minutes

type ApiChallengePlan = {
    id: string;
    name: string;
    price: string;
    max_drawdown: string;
    profit_target: string;
    phases: string;
    min_trading_days: string;
    profit_split: string;
    profit_cap: string;
    payout_frequency: string;
    status: 'Available' | 'Paused';
    enabled: boolean;
};

type UiPlan = {
    id: string;
    name: string;
    price: string;
    desc: string;
    features: string[];
};

const toUiPlan = (plan: ApiChallengePlan): UiPlan => ({
    id: plan.id,
    name: plan.name,
    price: plan.price,
    desc: plan.status === 'Paused' || !plan.enabled ? 'MT5 Account (Paused)' : 'MT5 Account',
    features: [
        `Max Drawdown: ${plan.max_drawdown}`,
        `Profit Target: ${plan.profit_target}`,
        `Phases: ${plan.phases}`,
        `Min. Trading Days: ${plan.min_trading_days}`,
        `Profit Split: ${plan.profit_split}`,
        `Profit Cap: ${plan.profit_cap}`,
        '24hr Payout',
        `Status: ${plan.status}`,
    ],
});

const toZeroUiPlan = (plan: { id: string; name: string }): UiPlan => ({
    id: plan.id,
    name: plan.name,
    price: '₦0',
    desc: 'MT5 Account',
    features: [
        'Max Drawdown: 0%',
        'Profit Target: 0%',
        'Phases: 0',
        'Min. Trading Days: 0',
        'Profit Split: 0%',
        'Profit Cap: 0%',
        '24hr Payout',
        'Status: Available',
    ],
});

const zeroPlansFromFallback: UiPlan[] = plansData
    .filter((plan) => !plan.desc.toLowerCase().includes('paused')
        && !plan.features.some((item) => item.toLowerCase().includes('status: paused')))
    .map((plan) => toZeroUiPlan({ id: plan.id, name: plan.name }));

type CachedChallengeConfig = {
    timestamp: number;
    plans: ApiChallengePlan[];
};

export default function Pricing() {
    const [plans, setPlans] = useState<UiPlan[]>(zeroPlansFromFallback);
    const mobileCardsContainerRef = useRef<HTMLDivElement | null>(null);
    const mobileCardRefs = useRef<Record<string, HTMLDivElement | null>>({});
    const [activeMobileTab, setActiveMobileTab] = useState(plansData[0]?.id ?? '');

    useEffect(() => {
        let mounted = true;

        const readFreshCache = (): ApiChallengePlan[] | null => {
            try {
                const raw = localStorage.getItem(CHALLENGE_CONFIG_CACHE_KEY);
                if (!raw) return null;

                const cached = JSON.parse(raw) as CachedChallengeConfig;
                if (!cached?.timestamp || !Array.isArray(cached?.plans)) return null;

                const isFresh = Date.now() - cached.timestamp < CHALLENGE_CONFIG_CACHE_TTL_MS;
                return isFresh ? cached.plans : null;
            } catch {
                return null;
            }
        };

        const writeCache = (nextPlans: ApiChallengePlan[]) => {
            try {
                const payload: CachedChallengeConfig = {
                    timestamp: Date.now(),
                    plans: nextPlans,
                };
                localStorage.setItem(CHALLENGE_CONFIG_CACHE_KEY, JSON.stringify(payload));
            } catch {
                // ignore cache write errors
            }
        };

        const normalizePublicPlans = (apiPlans: ApiChallengePlan[]): UiPlan[] => (
            apiPlans
                .map(toUiPlan)
                .filter((plan) => !plan.desc.toLowerCase().includes('paused')
                    && !plan.features.some((item) => item.toLowerCase().includes('status: paused')))
        );

        const cachedPlans = readFreshCache();
        if (cachedPlans && cachedPlans.length > 0) {
            const normalizedCached = normalizePublicPlans(cachedPlans);
            setPlans(normalizedCached.length > 0 ? normalizedCached : zeroPlansFromFallback);
            setActiveMobileTab(normalizedCached[0]?.id || zeroPlansFromFallback[0]?.id || '');
            return () => {
                mounted = false;
            };
        }

        const loadChallengeConfig = async () => {
            if (!BACKEND_BASE_URL) return;
            try {
                const response = await fetch(`${BACKEND_BASE_URL}/public/challenges/config`, { cache: 'no-store' });
                if (!response.ok) return;
                const payload = (await response.json()) as { plans?: ApiChallengePlan[] };
                if (!mounted || !payload.plans || payload.plans.length === 0) return;

                writeCache(payload.plans);

                const normalized = normalizePublicPlans(payload.plans);

                setPlans(normalized);
                setActiveMobileTab(normalized[0]?.id || '');
            } catch {
                // keep bundled fallback data if backend is unavailable
            }
        };

        void loadChallengeConfig();
        return () => {
            mounted = false;
        };
    }, []);

    const getFeatureValue = (features: string[], key: string, fallback = '-') => {
        const found = features.find((item) => item.startsWith(`${key}:`));
        if (!found) return fallback;
        return found.split(':').slice(1).join(':').trim() || fallback;
    };

    const getTabLabel = (name: string) => name.replace(/account/i, '').replace('₦', '').trim();

    const scrollToMobileCard = (planId: string) => {
        const target = mobileCardRefs.current[planId];
        if (!target) return;
        setActiveMobileTab(planId);
        target.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' });
    };

    const handleMobileCardsScroll = () => {
        const container = mobileCardsContainerRef.current;
        if (!container) return;

        let closestId = activeMobileTab;
        let minDistance = Number.POSITIVE_INFINITY;

        plans.forEach((plan) => {
            const el = mobileCardRefs.current[plan.id];
            if (!el) return;
            const distance = Math.abs(el.offsetLeft - container.scrollLeft);
            if (distance < minDistance) {
                minDistance = distance;
                closestId = plan.id;
            }
        });

        if (closestId && closestId !== activeMobileTab) {
            setActiveMobileTab(closestId);
        }
    };

    const getStatus = (plan: { desc: string; features: string[] }) => {
        const hasPausedTag = plan.desc.toLowerCase().includes('paused')
            || plan.features.some((item) => item.toLowerCase().includes('status: paused'));
        return hasPausedTag ? 'Paused' : 'Available';
    };

    const tableRows = [
        {
            label: 'Max DD',
            icon: ShieldAlert,
            getValue: (plan: { features: string[] }) => getFeatureValue(plan.features, 'Max Drawdown'),
        },
        {
            label: 'Target',
            icon: Target,
            getValue: (plan: { features: string[] }) => getFeatureValue(plan.features, 'Profit Target'),
        },
        {
            label: 'Phases',
            icon: Layers,
            getValue: (plan: { features: string[] }) => getFeatureValue(plan.features, 'Phases'),
        },
        {
            label: 'Profit Split',
            icon: Percent,
            getValue: (plan: { features: string[] }) => getFeatureValue(plan.features, 'Profit Split'),
        },
        {
            label: 'Profit Cap',
            icon: TrendingUp,
            getValue: (plan: { features: string[] }) => getFeatureValue(plan.features, 'Profit Cap'),
        },
        {
            label: 'Payout',
            icon: Clock3,
            getValue: () => '24hr',
        },
    ];

    const getMobileRows = (plan: { features: string[] }) => ([
        { label: 'Max DD', icon: ShieldAlert, value: getFeatureValue(plan.features, 'Max Drawdown') },
        { label: 'Target', icon: Target, value: getFeatureValue(plan.features, 'Profit Target') },
        { label: 'Phases', icon: Layers, value: getFeatureValue(plan.features, 'Phases') },
        { label: 'Profit Split', icon: Percent, value: getFeatureValue(plan.features, 'Profit Split') },
        { label: 'Profit Cap', icon: TrendingUp, value: getFeatureValue(plan.features, 'Profit Cap') },
        { label: 'Payout', icon: Clock3, value: '24hr' },
    ]);

    return (
        <section id="pricing" className="py-20 bg-white/3 border-t border-white/6">
            <div className="w-full px-4">
                <Title
                    title="Trading"
                    heading="Choose Your NairaTrader Challenge"
                    description="Complete our Trading Objectives to become eligible to gain your Funded Account."
                />

                <div className="md:hidden flex items-center gap-2 overflow-x-auto pb-3 mb-1">
                    {plans.map((plan) => (
                        <button
                            key={`${plan.id}-tab`}
                            onClick={() => scrollToMobileCard(plan.id)}
                            className={`shrink-0 px-4 py-2 rounded-full text-sm font-semibold border backdrop-blur-md transition ${
                                activeMobileTab === plan.id
                                    ? 'text-black bg-yellow-300 border-yellow-300 shadow-[0_0_12px_rgba(250,204,21,0.45)]'
                                    : 'text-white bg-white/10 border-white/20 hover:bg-white/20'
                            }`}
                        >
                            {getTabLabel(plan.name)}
                        </button>
                    ))}
                </div>

                <div>
                    <div className="hidden md:flex gap-3 overflow-x-auto pb-2 justify-center">
                        {plans.map((plan) => {
                            const status = getStatus(plan);
                            return (
                                <div key={plan.id} className="min-w-[220px] shrink-0">
                                    <div className="relative rounded-2xl border border-white/20 bg-white/10 backdrop-blur-md p-4 min-h-[390px] shadow-[0_0_24px_rgba(255,255,255,0.08)] overflow-hidden transition duration-300 hover:-translate-y-1 hover:shadow-[0_0_30px_rgba(250,204,21,0.2)]">
                                        <div className="absolute -top-8 -right-8 h-20 w-20 rounded-full bg-yellow-300/10 blur-xl" />
                                        <div className="relative flex items-center justify-between mb-4">
                                            <div className="font-bold text-white text-[15px]">{plan.name}</div>
                                            <div className="text-yellow-300 font-extrabold text-base">{plan.price}</div>
                                        </div>

                                        <div className="space-y-2.5">
                                            {tableRows.map((row) => (
                                                <div
                                                    key={`${plan.id}-${row.label}`}
                                                    className="flex items-center justify-between rounded-lg bg-white/8 border border-white/12 px-3 py-2.5"
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <row.icon className="w-4 h-4 text-yellow-300" />
                                                        <span className="text-white font-semibold text-sm">{row.label}</span>
                                                    </div>
                                                    <div className="text-sm font-bold text-gray-100">
                                                        {row.getValue(plan)}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <a href="https://app.nairatrader.com" className="block w-full mt-2">
                                        <button className="w-full text-sm py-2.5 font-bold text-black bg-yellow-300 hover:bg-yellow-400 rounded-full transition-all" disabled={status === 'Paused'}>
                                            {status === 'Paused' ? 'Paused' : 'Start Now'}
                                        </button>
                                    </a>
                                </div>
                            );
                        })}
                    </div>

                    <div ref={mobileCardsContainerRef} onScroll={handleMobileCardsScroll} className="md:hidden flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory">
                        {plans.map((plan) => {
                            const status = getStatus(plan);
                            const mobileRows = getMobileRows(plan);
                            return (
                                <div
                                    key={plan.id}
                                    className="min-w-[280px] shrink-0 snap-start"
                                    ref={(el) => {
                                        mobileCardRefs.current[plan.id] = el;
                                    }}
                                >
                                    <div className="rounded-xl border border-white/20 bg-white/10 backdrop-blur-md p-4 min-h-[330px] shadow-[0_0_18px_rgba(255,255,255,0.06)]">
                                        <div className="flex items-center justify-between mb-4">
                                            <h4 className="font-semibold text-white text-base">{plan.name}</h4>
                                            <span className="text-yellow-300 font-semibold text-base">{plan.price}</span>
                                        </div>
                                        <div className="space-y-2.5">
                                            {mobileRows.map((item) => (
                                                <div key={`${plan.id}-${item.label}`} className="flex items-center justify-between rounded-lg bg-white/6 border border-white/10 px-3 py-2.5">
                                                    <span className="text-gray-300 text-sm flex items-center gap-2">
                                                        <item.icon className="w-4 h-4 text-yellow-300" />
                                                        {item.label}
                                                    </span>
                                                    <span className="text-sm font-semibold text-white">
                                                        {item.value}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <a href="https://app.nairatrader.com" className="block w-full mt-2">
                                        <button className="w-full text-xs py-2 text-black bg-yellow-300 hover:bg-yellow-400 rounded-full transition-all" disabled={status === 'Paused'}>
                                            {status === 'Paused' ? 'Paused' : 'Start Now'}
                                        </button>
                                    </a>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </section>
    );
}
