export default function TrustHighlights() {
    const highlights = [
        {
            title: 'Scale with Confidence',
            desc: 'Trade within clear drawdown limits and earn bigger buying power as you stay consistent.',
        },
        {
            title: 'Speedy Payouts',
            desc: 'Trayding Fund processes rewards fast so you can reinvest, withdraw, or keep compounding.',
        },
        {
            title: 'Trader-First Rules',
            desc: 'Simplified objectives and transparent rules designed to keep you focused on performance.',
        },
    ];

    const mockReviews = [
        {
            name: 'Alex M.',
            title: 'Fast payouts and clarity',
            review: 'I received my payout quickly and the rules are straightforward. Trayding Fund keeps things simple.',
        },
        {
            name: 'Sofia R.',
            title: 'Support that responds',
            review: 'Live chat helped me immediately and the platform made the objectives easy to track.',
        },
        {
            name: 'Daniel H.',
            title: 'Built for real traders',
            review: 'The drawdown limits are fair and the process feels designed for consistent performance.',
        },
    ];

    return (
        <section className="py-14 md:py-20 border-t border-white/6 bg-white/2">
            <div className="max-w-6xl mx-auto px-4">
                <div className="text-center mb-12">
                    <p className="text-sm font-medium text-[#ffd700] uppercase tracking-wide mb-3">
                        THE TRAYDING FUND EDGE
                    </p>
                    <h2 className="text-2xl md:text-4xl text-white font-semibold">
                        Real funding, real speed, real trader focus
                    </h2>
                    <p className="max-w-2xl mx-auto text-sm text-gray-400 my-3">
                        Everything we build is designed to help you trade, scale, and withdraw with confidence.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {highlights.map((item, i) => (
                        <div
                            key={i}
                            className="rounded-2xl p-6 bg-white/5 border border-white/10 transition duration-300 hover:border-white/20 hover:-translate-y-1"
                        >
                            <h3 className="text-lg font-semibold text-[#ffd700] mb-2">{item.title}</h3>
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
