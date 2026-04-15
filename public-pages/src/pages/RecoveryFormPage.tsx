import { AlertTriangle, LoaderCircle, Mail, ShieldAlert } from 'lucide-react';
import { useState } from 'react';

const phaseOptions = ['Phase 1', 'Phase 2', 'Funded'];

type FormState = {
  email: string;
  accountNumber: string;
  phase: string;
};

const initialState: FormState = {
  email: '',
  accountNumber: '',
  phase: '',
};

export default function RecoveryFormPage() {
  const [form, setForm] = useState<FormState>(initialState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleChange = (field: keyof FormState, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setSuccessMessage('');
    setErrorMessage('');

    try {
      const response = await fetch('/api/recovery-form', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: form.email.trim(),
          accountNumber: form.accountNumber.trim(),
          phase: form.phase,
        }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.message || 'Unable to submit your recovery request right now.');
      }

      setSuccessMessage('Your recovery request has been submitted successfully. Our team will review it shortly.');
      setForm(initialState);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Something went wrong while submitting your form. Please try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="pt-28 pb-20 px-4">
      <section className="max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <p className="text-sm font-medium text-[#ffd700] uppercase tracking-wide mb-3">Account Support</p>
          <h1 className="text-3xl md:text-5xl font-semibold text-white">Recovery Form</h1>
          <p className="text-gray-300 mt-3 max-w-2xl mx-auto">
            Submit the correct details linked to your trading account so our team can review your recovery request quickly.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 md:p-8 shadow-[0_20px_70px_rgba(0,0,0,0.24)]">
            <div className="mb-6 flex items-start gap-3 rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4 text-left">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-amber-200">Important warning</h2>
                <p className="mt-2 text-sm leading-relaxed text-amber-50/90">
                  Avoid sending wrong details or attempting to manipulate any information. Any false submission or data manipulation
                  will lead to a permanent ban on your account.
                </p>
              </div>
            </div>

            <form className="grid gap-5" onSubmit={handleSubmit}>
              <label className="grid gap-2 text-sm text-gray-300">
                Email Address
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(event) => handleChange('email', event.target.value)}
                  className="rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white placeholder:text-white/35 focus:outline-none focus:ring-2 focus:ring-[#ffd700]/60"
                  placeholder="you@example.com"
                />
              </label>

              <label className="grid gap-2 text-sm text-gray-300">
                Account Number
                <input
                  type="text"
                  inputMode="numeric"
                  required
                  value={form.accountNumber}
                  onChange={(event) => handleChange('accountNumber', event.target.value)}
                  className="rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white placeholder:text-white/35 focus:outline-none focus:ring-2 focus:ring-[#ffd700]/60"
                  placeholder="Enter your account number"
                />
              </label>

              <label className="grid gap-2 text-sm text-gray-300">
                Phase
                <select
                  required
                  value={form.phase}
                  onChange={(event) => handleChange('phase', event.target.value)}
                  className="rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#ffd700]/60"
                >
                  <option value="" disabled className="text-black">
                    Select account phase
                  </option>
                  {phaseOptions.map((phase) => (
                    <option key={phase} value={phase} className="text-black">
                      {phase}
                    </option>
                  ))}
                </select>
              </label>

              {successMessage ? (
                <div className="rounded-2xl border border-emerald-400/25 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
                  {successMessage}
                </div>
              ) : null}

              {errorMessage ? (
                <div className="rounded-2xl border border-red-400/25 bg-red-400/10 px-4 py-3 text-sm text-red-100">
                  {errorMessage}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#ffd700] px-6 py-3 font-semibold text-black transition hover:bg-[#ffea62] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? (
                  <>
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Recovery Request'
                )}
              </button>
            </form>
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-[#0d313a] to-[#071c22] p-6 md:p-8 shadow-[0_20px_70px_rgba(0,0,0,0.24)]">
              <div className="mb-4 inline-flex rounded-full border border-[#7fe7f7]/20 bg-[#7fe7f7]/10 p-3 text-[#7fe7f7]">
                <Mail className="h-5 w-5" />
              </div>
              <h2 className="text-2xl font-semibold text-white">Before you submit</h2>
              <ul className="mt-4 space-y-3 text-sm leading-relaxed text-white/75">
                <li>• Make sure the email matches the one used on your trading account.</li>
                <li>• Double-check your account number before sending the request.</li>
                <li>• Select the correct account stage: Phase 1, Phase 2, or Funded.</li>
              </ul>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 md:p-8">
              <div className="mb-4 inline-flex rounded-full border border-white/10 bg-white/5 p-3 text-[#ffd700]">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <h2 className="text-xl font-semibold text-white">Review policy</h2>
              <p className="mt-3 text-sm leading-relaxed text-gray-300">
                Every submission is reviewed manually. Incorrect details, duplicated attempts, or manipulated data may delay your
                request and can result in a permanent restriction from our services.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}