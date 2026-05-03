export default function TrustHighlights() {
    const highlights = [
        {
            title: 'Simple Scaling Plan',
            desc: 'Receive 4 payouts and maintain good trading behaviour, then we scale your account by 50%. This repeats after each set of 4 payouts.',
        },
        {
            title: 'Speedy Payouts',
            desc: 'MacheFunded processes rewards fast so you can reinvest, withdraw, or keep compounding.',
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
            review: 'I received my payout quickly and the rules are straightforward. MacheFunded keeps things simple.',
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
        <section className="border-t border-white/8 bg-white/[0.02] py-14 md:py-20">
            <div className="max-w-6xl mx-auto px-4">
                <div className="text-center mb-12">
                    <p className="mb-4 text-xs font-semibold uppercase tracking-[0.3em] text-[#7fe7f7]">
                        THE MACHEFUNDED EDGE
                    </p>
                    <h2 className="text-2xl md:text-4xl text-white font-semibold">
                        Real funding, real speed, real trader focus
                    </h2>
                    <p className="mx-auto my-3 max-w-2xl text-sm text-white/65">
                        Everything we build is designed to help you trade, scale, and withdraw with confidence.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {highlights.map((item, i) => (
                        <div
                            key={i}
                            className="rounded-2xl border border-white/10 bg-gradient-to-b from-white/8 to-white/[0.03] p-6 shadow-[0_0_20px_rgba(255,255,255,0.04)] transition duration-300 hover:-translate-y-1 hover:border-white/20"
                        >
                            <h3 className="mb-2 text-lg font-semibold text-[#7fe7f7]">{item.title}</h3>
                            <p className="text-sm leading-relaxed text-white/72">{item.desc}</p>
                        </div>
                    ))}
                </div>

                <div className="mt-10 rounded-2xl border border-white/10 bg-white/[0.03] px-6 py-5">
                    <div className="flex flex-col items-center gap-4 text-center">
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

                        <div className="text-sm text-white/70">
                            4.8/5 based on 200+ reviews
                        </div>
                    </div>
                </div>

                <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                    {mockReviews.map((item, i) => (
                        <div
                            key={i}
                            className="rounded-2xl border border-white/10 bg-gradient-to-b from-white/8 to-white/[0.03] p-5 transition duration-300 hover:border-white/20"
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
                            <p className="mb-3 text-sm leading-relaxed text-white/72">{item.review}</p>
                            <p className="text-xs text-white/50">— {item.name}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
