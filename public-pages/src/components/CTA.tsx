import { PrimaryButton, GhostButton } from './Buttons';

export default function CTA() {

    return (
        <section id="how-it-works" className="py-14 md:py-20 2xl:pb-32 px-4">
            <div className="container mx-auto max-w-6xl">
                <div className="text-center mb-8">
                    <p className="text-sm font-medium text-[#ffd700] uppercase tracking-wide mb-2">
                        How it works
                    </p>
                    <h2 className="text-2xl md:text-3xl text-white font-semibold">
                        Start your journey in 3 simple steps
                    </h2>
                </div>

                <div className="rounded-3xl bg-gradient-to-b from-indigo-500 to-slate-900 border border-indigo-400/60 p-6 md:p-8 relative overflow-hidden">
                    <div>
                        <p className="text-sm font-medium text-white uppercase tracking-wide mb-3">
                            1. Start a Challenge
                        </p>

                        <h2 className="text-2xl sm:text-4xl font-semibold mb-4 text-white">
                            Choose your challenge and begin
                        </h2>

                        <p className="max-sm:text-sm text-white max-w-xl">
                            Pick the account size that fits your plan, start trading, and follow clear rules from day one.
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                    <div className="rounded-3xl bg-gradient-to-b from-emerald-500 to-slate-900 border border-emerald-400/60 p-6 relative overflow-hidden">
                        <div>
                            <p className="text-xs font-semibold text-white uppercase tracking-wide mb-3">
                                2. Meet the Trading Objectives
                            </p>
                            <h3 className="text-xl text-white font-semibold mb-3">
                                Show consistency and discipline
                            </h3>
                            <p className="text-sm text-white mb-5">
                                Hit profit targets while managing drawdown limits to demonstrate reliable risk management.
                            </p>

                        </div>
                    </div>

                    <div className="rounded-3xl bg-gradient-to-b from-rose-500 to-slate-900 border border-rose-400/70 p-6 relative overflow-hidden">
                        <div>
                            <p className="text-xs font-semibold text-white uppercase tracking-wide mb-3">
                                3. Earn Real-Money Rewards
                            </p>
                            <h3 className="text-xl text-white font-semibold mb-3">
                                Get paid for strong performance
                            </h3>
                            <p className="text-sm text-white mb-5">
                                Once you qualify, receive performance based payout fast - with 80% profit split in minutes.
                            </p>

                        </div>
                    </div>
                </div>

                <div className="mt-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 w-full">
                    <a href="/#pricing" className="w-full sm:w-auto">
                        <PrimaryButton className="w-full sm:w-auto">Start a Challenge</PrimaryButton>
                    </a>
                    <a href="/rules" className="w-full sm:w-auto">
                        <GhostButton className="w-full sm:w-auto justify-center">Rules</GhostButton>
                    </a>
                </div>


            </div>
        </section>
    );
};