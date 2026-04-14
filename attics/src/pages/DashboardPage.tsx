import React, { useState } from 'react';

const bottomNavItems = [
	{ label: 'Accounts', icon: 'fa-wallet', active: true },
	{ label: 'Rewards', icon: 'fa-gift' },
	{ label: 'Affiliate', icon: 'fa-users' },
	{ label: 'History', icon: 'fa-clock-rotate-left' },
];

const claimedRewards = [
	{ title: 'Attic Program Reward', detail: 'Claimed on 08 Apr 2026', code: 'WELCOME-USED' },
	{ title: 'Attic Program Reward', detail: 'Claimed on 02 Apr 2026', code: 'ATTIC5-USED' },
];

const availableRewards = [
	{ title: 'Attic Program Reward', detail: 'Available for your next reset', code: 'ATTIC10RESET' },
	{ title: 'Attic Program Reward', detail: 'Use on your next activation', code: 'UPGRADE15' },
];

const accountHistory = [
	{ account: '6254825401', status: 'Passed', date: '12 Apr 2026' },
	{ account: '6254825318', status: 'Breached', date: '04 Apr 2026' },
	{ account: '6254825203', status: 'Passed', date: '28 Mar 2026' },
];

const DashboardPage: React.FC = () => {
	const [isCredentialsOpen, setIsCredentialsOpen] = useState(false);
	const [isBankTransferOpen, setIsBankTransferOpen] = useState(false);
	const [activeTab, setActiveTab] = useState('Rewards');
	const [selectedCoupon, setSelectedCoupon] = useState<string | null>(null);

	const handleCopy = async (value: string) => {
		try {
			await navigator.clipboard.writeText(value);
		} catch (error) {
			console.error('Failed to copy credential', error);
		}
	};

	return (
		<div className="attics-dashboard-page">
			<header className="attics-dashboard-mobile-header">
				<div className="attics-dashboard-mobile-header__profile">
					<div className="attics-dashboard-avatar">
						<i className="fas fa-user" />
					</div>
					<div>
						<span className="attics-dashboard-mobile-header__eyebrow">Welcome back</span>
						<h1>Hey, Lucky</h1>
					</div>
				</div>
				<button type="button" className="attics-dashboard-icon-btn" aria-label="Notifications">
					<i className="fas fa-bell" />
				</button>
			</header>

			{activeTab === 'Accounts' ? (
				<section className="attics-dashboard-empty-state">
					<div className="attics-dashboard-empty-state__icon">
						<i className="fas fa-box-open" />
					</div>
					<p className="attics-dashboard-card-kicker">No Active Challenge</p>
					<h2>You have no active Attic challenge</h2>
					<p>
						Activate an Attic challenge to get your account details, begin evaluation, and start tracking your progress.
					</p>
					<button
						type="button"
						className="attics-dashboard-activate-btn"
						onClick={() => setIsBankTransferOpen(true)}
					>
						Activate Attic Challenge
					</button>
				</section>
			) : null}

			{activeTab === 'Rewards' ? (
				<section className="attics-dashboard-rewards-panel">
					<div className="attics-dashboard-rewards-section">
						<p className="attics-dashboard-card-kicker">Available Rewards</p>
						<div className="attics-dashboard-rewards-list">
							{availableRewards.map((reward) => (
								<div key={reward.code} className="attics-dashboard-reward-card">
									<div>
										<strong>{reward.title}</strong>
										<span>{reward.detail}</span>
									</div>
									<button
										type="button"
										className="attics-dashboard-claim-btn"
										onClick={() => setSelectedCoupon(reward.code)}
									>
										Claim
									</button>
								</div>
							))}
						</div>
					</div>

					<div className="attics-dashboard-rewards-section">
						<p className="attics-dashboard-card-kicker">Claimed Rewards</p>
						<div className="attics-dashboard-rewards-list">
							{claimedRewards.map((reward) => (
								<div key={reward.code} className="attics-dashboard-reward-card is-claimed">
									<div>
										<strong>{reward.title}</strong>
										<span>{reward.detail}</span>
									</div>
									<em>Claimed</em>
								</div>
							))}
						</div>
					</div>
				</section>
			) : null}

			{activeTab === 'Affiliate' ? (
				<section className="attics-dashboard-affiliate-panel">
					<div className="attics-dashboard-affiliate-card">
						<p className="attics-dashboard-card-kicker">Affiliate Link</p>
						<div className="attics-dashboard-coupon-box">
							<strong>https://machefunded.com/attics?ref=lucky</strong>
							<button
								type="button"
								className="attics-dashboard-copy-btn"
								onClick={() => handleCopy('https://machefunded.com/attics?ref=lucky')}
							>
								<i className="fas fa-copy" />
							</button>
						</div>
					</div>

					<div className="attics-dashboard-affiliate-stats">
						<div className="attics-dashboard-summary-item">
							<span>Total Referrals</span>
							<strong>: 24</strong>
						</div>
						<div className="attics-dashboard-summary-item">
							<span>Total Paid Out</span>
							<strong>: ₦180,000</strong>
						</div>
						<div className="attics-dashboard-summary-item">
							<span>Available Balance</span>
							<strong>: ₦35,000</strong>
						</div>
					</div>

					<button type="button" className="attics-dashboard-activate-btn">Request Payout</button>
				</section>
			) : null}

			{activeTab === 'History' ? (
				<section className="attics-dashboard-history-panel">
					<p className="attics-dashboard-card-kicker">Account History</p>
					<div className="attics-dashboard-history-list">
						{accountHistory.map((item) => (
							<div key={item.account} className="attics-dashboard-history-card">
								<div>
									<strong>{item.account}</strong>
									<span>{item.date}</span>
								</div>
								<em className={item.status === 'Passed' ? 'is-history-passed' : 'is-history-breached'}>{item.status}</em>
							</div>
						))}
					</div>
				</section>
			) : null}

			<nav className="attics-dashboard-bottom-nav" aria-label="Dashboard navigation">
				{bottomNavItems.map((item) => (
					<button
						key={item.label}
						type="button"
						onClick={() => setActiveTab(item.label)}
						className={`attics-dashboard-bottom-nav__item ${activeTab === item.label ? 'is-active' : ''}`}
					>
						<i className={`fas ${item.icon}`} />
						<span>{item.label}</span>
					</button>
				))}
			</nav>

			{isCredentialsOpen ? (
				<div className="attics-dashboard-modal-backdrop" onClick={() => setIsCredentialsOpen(false)}>
					<div className="attics-dashboard-modal" onClick={(event) => event.stopPropagation()}>
						<div className="attics-dashboard-modal__header">
							<div>
								<p className="attics-dashboard-card-kicker">Account Credentials</p>
								<h3>MT5 Access</h3>
							</div>
							<button
								type="button"
								className="attics-dashboard-modal__close"
								onClick={() => setIsCredentialsOpen(false)}
								aria-label="Close credentials modal"
							>
								<i className="fas fa-times" />
							</button>
						</div>

						<div className="attics-dashboard-modal__list">
							<div className="attics-dashboard-modal__item">
								<div className="attics-dashboard-modal__item-top">
									<span>MT5 Login</span>
									<button type="button" className="attics-dashboard-copy-btn" onClick={() => handleCopy('6254825489')}>
										<i className="fas fa-copy" />
									</button>
								</div>
								<strong>6254825489</strong>
							</div>
							<div className="attics-dashboard-modal__item">
								<div className="attics-dashboard-modal__item-top">
									<span>Password</span>
									<button type="button" className="attics-dashboard-copy-btn" onClick={() => handleCopy('Attic#2026')}>
										<i className="fas fa-copy" />
									</button>
								</div>
								<strong>Attic#2026</strong>
							</div>
							<div className="attics-dashboard-modal__item">
								<div className="attics-dashboard-modal__item-top">
									<span>Server</span>
									<button type="button" className="attics-dashboard-copy-btn" onClick={() => handleCopy('MacheFunded-Demo')}>
										<i className="fas fa-copy" />
									</button>
								</div>
								<strong>MacheFunded-Demo</strong>
							</div>
						</div>

						<div className="attics-dashboard-modal__warning">
							<strong>Important:</strong> Please do not modify the trading account password. Any unauthorized credential change may constitute a violation of account terms and could result in account breach review.
						</div>
					</div>
				</div>
			) : null}

			{isBankTransferOpen ? (
				<div className="attics-dashboard-modal-backdrop" onClick={() => setIsBankTransferOpen(false)}>
					<div className="attics-dashboard-modal" onClick={(event) => event.stopPropagation()}>
						<div className="attics-dashboard-modal__header">
							<div>
								<p className="attics-dashboard-card-kicker">Bank Transfer Payment</p>
								<h3>Activate your Attic challenge</h3>
							</div>
							<button
								type="button"
								className="attics-dashboard-modal__close"
								onClick={() => setIsBankTransferOpen(false)}
								aria-label="Close bank transfer modal"
							>
								<i className="fas fa-times" />
							</button>
						</div>

						<div className="attics-dashboard-modal__list">
							<div className="attics-dashboard-modal__item">
								<span>Bank Name</span>
								<strong>Moniepoint MFB</strong>
							</div>
							<div className="attics-dashboard-modal__item">
								<span>Account Name</span>
								<strong>MacheFunded Ltd</strong>
							</div>
							<div className="attics-dashboard-modal__item">
								<span>Account Number</span>
								<strong>8162749201</strong>
							</div>
							<div className="attics-dashboard-modal__item">
								<span>Amount</span>
								<strong>₦50,000</strong>
							</div>
						</div>

						<div className="attics-dashboard-modal__warning">
							<strong>Payment Notice:</strong> Once your transfer is completed, your payment will be reviewed and confirmed before challenge activation is processed.
						</div>
					</div>
				</div>
			) : null}

			{selectedCoupon ? (
				<div className="attics-dashboard-modal-backdrop" onClick={() => setSelectedCoupon(null)}>
					<div className="attics-dashboard-modal" onClick={(event) => event.stopPropagation()}>
						<div className="attics-dashboard-modal__header">
							<div>
								<p className="attics-dashboard-card-kicker">Reward Claimed</p>
								<h3>Coupon Code</h3>
							</div>
							<button
								type="button"
								className="attics-dashboard-modal__close"
								onClick={() => setSelectedCoupon(null)}
								aria-label="Close coupon modal"
							>
								<i className="fas fa-times" />
							</button>
						</div>

						<div className="attics-dashboard-coupon-box">
							<strong>{selectedCoupon}</strong>
							<button type="button" className="attics-dashboard-copy-btn" onClick={() => handleCopy(selectedCoupon)}>
								<i className="fas fa-copy" />
							</button>
						</div>
					</div>
				</div>
			) : null}
		</div>
	);
};

export default DashboardPage;