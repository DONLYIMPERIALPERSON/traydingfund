import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
	fetchUserChallengeAccounts,
	fetchAtticAffiliateDashboard,
	fetchApiStatus,
	fetchProfile,
	fetchUserChallengeAccountDetail,
	refreshChallengeAccount,
	initAtticBankTransferOrder,
	logoutFromBackend,
	requestAtticAffiliatePayout,
	refreshPaymentOrderStatus,
	type AuthMeResponse,
	type PaymentOrderResponse,
	type UserChallengeAccountDetailResponse,
	type UserChallengeAccountListItem,
	type AffiliateDashboardResponse,
} from '../lib/traderAuth';

const AUTH_USER_KEY = 'nairatrader_auth_user';

const bottomNavItems = [
	{ label: 'Accounts', icon: 'fa-wallet', active: true },
	{ label: 'Rewards', icon: 'fa-gift' },
	{ label: 'Affiliate', icon: 'fa-users' },
	{ label: 'History', icon: 'fa-clock-rotate-left' },
];

const ATTIC_PLAN_ID = 'attic_200000';
const ATTIC_ACCOUNT_SIZE = '₦200,000';
const ATTIC_AMOUNT_KOBO = 150000;
const ATTIC_PROFIT_TARGET_PERCENT = 0.3;
const ATTIC_MAX_LOSS_PERCENT = 0.2;

