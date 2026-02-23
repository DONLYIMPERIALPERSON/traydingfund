import Title from './Title';
import { AlertTriangle, CheckCircle2, CircleDot, Zap } from 'lucide-react';

export default function Rules() {
    return (
        <section id="rules" className="py-20 border-t border-white/6 bg-white/2">
            <div className="w-full px-4 md:px-6 lg:px-8">
                <Title
                    title="Rules"
                    heading="Simple Rules Tailourd for your consistent payouts and long term trading success"
                    description="We’ve removed 98% of all traditional prop firm rules to make trading at NairaTrader as simple and fair as possible."
                />

                <div className="max-w-6xl mx-auto space-y-6">
                    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-5 md:p-7">
                        <p className="text-gray-200 leading-relaxed">
                            Aside from our 2 essential rules, every other trading approach is fully allowed — giving you the freedom to trade your way, making us the best prop firm.
                        </p>
                        <p className="text-yellow-300 font-semibold mt-4 flex items-center gap-2">
                            <Zap className="w-4 h-4" />
                            Trade Freely. Earn Freely. — Only with NairaTrader.
                        </p>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-5 md:p-7">
                        <h3 className="text-xl font-semibold mb-4">Evaluation Rules</h3>
                        <p className="text-sm text-yellow-300 mb-4">
                            These rules and targets apply to both <strong>Phase 1</strong> and <strong>Phase 2</strong>.
                        </p>

                        <div className="grid md:grid-cols-2 gap-4 mb-4">
                            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                                <p className="text-sm text-gray-400">Profit Target</p>
                                <p className="text-2xl font-bold text-yellow-300">10%</p>
                            </div>
                            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                                <p className="text-sm text-gray-400">Overall Max DD (No daily DD)</p>
                                <p className="text-2xl font-bold text-yellow-300">20%</p>
                            </div>
                        </div>

                        <ul className="space-y-2 text-gray-200">
                            <li className="flex items-start gap-2"><CircleDot className="w-4 h-4 mt-0.5 text-yellow-300" /> All traders are expected to follow these rules to move to funded stage.</li>
                        </ul>
                    </div>



                    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-5 md:p-7">
                        <h3 className="text-xl font-semibold mb-3">Funded and Payout</h3>
                        <p className="text-gray-200 mb-4">
                            We process all trader payouts within minutes, paid directly to your bank account.
                        </p>

                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[680px] text-sm">
                                <thead>
                                    <tr className="text-left border-b border-white/10 text-gray-300">
                                        <th className="py-2 pr-4">Limits</th>
                                        <th className="py-2 pr-4">Value</th>
                                        <th className="py-2 pr-4">Note</th>
                                    </tr>
                                </thead>
                                <tbody className="text-gray-200">
                                    <tr className="border-b border-white/10">
                                        <td className="py-3 pr-4">Minimum Payout</td>
                                        <td className="py-3 pr-4">1%</td>
                                        <td className="py-3 pr-4">You can request a payout after 1% profit.</td>
                                    </tr>
                                    <tr className="border-b border-white/10">
                                        <td className="py-3 pr-4">Maximum Payout</td>
                                        <td className="py-3 pr-4">50%</td>
                                        <td className="py-3 pr-4">50% profit cap. Profits above these limits will be removed.</td>
                                    </tr>
                                    <tr>
                                        <td className="py-3 pr-4">Profit Split</td>
                                        <td className="py-3 pr-4">80%</td>
                                        <td className="py-3 pr-4">Traders keep 80% of their profit; NairaTrader takes 20%.</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        <p className="mt-3 text-gray-200 flex items-start gap-2"><AlertTriangle className="w-4 h-4 mt-0.5 text-yellow-300" /> Earning above the maximum profit limit is not considered a breach.</p>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-5 md:p-7">
                        <h3 className="text-xl font-semibold mb-3">Scalping Rule</h3>
                        <p className="text-gray-200 leading-relaxed">
                            No 1 – 4 minutes scalping. Scalping up to 3 minutes 59 seconds is still counted as a violation, so we recommend holding your trade for at least 4 minutes.
                        </p>
                        <p className="text-gray-300 mt-3">
                            This rule was introduced to prevent our system from copying delayed trades and to discourage high-frequency trading (HFT) practices.
                        </p>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-5 md:p-7">
                        <h3 className="text-xl font-semibold mb-3">Account Inactivity</h3>
                        <p className="text-gray-200">Our broker automatically deletes inactive accounts after 5 days of no trading activity.</p>
                        <p className="text-gray-200 mt-3 flex items-start gap-2"><CircleDot className="w-4 h-4 mt-0.5 text-yellow-300" /> Stay active! Place at least one trade every 5 days.</p>
                        <p className="text-gray-300 mt-2">
                            NairaTrader accounts with no trading for 5 days are automatically removed by the broker. If you have no setup, just open a trade with the smallest lot size.
                        </p>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-5 md:p-7">
                        <h3 className="text-xl font-semibold mb-3">Drawdown Explained</h3>
                        <p className="text-gray-200 leading-relaxed">
                            At NairaTrader, your maximum loss is 20% of your account size which remains static at every new balance peak of your account.
                        </p>
                        <p className="text-gray-200 mt-2">Example: On a ₦200,000 funded account.</p>
                        <p className="text-yellow-300 mt-2">Maximum drawdown: 20% of ₦200,000 = ₦40,000</p>

                        <div className="overflow-x-auto mt-4">
                            <table className="w-full min-w-[720px] text-sm">
                                <thead>
                                    <tr className="text-left border-b border-white/10 text-gray-300">
                                        <th className="py-2 pr-4">Event</th>
                                        <th className="py-2 pr-4">Account Balance</th>
                                        <th className="py-2 pr-4">New DD Limit</th>
                                        <th className="py-2 pr-4">Explanation</th>
                                    </tr>
                                </thead>
                                <tbody className="text-gray-200">
                                    <tr className="border-b border-white/10">
                                        <td className="py-3 pr-4">Start</td>
                                        <td className="py-3 pr-4">₦200,000</td>
                                        <td className="py-3 pr-4">₦160,000</td>
                                        <td className="py-3 pr-4">₦200k (Starting balance) – 40k DD</td>
                                    </tr>
                                    <tr className="border-b border-white/10">
                                        <td className="py-3 pr-4">Profit to ₦250,000</td>
                                        <td className="py-3 pr-4">₦250,000</td>
                                        <td className="py-3 pr-4">₦210,000</td>
                                        <td className="py-3 pr-4">₦250k (New balance) – 40k DD</td>
                                    </tr>
                                    <tr className="border-b border-white/10">
                                        <td className="py-3 pr-4">Profit to ₦300,000</td>
                                        <td className="py-3 pr-4">₦300,000</td>
                                        <td className="py-3 pr-4">₦260,000</td>
                                        <td className="py-3 pr-4">₦300k (Newest balance) – 40k DD</td>
                                    </tr>
                                    <tr>
                                        <td className="py-3 pr-4">Equity drops to ₦260,000</td>
                                        <td className="py-3 pr-4">₦260,000</td>
                                        <td className="py-3 pr-4">Breach</td>
                                        <td className="py-3 pr-4">Account hits DD limit and is closed</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        <p className="mt-4 text-gray-200 flex items-start gap-2"><CheckCircle2 className="w-4 h-4 mt-0.5 text-green-300" /> Quick Cash-Out: If your account is still in profit, you can close your trades and request a cash-out at 19.9% drawdown (before hitting the 20% limit).</p>
                        <p className="mt-3 text-gray-200 flex items-start gap-2"><AlertTriangle className="w-4 h-4 mt-0.5 text-red-300" /> Key Takeaway: You should never lose more than 20% of your original account size at any point regardless of your account profit.</p>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-5 md:p-7">
                        <h3 className="text-xl font-semibold mb-3">Refund Policy</h3>
                        <p className="text-gray-200 leading-relaxed">
                            All sales on NairaTrader are final. Because our products and trading accounts provide instant digital access and value, we do not offer refunds once an order has been delivered, activated, or used.
                        </p>
                        <p className="text-gray-200 mt-3">
                            If an account is delivered with incorrect MT5 login details, we will promptly correct it at no extra cost.
                        </p>
                    </div>
                </div>
            </div>
        </section>
    );
}
