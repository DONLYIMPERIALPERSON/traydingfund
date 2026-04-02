import { useState } from 'react';

const FORM_ACTION = 'https://docs.google.com/forms/d/e/1BlxKwkW05R8QZCyrZ4H4ny3UTdcAx8bt4OvI3wSujH8/formResponse';

const FIELD_IDS = {
  fullName: 'entry.651761561',
  whatsapp: 'entry.327336430',
  email: 'entry.265510089',
  payoutProof: 'entry.1290594590',
  payoutAmount: 'entry.1464480036',
  tradingStyle: 'entry.1864163779',
  mainAsset: 'entry.671668543',
  bigWinStory: 'entry.1086834067',
  cameraReady: 'entry.1330110893',
};

const tradingStyles = ['Scalper', 'Day Trader', 'Swing Trader'];

export default function MacheMinutePage() {
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const data = new URLSearchParams(formData as any);

    setIsSubmitting(true);
    try {
      await fetch(FORM_ACTION, {
        method: 'POST',
        mode: 'no-cors',
        body: data,
      });
      setSubmitted(true);
      form.reset();
    } catch (error) {
      console.error('Failed to submit form', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="pt-28 pb-20 px-4">
      <section className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <p className="text-sm font-medium text-[#ffd700] uppercase tracking-wide mb-3">The Mache Minute</p>
          <h1 className="text-3xl md:text-5xl font-semibold text-white">Share your MacheFunded win</h1>
          <p className="text-gray-300 mt-3 max-w-2xl mx-auto">
            Submit your story to be featured on our YouTube & TikTok highlights. Fill in the form below and we will reach out
            to schedule your interview.
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 md:p-10">
          {submitted ? (
            <div className="text-center text-white">
              <h2 className="text-2xl font-semibold mb-3">Application Received!</h2>
              <p className="text-gray-300">We will contact you shortly via WhatsApp or email to schedule your interview.</p>
            </div>
          ) : (
            <form className="grid gap-6" onSubmit={handleSubmit}>
              <div className="grid gap-4">
                <h3 className="text-lg font-semibold text-white">Personal & Contact Info</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="grid gap-2 text-sm text-gray-300">
                    Full Name
                    <input
                      name={FIELD_IDS.fullName}
                      required
                      type="text"
                      className="rounded-lg border border-white/10 bg-black/50 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#ffd700]/60"
                      placeholder="Your full name"
                    />
                  </label>
                  <label className="grid gap-2 text-sm text-gray-300">
                    WhatsApp Number
                    <input
                      name={FIELD_IDS.whatsapp}
                      required
                      type="text"
                      className="rounded-lg border border-white/10 bg-black/50 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#ffd700]/60"
                      placeholder="+234 000 000 0000"
                    />
                  </label>
                </div>
                <label className="grid gap-2 text-sm text-gray-300">
                  Email Address
                  <input
                    name={FIELD_IDS.email}
                    required
                    type="email"
                    className="rounded-lg border border-white/10 bg-black/50 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#ffd700]/60"
                    placeholder="you@example.com"
                  />
                </label>
              </div>

              <div className="grid gap-4">
                <h3 className="text-lg font-semibold text-white">Trading Proof</h3>
                <label className="grid gap-2 text-sm text-gray-300">
                  MacheFunded payout proof link
                  <input
                    name={FIELD_IDS.payoutProof}
                    required
                    type="url"
                    className="rounded-lg border border-white/10 bg-black/50 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#ffd700]/60"
                    placeholder="Paste an Imgur link or social media post"
                  />
                </label>
                <label className="grid gap-2 text-sm text-gray-300">
                  Total Payout Amount
                  <input
                    name={FIELD_IDS.payoutAmount}
                    required
                    type="number"
                    min="0"
                    step="0.01"
                    className="rounded-lg border border-white/10 bg-black/50 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#ffd700]/60"
                    placeholder="10000"
                  />
                </label>
              </div>

              <div className="grid gap-4">
                <h3 className="text-lg font-semibold text-white">Content Prep (The Alpha)</h3>
                <label className="grid gap-2 text-sm text-gray-300">
                  Trading Style
                  <select
                    name={FIELD_IDS.tradingStyle}
                    required
                    className="rounded-lg border border-white/10 bg-black/50 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#ffd700]/60"
                    defaultValue=""
                  >
                    <option value="" disabled>
                      Select your style
                    </option>
                    {tradingStyles.map((style) => (
                      <option key={style} value={style} className="text-black">
                        {style}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-2 text-sm text-gray-300">
                  Main Asset Traded
                  <input
                    name={FIELD_IDS.mainAsset}
                    required
                    type="text"
                    className="rounded-lg border border-white/10 bg-black/50 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#ffd700]/60"
                    placeholder="Gold (XAUUSD)"
                  />
                </label>
                <label className="grid gap-2 text-sm text-gray-300">
                  The “Big Win” Story
                  <textarea
                    name={FIELD_IDS.bigWinStory}
                    required
                    rows={4}
                    className="rounded-lg border border-white/10 bg-black/50 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#ffd700]/60"
                    placeholder="Tell us about your most memorable trade..."
                  />
                </label>
              </div>

              <div className="grid gap-3">
                <h3 className="text-lg font-semibold text-white">Technical Readiness</h3>
                <p className="text-sm text-gray-300">Can you record with Camera & Microphone?</p>
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2 text-sm text-gray-300">
                    <input name={FIELD_IDS.cameraReady} type="radio" value="Yes" required />
                    Yes
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-300">
                    <input name={FIELD_IDS.cameraReady} type="radio" value="No" required />
                    No
                  </label>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-lg bg-[#ffd700] px-6 py-3 text-black font-semibold hover:bg-[#ffea62] transition disabled:opacity-60"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Application'}
              </button>
            </form>
          )}
        </div>
      </section>
    </main>
  );
}