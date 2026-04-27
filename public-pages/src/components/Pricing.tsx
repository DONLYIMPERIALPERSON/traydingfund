import { useEffect, useState } from 'react';

type PricingTier = {
    account: string;
    price: string;
    originalPrice?: string;
    discountPrice?: string;
    discountBadge?: string;
};

type PricingTab = {
    key: string;
    label: string;
    tiers: PricingTier[];
    rules: string[];
    ctaPrefix?: string;
    ctaSuffix?: string;
};

const usdTwoPhaseRules = [
    'Max Drawdown: 11%',
    'Max Daily Drawdown: 5%',
    'Phase 1 Profit Target: 10%',
    'Phase 2 Profit Target: 5%',
    'Minimum Trading Days: 1',
    'Profit Split: 80%',
    'Withdrawals: Weekly',
];

const usdTabs: PricingTab[] = [
    {
        key: 'twoPhase',
        label: '2 Step',
        tiers: [
            { account: '$2,000', price: '$12' },
            { account: '$10,000', price: '$81' },
            { account: '$30,000', price: '$163' },
            { account: '$50,000', price: '$203' },
            { account: '$100,000', price: '$354' },
            { account: '$200,000', price: '$681' },
        ],
        rules: usdTwoPhaseRules,
    },
    {
        key: 'onePhase',
        label: '1 Step',
        tiers: [
            { account: '$2,000', price: '$26' },
            { account: '$10,000', price: '$108' },
            { account: '$30,000', price: '$203' },
            { account: '$50,000', price: '$299' },
            { account: '$100,000', price: '$450' },
            { account: '$200,000', price: '$885' },
        ],
        rules: [
            'Max Drawdown: 11%',
            'Max Daily Drawdown: 5%',
            'Profit Target: 10%',
            'Minimum Trading Days: 1',
            'Profit Split: 80%',
            'Withdrawals: Weekly',
        ],
    },
    {
        key: 'instant',
        label: 'Instant Funded',
        tiers: [
            { account: '$2,000', price: '$53' },
            { account: '$10,000', price: '$163' },
            { account: '$30,000', price: '$381' },
            { account: '$50,000', price: '$612' },
            { account: '$100,000', price: '$1,091' },
            { account: '$200,000', price: '$1,910' },
        ],
        rules: [
            'Max Drawdown: 5%',
            'Max Daily Drawdown: 2%',
            'Minimum Trading Days: 5',
            'Profit Split: 50%',
            'Withdrawals: Bi-weekly',
        ],
    },
];

const ngnTabs: PricingTab[] = [
    {
        key: 'flexi',
        label: 'Flexi Account',
        tiers: [
            { account: '₦200,000', price: '₦9,000' },
            { account: '₦500,000', price: '₦21,000' },
            { account: '₦800,000', price: '₦31,500' },
        ],
        rules: [
            'No Daily Drawdown',
            'Phase 1 Profit Target: 10%',
            'Phase 2 Profit Target: 10%',
            'Max Drawdown: 20%',
            'No Minimum Trading Days',
            'Profit Split: 70%',
            'Withdrawals: Daily',
        ],
    },
    {
        key: 'standard',
        label: 'Standard Account',
        tiers: [
            { account: '₦200,000', price: '₦5,000' },
            { account: '₦500,000', price: '₦11,500' },
            { account: '₦800,000', price: '₦17,000' },
        ],
        rules: usdTwoPhaseRules,
    },
    {
        key: 'breezy',
        label: 'BREEZY Account',
        tiers: [
            { account: '₦200,000', price: '₦7,500' },
            { account: '₦500,000', price: '₦15,000' },
            { account: '₦800,000', price: '₦24,000' },
            { account: '₦1,000,000', price: '₦30,000' },
        ],
        rules: [
            'Challenge: None',
            'Daily DD: None',
            'Max DD: None',
            'Minimum Trades Required: 5',
            'Profit Split: Up to 100%',
            'Withdrawals: On Demand',
        ],
        ctaPrefix: 'Activate Now',
        ctaSuffix: '/Week',
    },
];

type CurrencyTab = {
    key: 'usd' | 'ngn';
    label: string;
    tabs: PricingTab[];
};

const currencyTabs: CurrencyTab[] = [
    { key: 'ngn', label: 'NGN', tabs: ngnTabs },
    { key: 'usd', label: 'USD', tabs: usdTabs },
];

