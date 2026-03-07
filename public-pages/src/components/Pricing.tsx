import { useState } from 'react';

type PricingTier = {
    account: string;
    price: string;
};

type PricingTab = {
    key: 'twoPhase' | 'onePhase' | 'instant';
    label: string;
    tiers: PricingTier[];
    rules: string[];
};

const pricingTabs: PricingTab[] = [
    {
        key: 'twoPhase',
        label: '2 Step',
        tiers: [
            { account: '$2K', price: '$5' },
            { account: '$10K', price: '$29' },
            { account: '$30K', price: '$69' },
            { account: '$50K', price: '$99' },
            { account: '$100K', price: '$179' },
            { account: '$200K', price: '$329' },
        ],
        rules: [
            'Max Drawdown: 15%',
            'Phase 1 Target: 7%',
            'Phase 2 Target: 4%',
            'Profit Split: 80%',
            'Withdrawals: Weekly',
        ],
    },
    {
        key: 'onePhase',
        label: '1 Step',
        tiers: [
            { account: '$2K', price: '$9' },
            { account: '$10K', price: '$49' },
            { account: '$30K', price: '$119' },
            { account: '$50K', price: '$179' },
            { account: '$100K', price: '$299' },
            { account: '$200K', price: '$549' },
        ],
        rules: [
            'Max Drawdown: 15%',
            'Profit Target: 7%',
            'Profit Split: 80%',
            'Withdrawals: Weekly',
        ],
    },
    {
        key: 'instant',
        label: 'Instant Funded',
        tiers: [
            { account: '$2K', price: '$29' },
            { account: '$10K', price: '$99' },
            { account: '$30K', price: '$249' },
            { account: '$50K', price: '$399' },
            { account: '$100K', price: '$699' },
            { account: '$200K', price: '$1299' },
        ],
        rules: [
            'Daily Drawdown: 2%',
            'Max Drawdown: 5%',
            'Profit Split: 50%',
            'Withdrawals: Every 14 days',
        ],
    },
];

export default function Pricing() {
    const [activeTab, setActiveTab] = useState<PricingTab>(pricingTabs[0]);

    return (
        <section id="pricing" className="py-14 md:py-20 bg-white/3 border-t border-white/6">
            <div className="max-w-6xl mx-auto px-4">
                <div className="text-center mb-10">
                    <h2 className="text-2xl md:text-4xl text-white font-semibold">
                        Choose Your TraydingFund Challenge
                    </h2>
                    <p className="text-gray-300 mt-3 max-w-2xl mx-auto">
                        Complete the Trayding Objectives to become eligible to gain your funded Account.
                    </p>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-3 mb-10">
                    {pricingTabs.map((tab) => (
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
                    <h3 className="text-center text-white font-semibold text-lg md:text-2xl mb-6">
                        TRAYDINGFUNDS – ACCOUNT SIZES &amp; PRICING
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {activeTab.tiers.map((tier) => (
                            <div
                                key={`${activeTab.key}-${tier.account}`}
                                className="relative rounded-2xl border border-white/15 bg-gradient-to-b from-white/10 to-white/5 p-6 shadow-[0_0_20px_rgba(255,255,255,0.08)] transition duration-300 hover:-translate-y-1 hover:border-[#ffd700]/40 hover:shadow-[0_0_26px_rgba(250,204,21,0.18)]"
                            >
                                <div className="absolute -top-6 -right-6 h-16 w-16 rounded-full bg-[#ffd700]/10 blur-2xl" />
                                <div className="flex items-center justify-between mb-4">
                                    <div className="text-white text-lg font-semibold">{tier.account}</div>
                                    <div className="text-[#ffd700] text-lg font-bold">{tier.price}</div>
                                </div>
                                <div className="space-y-2 text-sm text-gray-200">
                                    {activeTab.rules.map((rule) => (
                                        <div key={rule} className="flex items-start gap-2">
                                            <span className="text-[#ffd700]">•</span>
                                            <span>{rule}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}