const formatNaira = (amount: number | null | undefined) => {
	if (amount == null || !Number.isFinite(amount)) return '₦0';
	return `₦${amount.toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
};

const formatDisplayDate = (value?: string | null) => {
	if (!value) return '—';
	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) return '—';
	return parsed.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatDateTime = (value?: string | null) => {
	if (!value) return '—';
	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) return '—';
	return parsed.toLocaleString('en-GB', {
		day: '2-digit',
		month: 'short',
		hour: '2-digit',
		minute: '2-digit',
	});
};

const formatPnl = (amount: number | null | undefined) => {
	if (amount == null || !Number.isFinite(amount)) return '—';
	const sign = amount > 0 ? '+' : '';
	return `${sign}${formatNaira(amount)}`;
};

const formatTimeLimitRemaining = (
	status?: string | null,
	remainingHours?: number | null,
	remainingMinutes?: number | null,
) => {
	if (status === 'not_started') return 'Not Started';
	if (status === 'passed') return 'Passed';
	if (status === 'expired') return 'Expired';
	if (status === 'expired_pending_confirmation') return 'Awaiting Review';
	if (status !== 'running') return '—';
	if (remainingHours == null || !Number.isFinite(remainingHours)) return '—';

	const safeMinutes = remainingMinutes != null && Number.isFinite(remainingMinutes)
		? Math.max(0, remainingMinutes)
		: Math.max(0, remainingHours * 60);
	const wholeHours = Math.floor(safeMinutes / 60);
	const minutes = Math.round(safeMinutes - wholeHours * 60);
	if (wholeHours <= 0 && minutes <= 0) return 'Expired';
	if (wholeHours <= 0) return `${minutes}m left`;
	if (minutes <= 0) return `${wholeHours}h left`;
	return `${wholeHours}h ${minutes}m left`;
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const formatHistoryFailReason = (value?: string | null) => {
	const normalized = String(value ?? '').toLowerCase();
	if (!normalized) return null;
	if (normalized.includes('time')) return 'Time limit';
	if (normalized.includes('loss') || normalized.includes('drawdown')) return 'Max loss';
	return 'Rule breach';
};

const extractPreferredName = (profile: AuthMeResponse | null) => {
	const firstName = profile?.first_name?.trim();
	if (firstName) return firstName;

	const fullName = profile?.full_name?.trim();
	if (fullName) {
		const first = fullName.split(/\s+/)[0]?.trim();
		if (first) return first;
	}

	const email = profile?.email?.trim();
	if (email) {
		return email.split('@')[0] || 'Trader';
	}

	return 'Trader';
};

const DashboardPage: React.FC = () => {
	const navigate = useNavigate();
	const [isCredentialsOpen, setIsCredentialsOpen] = useState(false);
	const [isBankTransferOpen, setIsBankTransferOpen] = useState(false);
	const [isPromoPromptOpen, setIsPromoPromptOpen] = useState(false);
	const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
	const [activeTab, setActiveTab] = useState('Accounts');
	const [selectedCoupon, setSelectedCoupon] = useState<string | null>(null);
	const [paymentOrder, setPaymentOrder] = useState<PaymentOrderResponse | null>(null);
	const [isCreatingOrder, setIsCreatingOrder] = useState(false);
	const [paymentError, setPaymentError] = useState<string | null>(null);
	const [paymentMessage, setPaymentMessage] = useState<string | null>(null);
	const [promoCode, setPromoCode] = useState('');
	const [challengeAccounts, setChallengeAccounts] = useState<UserChallengeAccountListItem[]>([]);
	const [profile, setProfile] = useState<AuthMeResponse | null>(null);
	const [selectedAccountDetail, setSelectedAccountDetail] = useState<UserChallengeAccountDetailResponse | null>(null);
	const [isLoadingCredentials, setIsLoadingCredentials] = useState(false);
	const [affiliateDashboard, setAffiliateDashboard] = useState<AffiliateDashboardResponse | null>(null);
	const [dashboardError, setDashboardError] = useState<string | null>(null);
	const [affiliateError, setAffiliateError] = useState<string | null>(null);
	const [isDashboardLoading, setIsDashboardLoading] = useState(true);
	const [isRequestingAffiliatePayout, setIsRequestingAffiliatePayout] = useState(false);
	const [isLoggingOut, setIsLoggingOut] = useState(false);
	const [isRefreshingAccount, setIsRefreshingAccount] = useState(false);
	const [historyReasons, setHistoryReasons] = useState<Record<string, string | null>>({});
	const pollingActiveRef = useRef(false);

	const displayName = useMemo(() => extractPreferredName(profile), [profile]);

	const atticReferralLink = useMemo(() => {
		if (affiliateDashboard?.referral_link) return affiliateDashboard.referral_link;
		if (profile?.id) return `https://attic.machefunded.com/ref/${profile.id}`;
		return 'https://attic.machefunded.com/ref/...';
	}, [affiliateDashboard?.referral_link, profile?.id]);

	const handleCopy = async (value: string) => {
		try {
			await navigator.clipboard.writeText(value);
		} catch (error) {
			console.error('Failed to copy credential', error);
		}
	};

	const stopPolling = () => {
		pollingActiveRef.current = false;
	};

	useEffect(() => () => stopPolling(), []);

	const loadDashboardData = async () => {
		setIsDashboardLoading(true);
		setDashboardError(null);

		try {
			await fetchApiStatus();

			const [profileResult, accountsResult] = await Promise.allSettled([
				fetchProfile(),
				fetchUserChallengeAccounts(),
			]);

			if (profileResult.status === 'fulfilled') {
				setProfile(profileResult.value);
			} else {
				console.error('Failed to fetch attic profile', profileResult.reason);
				setProfile(null);
			}

			if (accountsResult.status === 'fulfilled') {
				setChallengeAccounts([...(accountsResult.value.active_accounts ?? []), ...(accountsResult.value.history_accounts ?? [])]);
			} else {
				console.error('Failed to fetch attic challenge accounts', accountsResult.reason);
				setChallengeAccounts([]);
			}

			const profileMessage = profileResult.status === 'rejected'
				? (profileResult.reason instanceof Error ? profileResult.reason.message : String(profileResult.reason))
				: '';
			const accountMessage = accountsResult.status === 'rejected'
				? (accountsResult.reason instanceof Error ? accountsResult.reason.message : String(accountsResult.reason))
				: '';
			const hasUnauthorized = [profileMessage, accountMessage].some((message) => message.includes('401') || message.toLowerCase().includes('unauthorized'));

			if (hasUnauthorized) {
				localStorage.removeItem('supabase_access_token');
				localStorage.removeItem(AUTH_USER_KEY);
				navigate('/login', { replace: true });
				return;
			}

			if (profileResult.status === 'rejected' && accountsResult.status === 'rejected') {
				setDashboardError('Connected to backend, but unable to load your dashboard data. Please sign in again or try again shortly.');
			}
		} catch (error) {
			console.error('Failed to load attic dashboard data', error);
			const message = error instanceof Error ? error.message : '';
			if (message.includes('401') || message.toLowerCase().includes('unauthorized')) {
				localStorage.removeItem('supabase_access_token');
				localStorage.removeItem(AUTH_USER_KEY);
				navigate('/login', { replace: true });
				return;
			}

			setDashboardError('Unable to connect to the server. Please check your connection or try again shortly.');
			setProfile(null);
			setChallengeAccounts([]);
		} finally {
			setIsDashboardLoading(false);
		}
	};

	useEffect(() => {
		void loadDashboardData();
	}, [navigate]);

	useEffect(() => {
		const loadAffiliate = async () => {
			try {
				setAffiliateError(null);
				const response = await fetchAtticAffiliateDashboard();
				setAffiliateDashboard(response);
			} catch (error) {
				console.error('Failed to fetch attic affiliate dashboard', error);
				setAffiliateDashboard(null);
				setAffiliateError('Affiliate data is currently unavailable.');
			}
		};

		void loadAffiliate();
	}, []);

	const rewardState = useMemo(() => {
		const atticAccounts = challengeAccounts.filter((account) => String(account.challenge_type ?? '').toLowerCase() === 'attic');
		const hasAtticJourney = atticAccounts.length > 0;
		const hasPendingMigration = atticAccounts.some((account) => ['awaiting_reset', 'admin_checking'].includes(String(account.objective_status).toLowerCase()));
		const hasReceivedMigration = challengeAccounts.some((account) => (
			String(account.challenge_type ?? '').toLowerCase() === 'ngn_standard'
			&& String(account.phase ?? '').toLowerCase() === 'phase_1'
			&& hasAtticJourney
		));

		if (hasReceivedMigration && !hasPendingMigration) {
			return {
				status: 'received' as const,
				label: 'Received',
				title: 'Attic reward received',
				detail: 'You have successfully received your Standard NGN Phase 1 account.',
			};
		}

		if (hasPendingMigration) {
			return {
				status: 'pending' as const,
				label: 'Pending',
				title: 'Attic reward pending',
				detail: 'You passed the Attic phase and your migration to Standard NGN Phase 1 is being processed.',
			};
		}

		return {
			status: 'none' as const,
			label: 'No reward yet',
			title: 'No reward yet',
			detail: 'Pass the Attic phase to receive your Standard NGN Phase 1 account.',
		};
	}, [challengeAccounts]);

	const atticAccounts = useMemo(
		() => challengeAccounts.filter((account) => String(account.challenge_type ?? '').toLowerCase() === 'attic'),
		[challengeAccounts],
	);

	const activeAtticAccounts = useMemo(
		() => atticAccounts.filter((account) => {
			if (!account.is_active) return false;
			const objectiveStatus = String(account.objective_status ?? '').toLowerCase();
			return objectiveStatus !== 'awaiting_reset' && objectiveStatus !== 'admin_checking';
		}),
		[atticAccounts],
	);

	const hasReceivedStandardReward = useMemo(
		() => challengeAccounts.some((account) => (
			String(account.challenge_type ?? '').toLowerCase() === 'ngn_standard'
			&& String(account.phase ?? '').toLowerCase() === 'phase_1'
		)),
		[challengeAccounts],
	);

	const hasPendingAtticReset = useMemo(
		() => atticAccounts.some((account) => ['awaiting_reset', 'admin_checking'].includes(String(account.objective_status ?? '').toLowerCase())),
		[atticAccounts],
	);

	const historyItems = useMemo(
		() => atticAccounts
			.filter((account) => !account.is_active)
			.map((account) => ({
				challengeId: account.challenge_id,
				account: account.mt5_account ?? account.challenge_id,
				status: account.display_status,
				date: formatDisplayDate(account.passed_at ?? account.breached_at ?? account.started_at),
			}))
			.slice(0, 5),
		[atticAccounts],
	);

	useEffect(() => {
		const breachedHistory = historyItems.filter((item) => item.status !== 'Passed');
		if (breachedHistory.length === 0) {
			setHistoryReasons({});
			return;
		}

		const loadHistoryReasons = async () => {
			try {
				const entries = await Promise.all(
					breachedHistory.map(async (item) => {
						try {
							const detail = await fetchUserChallengeAccountDetail(item.challengeId);
							return [item.challengeId, formatHistoryFailReason(detail.breached_reason)] as const;
						} catch {
							return [item.challengeId, null] as const;
						}
					}),
				);
				setHistoryReasons(Object.fromEntries(entries));
			} catch (error) {
				console.error('Failed to load attic history reasons', error);
			}
		};

		void loadHistoryReasons();
	}, [historyItems]);

	const currentAtticAccount = useMemo(
		() => activeAtticAccounts[0] ?? null,
		[activeAtticAccounts],
	);

	const pendingPassedAtticAccount = useMemo(
		() => atticAccounts
			.filter((account) => String(account.objective_status).toLowerCase() === 'awaiting_reset' || Boolean(account.passed_at))
			.sort((a, b) => new Date(b.passed_at ?? 0).getTime() - new Date(a.passed_at ?? 0).getTime())[0] ?? null,
		[atticAccounts],
	);

	const displayAtticAccount = currentAtticAccount
		?? (hasPendingAtticReset ? pendingPassedAtticAccount : null)
		?? (!hasReceivedStandardReward ? pendingPassedAtticAccount : null);
	const isPassedAwaitingResetView = Boolean(displayAtticAccount)
		&& ['awaiting_reset', 'admin_checking'].includes(String(displayAtticAccount?.objective_status ?? '').toLowerCase());

	useEffect(() => {
		const loadCurrentAtticDetail = async () => {
			if (!displayAtticAccount?.challenge_id) {
				setSelectedAccountDetail(null);
				return;
			}

			try {
				const detail = await fetchUserChallengeAccountDetail(displayAtticAccount.challenge_id);
				setSelectedAccountDetail(detail);
			} catch (error) {
				console.error('Failed to prefetch active attic account detail', error);
			}
		};

		void loadCurrentAtticDetail();
	}, [displayAtticAccount?.challenge_id]);

	const handleOpenCredentials = async () => {
		if (!currentAtticAccount?.challenge_id) return;

		try {
			setIsLoadingCredentials(true);
			const detail = await fetchUserChallengeAccountDetail(currentAtticAccount.challenge_id);
			setSelectedAccountDetail(detail);
			setIsCredentialsOpen(true);
		} catch (error) {
			console.error('Failed to fetch attic account detail', error);
		} finally {
			setIsLoadingCredentials(false);
		}
	};

	const activeAccountTitle = useMemo(() => {
		if (!displayAtticAccount?.mt5_account) return 'Attic Challenge';
		return `Attic Challenge #${displayAtticAccount.mt5_account}`;
	}, [displayAtticAccount?.mt5_account]);

	const activeAccountBalance = selectedAccountDetail?.initial_balance
		?? selectedAccountDetail?.metrics?.balance
		?? null;

	const activeInitialBalance = selectedAccountDetail?.initial_balance ?? activeAccountBalance ?? 0;
	const realizedAccountPnl = selectedAccountDetail?.metrics?.balance != null && activeInitialBalance > 0
		? selectedAccountDetail.metrics.balance - activeInitialBalance
		: null;
	const activeAccountPnl = realizedAccountPnl;
	const passedAccountPnl = realizedAccountPnl;
	const activeAccountLastUpdated = selectedAccountDetail?.last_feed_at ?? selectedAccountDetail?.last_refresh_requested_at ?? null;
	const activeAccountTimeLeft = formatTimeLimitRemaining(
		selectedAccountDetail?.metrics?.time_limit_status,
		selectedAccountDetail?.metrics?.time_limit_remaining_hours,
		selectedAccountDetail?.metrics?.time_limit_remaining_minutes,
	);
	const activeAccountLastUpdatedLabel = formatRelativeUpdate(activeAccountLastUpdated);
	const showAccountRefresh = Boolean(displayAtticAccount?.challenge_id) && !isPassedAwaitingResetView && isOlderThanThirtyMinutes(selectedAccountDetail?.last_feed_at);
	const activePnlValue = activeAccountPnl ?? 0;
	const activeProfitTargetAmount = activeInitialBalance * ATTIC_PROFIT_TARGET_PERCENT;
	const activeMaxLossAmount = activeInitialBalance * ATTIC_MAX_LOSS_PERCENT;
	const activeProfitLeft = Math.max(0, activeProfitTargetAmount - Math.max(activePnlValue, 0));
	const activeMaxLossLeft = Math.max(0, activeMaxLossAmount - Math.abs(Math.min(activePnlValue, 0)));
	const chartRange = Math.max(1, activeProfitTargetAmount + activeMaxLossAmount);
	const chartProgressPercent = isPassedAwaitingResetView
		? 100
		: clamp(((activePnlValue + activeMaxLossAmount) / chartRange) * 100, 0, 100);

	const handleRefreshAccount = async () => {
		if (!displayAtticAccount?.challenge_id || isRefreshingAccount) return;

		try {
			setIsRefreshingAccount(true);
			const response = await refreshChallengeAccount(displayAtticAccount.challenge_id);
			setSelectedAccountDetail((current) => current ? {
				...current,
				last_refresh_requested_at: response.requested_at ?? new Date().toISOString(),
			} : current);
			const refreshedDetail = await fetchUserChallengeAccountDetail(displayAtticAccount.challenge_id);
			setSelectedAccountDetail(refreshedDetail);
		} catch (error) {
			console.error('Failed to refresh attic account metrics', error);
		} finally {
			setIsRefreshingAccount(false);
		}
	};

	const rewardItems = useMemo(() => {
		const passedAtticAccounts = atticAccounts
			.filter((account) => String(account.objective_status).toLowerCase() === 'awaiting_reset' || Boolean(account.passed_at))
			.sort((a, b) => new Date(b.passed_at ?? 0).getTime() - new Date(a.passed_at ?? 0).getTime());

		const receivedCount = hasPendingAtticReset ? 0 : challengeAccounts.filter(
			(account) => String(account.challenge_type ?? '').toLowerCase() === 'ngn_standard'
				&& String(account.phase ?? '').toLowerCase() === 'phase_1',
		).length;

		return passedAtticAccounts.slice(0, 5).map((account, index) => ({
			id: account.challenge_id,
			title: 'Attic Migration Reward',
			detail: index < receivedCount
				? 'Standard NGN Phase 1 account received.'
				: 'Migration to Standard NGN Phase 1 is processing.',
			status: index < receivedCount ? 'Received' : 'Pending',
			isReceived: index < receivedCount,
			date: formatDisplayDate(account.passed_at),
		}));
	}, [atticAccounts, challengeAccounts, hasPendingAtticReset]);

	const affiliateRecentTransactions = useMemo(
		() => (affiliateDashboard?.recent_transactions ?? []).slice(0, 2),
		[affiliateDashboard?.recent_transactions],
	);

	const affiliateRecentPayouts = useMemo(
		() => (affiliateDashboard?.recent_payouts ?? []).slice(0, 2),
		[affiliateDashboard?.recent_payouts],
	);

	const startPaymentPolling = async (providerOrderId: string) => {
		pollingActiveRef.current = true;
		for (let attempt = 0; attempt < 24; attempt += 1) {
			if (!pollingActiveRef.current) return;
			await new Promise((resolve) => window.setTimeout(resolve, 5000));
			if (!pollingActiveRef.current) return;

			try {
				const refreshed = await refreshPaymentOrderStatus(providerOrderId);
				if (refreshed.status === 'completed' && refreshed.assignment_status === 'assigned') {
					setPaymentMessage('Payment confirmed and your Attic account has been assigned successfully.');
					stopPolling();
					return;
				}
				if (refreshed.status === 'failed' || refreshed.status === 'expired') {
					setPaymentError(`Payment ${refreshed.status}. Please try again.`);
					stopPolling();
					return;
				}
			} catch (error) {
				console.error('Failed to refresh attic payment status', error);
			}
		}

		stopPolling();
	};

	const createAtticOrder = async (couponCode?: string | null) => {
		setIsCreatingOrder(true);
		setPaymentError(null);
		setPaymentMessage(null);
		try {
			const order = await initAtticBankTransferOrder({
				plan_id: ATTIC_PLAN_ID,
				account_size: ATTIC_ACCOUNT_SIZE,
				amount_kobo: ATTIC_AMOUNT_KOBO,
				coupon_code: couponCode?.trim() ? couponCode.trim().toUpperCase() : null,
				challenge_type: 'attic',
				phase: 'phase_1',
				platform: 'mt5',
			});

			setIsPromoPromptOpen(false);
			const refreshedAccounts = await fetchUserChallengeAccounts();
			setChallengeAccounts([...(refreshedAccounts.active_accounts ?? []), ...(refreshedAccounts.history_accounts ?? [])]);

			if (order.status === 'completed') {
				setPaymentOrder(null);
				setIsBankTransferOpen(false);
				setPaymentMessage('Coupon applied successfully and your Attic challenge has been activated.');
				stopPolling();
				return;
			}

			setPaymentOrder(order);
			setIsBankTransferOpen(true);
			void startPaymentPolling(order.provider_order_id);
		} catch (error) {
			setPaymentError(error instanceof Error ? error.message : 'Unable to create Attic payment order right now.');
		} finally {
			setIsCreatingOrder(false);
		}
	};

	const handleActivateAtticChallenge = () => {
		setPaymentError(null);
		setPaymentMessage('This program has been paused. Try again soon.');
		setPromoCode('');
		setIsPromoPromptOpen(false);
		setIsBankTransferOpen(false);
	};

	const handleContinueWithoutPromo = () => {
		void createAtticOrder(null);
	};

	const handleApplyPromoAndContinue = () => {
		void createAtticOrder(promoCode);
	};

	const handleRequestAffiliatePayout = async () => {
		if (!affiliateDashboard?.stats.available_balance) {
			setAffiliateError('No available affiliate balance to withdraw yet.');
			return;
		}

		try {
			setIsRequestingAffiliatePayout(true);
			setAffiliateError(null);
			await requestAtticAffiliatePayout();
			const refreshed = await fetchAtticAffiliateDashboard();
			setAffiliateDashboard(refreshed);
		} catch (error) {
			console.error('Failed to request attic affiliate payout', error);
			const message = error instanceof Error ? error.message : 'Unable to request affiliate payout right now.';
			if (message.toLowerCase().includes('configure a payout method')) {
				setAffiliateError('Please set your payout method in Trader Area settings first, then come back to request your attic affiliate payout.');
			} else {
				setAffiliateError(message);
			}
		} finally {
			setIsRequestingAffiliatePayout(false);
		}
	};

	const handleLogout = async () => {
		try {
			setIsLoggingOut(true);
			await logoutFromBackend();
			navigate('/login', { replace: true });
		} catch (error) {
			console.error('Failed to logout from attic dashboard', error);
		} finally {
			setIsLoggingOut(false);
			setIsLogoutModalOpen(false);
		}
	};

	if (isDashboardLoading) {
		return (
			<div className="attics-dashboard-placeholder">
				<div className="attics-dashboard-card">
					<p className="attics-dashboard-kicker">ATTICS DASHBOARD</p>
					<h1>Loading your dashboard...</h1>
					<p>Please wait while we connect to you to your dashboard</p>
				</div>
			</div>
		);
	}

	if (dashboardError) {
		return (
			<div className="attics-dashboard-placeholder">
				<div className="attics-dashboard-card">
					<p className="attics-dashboard-kicker">BACKEND UNAVAILABLE</p>
					<h1>Unable to load Attics</h1>
					<p>{dashboardError}</p>
					<button type="button" className="attics-dashboard-activate-btn" onClick={() => void loadDashboardData()}>
						Try Again
					</button>
				</div>
			</div>
		);
	}

	return (
		<div className="attics-dashboard-page">
			<header className="attics-dashboard-mobile-header">
				<div className="attics-dashboard-mobile-header__profile">
					<button type="button" className="attics-dashboard-avatar attics-dashboard-avatar-btn" onClick={() => setIsLogoutModalOpen(true)} aria-label="Open profile menu">
						<i className="fas fa-user" />
					</button>
					<div>
						<span className="attics-dashboard-mobile-header__eyebrow">Welcome back</span>
						<h1>Hey, {displayName}</h1>
					</div>
				</div>
				<button type="button" className="attics-dashboard-icon-btn" aria-label="Notifications">
					<i className="fas fa-bell" />
				</button>
			</header>

			{activeTab === 'Accounts' ? (
				<section className="attics-dashboard-empty-state">
					{displayAtticAccount ? (
						<>
							<div className="attics-dashboard-active-account-card">
								<div className="attics-dashboard-active-account-card__header">
									<div>
										<h2>{activeAccountTitle}</h2>
									</div>
									<div className="attics-dashboard-active-account-update-wrap">
										<span className="attics-dashboard-active-account-tag">{activeAccountLastUpdatedLabel}</span>
										{showAccountRefresh ? (
											<button
												type="button"
												className="attics-dashboard-active-account-refresh-btn"
												onClick={() => void handleRefreshAccount()}
												disabled={isRefreshingAccount}
											>
												{isRefreshingAccount ? 'Refreshing...' : 'Refresh'}
											</button>
										) : null}
									</div>
								</div>

								<div className="attics-dashboard-active-account-card__balance-row">
									<strong>{activeAccountBalance != null ? formatNaira(activeAccountBalance) : displayAtticAccount?.account_size || '₦200,000'}</strong>
								</div>

								<div className="attics-dashboard-active-account-stats">
									<div className="attics-dashboard-active-account-stat">
										<span>{isPassedAwaitingResetView ? 'Time Limit' : 'Time Left'}</span>
										<strong>{isPassedAwaitingResetView ? 'Passed' : activeAccountTimeLeft}</strong>
									</div>
									<div className="attics-dashboard-active-account-stat">
										<span>PNL</span>
										<strong className={(isPassedAwaitingResetView ? passedAccountPnl : activeAccountPnl) != null && (isPassedAwaitingResetView ? passedAccountPnl : activeAccountPnl)! < 0 ? 'is-negative' : 'is-positive'}>{isPassedAwaitingResetView ? 'Passed' : formatPnl(activeAccountPnl)}</strong>
									</div>
								</div>
							</div>
							{!isPassedAwaitingResetView ? (
								<button
									type="button"
									className="attics-dashboard-activate-btn"
									onClick={handleOpenCredentials}
									disabled={isLoadingCredentials}
								>
									{isLoadingCredentials ? 'Loading Credentials...' : 'View Credentials'}
								</button>
							) : null}
							<div className="attics-dashboard-active-account-chart">
								<div className="attics-dashboard-active-account-chart__labels">
									<div>
										<span>Max loss left</span>
										<strong>{formatNaira(activeMaxLossLeft)}</strong>
									</div>
									<div>
										<span>Profit left</span>
										<strong>{formatNaira(activeProfitLeft)}</strong>
									</div>
								</div>
								<div className="attics-dashboard-active-account-chart__track-wrap">
									<div className="attics-dashboard-active-account-chart__track">
										<div className="attics-dashboard-active-account-chart__midline" />
										<div className="attics-dashboard-active-account-chart__marker" style={{ left: `${chartProgressPercent}%` }} />
									</div>
								</div>
								<div className="attics-dashboard-active-account-chart__ends">
									<span>Max DD</span>
									<span>Profit Target</span>
								</div>
							</div>
						</>
					) : (
						<>
							<div className="attics-dashboard-empty-state__icon">
								<i className="fas fa-box-open" />
							</div>
							<p className="attics-dashboard-card-kicker">Program Paused</p>
							<h2>This program has been paused</h2>
							<p>
								This program has been paused. Try again soon.
							</p>
							{paymentError ? <p className="attics-dashboard-error-text">{paymentError}</p> : null}
							{paymentMessage ? <p className="attics-dashboard-info-text">{paymentMessage}</p> : null}
							<button
								type="button"
								className="attics-dashboard-activate-btn"
								onClick={handleActivateAtticChallenge}
								disabled
							>
								Program Paused
							</button>
						</>
					)}
				</section>
			) : null}

			{activeTab === 'Rewards' ? (
				<section className="attics-dashboard-rewards-panel">
					<div className="attics-dashboard-rewards-section">
						<p className="attics-dashboard-card-kicker">Attic Migration Rewards</p>
						<div className="attics-dashboard-rewards-list">
							{rewardItems.length > 0 ? rewardItems.map((reward) => (
								<div key={reward.id} className={`attics-dashboard-reward-card ${reward.isReceived ? 'is-claimed' : ''}`}>
									<div>
										<strong>{reward.title}</strong>
										<span>{reward.detail}</span>
										<span>{reward.date}</span>
									</div>
									<em>{reward.status}</em>
								</div>
							)) : (
								<div className="attics-dashboard-reward-card">
									<div>
										<strong>No reward yet</strong>
										<span>Pass the Attic phase to receive your Standard NGN Phase 1 account.</span>
									</div>
									<em>No reward yet</em>
								</div>
							)}
						</div>
					</div>
				</section>
			) : null}

			{activeTab === 'Affiliate' ? (
				<section className="attics-dashboard-affiliate-panel">
					{affiliateError ? (
						<div className="attics-dashboard-affiliate-card">
							<p className="attics-dashboard-card-kicker">Affiliate Unavailable</p>
							<p>{affiliateError}</p>
						</div>
					) : null}
					<div className="attics-dashboard-affiliate-card">
						<p className="attics-dashboard-card-kicker">Affiliate Link</p>
						<div className="attics-dashboard-coupon-box">
							<strong>{affiliateDashboard?.referral_link || atticReferralLink}</strong>
							<button
								type="button"
								className="attics-dashboard-copy-btn"
								onClick={() => handleCopy(affiliateDashboard?.referral_link || atticReferralLink)}
							>
								<i className="fas fa-copy" />
							</button>
						</div>
					</div>

					<div className="attics-dashboard-affiliate-stats">
						<div className="attics-dashboard-summary-item">
							<span>Total Referrals</span>
							<strong>: {affiliateDashboard?.stats.referrals ?? 0}</strong>
						</div>
						<div className="attics-dashboard-summary-item">
							<span>Total Paid Out</span>
							<strong>: {formatNaira(affiliateDashboard?.recent_payouts.reduce((sum, item) => sum + item.amount, 0) ?? 0)}</strong>
						</div>
						<div className="attics-dashboard-summary-item">
							<span>Available Balance</span>
							<strong>: {formatNaira(affiliateDashboard?.stats.available_balance ?? 0)}</strong>
						</div>
					</div>

					{affiliateError ? (
						<div className="attics-dashboard-affiliate-card">
							<p>{affiliateError}</p>
						</div>
					) : null}

					<button
						type="button"
						className="attics-dashboard-activate-btn"
						onClick={handleRequestAffiliatePayout}
						disabled={isRequestingAffiliatePayout}
					>
						{isRequestingAffiliatePayout ? 'Requesting Payout...' : 'Request Payout'}
					</button>

					{affiliateRecentTransactions.length > 0 ? (
						<div className="attics-dashboard-rewards-section">
							<p className="attics-dashboard-card-kicker">Recent Commissions</p>
							<div className="attics-dashboard-history-list">
								{affiliateRecentTransactions.map((item, index) => (
									<div key={`${item.date}-${index}`} className="attics-dashboard-history-card">
										<div>
											<strong>{item.type}</strong>
											<span>{formatDateTime(item.date)}</span>
											<span>{formatNaira(item.commission)}</span>
										</div>
										<em className="is-history-passed">Earned</em>
									</div>
								))}
							</div>
						</div>
					) : null}

					<div className="attics-dashboard-rewards-section">
						<p className="attics-dashboard-card-kicker">Recent Payouts</p>
						<div className="attics-dashboard-history-list">
							{affiliateRecentPayouts.length > 0 ? affiliateRecentPayouts.map((item, index) => (
								<div key={`${item.date}-${index}`} className="attics-dashboard-history-card">
									<div>
										<strong>{formatNaira(item.amount)}</strong>
										<span>{formatDateTime(item.date)}</span>
										<span>Affiliate payout</span>
									</div>
									<em className={String(item.status).toLowerCase() === 'pending' ? 'is-history-breached' : 'is-history-passed'}>
										{String(item.status).toLowerCase() === 'pending' ? 'Pending' : item.status}
									</em>
								</div>
							)) : (
								<div className="attics-dashboard-history-card">
									<div>
										<strong>No payout history yet</strong>
										<span>Your last 2 attic affiliate payouts will appear here.</span>
									</div>
								</div>
							)}
						</div>
					</div>

				</section>
			) : null}

			{activeTab === 'History' ? (
				<section className="attics-dashboard-history-panel">
					<p className="attics-dashboard-card-kicker">Account History</p>
					<div className="attics-dashboard-history-list">
						{historyItems.length > 0 ? historyItems.map((item) => (
							<div key={item.account} className="attics-dashboard-history-card">
								<div>
									<strong>{item.account}</strong>
									<span>{item.date}</span>
									{historyReasons[item.challengeId] ? <span>{historyReasons[item.challengeId]}</span> : null}
								</div>
								<em className={item.status === 'Passed' ? 'is-history-passed' : 'is-history-breached'}>{item.status}</em>
							</div>
						)) : (
							<div className="attics-dashboard-history-card">
								<div>
									<strong>No Attic history yet</strong>
									<span>Passed or failed Attic challenges will appear here.</span>
								</div>
							</div>
						)}
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
									<button type="button" className="attics-dashboard-copy-btn" onClick={() => handleCopy(selectedAccountDetail?.credentials?.account_number || '')}>
										<i className="fas fa-copy" />
									</button>
								</div>
								<strong>{selectedAccountDetail?.credentials?.account_number || 'Not available'}</strong>
							</div>
							<div className="attics-dashboard-modal__item">
								<div className="attics-dashboard-modal__item-top">
									<span>Password</span>
									<button type="button" className="attics-dashboard-copy-btn" onClick={() => handleCopy(selectedAccountDetail?.credentials?.password || '')}>
										<i className="fas fa-copy" />
									</button>
								</div>
								<strong>{selectedAccountDetail?.credentials?.password || 'Not available'}</strong>
							</div>
							<div className="attics-dashboard-modal__item">
								<div className="attics-dashboard-modal__item-top">
									<span>Server</span>
									<button type="button" className="attics-dashboard-copy-btn" onClick={() => handleCopy(selectedAccountDetail?.credentials?.server || '')}>
										<i className="fas fa-copy" />
									</button>
								</div>
								<strong>{selectedAccountDetail?.credentials?.server || 'Not available'}</strong>
							</div>
						</div>

						<div className="attics-dashboard-modal__warning">
							<strong>Important:</strong> Please do not modify the trading account password. Any unauthorized credential change may constitute a violation of account terms and could result in account breach review.
						</div>
					</div>
				</div>
			) : null}

			{isBankTransferOpen ? (
				<div className="attics-dashboard-modal-backdrop" onClick={() => { stopPolling(); setIsBankTransferOpen(false); }}>
					<div className="attics-dashboard-modal" onClick={(event) => event.stopPropagation()}>
						<div className="attics-dashboard-modal__header">
							<div>
								<p className="attics-dashboard-card-kicker">Bank Transfer Payment</p>
								<h3>Activate your Attic challenge</h3>
							</div>
							<button
								type="button"
								className="attics-dashboard-modal__close"
								onClick={() => { stopPolling(); setIsBankTransferOpen(false); }}
								aria-label="Close bank transfer modal"
							>
								<i className="fas fa-times" />
							</button>
						</div>

						<div className="attics-dashboard-modal__list">
							<div className="attics-dashboard-modal__item attics-dashboard-modal__item--stacked">
								<div className="attics-dashboard-modal__pair">
									<span>Bank Name</span>
									<strong>{paymentOrder?.payer_bank_name || 'SafeHaven MFB'}</strong>
								</div>
								<div className="attics-dashboard-modal__pair">
									<span>Account Name</span>
									<strong>{paymentOrder?.payer_account_name || 'Pending'}</strong>
								</div>
								<div className="attics-dashboard-modal__pair">
									<span>Account Number</span>
									<div className="attics-dashboard-modal__item-top">
										<strong>{paymentOrder?.payer_virtual_acc_no || 'Pending'}</strong>
										<button type="button" className="attics-dashboard-copy-btn" onClick={() => handleCopy(paymentOrder?.payer_virtual_acc_no || '')}>
											<i className="fas fa-copy" />
										</button>
									</div>
								</div>
								<div className="attics-dashboard-modal__pair">
									<span>Amount</span>
									<div className="attics-dashboard-modal__item-top">
										<strong>{formatNaira(paymentOrder?.bank_transfer_amount_ngn)}</strong>
										<button type="button" className="attics-dashboard-copy-btn" onClick={() => handleCopy(String(paymentOrder?.bank_transfer_amount_ngn ?? ''))}>
											<i className="fas fa-copy" />
										</button>
									</div>
								</div>
								<div className="attics-dashboard-modal__pair">
									<span>Expires At</span>
									<strong>{paymentOrder?.expires_at ? new Date(paymentOrder.expires_at).toLocaleString() : 'Not provided'}</strong>
								</div>
							</div>
						</div>

						<div className="attics-dashboard-modal__warning">
							<strong>Payment Notice:</strong> Once your transfer is completed, your payment will be confirmed and your Attic challenge will be activated.
						</div>
					</div>
				</div>
			) : null}

			{isPromoPromptOpen ? (
				<div className="attics-dashboard-modal-backdrop" onClick={() => !isCreatingOrder && setIsPromoPromptOpen(false)}>
					<div className="attics-dashboard-modal" onClick={(event) => event.stopPropagation()}>
						<div className="attics-dashboard-modal__header">
							<div>
								<p className="attics-dashboard-card-kicker">Promo Code</p>
								<h3>Do you have a promo code?</h3>
							</div>
							<button
								type="button"
								className="attics-dashboard-modal__close"
								onClick={() => !isCreatingOrder && setIsPromoPromptOpen(false)}
								aria-label="Close promo code modal"
							>
								<i className="fas fa-times" />
							</button>
						</div>

						<div className="attics-dashboard-modal__item attics-dashboard-modal__item--stacked">
							<div className="attics-dashboard-modal__pair" style={{ borderBottom: 'none', paddingBottom: 0 }}>
								<span>Promo Code</span>
								<input
									type="text"
									className="attics-dashboard-promo-input"
									placeholder="Enter promo code (optional)"
									value={promoCode}
									onChange={(event) => setPromoCode(event.target.value)}
									disabled={isCreatingOrder}
								/>
							</div>
						</div>

						{paymentError ? <p className="attics-dashboard-error-text">{paymentError}</p> : null}

						<div className="attics-dashboard-promo-actions">
							<button type="button" className="attics-dashboard-promo-secondary" onClick={handleContinueWithoutPromo} disabled={isCreatingOrder}>
								Continue Without Code
							</button>
							<button type="button" className="attics-dashboard-activate-btn" onClick={handleApplyPromoAndContinue} disabled={isCreatingOrder}>
								{isCreatingOrder ? 'Preparing Payment...' : 'Apply Code & Continue'}
							</button>
						</div>
					</div>
				</div>
			) : null}

			{isLogoutModalOpen ? (
				<div className="attics-dashboard-modal-backdrop" onClick={() => !isLoggingOut && setIsLogoutModalOpen(false)}>
					<div className="attics-dashboard-modal" onClick={(event) => event.stopPropagation()}>
						<div className="attics-dashboard-modal__header">
							<div>
								<p className="attics-dashboard-card-kicker">Profile</p>
								<h3>Logout</h3>
							</div>
							<button
								type="button"
								className="attics-dashboard-modal__close"
								onClick={() => !isLoggingOut && setIsLogoutModalOpen(false)}
								aria-label="Close logout modal"
							>
								<i className="fas fa-times" />
							</button>
						</div>

						<div className="attics-dashboard-modal__item attics-dashboard-modal__item--stacked">
							<div className="attics-dashboard-modal__pair" style={{ borderBottom: 'none', paddingBottom: 0 }}>
								<span>Account</span>
								<strong>{profile?.email || 'Signed in user'}</strong>
							</div>
							<p className="attics-dashboard-logout-copy">Are you sure you want to log out of Attics?</p>
						</div>

						<div className="attics-dashboard-promo-actions">
							<button type="button" className="attics-dashboard-promo-secondary" onClick={() => setIsLogoutModalOpen(false)} disabled={isLoggingOut}>
								Cancel
							</button>
							<button type="button" className="attics-dashboard-activate-btn" onClick={handleLogout} disabled={isLoggingOut}>
								{isLoggingOut ? 'Logging out...' : 'Logout'}
							</button>
						</div>
					</div>
				</div>
			) : null}

		</div>
	);
};

const formatRelativeUpdate = (timestamp?: string | null) => {
	if (!timestamp) return 'Unknown';
	const parsed = new Date(timestamp);
	if (Number.isNaN(parsed.getTime())) return 'Unknown';
	const diffMs = Date.now() - parsed.getTime();
	if (diffMs < 0) return 'Just now';
	const diffSeconds = Math.floor(diffMs / 1000);
	if (diffSeconds < 30) return 'Just now';
	if (diffSeconds < 60) return `${diffSeconds}s ago`;
	const diffMinutes = Math.floor(diffSeconds / 60);
	if (diffMinutes < 60) return `${diffMinutes} min${diffMinutes === 1 ? '' : 's'} ago`;
	const diffHours = Math.floor(diffMinutes / 60);
	if (diffHours < 24) return `${diffHours} hr${diffHours === 1 ? '' : 's'} ago`;
	const diffDays = Math.floor(diffHours / 24);
	return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
};

const isOlderThanThirtyMinutes = (timestamp?: string | null) => {
	if (!timestamp) return false;
	const parsed = new Date(timestamp);
	if (Number.isNaN(parsed.getTime())) return false;
	return (Date.now() - parsed.getTime()) > (30 * 60 * 1000);
};

export default DashboardPage;