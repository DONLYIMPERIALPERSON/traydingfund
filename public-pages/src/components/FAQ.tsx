const faqs = [
  {
    question: 'What is MacheFunded?',
    answer:
      'MacheFunded is a prop trading firm that funds traders who meet clear trading objectives and risk rules.',
  },
  {
    question: 'How fast can I get funded?',
    answer:
      'You can choose from 1-step, 2-step, or instant funded challenges. Once you pass, you receive a funded account.',
  },
  {
    question: 'What is max drawdown?',
    answer:
      'Max drawdown is the total loss limit on your account balance or equity. For 1-Step and 2-Step challenges it is 11%, while Instant Funded accounts use 5%.',
  },
  {
    question: 'What is max daily drawdown?',
    answer:
      'Max daily drawdown is the maximum loss you can take in a single day. It is 5% for 1-Step and 2-Step challenges, and 2% for Instant Funded accounts.',
  },
  {
    question: 'When does the daily drawdown reset?',
    answer:
      'Daily drawdown resets at 00:00 UTC each day, based on the highest balance reached during the UTC day.',
  },
  {
    question: 'What are the profit targets?',
    answer:
      'For 2-Step challenges, the target is 10% in Phase 1 and 5% in Phase 2. For 1-Step challenges, the target is 10%.',
  },
  {
    question: 'Do you have minimum trading days?',
    answer:
      'Yes. 1-Step and 2-Step challenges require at least 1 trading day per phase, while Instant Funded accounts require 5 minimum trading days.',
  },
  {
    question: 'What is the minimum trade duration?',
    answer:
      'All challenge types enforce a minimum trade duration of 3 minutes; closing 3 trades under 3 minutes breaches the account.',
  },
  {
    question: 'What profit split do I receive?',
    answer:
      'Funded 1-Step and 2-Step accounts pay up to 80% profit split. Instant Funded accounts use a 50% split.',
  },
  {
    question: 'How often are withdrawals processed?',
    answer:
      'Withdrawals are weekly for 1-Step and 2-Step funded accounts, and bi-weekly for Instant Funded accounts.',
  },
  {
    question: 'Do you offer instant funded accounts?',
    answer:
      'Yes. Our instant funded option provides immediate access to a funded account with defined risk limits.',
  },
  {
    question: 'How do withdrawals work?',
    answer:
      'Withdrawals are processed on the schedule defined for each challenge type. Payouts are fast once approved.',
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
              href="/faq"
              className="inline-flex items-center justify-center rounded-full border border-white/20 px-6 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Read more FAQs
            </a>
            <a
              href="/supported-markets"
              className="inline-flex items-center justify-center rounded-full border border-[#7fe7f7]/50 px-6 py-2 text-sm font-semibold text-[#7fe7f7] transition hover:bg-[#0f3a46] hover:text-white"
            >
              🔗 Supported markets list
            </a>
          </div>
        )}
      </div>
    </section>
  );
}