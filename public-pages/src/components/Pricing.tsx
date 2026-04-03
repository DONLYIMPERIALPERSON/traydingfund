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
};

const usdTwoPhaseRules = [
    'Max Drawdown: 11%',
    'Max Daily Drawdown: 5%',
    'Phase 1 Profit Target: 10%',
    'Phase 2 Profit Target: 5%',
    'Minimum Trading Days: 1',
    'Minimum Trade Duration Rule: 3 mins (3 trades closed under 3 mins breach the account)',
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
            'Minimum Trade Duration Rule: 3 mins (3 trades closed under 3 mins breach the account)',
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
            'Minimum Trade Duration Rule: 3 mins (3 trades closed under 3 mins breach the account)',
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
            'Minimum Trade Duration Rule: 3 mins (3 trades closed under 3 mins breach the account)',
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
];

type CurrencyTab = {
    key: 'usd' | 'ngn';
    label: string;
    tabs: PricingTab[];
};

const currencyTabs: CurrencyTab[] = [
    { key: 'usd', label: 'USD', tabs: usdTabs },
    { key: 'ngn', label: 'NGN', tabs: ngnTabs },
];

export default function Pricing() {
    const [activeCurrency, setActiveCurrency] = useState<CurrencyTab>(currencyTabs[0]);
    const [activeTab, setActiveTab] = useState<PricingTab>(currencyTabs[0].tabs[0]);
    const buyUrl = 'https://trader.machefunded.com/start-challenge';

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const currencyParam = params.get('currency');
        if (currencyParam !== 'ngn') return;
        const ngnCurrency = currencyTabs.find((currency) => currency.key === 'ngn');
        if (!ngnCurrency) return;
        setActiveCurrency(ngnCurrency);
        setActiveTab(ngnCurrency.tabs[0]);
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
                        Choose Your MacheFunded Challenge
                    </h2>
                    <p className="text-gray-300 mt-3 max-w-2xl mx-auto">
                        Complete the Trayding Objectives to become eligible to gain your funded Account.
                    </p>
                </div>

                <div className="flex flex-nowrap items-center justify-center gap-3 mb-6 overflow-x-auto">
                    {currencyTabs.map((currency) => (
                        <button
                            key={currency.key}
                            onClick={() => handleCurrencyChange(currency)}
                            className={`rounded-full border px-8 py-2 text-sm md:text-base font-semibold min-w-[110px] md:min-w-[140px] transition ${
                                activeCurrency.key === currency.key
                                    ? 'border-[#ffd700] bg-[#ffd700] text-black shadow-[0_0_16px_rgba(250,204,21,0.45)]'
                                    : 'border-white/20 bg-white/10 text-white hover:bg-white/20'
                            }`}
                        >
                            {currency.label}
                        </button>
                    ))}
                </div>

                <div className="flex flex-wrap items-center justify-center gap-3 mb-10">
                    {activeCurrency.tabs.map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab)}
                            className={`rounded-full border px-5 py-2 text-sm md:text-base font-semibold transition ${
                                activeTab.key === tab.key
                                    ? 'border-[#ffd700] bg-[#ffd700] text-black shadow-[0_0_16px_rgba(250,204,21,0.45)]'
                                    : 'border-white/20 bg-white/10 text-white hover:bg-white/20'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="rounded-3xl border border-white/10 bg-white/5 p-6 md:p-10">
                    <p className="text-sm font-medium text-[#ffd700] uppercase tracking-wide mb-3 text-center">
                        MACHEFUNDED'S – ACCOUNT SIZES &amp; PRICING
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {activeTab.tiers.map((tier) => (
                            <div
                                key={`${activeTab.key}-${tier.account}`}
                                className="relative rounded-2xl border border-white/15 bg-gradient-to-b from-white/10 to-white/5 p-6 shadow-[0_0_20px_rgba(255,255,255,0.08)] transition duration-300 hover:-translate-y-1 hover:border-[#ffd700]/40 hover:shadow-[0_0_26px_rgba(250,204,21,0.18)]"
                            >
                                {tier.discountBadge && (
                                    <div className="absolute -top-3 left-4 rounded-full bg-[#ffd700] px-3 py-1 text-xs font-semibold text-black">
                                        {tier.discountBadge}
                                    </div>
                                )}
                                <div className="absolute -top-6 -right-6 h-16 w-16 rounded-full bg-[#ffd700]/10 blur-2xl" />
                                <div className="flex items-center justify-between mb-4">
                                    <div className="text-white text-lg font-semibold">{tier.account}</div>
                                    {tier.discountPrice ? (
                                        <div className="text-right">
                                            <div className="text-xs text-white/80 line-through">{tier.originalPrice}</div>
                                            <div className="text-[#ffd700] text-lg font-bold">{tier.discountPrice}</div>
                                        </div>
                                    ) : (
                                        <div className="text-[#ffd700] text-lg font-bold">{tier.price}</div>
                                    )}
                                </div>
                                <div className="space-y-2 text-sm text-gray-200">
                                    {activeTab.rules.map((rule) => (
                                        <div key={rule} className="flex items-start gap-2">
                                            <span className="text-[#ffd700]">•</span>
                                            <span>{rule}</span>
                                        </div>
                                    ))}
                                </div>
                            <a
                                href={buyUrl}
                                className="mt-5 block w-full rounded-xl bg-white py-3 text-center text-sm font-semibold text-black transition hover:bg-gray-100"
                            >
                                Start Now
                            </a>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}