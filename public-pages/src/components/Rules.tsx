const rulesData = [
    {
        title: '2-Step Challenge — Phase 1',
        items: [
            'Max Drawdown: 11%',
            'Max Daily Drawdown: 5%',
            'Profit Target: 10%',
            'Minimum Trading Days: 1',
            'Minimum Trade Duration Rule: 5 mins',
        ],
    },
    {
        title: '2-Step Challenge — Phase 2',
        items: [
            'Max Drawdown: 11%',
            'Max Daily Drawdown: 5%',
            'Profit Target: 5%',
            'Minimum Trading Days: 1',
            'Minimum Trade Duration Rule: 5 mins',
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
            'Minimum Trade Duration Rule: 5 mins',
        ],
    },
    {
        title: '1-Step Challenge — Phase 1',
        items: [
            'Max Drawdown: 11%',
            'Max Daily Drawdown: 5%',
            'Profit Target: 10%',
            'Minimum Trading Days: 1',
            'Minimum Trade Duration Rule: 5 mins',
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
            'Minimum Trade Duration Rule: 5 mins',
        ],
    },
    {
        title: 'Instant Funded',
        items: [
            'Max Drawdown: 5%',
            'Max Daily Drawdown: 2%',
            'Minimum Trading Days: 5',
            'Minimum Trade Duration Rule: 5 mins',
            'Profit Split: 50%',
            'Withdrawals: Bi-weekly',
        ],
    },
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
            </div>
        </section>
    );
}