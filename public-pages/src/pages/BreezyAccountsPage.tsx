import { useEffect } from 'react';
import { ArrowRightIcon, CheckCircle2Icon } from 'lucide-react';

const howItWorks = [
    {
        step: '1. Activate your account',
        description: 'Choose your account size and start trading immediately.',
    },
    {
        step: '2. Trade with full flexibility',
        description: 'No phases. No drawdown limits. Just focus on your strategy.',
    },
    {
        step: '3. Maintain a healthy risk score',
        description: 'Your trading behavior determines your eligibility and payout.',
    },
    {
        step: '4. Withdraw your profits',
        description: 'Once eligible, request payouts anytime.',
    },
];

const keyFeatures = [
    'No Challenge Model',
    'No Drawdown Limits',
    '50% Capital Protection Limit',
    'Weekly Subscription',
    'Risk-Based Payout System',
    'Withdrawals On Demand',
    'Up to 100% Profit Split',
];

const riskScorePoints = [
    'Risk per trade',
    'Drawdown behavior',
    'Lot Size control',
    'Trading discipline',
];

const profitSplitTiers = [
    '100 Score → 100% Profit Split',
    '75–99 Score → 80%',
    '60–74 Score → 60%',
    '40–59 Score → 40%',
    'Below 40 → Not eligible for withdrawal',
];

const pricing = [
    { account: '₦200,000', price: '₦5,000/week' },
    { account: '₦500,000', price: '₦9,500/week', badge: 'Most Popular' },
    { account: '₦800,000', price: '₦13,500/week' },
    { account: '₦1,000,000', price: '₦16,500/week' },
];

const importantRules = [
    'Accounts are terminated at 50% loss',
    'Subscription is non-refundable',
    'Account access is paused if subscription expires',
    'Each subscription applies to one active account',
];

const faqs = [
    {
        question: 'Is this a challenge account?',
        answer: 'No. Breezy accounts have no evaluation phases. You trade instantly.',
    },
    {
        question: 'Is there any drawdown rule?',
        answer: 'There is no daily drawdown, but your account is protected by a 50% capital limit.',
    },
    {
        question: 'How do I qualify for withdrawal?',
        answer: 'You must reach at least 5% profit, complete 5 trades, and maintain a risk score of 40 or above.',
    },
    {
        question: 'How is my profit split determined?',
        answer: 'Your risk score determines your payout percentage — up to 100%.',
    },
    {
        question: 'Can I withdraw anytime?',
        answer: 'Yes — once you meet the eligibility conditions.',
    },
    {
        question: 'What happens if I lose 50% of the account?',
        answer: 'The account is closed, and you’ll need to activate a new one.',
    },
    {
        question: 'Does subscription renew automatically?',
        answer: 'Yes for card payments. Manual renewal is required for bank transfers.',
    },
];

