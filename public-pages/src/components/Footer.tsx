export default function Footer() {

    return (
        <footer className="bg-white/6 border-t border-white/6 pt-10 text-gray-300">
            <div className="max-w-6xl mx-auto px-6">
                <div className="flex flex-col md:flex-row items-start justify-between gap-10 py-10 border-b border-white/10">
                    <div>
                        <img src='/white-logo.svg' alt="NairaTrader logo" className="h-8" />
                        <p className="max-w-[410px] mt-6 text-sm leading-relaxed">
                            NairaTrader is the first naira-based prop trading firm built for ambitious traders—offering clear rules, fair evaluations, and fast reward payouts.
                        </p>
                    </div>

                    <div className="w-full md:w-auto">
                        <div className="grid grid-cols-3 gap-2">
                            <div className="rounded-md border border-white/15 bg-white h-8 px-2 flex items-center justify-center">
                                <img src="/apple-pay.webp" alt="Apple Pay" className="max-h-4 w-auto object-contain" />
                            </div>
                            <div className="rounded-md border border-white/15 bg-white h-8 px-2 flex items-center justify-center">
                                <img src="/master-card.png" alt="Mastercard" className="max-h-4 w-auto object-contain" />
                            </div>
                            <div className="rounded-md border border-white/15 bg-white h-8 px-2 flex items-center justify-center">
                                <img src="/visa-card.webp" alt="Visa" className="max-h-4 w-auto object-contain" />
                            </div>
                        </div>
                    </div>
                </div>

                <p className="py-4 text-center text-sm text-gray-400">
                    Copyright © 2026 by NairaTrader.com
                </p>
            </div>
        </footer>
    );
};