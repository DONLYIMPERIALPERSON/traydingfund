const rulesData = [
    {
        title: '2-Step Challenge — Phase 1',
        items: [
            'Max Drawdown: 11%',
            'Max Daily Drawdown: 5%',
            'Profit Target: 10%',
            'Minimum Trading Days: 1',
            'Minimum Trade Duration Rule: 3 mins (3 trades closed under 3 mins breach the account)',
        ],
    },
    {
        title: '2-Step Challenge — Phase 2',
        items: [
            'Max Drawdown: 11%',
            'Max Daily Drawdown: 5%',
            'Profit Target: 5%',
            'Minimum Trading Days: 1',
            'Minimum Trade Duration Rule: 3 mins (3 trades closed under 3 mins breach the account)',
        ],
    },
    {
        title: '2-Step Challenge — Funded',
        items: [
            'Max Drawdown: 11%',
            'Max Daily Drawdown: 5%',
            'Profit Split: 80%',
            'Withdrawals: Weekly',
            'Minimum Trading Days: 1',
            'Minimum Trade Duration Rule: 3 mins (3 trades closed under 3 mins breach the account)',
        ],
    },
    {
        title: '1-Step Challenge — Phase 1',
        items: [
            'Max Drawdown: 11%',
            'Max Daily Drawdown: 5%',
            'Profit Target: 10%',
            'Minimum Trading Days: 1',
            'Minimum Trade Duration Rule: 3 mins (3 trades closed under 3 mins breach the account)',
        ],
    },
    {
        title: '1-Step Challenge — Funded',
        items: [
            'Max Drawdown: 11%',
            'Max Daily Drawdown: 5%',
            'Profit Split: 80%',
            'Withdrawals: Weekly',
            'Minimum Trading Days: 1',
            'Minimum Trade Duration Rule: 3 mins (3 trades closed under 3 mins breach the account)',
        ],
    },
    {
        title: 'Instant Funded',
        items: [
            'Max Drawdown: 5%',
            'Max Daily Drawdown: 2%',
            'Minimum Trading Days: 5',
            'Minimum Trade Duration Rule: 3 mins (3 trades closed under 3 mins breach the account)',
            'Profit Split: 50%',
            'Withdrawals: Bi-weekly',
        ],
    },
    {
        title: 'NGN Flexi Account',
        items: [
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
        title: 'NGN Standard Account',
        items: [
            'Max Drawdown: 11%',
            'Max Daily Drawdown: 5%',
            'Phase 1 Profit Target: 10%',
            'Phase 2 Profit Target: 5%',
            'Minimum Trading Days: 1',
            'Minimum Trade Duration Rule: 3 mins (3 trades closed under 3 mins breach the account)',
            'Profit Split: 80%',
            'Withdrawals: Weekly',
        ],
    },
];

const prohibitedStrategies = [
    'High-frequency trading (HFT), latency arbitrage, or ultra-fast scalping systems',
    'Opening trades in opposite directions on the same pair at the same time (hedging)',
    'Martingale, grid, or doubling-down position sizing to recover losses',
    'Copy trading or signal mirroring from third-party providers',
    'Using trade manipulation, price feed delays, or broker exploits',
    'Placing trades during major news solely to exploit slippage or spread spikes',
    'Account sharing, trade pooling, or coordinated group trading',
];

export default function Rules() {
    return (
        <section id="rules" className="py-14 md:py-20 border-t border-white/6 bg-white/2">
            <div className="max-w-6xl mx-auto px-4">
                <div className="text-center mb-10">
                    <p className="text-sm font-medium text-[#ffd700] uppercase tracking-wide mb-3">Trading Objectives</p>
                    <h2 className="text-2xl md:text-4xl text-white font-semibold">
                        Trading objectives that match your challenge
                    </h2>
                    <p className="text-gray-300 mt-3 max-w-2xl mx-auto">
                        The essentials only—clear drawdown limits, targets, and payout schedules.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {rulesData.map((rule) => (
                        <div
                            key={rule.title}
                            className="rounded-2xl border border-white/10 bg-white/5 p-6"
                        >
                            <h3 className="text-lg font-semibold text-white mb-4">{rule.title}</h3>
                            <ul className="space-y-2 text-sm text-gray-200">
                                {rule.items.map((item) => (
                                    <li key={item} className="flex items-start gap-2">
                                        <span className="text-[#ffd700]">•</span>
                                        <span>{item}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>

                <div className="mt-12 rounded-3xl border border-white/10 bg-white/5 p-6 md:p-8">
                    <div className="text-center mb-6">
                        <p className="text-sm font-medium text-[#ffd700] uppercase tracking-wide mb-2">
                            Prohibited Trading Strategies
                        </p>
                        <h3 className="text-xl md:text-2xl font-semibold text-white">
                            Gambling and exploitative strategies are not allowed
                        </h3>
                        <p className="text-gray-300 mt-3 max-w-3xl mx-auto text-sm md:text-base">
                            These tactics violate our risk policies and may result in an immediate breach.
                        </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-200">
                        {prohibitedStrategies.map((strategy) => (
                            <div key={strategy} className="flex items-start gap-2 rounded-2xl border border-white/10 bg-black/30 p-4">
                                <span className="text-[#ffd700]">•</span>
                                <span>{strategy}</span>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="mt-8 text-center">
                    <a
                        href="/supported-markets"
                        className="inline-flex items-center justify-center rounded-full border border-[#ffd700] px-5 py-2 text-sm font-semibold text-[#ffd700] transition hover:bg-[#ffd700] hover:text-black"
                    >
                        🔗 View full supported markets list
                    </a>
                </div>
            </div>
        </section>
    );
}