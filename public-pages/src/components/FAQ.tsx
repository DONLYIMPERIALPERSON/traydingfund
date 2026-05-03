const faqs = [
  {
    question: 'What is MacheFunded?',
    answer:
      'MacheFunded is a prop trading firm that funds traders who meet clear trading objectives and risk rules.',
  },
  {
    question: 'How fast can I get funded?',
    answer:
      'You can choose from 1-step, 2-step, NGN 1-step, NGN Standard, NGN Flexi, or Breezy options. Once you pass the required phase(s), you receive a funded account.',
  },
  {
    question: 'What is max drawdown?',
    answer:
      'Max drawdown is the total loss limit on your account balance or equity. For 1-Step and 2-Step challenges it is 11%. NGN 1-Step uses 10%.',
  },
  {
    question: 'What is max daily drawdown?',
    answer:
      'Max daily drawdown is the maximum loss you can take in a single day. It is 5% for 1-Step and 2-Step challenges, while NGN 1-Step uses 3%.',
  },
  {
    question: 'When does the daily drawdown reset?',
    answer:
      'Daily drawdown resets at 00:00 UTC each day, based on the highest balance reached during the UTC day. To make the reset visible in your metrics, you must trigger a position/trade so the metrics refresh. If you already have an open position, it should update automatically.',
  },
  {
    question: 'What are the profit targets?',
    answer:
      'For 2-Step challenges, the target is 10% in Phase 1 and 5% in Phase 2. For 1-Step challenges, the target is 10%.',
  },
  {
    question: 'Do you have minimum trading days?',
    answer:
      'Yes. 1-Step, 2-Step, and NGN 1-Step challenges require at least 1 trading day per required phase.',
  },
  {
    question: 'What profit split do I receive?',
    answer:
      'Funded 1-Step, 2-Step, and NGN 1-Step accounts pay up to 80% profit split.',
  },
  {
    question: 'How often are withdrawals processed?',
    answer:
      'Withdrawals are weekly for 1-Step, 2-Step, and NGN 1-Step funded accounts.',
  },
  {
    question: 'Do you offer account scaling?',
    answer:
      'Yes. Our scaling conditions are simple: receive 4 payouts and maintain good trading behaviour. After each set of 4 payouts, we scale your account by 50%.',
  },
  {
    question: 'Do you offer NGN 1-step accounts?',
    answer:
      'Yes. NGN 1-Step is available with Phase 1 to Funded progression, 10% max drawdown, and 3% max daily drawdown.',
  },
  {
    question: 'How do withdrawals work?',
    answer:
      'Withdrawals are processed on the schedule defined for each challenge type. Payouts are fast once approved.',
  },
  {
    question: 'Can I repeat a phase if breached?',
    answer:
      'Yes. Phase repeat is available for all Naira (NGN) accounts.',
  },
  {
    question: 'How long does KYC take and what is needed?',
    answer:
      'For NGN accounts, verification can be instant using your bank account number. For USD accounts, KYC can take up to 24 hours and requires a valid government-issued ID.',
  },
  {
    question: 'What happens if I trade an unsupported market?',
    answer:
      'Trading any unsupported market is a rule violation and can immediately breach your account. Always check the Supported Markets list before placing a trade.',
  },
  {
    question: 'What happens if I trade during review windows?',
    answer:
      'Review windows include events such as withdrawal requests and next-phase resets. During these periods, our system does not monitor accounts. If you trade during a withdrawal review window, any profits made may be deducted and the withdrawal may be rejected. If you trade during a next-phase reset window, the account may be breached. For your safety, do not trade during any review window until processing is complete.',
  },
  {
    question: 'Where do I start my challenge?',
    answer:
      'Select a challenge on this page and click Start Now to head to the trader area checkout.',
  },
];

type FAQProps = {
  limit?: number
  showReadMore?: boolean
}

export default function FAQ({ limit, showReadMore = false }: FAQProps) {
  const visibleFaqs = typeof limit === 'number' ? faqs.slice(0, limit) : faqs

  return (
    <section id="faq" className="border-t border-white/8 bg-white/[0.02] py-14 md:py-20">
      <div className="max-w-5xl mx-auto px-4">
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-4xl text-white font-semibold">Frequently Asked Questions</h2>
          <p className="mt-3 max-w-2xl mx-auto text-white/68">
            Quick answers to the most common questions about MacheFunded challenges and payouts.
          </p>
        </div>

        <div className="grid gap-4">
          {visibleFaqs.map((faq) => (
            <div key={faq.question} className="rounded-2xl border border-white/10 bg-gradient-to-b from-white/8 to-white/[0.03] p-5 shadow-[0_0_20px_rgba(255,255,255,0.04)]">
              <h3 className="text-white font-semibold text-lg">{faq.question}</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/70">{faq.answer}</p>
            </div>
          ))}
        </div>

        {showReadMore && (
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <a
              href="/rules"
              className="inline-flex items-center justify-center rounded-full border border-[#ffd700]/50 px-6 py-2 text-sm font-semibold text-[#ffd700] transition hover:bg-[#2a2200] hover:text-white"
            >
              View trading rules
            </a>
            <a
              href="/faq"
              className="inline-flex items-center justify-center rounded-full border border-white/20 px-6 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Read more FAQs
            </a>
            <a
              href="/supported-markets"
              className="inline-flex items-center justify-center rounded-full border border-[#7fe7f7]/50 px-6 py-2 text-sm font-semibold text-[#7fe7f7] transition hover:bg-[#0f3a46] hover:text-white"
            >
              Supported markets list
            </a>
          </div>
        )}
      </div>
    </section>
  );
}