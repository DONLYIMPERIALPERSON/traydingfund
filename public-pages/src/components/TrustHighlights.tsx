export default function TrustHighlights() {
    const highlights = [
        {
            title: 'Small Trader, Huge Capital',
            desc: 'Maintain low drawdown and a few successful payouts to qualify for a scaled-up account.',
        },
        {
            title: '₦200k and ₦400k Traders',
            desc: '₦1.5M free instant funded account will be issued with automatic payout activated as you sabi trade, we sabi scale.',
        },
        {
            title: '₦600k and ₦800k Traders',
            desc: 'If you sabi trade, we sabi scale! ₦3M free instant funded account will be issued with automatic payout activated.',
        },
    ];

    const mockReviews = [
        {
            name: 'Chinedu A.',
            title: 'Fast payout and clear rules',
            review: 'I requested payout and got it quickly. The rules are simple and fair compared to most firms I have tried.',
        },
        {
            name: 'Aisha M.',
            title: 'Best local prop firm experience',
            review: 'As a Nigerian trader, this feels built for us. Support is responsive and the account objectives are straightforward.',
        },
        {
            name: 'Tobi K.',
            title: 'Room to trade properly',
            review: 'The drawdown structure gives enough breathing space to execute my strategy without unnecessary pressure.',
        },
    ];

    return (
        <section className="py-20 border-t border-white/6 bg-white/2">
            <div className="max-w-6xl mx-auto px-4">
                <div className="text-center mb-12">
                    <p className="text-sm font-medium text-yellow-300 uppercase tracking-wide mb-3">
                        SCALE FROM 0 TO 100
                    </p>
                    <h2 className="text-2xl md:text-4xl text-white font-semibold">
                        Free 1.5 and 3m Live Funded
                    </h2>
                    <p className="max-w-2xl mx-auto text-sm text-gray-400 my-3">
                        Yes, you heard it correctly — no evaluation, just a live funded account with instant payout enabled.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {highlights.map((item, i) => (
                        <div
                            key={i}
                            className="rounded-2xl p-6 bg-white/5 border border-white/10 transition duration-300 hover:border-white/20 hover:-translate-y-1"
                        >
                            <h3 className="text-lg font-semibold text-yellow-300 mb-2">{item.title}</h3>
                            <p className="text-sm text-gray-300 leading-relaxed">{item.desc}</p>
                        </div>
                    ))}
                </div>

                <div className="mt-10 py-2">
                    <div className="flex flex-col items-center text-center gap-4">
                        <div className="flex items-center gap-3">
                            <h3 className="text-xl font-semibold text-white">Excellent</h3>
                            <div className="flex items-center gap-1">
                                {[...Array(5)].map((_, i) => (
                                    <span
                                        key={i}
                                        className="inline-flex h-6 w-6 items-center justify-center rounded-[2px] bg-[#00b67a] text-white text-sm"
                                    >
                                        ★
                                    </span>
                                ))}
                            </div>
                        </div>

                        <div className="text-sm text-gray-300">
                            4.8/5 based on 200+ reviews
                        </div>
                    </div>
                </div>

                <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                    {mockReviews.map((item, i) => (
                        <div
                            key={i}
                            className="rounded-2xl p-5 bg-white/5 border border-white/10 transition duration-300 hover:border-white/20"
                        >
                            <div className="flex items-center gap-1 mb-2">
                                {[...Array(5)].map((_, starIndex) => (
                                    <span
                                        key={starIndex}
                                        className="inline-flex h-5 w-5 items-center justify-center rounded-[2px] bg-[#00b67a] text-white text-[10px]"
                                    >
                                        ★
                                    </span>
                                ))}
                            </div>
                            <h4 className="text-white font-semibold mb-2">{item.title}</h4>
                            <p className="text-sm text-gray-300 leading-relaxed mb-3">{item.review}</p>
                            <p className="text-xs text-gray-400">— {item.name}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