export default function Pricing() {
    const [activeCurrency, setActiveCurrency] = useState<CurrencyTab>(currencyTabs[0]);
    const [activeTab, setActiveTab] = useState<PricingTab>(currencyTabs[0].tabs[0]);
    const buyUrl = 'https://trader.machefunded.com/start-challenge';

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const currencyParam = params.get('currency');
        const tabParam = params.get('tab');

        if (currencyParam === 'ngn') {
            const ngnCurrency = currencyTabs.find((currency) => currency.key === 'ngn');
            if (!ngnCurrency) return;

            setActiveCurrency(ngnCurrency);

            if (tabParam) {
                const requestedTab = ngnCurrency.tabs.find((tab) => tab.key === tabParam);
                setActiveTab(requestedTab ?? ngnCurrency.tabs[0]);
                return;
            }

            setActiveTab(ngnCurrency.tabs[0]);
        }
    }, []);

    const handleCurrencyChange = (currency: CurrencyTab) => {
        setActiveCurrency(currency);
        setActiveTab(currency.tabs[0]);
    };

    return (
        <section id="pricing" className="py-14 md:py-20 bg-white/3 border-t border-white/6">
            <div className="max-w-6xl mx-auto px-4">
                <div className="text-center mb-10">
                    <h2 className="text-2xl md:text-4xl text-white font-semibold">
                        Choose Your MF Challenge
                    </h2>
                    <p className="text-gray-300 mt-3 max-w-2xl mx-auto">
                        Complete MF Trading Objectives to become eligible to gain your demo MF Account.
                    </p>
                </div>

                <div className="mb-6 flex justify-center">
                    <div className="flex w-full max-w-3xl items-center gap-2 rounded-2xl border border-white/14 bg-white/6 p-2 shadow-[0_12px_40px_rgba(0,0,0,0.18)] backdrop-blur-sm">
                    {currencyTabs.map((currency) => (
                        <button
                            key={currency.key}
                            onClick={() => handleCurrencyChange(currency)}
                            className={`group relative flex-1 rounded-xl px-6 py-3 text-sm md:text-base font-semibold transition-all duration-300 ${
                                activeCurrency.key === currency.key
                                    ? 'border border-white/18 bg-linear-to-r from-[#0a2a33] to-[#0f3a46] text-white shadow-[0_12px_30px_rgba(10,42,51,0.38)]'
                                    : 'bg-transparent text-white/75 hover:bg-white/8 hover:text-white'
                            }`}
                        >
                            <span className="flex items-center justify-center gap-2">
                                <span className={`inline-block size-2 rounded-full ${activeCurrency.key === currency.key ? 'bg-[#7fe7f7]' : 'bg-[#0f3a46]'}`} />
                                {currency.label}
                            </span>
                        </button>
                    ))}
                    </div>
                </div>

                <div className="mb-10 flex justify-center">
                    <div className="flex w-full max-w-4xl flex-wrap items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/4 p-3 shadow-[0_12px_34px_rgba(0,0,0,0.14)] backdrop-blur-sm">
                        {activeCurrency.tabs.map((tab) => (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab)}
                                className={`min-w-[160px] rounded-xl border px-5 py-3 text-sm md:text-base font-semibold transition-all duration-300 ${
                                    activeTab.key === tab.key
                                        ? 'border-white/18 bg-linear-to-r from-[#0a2a33] to-[#0f3a46] text-white shadow-[0_12px_28px_rgba(10,42,51,0.34)]'
                                        : 'border-white/10 bg-transparent text-white/80 hover:border-white/16 hover:bg-white/7 hover:text-white'
                                }`}
                            >
                                <span className="flex items-center justify-center gap-2">
                                    <span className={`inline-block size-2 rounded-full ${activeTab.key === tab.key ? 'bg-[#7fe7f7]' : 'bg-white/35'}`} />
                                    {tab.label}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="-mx-2 flex snap-x snap-mandatory gap-4 overflow-x-auto px-2 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-6 sm:overflow-visible sm:px-0 lg:grid-cols-3">
                    {activeTab.tiers.map((tier) => (
                        <div
                            key={`${activeTab.key}-${tier.account}`}
                            className="relative min-w-[85%] snap-center rounded-2xl border border-white/15 bg-gradient-to-b from-white/10 to-white/5 p-6 shadow-[0_0_20px_rgba(255,255,255,0.08)] transition duration-300 hover:-translate-y-1 hover:border-[#ffd700]/40 hover:shadow-[0_0_26px_rgba(250,204,21,0.18)] sm:min-w-0"
                        >
                            {tier.discountBadge && (
                                <div className="absolute -top-3 left-4 rounded-full bg-[#ffd700] px-3 py-1 text-xs font-semibold text-black">
                                    {tier.discountBadge}
                                </div>
                            )}
                            <div className="absolute -top-6 -right-6 h-16 w-16 rounded-full bg-[#ffd700]/10 blur-2xl" />
                            <div className="mb-6 text-center">
                                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/55">
                                    Account
                                </p>
                                <div className="mt-2 text-3xl font-extrabold text-white md:text-4xl">
                                    {tier.account}
                                </div>
                            </div>
                            <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/10">
                                {activeTab.rules.map((rule, index) => {
                                    const [label, ...valueParts] = rule.split(':');
                                    const value = valueParts.join(':').trim();

                                    return (
                                        <div
                                            key={rule}
                                            className={`flex items-center justify-between gap-4 px-4 py-3 text-sm ${index !== activeTab.rules.length - 1 ? 'border-b border-white/8' : ''}`}
                                        >
                                            <span className="text-white/72">{label.trim()}</span>
                                            <span className="text-right font-semibold text-white">
                                                {value || '—'}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                            <a
                                href={buyUrl}
                                className="mt-5 block w-full rounded-xl bg-white py-3 text-center text-sm font-semibold text-black transition hover:bg-gray-100"
                            >
                                {(activeTab.ctaPrefix ?? 'Start Now')} {tier.discountPrice ?? tier.price}{activeTab.ctaSuffix ?? ''}
                            </a>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}