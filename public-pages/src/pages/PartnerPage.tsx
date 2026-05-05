import { useMemo, useState } from 'react';

export default function PartnerPage() {
  const levelOptions = [
    { key: 'bronze', label: 'Bronze', commissionRate: 0.2 },
    { key: 'silver', label: 'Silver', commissionRate: 0.25 },
    { key: 'gold', label: 'Gold', commissionRate: 0.3 },
    { key: 'platinum', label: 'Platinum', commissionRate: 0.35 },
  ] as const;

  const challengeOptions = {
    flexi: {
      label: 'NGN Flexi',
      accounts: [
        { size: '₦200,000', price: 9000 },
        { size: '₦500,000', price: 21000 },
        { size: '₦800,000', price: 31500 },
      ],
    },
    standard: {
      label: 'NGN Standard',
      accounts: [
        { size: '₦200,000', price: 5000 },
        { size: '₦500,000', price: 11500 },
        { size: '₦800,000', price: 17000 },
      ],
    },
    oneStep: {
      label: 'NGN 1 Step',
      accounts: [
        { size: '₦200,000', price: 6000 },
        { size: '₦500,000', price: 13800 },
        { size: '₦800,000', price: 20400 },
      ],
    },
    breezy: {
      label: 'NGN Breezy',
      accounts: [
        { size: '₦200,000', price: 7500 },
        { size: '₦500,000', price: 15000 },
        { size: '₦800,000', price: 24000 },
        { size: '₦1,000,000', price: 30000 },
      ],
    },
  } as const;

  const partnerFaqs = [
    {
      question: '1. How do I become a partner?',
      answer:
        'To qualify for the MacheFunded Partner Program, you must complete at least 10 successful affiliate sales.\n\nOnce eligible, simply log in through the Partner Portal.\nIf you qualify, your Partner Dashboard will be unlocked automatically.',
    },
    {
      question: '2. What happens if I’m not eligible yet?',
      answer:
        'If you haven’t reached 10 sales yet, you’ll still have access to your affiliate dashboard.\n\nWe’ll also show you:\n• Your current progress\n• How many sales you need to qualify\n\nKeep promoting — you’re closer than you think.',
    },
    {
      question: '3. How are partner levels calculated?',
      answer:
        'Partner levels are based on your monthly confirmed sales.\n\nEach level has a required number of sales:\n• Bronze: 10\n• Silver: 25\n• Gold: 40\n• Platinum: 60\n\nOnce you reach a level, it is locked for 3 months, even if your sales drop.',
    },
    {
      question: '4. What counts as a valid sale?',
      answer:
        'A sale is counted when:\n• The purchase is completed successfully\n• The payment is confirmed\n• The account is not refunded or disputed\n\nFraudulent, self-referred, or abusive transactions will not be counted.',
    },
    {
      question: '5. When do I receive my commission?',
      answer:
        'Your commission is approved instantly after a successful referral.\n\nYou can withdraw your earnings anytime via:\n• Crypto (USDT TRC20)\n• Bank transfer (for Nigerian users)',
    },
    {
      question: '6. How do payouts work?',
      answer:
        'All earnings are credited to your partner wallet in real-time.\n\nYou can:\n• Track earnings inside your dashboard\n• Withdraw anytime (no delays)\n\nWe prioritize fast and transparent payouts.',
    },
    {
      question: '7. What are “Free MF Challenges” and how do I use them?',
      answer:
        'Each partner level unlocks free challenge accounts monthly.\n\nThese can be used to:\n• Trade personally\n• Run giveaways for your community\n• Reward your audience\n\nSome rewards (like Platinum) are transferable, meaning you can give them to anyone.',
    },
    {
      question: '8. How do community giveaways work?',
      answer:
        'At higher levels, you receive extra accounts specifically for giveaways.\n\nYou can:\n• Use them for promotions\n• Grow your Telegram/Discord/X audience\n• Reward loyal followers\n\nThis helps you increase engagement and drive more referrals.',
    },
    {
      question: '9. Can I use my own referral link or code?',
      answer:
        'No.\n\nSelf-referrals are strictly prohibited.\n\nAny attempt to:\n• Refer yourself\n• Create multiple accounts\n• Abuse the system\n\nWill result in:\n• Commission cancellation\n• Account restriction',
    },
    {
      question: '10. Do I get a custom discount code?',
      answer:
        'Yes.\n\nAll partners receive a personal discount code they can share with their audience.\n\nThis helps:\n• Increase conversions\n• Track performance more effectively',
    },
    {
      question: '11. What happens if I don’t maintain my sales?',
      answer:
        'Your level is locked for 3 months once achieved.\n\nAfter that period:\n• Your level will be recalculated based on your performance',
    },
    {
      question: '12. Is there a limit to how much I can earn?',
      answer:
        'No.\n\nThere is no cap on your earnings.\n\nThe more you promote, the more you earn — including:\n• Commissions\n• Bonuses\n• Free accounts',
    },
    {
      question: '13. Can I promote anywhere?',
      answer:
        'Yes, but with guidelines.\n\nYou can promote on:\n• X (Twitter)\n• Telegram\n• Discord\n• YouTube\n• Websites\n\nHowever, you must NOT:\n• Make false promises (e.g. “guaranteed profits”)\n• Misrepresent MacheFunded\n• Run misleading ads',
    },
    {
      question: '14. Can I lose my partner status?',
      answer:
        'Yes, if you violate our terms.\n\nThis includes:\n• Fraudulent activity\n• Abuse of referral system\n• Misleading promotions\n\nWe maintain a strict but fair system to protect all partners.',
    },
    {
      question: '15. Why should I join the MacheFunded Partner Program?',
      answer:
        'Because we offer:\n• High commissions (up to 35%)\n• Instant payouts\n• Monthly rewards & free accounts\n• Community growth tools\n• A fast-growing Nigerian prop firm\n\nBuilt for serious partners who want to scale.',
    },
  ] as const;

  const [selectedLevel, setSelectedLevel] = useState<(typeof levelOptions)[number]['key']>('bronze');
  const [selectedChallenge, setSelectedChallenge] = useState<keyof typeof challengeOptions>('flexi');
  const [selectedAccountSize, setSelectedAccountSize] = useState('₦200,000');
  const [referralCount, setReferralCount] = useState(10);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [showComingSoonModal, setShowComingSoonModal] = useState(false);

  const selectedChallengeData = challengeOptions[selectedChallenge];
  const selectedTier = selectedChallengeData.accounts.find((item) => item.size === selectedAccountSize) ?? selectedChallengeData.accounts[0];
  const selectedCommissionRate = levelOptions.find((level) => level.key === selectedLevel)?.commissionRate ?? 0.2;

  const formattedChallengePrice = `₦${selectedTier.price.toLocaleString()}`;
  const earningPerReferral = Math.round(selectedTier.price * selectedCommissionRate);

  const estimatedEarnings = useMemo(() => {
    return referralCount * earningPerReferral;
  }, [referralCount, earningPerReferral]);

  return (
    <main className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-x-0 top-0 h-[30rem] bg-[radial-gradient(circle_at_top,rgba(8,128,149,0.22),transparent_66%)]" />
        <div className="absolute left-[-10rem] top-24 h-[24rem] w-[24rem] rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute right-[-8rem] top-[22rem] h-[22rem] w-[22rem] rounded-full bg-teal-400/10 blur-3xl" />
        <div className="absolute inset-x-0 bottom-0 h-[26rem] bg-[linear-gradient(180deg,transparent,rgba(3,20,26,0.16),rgba(2,12,16,0.34))]" />
      </div>

      <section className="relative z-10 pt-24 pb-16 sm:py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mt-6 grid grid-cols-1 items-center gap-12 lg:mt-10 lg:grid-cols-2">
            <div className="flex flex-col">
              <p className="text-base font-semibold uppercase tracking-wider text-[#cfeaf0]">
                Machefunded Partner Programme
              </p>
              <h1 className="mt-2 text-4xl font-bold text-white sm:text-6xl lg:mt-5 xl:text-7xl">
                Promote the Best <br />
                Naira Prop Firm to Traders in Nigeria
              </h1>
              <p className="mt-2 text-xl text-[#cfeaf0] lg:mt-5 sm:text-2xl">
                Receive up to 35% commission for sale
              </p>

              <div className="mt-8 hidden lg:block">
                <button
                  type="button"
                  onClick={() => setShowComingSoonModal(true)}
                  className="inline-flex items-center justify-center rounded-lg bg-[#0b8ea6] px-6 py-3 text-base font-semibold text-white transition-all duration-200 hover:bg-[#0ea5bf]"
                >
                  Partner Login
                </button>

                <a href="#partner-calculator" className="mt-4 flex w-fit items-center gap-2 text-base font-medium text-[#cfeaf0] hover:text-white">
                  <svg
                    className="h-5 w-5"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.8"
                      d="M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2zm4 4h6m-6 4h6m-6 4h.01M12 15h.01M15 15h.01"
                    />
                  </svg>
                  Calculate your earnings
                </a>
              </div>
            </div>

            <div className="mt-6 lg:mt-12">
              <img
                className="mx-auto w-4/5 lg:w-10/12"
                src="/partner-hero-image.png"
                alt="Hero"
              />

              <div className="mt-6 lg:hidden">
                <button
                  type="button"
                  onClick={() => setShowComingSoonModal(true)}
                  className="inline-flex w-full items-center justify-center rounded-lg bg-[#0b8ea6] px-6 py-3 text-base font-semibold text-white transition-all duration-200 hover:bg-[#0ea5bf]"
                >
                  Partner Login
                </button>

                <a href="#partner-calculator" className="mt-4 flex w-full items-center justify-center gap-2 text-base font-medium text-[#cfeaf0] hover:text-white">
                  <svg
                    className="h-5 w-5"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.8"
                      d="M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2zm4 4h6m-6 4h6m-6 4h.01M12 15h.01M15 15h.01"
                    />
                  </svg>
                  Calculate your earnings
                </a>
              </div>
            </div>
          </div>

          <div className="mt-14 grid grid-cols-1 gap-8 border-t border-white/15 pt-8 lg:grid-cols-2 lg:items-center">
            <div className="text-center lg:text-left">
              <p className="text-lg font-semibold text-white sm:text-xl">
                Partner with a trusted platform
              </p>
              <div className="mt-3 flex items-center justify-center gap-3 text-[#cfeaf0] lg:justify-start">
                <span className="inline-flex items-center gap-1">
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-[2px] bg-[#00b67a] text-[11px] leading-none text-white">★</span>
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-[2px] bg-[#00b67a] text-[11px] leading-none text-white">★</span>
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-[2px] bg-[#00b67a] text-[11px] leading-none text-white">★</span>
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-[2px] bg-[#00b67a] text-[11px] leading-none text-white">★</span>
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-[2px] bg-[#00b67a] text-[11px] leading-none text-white">★</span>
                </span>
                <span className="text-sm font-medium sm:text-base">
                  100+ Reviews on Trustpilot
                </span>
              </div>
            </div>

            <div className="grid w-full grid-cols-3 gap-3 text-center lg:flex lg:w-auto lg:items-start lg:justify-end lg:gap-x-5 lg:gap-y-4 lg:text-left">
              <div className="min-w-0 lg:pr-5 lg:border-r lg:border-white/20">
                <p className="text-lg font-bold text-white sm:text-xl">10k+</p>
                <p className="mt-1 text-xs text-[#cfeaf0] sm:text-sm">Customers</p>
              </div>

              <div className="min-w-0 lg:pr-5 lg:border-r lg:border-white/20">
                <p className="text-lg font-bold text-white sm:text-xl">N500M+</p>
                <p className="mt-1 text-xs text-[#cfeaf0] sm:text-sm">Paid in rewards worldwide</p>
              </div>

              <div className="min-w-0 lg:pr-5">
                <p className="text-lg font-bold text-white sm:text-xl">4.8/5</p>
                <p className="mt-1 text-xs text-[#cfeaf0] sm:text-sm">Trustpilot</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="partner-calculator" className="relative z-10 pb-20 sm:pb-24 lg:pb-28 scroll-mt-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-2xl font-bold text-white sm:text-3xl lg:text-4xl">
            Why Become Our Partner?
          </h2>

          <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-3">
            <article className="group rounded-2xl border border-white/15 bg-white/[0.03] p-4 transition-all duration-300 hover:-translate-y-1 hover:border-[#0ea5bf]/40 hover:bg-white/[0.05] sm:p-5">
              <div className="relative flex aspect-[16/10] items-center justify-center overflow-hidden rounded-xl border border-[#0ea5bf]/30 bg-gradient-to-br from-[#123f4b] via-[#0e3540] to-[#081f27]">
                <div className="absolute -left-8 -top-8 h-24 w-24 rounded-full bg-[#0ea5bf]/20 blur-2xl" />
                <div className="absolute -bottom-8 -right-8 h-24 w-24 rounded-full bg-[#7de4f8]/20 blur-2xl" />
                <div className="text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#0ea5bf]/20">
                    <svg className="h-7 w-7 text-[#7de4f8]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="M3 10h18" />
                      <path d="M7 14h10" />
                      <path d="M8 6h8" />
                      <path d="M6 18h12" />
                    </svg>
                  </div>
                  <p className="mt-3 text-xs font-medium text-[#cfeaf0]">High-demand challenge products</p>
                </div>
              </div>
              <h3 className="mt-5 text-xl font-semibold text-white">1. Proven Rewards</h3>
              <p className="mt-3 text-sm leading-relaxed text-[#cfeaf0] sm:text-base">
                Promote the MacheFunded Challenges (NGN Flexi &amp; Standard), our most popular product with strong demand. Benefit from high affiliate earnings.
              </p>
            </article>

            <article className="group rounded-2xl border border-white/15 bg-white/[0.03] p-4 transition-all duration-300 hover:-translate-y-1 hover:border-[#0ea5bf]/40 hover:bg-white/[0.05] sm:p-5">
              <div className="relative flex aspect-[16/10] items-center justify-center overflow-hidden rounded-xl border border-[#0ea5bf]/30 bg-gradient-to-br from-[#123f4b] via-[#0e3540] to-[#081f27]">
                <div className="absolute -left-8 -top-8 h-24 w-24 rounded-full bg-[#0ea5bf]/20 blur-2xl" />
                <div className="absolute -bottom-8 -right-8 h-24 w-24 rounded-full bg-[#7de4f8]/20 blur-2xl" />
                <div className="text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#0ea5bf]/20">
                    <svg className="h-7 w-7 text-[#7de4f8]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="M4 18h16" />
                      <path d="M7 18v-6" />
                      <path d="M12 18V9" />
                      <path d="M17 18v-12" />
                    </svg>
                  </div>
                  <p className="mt-3 text-xs font-medium text-[#cfeaf0]">Grow through partner levels</p>
                </div>
              </div>
              <h3 className="mt-5 text-xl font-semibold text-white">2. Level Up &amp; Claim Rewards</h3>
              <p className="mt-3 text-sm leading-relaxed text-[#cfeaf0] sm:text-base">
                Progress through four partner levels and unlock exclusive affiliate rewards based on your performance, consistency, and growth.
              </p>
            </article>

            <article className="group rounded-2xl border border-white/15 bg-white/[0.03] p-4 transition-all duration-300 hover:-translate-y-1 hover:border-[#0ea5bf]/40 hover:bg-white/[0.05] sm:p-5">
              <div className="relative flex aspect-[16/10] items-center justify-center overflow-hidden rounded-xl border border-[#0ea5bf]/30 bg-gradient-to-br from-[#123f4b] via-[#0e3540] to-[#081f27]">
                <div className="absolute -left-8 -top-8 h-24 w-24 rounded-full bg-[#0ea5bf]/20 blur-2xl" />
                <div className="absolute -bottom-8 -right-8 h-24 w-24 rounded-full bg-[#7de4f8]/20 blur-2xl" />
                <div className="text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#0ea5bf]/20">
                    <svg className="h-7 w-7 text-[#7de4f8]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <rect x="3" y="6" width="18" height="12" rx="2" />
                      <path d="M3 10h18" />
                      <path d="M7 14h4" />
                    </svg>
                  </div>
                  <p className="mt-3 text-xs font-medium text-[#cfeaf0]">Fast and flexible payouts</p>
                </div>
              </div>
              <h3 className="mt-5 text-xl font-semibold text-white">3. Instant Earnings &amp; Flexible Payments</h3>
              <p className="mt-3 text-sm leading-relaxed text-[#cfeaf0] sm:text-base">
                Your commissions are approved immediately and are ready for payout. Receive your earnings via bank transfer or crypto.
              </p>
            </article>
          </div>
        </div>
      </section>

      <section className="relative z-10 pb-20 sm:pb-24 lg:pb-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-wider text-[#cfeaf0]">
              Calculate your earnings
            </p>

            <h2 className="mt-3 text-3xl font-bold text-white sm:text-5xl">
              How Much You Can Earn
            </h2>

            <p className="mx-auto mt-4 max-w-3xl text-sm leading-relaxed text-[#cfeaf0] sm:text-base">
              Earn more as you grow. Explore how your commission scales with level using our interactive calculator.
            </p>
          </div>

          <div className="mx-auto mt-8 max-w-5xl rounded-2xl border border-white/15 bg-white/[0.03] p-5 sm:p-6 lg:p-7">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:items-end">
              <div>
                  <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-[#cfeaf0]">Level</label>
                  <select
                    value={selectedLevel}
                    onChange={(e) => setSelectedLevel(e.target.value as (typeof levelOptions)[number]['key'])}
                    className="w-full rounded-md border border-[#1a5563] bg-[#114554] px-3 py-3 text-sm text-white outline-none focus:border-[#0ea5bf]"
                  >
                    {levelOptions.map((level) => (
                      <option key={level.key} value={level.key}>{level.label}</option>
                    ))}
                  </select>
              </div>

              <div>
                  <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-[#cfeaf0]">Challenge Type</label>
                  <select
                    value={selectedChallenge}
                    onChange={(e) => {
                      const nextType = e.target.value as keyof typeof challengeOptions;
                      setSelectedChallenge(nextType);
                      setSelectedAccountSize(challengeOptions[nextType].accounts[0].size);
                    }}
                    className="w-full rounded-md border border-[#1a5563] bg-[#114554] px-3 py-3 text-sm text-white outline-none focus:border-[#0ea5bf]"
                  >
                    {Object.entries(challengeOptions).map(([key, data]) => (
                      <option key={key} value={key}>{data.label}</option>
                    ))}
                  </select>
              </div>

              <div>
                  <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-[#cfeaf0]">Account Size</label>
                  <select
                    value={selectedAccountSize}
                    onChange={(e) => setSelectedAccountSize(e.target.value)}
                    className="w-full rounded-md border border-[#1a5563] bg-[#114554] px-3 py-3 text-sm text-white outline-none focus:border-[#0ea5bf]"
                  >
                    {selectedChallengeData.accounts.map((tier) => (
                      <option key={tier.size} value={tier.size}>{tier.size}</option>
                    ))}
                  </select>
              </div>
            </div>

            <div className="mt-6">
              <div className="flex items-center justify-between gap-3">
                <label htmlFor="referral-count" className="text-sm font-medium text-[#cfeaf0]">
                  Referral Count
                </label>
                <span className="text-sm font-semibold text-white">{referralCount}</span>
              </div>

              <input
                id="referral-count"
                type="range"
                min={1}
                max={500}
                step={1}
                value={referralCount}
                onChange={(e) => setReferralCount(Number(e.target.value))}
                className="mt-3 w-full accent-[#0ea5bf]"
              />
            </div>

            <div className="mt-6 rounded-xl border border-[#0ea5bf]/35 bg-gradient-to-br from-[#0e3540] to-[#0a2a33] p-4 sm:p-5">
              <p className="text-sm font-medium uppercase tracking-wider text-[#cfeaf0]">Estimated Earnings</p>
              <p className="mt-2 text-xs text-[#cfeaf0]">
                Challenge Fee: {formattedChallengePrice} • Commission: {(selectedCommissionRate * 100).toFixed(0)}% • Per Referral: ₦{earningPerReferral.toLocaleString()}
              </p>
              <p className="mt-3 text-3xl font-bold text-white sm:text-4xl">
                ₦{estimatedEarnings.toLocaleString()}
              </p>
              <p className="mt-2 text-xs text-[#cfeaf0]">Select your level, challenge type, and account size to see your expected commission amount.</p>
            </div>

            <p className="mt-5 rounded-lg border border-[#0ea5bf]/25 bg-[#0ea5bf]/10 px-4 py-3 text-sm leading-relaxed text-[#cfeaf0]">
              Top-performing partners may receive additional rewards, including cash bonuses and advertising support, based on performance, consistency, and impact.
            </p>
          </div>
        </div>
      </section>

      <section className="relative z-10 pb-20 sm:pb-24 lg:pb-28">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-white sm:text-4xl lg:text-5xl">
            Partner Levels
          </h2>
          <p className="mx-auto mt-4 max-w-3xl text-sm leading-relaxed text-[#cfeaf0] sm:text-base">
            Level up based on your monthly commissions to lock in each achieved level for three full months.
          </p>
        </div>

        <div className="mx-auto mt-10 max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
            <article className="rounded-2xl border border-[#8b5e34]/45 bg-gradient-to-b from-[#2d2217] to-[#1d1711] p-5">
              <h3 className="text-2xl font-bold text-[#f4c58d]">🥉 Bronze (Entry Partner)</h3>
              <p className="mt-4 text-xs uppercase tracking-wide text-[#cfeaf0]">Commission:</p>
              <p className="text-2xl font-bold text-white">20%</p>

              <p className="mt-4 text-xs uppercase tracking-wide text-[#cfeaf0]">Required Monthly Sales:</p>
              <p className="text-lg font-semibold text-white">10</p>

              <p className="mt-4 text-xs uppercase tracking-wide text-[#cfeaf0]">Discount:</p>
              <p className="text-sm font-medium text-white">10%</p>

              <p className="mt-4 text-xs uppercase tracking-wide text-[#cfeaf0]">Free MF Challenge:</p>
              <p className="text-sm font-medium text-white">• N200,000 Flexi (monthly)</p>
            </article>

            <article className="rounded-2xl border border-[#aeb7c4]/45 bg-gradient-to-b from-[#2a313c] to-[#1b222b] p-5">
              <h3 className="text-2xl font-bold text-[#dde4ef]">🥈 Silver (Serious Partner)</h3>
              <p className="mt-4 text-xs uppercase tracking-wide text-[#cfeaf0]">Commission:</p>
              <p className="text-2xl font-bold text-white">25%</p>

              <p className="mt-4 text-xs uppercase tracking-wide text-[#cfeaf0]">Required Monthly Sales:</p>
              <p className="text-lg font-semibold text-white">25</p>

              <p className="mt-4 text-xs uppercase tracking-wide text-[#cfeaf0]">Discount:</p>
              <p className="text-sm font-medium text-white">10%</p>

              <p className="mt-4 text-xs uppercase tracking-wide text-[#cfeaf0]">Rewards:</p>
              <p className="text-sm font-medium text-white">• N500,000 Flexi (monthly)</p>
              <p className="mt-2 text-xs uppercase tracking-wide text-[#cfeaf0]">Community Giveaway:</p>
              <p className="text-sm font-medium text-white">• 1 × 200k NGN Standard</p>
            </article>

            <article className="rounded-2xl border border-[#d4af37]/45 bg-gradient-to-b from-[#332a12] to-[#221c0f] p-5">
              <h3 className="text-2xl font-bold text-[#f3d36d]">🥇 Gold (High Performer)</h3>
              <p className="mt-4 text-xs uppercase tracking-wide text-[#cfeaf0]">Commission:</p>
              <p className="text-2xl font-bold text-white">30%</p>

              <p className="mt-4 text-xs uppercase tracking-wide text-[#cfeaf0]">Required Monthly Sales:</p>
              <p className="text-lg font-semibold text-white">40</p>

              <p className="mt-4 text-xs uppercase tracking-wide text-[#cfeaf0]">Discount:</p>
              <p className="text-sm font-medium text-white">10%</p>

              <p className="mt-4 text-xs uppercase tracking-wide text-[#cfeaf0]">Rewards:</p>
              <p className="text-sm font-medium text-white">• N800,000 Flexi (monthly)</p>
              <p className="mt-2 text-xs uppercase tracking-wide text-[#cfeaf0]">Community Giveaway:</p>
              <p className="text-sm font-medium text-white">• 3 × 200k NGN Standard</p>
            </article>

            <article className="rounded-2xl border border-[#8be8ff]/45 bg-gradient-to-b from-[#15313a] to-[#0f2229] p-5">
              <h3 className="text-2xl font-bold text-[#a5f0ff]">💎 Platinum (Elite)</h3>
              <p className="mt-4 text-xs uppercase tracking-wide text-[#cfeaf0]">Commission:</p>
              <p className="text-2xl font-bold text-white">35%</p>

              <p className="mt-4 text-xs uppercase tracking-wide text-[#cfeaf0]">Required Monthly Sales:</p>
              <p className="text-lg font-semibold text-white">60</p>

              <p className="mt-4 text-xs uppercase tracking-wide text-[#cfeaf0]">Discount:</p>
              <p className="text-sm font-medium text-white">10%</p>

              <p className="mt-4 text-xs uppercase tracking-wide text-[#cfeaf0]">Rewards:</p>
              <p className="text-sm font-medium text-white">• N800,000 Flexi ×2 (Transferable)</p>
              <p className="mt-2 text-xs uppercase tracking-wide text-[#cfeaf0]">Community Giveaway:</p>
              <p className="text-sm font-medium text-white">• 5 × 200k Standard</p>
              <p className="text-sm font-medium text-white">• 2 × 200k Flexi</p>
            </article>
          </div>
        </div>
      </section>

      <section className="relative z-10 pb-24 sm:pb-28 lg:pb-32">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-white sm:text-4xl lg:text-5xl">
              Frequently Asked Questions
            </h2>
            <p className="mx-auto mt-4 max-w-3xl text-sm leading-relaxed text-[#cfeaf0] sm:text-base">
              Do you have any questions about our FTMO Affiliate Programme? You are going to find all the answers here!
            </p>
          </div>

          <div className="mt-10 space-y-4">
            {partnerFaqs.map((item, index) => (
              <article key={item.question} className="rounded-xl border border-white/15 bg-white/[0.03]">
                <button
                  type="button"
                  onClick={() => setOpenFaqIndex(openFaqIndex === index ? null : index)}
                  className="flex w-full items-center justify-between px-5 py-4 text-left"
                >
                  <h3 className="pr-4 text-sm font-semibold text-white sm:text-base">{item.question}</h3>
                  <span className="text-xl font-semibold text-[#cfeaf0]">
                    {openFaqIndex === index ? '−' : '+'}
                  </span>
                </button>

                {openFaqIndex === index && (
                  <p className="px-5 pb-4 whitespace-pre-line text-sm leading-relaxed text-[#cfeaf0]">
                    {item.answer}
                  </p>
                )}
              </article>
            ))}
          </div>
        </div>
      </section>

      {showComingSoonModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-md rounded-2xl border border-white/20 bg-[#071b22] p-6 text-center shadow-2xl">
            <h3 className="text-2xl font-bold text-white">Coming Soon</h3>
            <p className="mt-3 text-sm leading-relaxed text-[#cfeaf0]">
              Partner Login will be available soon. Please check back shortly.
            </p>
            <button
              type="button"
              onClick={() => setShowComingSoonModal(false)}
              className="mt-6 inline-flex items-center justify-center rounded-lg bg-[#0b8ea6] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0ea5bf]"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
