import { ArrowRightIcon, CheckCircle2Icon } from 'lucide-react';

const atticBenefits = [
	'Prove your ability',
	'Earn your challenge',
	'Begin your journey to becoming a funded trader',
];

const audience = [
	'Traders with strong strategies but limited capital',
	'Traders who want a fast-track opportunity',
	'Traders confident in their ability to deliver results quickly',
];

const atticRules = [
	{ label: 'Profit Target', value: '30%' },
	{ label: 'Maximum Drawdown', value: '20%' },
	{ label: 'Time Limit', value: '24 Hours' },
	{ label: 'Rules', value: 'No additional restrictions' },
];

const accountInfo = [
	{ label: 'Account Type', value: 'Standard Challenge' },
	{ label: 'Account Size', value: '₦200,000 NGN' },
	{ label: 'Entry Fee', value: '₦1,500' },
];

const comingSoonAccount = [
	{ label: 'Account Type', value: '2 Step Challenge' },
	{ label: 'Account Size', value: '$2,000' },
	{ label: 'Entry Fee', value: '$2' },
];

export default function AtticProgramPage() {
	return (
		<main className="relative overflow-hidden pt-24 md:pt-28">
			<div className="pointer-events-none absolute inset-0">
				<div className="absolute inset-x-0 top-0 h-[30rem] bg-[radial-gradient(circle_at_top,rgba(14,137,158,0.18),transparent_68%)]" />
				<div className="absolute left-[-8rem] top-40 h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl" />
				<div className="absolute right-[-10rem] top-[30rem] h-80 w-80 rounded-full bg-teal-500/10 blur-3xl" />
			</div>

			<section className="relative px-4 pb-12 pt-8 md:pb-16 md:pt-10">
				<div className="mx-auto max-w-6xl">
					<div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
						<div>
							<p className="mb-4 text-sm font-semibold uppercase tracking-[0.28em] text-[#7fe7f7]">
								MACHEFUNDED ATTIC PROGRAM
							</p>
							<h1 className="max-w-4xl text-4xl font-extrabold leading-tight text-white md:text-6xl">
								Discovering Talent. <br />
								<span className="bg-linear-to-r from-[#7fe7f7] to-white bg-clip-text text-transparent">
									Unlocking Opportunity.
								</span>
							</h1>
							<p className="mt-6 text-lg font-medium text-white/85 md:text-2xl">
								Not every great trader has the capital to start.
							</p>
							<div className="mt-6 max-w-3xl space-y-4 text-base leading-relaxed text-white/72 md:text-lg">
								<p>
									At MACHEFUNDED, we believe skill should never be limited by money.
								</p>
								<p>
									That’s why we created the MACHEFUNDED Attic Program — a unique pathway designed to discover talented traders and give them a real opportunity to get funded.
								</p>
							</div>

							<div className="mt-8 flex flex-row flex-wrap gap-3">
								<a
									href="https://attic.machefunded.com"
									className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-black transition hover:bg-gray-100"
								>
									Dashboard
									<ArrowRightIcon className="size-4" />
								</a>
								<a
									href="https://machefunded.com/#pricing"
									className="inline-flex items-center justify-center rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
								>
									Main Challenges
								</a>
							</div>
						</div>

						<div className="rounded-3xl border border-white/12 bg-gradient-to-b from-white/10 to-white/[0.04] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.22)]">
							<p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#7fe7f7]">
								Available Account
							</p>
							<div className="mt-5 grid gap-4">
								<div className="overflow-hidden rounded-2xl border border-white/10 bg-black/10">
									{accountInfo.map((item, index) => (
										<div
											key={item.label}
											className={`flex items-center justify-between gap-4 px-4 py-4 ${index !== accountInfo.length - 1 ? 'border-b border-white/8' : ''}`}
										>
											<span className="text-white/68">{item.label}</span>
											<span className="text-right font-semibold text-white">{item.value}</span>
										</div>
									))}
								</div>

								<div className="overflow-hidden rounded-2xl border border-dashed border-[#7fe7f7]/30 bg-[#0b2128]">
									<div className="flex items-center justify-between border-b border-white/8 px-4 py-4">
										<p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#7fe7f7]">
											Coming Soon
										</p>
										<span className="rounded-full border border-[#7fe7f7]/25 bg-[#103540] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#7fe7f7]">
											Soon
										</span>
									</div>
									{comingSoonAccount.map((item, index) => (
										<div
											key={item.label}
											className={`flex items-center justify-between gap-4 px-4 py-4 ${index !== comingSoonAccount.length - 1 ? 'border-b border-white/8' : ''}`}
										>
											<span className="text-white/68">{item.label}</span>
											<span className="text-right font-semibold text-white">{item.value}</span>
										</div>
									))}
								</div>
							</div>
							<p className="mt-5 text-sm leading-relaxed text-white/68">
								This keeps the program accessible while maintaining a serious trading environment.
							</p>
						</div>
					</div>
				</div>
			</section>

			<section className="relative border-t border-white/8 bg-white/[0.02] px-4 py-14 md:py-18">
				<div className="mx-auto max-w-6xl">
					<div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
						<div className="rounded-3xl border border-white/10 bg-gradient-to-b from-white/8 to-white/[0.03] p-7">
							<p className="mb-3 text-sm font-semibold uppercase tracking-[0.24em] text-[#7fe7f7]">
								What is the Attic Program?
							</p>
							<p className="text-base leading-relaxed text-white/74">
								The Attic Program is a low-cost entry challenge created for traders who are confident in their skills but may not yet have the funds to purchase a standard challenge account.
							</p>
							<p className="mt-5 text-sm font-semibold uppercase tracking-[0.2em] text-white/50">
								Instead of being locked out, you now have a chance to:
							</p>
							<div className="mt-5 space-y-3">
								{atticBenefits.map((item) => (
									<div key={item} className="flex items-start gap-3 rounded-2xl border border-white/8 bg-black/10 px-4 py-3">
										<CheckCircle2Icon className="mt-0.5 size-5 text-[#7fe7f7]" />
										<span className="text-white/78">{item}</span>
									</div>
								))}
							</div>
						</div>

						<div className="rounded-3xl border border-white/10 bg-gradient-to-b from-[#0c2f39] to-[#071c22] p-7">
							<p className="mb-3 text-sm font-semibold uppercase tracking-[0.24em] text-[#7fe7f7]">
								How It Works
							</p>
							<p className="text-base leading-relaxed text-white/74">
								The Attic Program introduces a pre-challenge phase that you must successfully complete before accessing the full challenge.
							</p>
							<div className="mt-6 rounded-2xl border border-white/10 bg-black/10 p-5">
								<p className="text-sm font-semibold uppercase tracking-[0.22em] text-white/55">Step 1</p>
								<h3 className="mt-2 text-2xl font-semibold text-white">The Attic Challenge</h3>
								<p className="mt-3 text-white/70">
									Before receiving your standard account, you must pass the Attic phase.
								</p>
								<div className="mt-5 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
									{atticRules.map((item, index) => (
										<div
											key={item.label}
											className={`flex items-center justify-between gap-4 px-4 py-3 text-sm ${index !== atticRules.length - 1 ? 'border-b border-white/8' : ''}`}
										>
											<span className="text-white/68">{item.label}</span>
											<span className="font-semibold text-white">{item.value}</span>
										</div>
									))}
								</div>
							</div>
						</div>
					</div>
				</div>
			</section>

			<section className="px-4 py-14 md:py-18">
				<div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-2">
					<div className="rounded-3xl border border-white/10 bg-gradient-to-b from-white/8 to-white/[0.03] p-7">
						<p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#7fe7f7]">Step 2</p>
						<h2 className="mt-3 text-3xl font-semibold text-white">Unlock the Full Challenge</h2>
						<p className="mt-4 text-white/72">
							Once you successfully complete the Attic Challenge, you will receive a ₦200,000 Standard Challenge Account and begin from Phase 1 of the normal challenge.
						</p>
						<div className="mt-5 space-y-3">
							{[
								'You will receive a ₦200,000 Standard Challenge Account',
								'You will begin from Phase 1 of the normal challenge',
								'All standard rules and objectives will now apply',
							].map((item) => (
								<div key={item} className="flex items-start gap-3 rounded-2xl border border-white/8 bg-black/10 px-4 py-3">
									<CheckCircle2Icon className="mt-0.5 size-5 text-[#7fe7f7]" />
									<span className="text-white/78">{item}</span>
								</div>
							))}
						</div>
						<div className="mt-6 rounded-2xl border border-[#7fe7f7]/20 bg-[#0d2730] px-5 py-4 text-center text-lg font-semibold text-white">
							Attic → Phase 1 → Phase 2 → Funded
						</div>
					</div>

					<div className="space-y-6">
						<div className="rounded-3xl border border-white/10 bg-gradient-to-b from-[#0c2f39] to-[#071c22] p-7">
							<p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#7fe7f7]">Who Is This For?</p>
							<div className="mt-5 space-y-3">
								{audience.map((item) => (
									<div key={item} className="rounded-2xl border border-white/8 bg-black/10 px-4 py-3 text-white/78">
										{item}
									</div>
								))}
							</div>
						</div>

						<div className="rounded-3xl border border-white/10 bg-gradient-to-b from-white/8 to-white/[0.03] p-7">
							<p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#7fe7f7]">Why the Attic Program?</p>
							<h3 className="mt-3 text-2xl font-semibold text-white">Because talent deserves a chance.</h3>
							<div className="mt-4 space-y-4 text-white/72">
								<p>
									Too many skilled traders are held back — not by ability, but by access. The Attic Program removes that barrier and replaces it with pure performance.
								</p>
								<p>No unnecessary complexity. No long waiting periods. Just you, your strategy, and the market.</p>
							</div>
						</div>
					</div>
				</div>
			</section>

			<section className="border-t border-white/8 bg-white/[0.02] px-4 py-14 md:py-18">
				<div className="mx-auto max-w-5xl rounded-[2rem] border border-white/10 bg-gradient-to-b from-[#0f3a46] to-[#071c22] px-6 py-10 text-center shadow-[0_20px_70px_rgba(0,0,0,0.24)] md:px-10">
					<p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#7fe7f7]">Final Note</p>
					<h2 className="mt-4 text-3xl font-semibold text-white md:text-5xl">Start From the Attic. Rise to the Top.</h2>
					<div className="mx-auto mt-6 max-w-3xl space-y-4 text-white/76">
						<p>This is not for everyone.</p>
						<p>
							The Attic Challenge is fast, intense, and requires discipline. But for those who succeed, it opens the door to something bigger.
						</p>
						<p className="text-lg font-medium text-white">A real opportunity to get funded.</p>
						<p>Your journey begins here.</p>
					</div>
					<a
						href="https://trader.machefunded.com/start-challenge"
						className="mt-8 inline-flex items-center justify-center gap-2 rounded-full bg-white px-7 py-3 text-sm font-semibold text-black transition hover:bg-gray-100"
					>
						Start the Attic Program
						<ArrowRightIcon className="size-4" />
					</a>
				</div>
			</section>
		</main>
	);
}