export default function BreezyAccountsPage() {
    useEffect(() => {
        const title = 'NGN Breezy Accounts | No Challenge Prop Trading | MacheFunded';
        const description = 'Start trading instantly with MacheFunded NGN Breezy Accounts. No challenge phases, no daily drawdown limits, on-demand withdrawals, weekly subscriptions, and up to 100% profit split based on risk score.';
        const canonicalUrl = 'https://www.machefunded.com/breezy-accounts';
        const imageUrl = 'https://www.machefunded.com/preview.png';

        document.title = title;

        const upsertMeta = (selector: string, attributes: Record<string, string>) => {
            let element = document.head.querySelector(selector) as HTMLMetaElement | null;
            if (!element) {
                element = document.createElement('meta');
                document.head.appendChild(element);
            }

            Object.entries(attributes).forEach(([key, value]) => {
                element?.setAttribute(key, value);
            });
        };

        const upsertLink = (selector: string, attributes: Record<string, string>) => {
            let element = document.head.querySelector(selector) as HTMLLinkElement | null;
            if (!element) {
                element = document.createElement('link');
                document.head.appendChild(element);
            }

            Object.entries(attributes).forEach(([key, value]) => {
                element?.setAttribute(key, value);
            });
        };

        upsertMeta('meta[name="description"]', { name: 'description', content: description });
        upsertMeta('meta[name="keywords"]', {
            name: 'keywords',
            content: 'NGN Breezy Accounts, MacheFunded Breezy, no challenge prop account, Nigeria funded account, prop trading Nigeria, instant funded account NGN, Breezy account objectives',
        });
        upsertMeta('meta[property="og:title"]', { property: 'og:title', content: title });
        upsertMeta('meta[property="og:description"]', { property: 'og:description', content: description });
        upsertMeta('meta[property="og:url"]', { property: 'og:url', content: canonicalUrl });
        upsertMeta('meta[property="og:type"]', { property: 'og:type', content: 'website' });
        upsertMeta('meta[property="og:image"]', { property: 'og:image', content: imageUrl });
        upsertMeta('meta[name="twitter:title"]', { name: 'twitter:title', content: title });
        upsertMeta('meta[name="twitter:description"]', { name: 'twitter:description', content: description });
        upsertMeta('meta[name="twitter:image"]', { name: 'twitter:image', content: imageUrl });
        upsertLink('link[rel="canonical"]', { rel: 'canonical', href: canonicalUrl });

        const schemaId = 'breezy-accounts-schema';
        const existingSchema = document.getElementById(schemaId);
        if (existingSchema) existingSchema.remove();

        const schema = document.createElement('script');
        schema.id = schemaId;
        schema.type = 'application/ld+json';
        schema.text = JSON.stringify([
            {
                '@context': 'https://schema.org',
                '@type': 'WebPage',
                name: title,
                description,
                url: canonicalUrl,
            },
            {
                '@context': 'https://schema.org',
                '@type': 'FAQPage',
                mainEntity: faqs.map((item) => ({
                    '@type': 'Question',
                    name: item.question,
                    acceptedAnswer: {
                        '@type': 'Answer',
                        text: item.answer,
                    },
                })),
            },
        ]);
        document.head.appendChild(schema);

        return () => {
            const mountedSchema = document.getElementById(schemaId);
            if (mountedSchema) mountedSchema.remove();
        };
    }, []);

    return (
        <main className="relative overflow-hidden pt-24 md:pt-28">
            <div className="pointer-events-none absolute inset-0">
                <div className="absolute inset-x-0 top-0 h-[30rem] bg-[radial-gradient(circle_at_top,rgba(8,128,149,0.22),transparent_66%)]" />
                <div className="absolute left-[-8rem] top-24 h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl" />
                <div className="absolute right-[-10rem] top-[26rem] h-80 w-80 rounded-full bg-teal-500/10 blur-3xl" />
            </div>

            <section className="relative px-4 pb-12 pt-8 md:pb-16 md:pt-10">
                <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
                    <div>
                        <p className="mb-4 text-sm font-semibold uppercase tracking-[0.28em] text-[#7fe7f7]">
                            NGN BREEZY ACCOUNTS
                        </p>
                        <h1 className="max-w-4xl text-4xl font-extrabold leading-tight text-white md:text-6xl">
                            Start trading instantly with NGN Breezy Accounts.
                        </h1>
                        <p className="mt-6 max-w-3xl text-lg text-white/82 md:text-2xl">
                            No challenges. No drawdown limits. Just trade freely and earn up to 100% of your profits.
                        </p>
                        <p className="mt-5 max-w-3xl text-base leading-relaxed text-white/70 md:text-lg">
                            A flexible funding model designed for disciplined traders who want real payouts without pressure.
                        </p>

                        <a
                            href="#pricing"
                            className="mt-8 inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-black transition hover:bg-gray-100"
                        >
                            Explore Breezy Accounts
                            <ArrowRightIcon className="size-4" />
                        </a>
                    </div>

                    <div className="rounded-[2rem] border border-white/12 bg-gradient-to-b from-white/10 to-white/[0.04] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.22)] md:p-8">
                        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#7fe7f7]">Key Features</p>
                        <div className="mt-5 grid gap-3">
                            {keyFeatures.map((feature) => (
                                <div key={feature} className="flex items-start gap-3 rounded-2xl border border-white/8 bg-black/20 px-4 py-3">
                                    <CheckCircle2Icon className="mt-0.5 size-5 text-[#7fe7f7]" />
                                    <span className="text-white/80">{feature}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            <section className="border-t border-white/8 bg-white/[0.02] px-4 py-14 md:py-18">
                <div className="mx-auto max-w-6xl">
                    <div className="mb-10 text-center">
                        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#7fe7f7]">How It Works</p>
                        <h2 className="mt-3 text-3xl font-semibold text-white md:text-5xl">Simple. Transparent. Built for real traders.</h2>
                    </div>

                    <div className="grid gap-5 md:grid-cols-2">
                        {howItWorks.map((item) => (
                            <div key={item.step} className="rounded-3xl border border-white/10 bg-gradient-to-b from-white/8 to-white/[0.03] p-6">
                                <p className="text-lg font-semibold text-white">{item.step}</p>
                                <p className="mt-3 text-white/72">{item.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section className="px-4 py-14 md:py-18">
                <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1fr_1fr]">
                    <div className="rounded-3xl border border-white/10 bg-gradient-to-b from-[#0c2f39] to-[#071c22] p-7">
                        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#7fe7f7]">Trading Rules</p>
                        <div className="mt-6 space-y-6 text-white/78">
                            <div>
                                <h3 className="text-2xl font-semibold text-white">Capital Protection</h3>
                                <p className="mt-3">Your account will be closed if equity falls below 50% of the initial balance.</p>
                            </div>

                            <div className="border-t border-white/10 pt-6">
                                <h3 className="text-2xl font-semibold text-white">Risk Score System</h3>
                                <p className="mt-3">Your trading is evaluated on a 0–100 score based on:</p>
                                <div className="mt-4 rounded-2xl border border-[#7fe7f7]/20 bg-[#0d2730] px-4 py-4 text-white/82">
                                    Your Risk Score is automatically calculated based on how you manage risk — including lot size, drawdown behavior, and trading activity.
                                </div>
                                <div className="mt-4 space-y-3">
                                    {riskScorePoints.map((item) => (
                                        <div key={item} className="rounded-2xl border border-white/8 bg-black/20 px-4 py-3">{item}</div>
                                    ))}
                                </div>
                                <p className="mt-4 font-semibold text-[#7fe7f7]">Minimum score required for withdrawal: 40</p>
                            </div>

                            <div className="border-t border-white/10 pt-6">
                                <h3 className="text-2xl font-semibold text-white">Minimum Trading Requirement</h3>
                                <div className="mt-4 space-y-3">
                                    <div className="rounded-2xl border border-white/8 bg-black/20 px-4 py-3">At least 5 closed trades</div>
                                    <div className="rounded-2xl border border-white/8 bg-black/20 px-4 py-3">At least 5% profit</div>
                                </div>
                            </div>

                            <div className="border-t border-white/10 pt-6">
                                <h3 className="text-2xl font-semibold text-white">Withdrawals</h3>
                                <div className="mt-4 space-y-3">
                                    <div className="rounded-2xl border border-white/8 bg-black/20 px-4 py-3">Available on demand once eligible</div>
                                    <div className="rounded-2xl border border-white/8 bg-black/20 px-4 py-3">Fast processing</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="rounded-3xl border border-white/10 bg-gradient-to-b from-white/8 to-white/[0.03] p-7">
                            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#7fe7f7]">Profit Split</p>
                            <h3 className="mt-3 text-3xl font-semibold text-white">Earn based on how you manage your risk.</h3>
                            <div className="mt-5 space-y-3">
                                {profitSplitTiers.map((item) => (
                                    <div key={item} className="rounded-2xl border border-white/8 bg-black/20 px-4 py-3 text-white/80">
                                        {item}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="rounded-3xl border border-white/10 bg-gradient-to-b from-white/8 to-white/[0.03] p-7">
                            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#7fe7f7]">Important Rules</p>
                            <div className="mt-5 space-y-3">
                                {importantRules.map((item) => (
                                    <div key={item} className="flex items-start gap-3 rounded-2xl border border-white/8 bg-black/20 px-4 py-3 text-white/80">
                                        <span className="text-[#ffd700]">•</span>
                                        <span>{item}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section id="pricing" className="border-t border-white/8 bg-white/[0.02] px-4 py-14 md:py-18">
                <div className="mx-auto max-w-6xl">
                    <div className="mb-10 text-center">
                        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#7fe7f7]">Pricing</p>
                        <h2 className="mt-3 text-3xl font-semibold text-white md:text-5xl">Choose your Breezy account.</h2>
                        <p className="mt-4 text-white/72">Activate instantly and start trading.</p>
                    </div>

                    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
                        {pricing.map((item) => (
                            <div key={item.account} className="relative rounded-3xl border border-white/10 bg-gradient-to-b from-white/8 to-white/[0.03] p-6">
                                {item.badge && (
                                    <div className="absolute right-4 top-4 rounded-full bg-[#ffd700] px-3 py-1 text-xs font-semibold text-black">
                                        {item.badge}
                                    </div>
                                )}
                                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/55">Account Size</p>
                                <h3 className="mt-3 text-3xl font-bold text-white">{item.account}</h3>
                                <p className="mt-3 text-xl font-semibold text-[#7fe7f7]">{item.price}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section className="px-4 py-14 md:py-18">
                <div className="mx-auto max-w-6xl">
                    <div className="mb-10 text-center">
                        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#7fe7f7]">Frequently Asked Questions</p>
                        <h2 className="mt-3 text-3xl font-semibold text-white md:text-5xl">Everything to know about Breezy Accounts.</h2>
                    </div>

                    <div className="space-y-4">
                        {faqs.map((item) => (
                            <div key={item.question} className="rounded-3xl border border-white/10 bg-gradient-to-b from-white/8 to-white/[0.03] p-6">
                                <h3 className="text-xl font-semibold text-white">{item.question}</h3>
                                <p className="mt-3 text-white/72">{item.answer}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section className="border-t border-white/8 bg-white/[0.02] px-4 py-14 md:py-18">
                <div className="mx-auto max-w-5xl rounded-[2rem] border border-white/10 bg-gradient-to-b from-[#0f3a46] to-[#071c22] px-6 py-10 text-center shadow-[0_20px_70px_rgba(0,0,0,0.24)] md:px-10">
                    <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#7fe7f7]">Final CTA</p>
                    <h2 className="mt-4 text-3xl font-semibold text-white md:text-5xl">Trade without pressure. Earn based on discipline.</h2>
                    <p className="mx-auto mt-6 max-w-3xl text-white/76">
                        Start your Breezy account today and experience a smarter way to get funded.
                    </p>
                    <a
                        href="https://trader.machefunded.com/start-challenge"
                        className="mt-8 inline-flex items-center justify-center gap-2 rounded-full bg-white px-7 py-3 text-sm font-semibold text-black transition hover:bg-gray-100"
                    >
                        Activate Now
                        <ArrowRightIcon className="size-4" />
                    </a>
                </div>
            </section>
        </main>
    );
}