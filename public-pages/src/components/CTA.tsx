import { PrimaryButton, GhostButton } from './Buttons';

export default function CTA() {

    return (
        <section id="how-it-works" className="px-4 py-14 md:py-20 2xl:pb-32 border-t border-white/8 bg-white/[0.02]">
            <div className="container mx-auto max-w-6xl">
                <div className="text-center mb-8">
                    <p className="mb-2 text-sm font-medium uppercase tracking-wide text-[#7fe7f7]">
                        How it works
                    </p>
                    <h2 className="text-2xl md:text-3xl text-white font-semibold">
                        Start your journey in 3 simple steps
                    </h2>
                </div>

                <div className="relative overflow-hidden rounded-3xl border border-white/12 bg-gradient-to-b from-[#0f3a46] to-[#071c22] p-6 md:p-8">
                    <div>
                        <p className="mb-3 text-sm font-medium uppercase tracking-wide text-[#7fe7f7]">
                            1. Start a Challenge
                        </p>

                        <h2 className="text-2xl sm:text-4xl font-semibold mb-4 text-white">
                            Choose your challenge and begin
                        </h2>

                        <p className="max-w-xl text-white/74 max-sm:text-sm">
                            Pick the account size that fits your plan, start trading, and follow clear rules from day one.
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                    <div className="relative overflow-hidden rounded-3xl border border-white/12 bg-gradient-to-b from-[#0b313b] to-[#071c22] p-6">
                        <div>
                            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[#7fe7f7]">
                                2. Meet the Trading Objectives
                            </p>
                            <h3 className="text-xl text-white font-semibold mb-3">
                                Show consistency and discipline
                            </h3>
                            <p className="mb-5 text-sm text-white/72">
                                Hit profit targets while managing drawdown limits to demonstrate reliable risk management.
                            </p>

                        </div>
                    </div>

                    <div className="relative overflow-hidden rounded-3xl border border-white/12 bg-gradient-to-b from-[#123944] to-[#071c22] p-6">
                        <div>
                            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[#7fe7f7]">
                                3. Earn Real-Money Rewards
                            </p>
                            <h3 className="text-xl text-white font-semibold mb-3">
                                Get paid for strong performance
                            </h3>
                            <p className="mb-5 text-sm text-white/72">
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