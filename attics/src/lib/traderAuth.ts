import { apiFetch } from './api';
import { supabase } from './supabaseClient';

const AUTH_USER_KEY = 'nairatrader_auth_user';

export type AuthMeResponse = {
	id: number;
	email: string;
	full_name: string | null;
	first_name?: string | null;
	last_name?: string | null;
	nick_name?: string | null;
	kyc_status?: string | null;
	payout_method_type?: string | null;
	payout_bank_name?: string | null;
	payout_bank_code?: string | null;
	payout_account_number?: string | null;
	payout_account_name?: string | null;
	role: string;
	status: string;
};

export type PaymentOrderResponse = {
	provider_order_id: string;
	status: string;
	assignment_status: string;
	currency: string;
	gross_amount_kobo: number;
	discount_amount_kobo: number;
	net_amount_kobo: number;
	bank_transfer_amount_ngn?: number | null;
	bank_transfer_rate?: number | null;
	plan_id: string;
	account_size: string;
	challenge_type?: string;
	phase?: string;
	coupon_code: string | null;
	checkout_url: string | null;
	payer_bank_name: string | null;
	payer_account_name: string | null;
	payer_virtual_acc_no: string | null;
	expires_at: string | null;
	challenge_id: string | null;
};

export type PaymentStatusRefreshResponse = {
	provider_order_id: string;
	status: string;
	assignment_status: string;
	challenge_id: string | null;
	message: string;
};

export type UserChallengeAccountListItem = {
	challenge_id: string;
	account_size: string;
	currency?: string;
	challenge_type?: string;
	phase: string;
	objective_status: string;
	display_status: string;
	is_active: boolean;
	mt5_account: string | null;
	platform?: string;
	started_at: string | null;
	breached_at: string | null;
	passed_at: string | null;
	passed_stage: string | null;
	reset_type?: string | null;
};

export type UserChallengeAccountListResponse = {
	has_any_accounts: boolean;
	has_active_accounts: boolean;
	active_accounts: UserChallengeAccountListItem[];
	history_accounts: UserChallengeAccountListItem[];
};

export type UserChallengeMetrics = {
	balance: number;
	equity: number;
	unrealized_pnl: number;
	max_permitted_loss_left: number;
	highest_balance: number;
	breach_balance: number;
	profit_target_balance: number;
	win_rate: number;
	closed_trades_count: number;
	winning_trades_count: number;
	lots_traded_total: number;
	today_closed_pnl: number;
	today_trades_count: number;
	today_lots_total: number;
	min_trading_days_required: number;
	min_trading_days_met: boolean;
	stage_elapsed_hours: number;
	scalping_violations_count: number;
	duration_violations_count?: number;
	trading_days_count?: number | null;
	trading_cycle_start?: string | null;
	trading_cycle_source?: string | null;
	breach_event?: Record<string, unknown> | null;
	trade_duration_violations?: Record<string, unknown>[] | null;
	min_equity?: number | null;
	daily_breach_balance?: number | null;
	daily_low_equity?: number | null;
	drawdown_percent?: number | null;
	daily_dd_percent?: number | null;
};

export type UserChallengeObjectiveStatus = {
	label: string;
	status: string;
	note?: string | null;
};

export type UserChallengeCredentials = {
	server: string;
	account_number: string;
	password: string;
	investor_password: string | null;
};

export type UserChallengeAccountDetailResponse = {
	challenge_id: string;
	account_size: string;
	currency?: string;
	challenge_type?: string;
	platform?: string;
	initial_balance?: number;
	phase: string;
	objective_status: string;
	has_pending_withdrawal?: boolean;
	pending_withdrawal_amount?: number | null;
	breached_reason: string | null;
	reset_type?: string | null;
	started_at: string | null;
	breached_at: string | null;
	passed_at: string | null;
	mt5_account: string | null;
	last_feed_at: string | null;
	last_refresh_requested_at: string | null;
	metrics: UserChallengeMetrics;
	objectives: Record<string, UserChallengeObjectiveStatus>;
	credentials: UserChallengeCredentials | null;
	funded_profit_raw: number | null;
	funded_profit_capped: number | null;
	funded_profit_cap_amount: number | null;
	funded_user_payout_amount: number | null;
};

export type AffiliateDashboardResponse = {
	referral_link: string;
	stats: {
		available_balance: number;
		total_earned: number;
		referrals: number;
		impressions: number;
	};
	recent_transactions: Array<{ date: string; type: string; commission: number; order_id?: number }>;
	recent_payouts: Array<{ date: string; status: string; amount: number }>;
	bank_details?: {
		bank_name: string;
		account_name: string;
		account_number: string;
	} | null;
	payout_method_type?: string | null;
};

export type ApiStatusResponse = {
	status: string;
	version?: string;
};

export async function loginWithBackend(): Promise<AuthMeResponse> {
	const user = await apiFetch<AuthMeResponse>('/trader/me');
	persistAuthUser(user);
	return user;
}

export async function fetchApiStatus(): Promise<ApiStatusResponse> {
	return apiFetch<ApiStatusResponse>('/status');
}

export async function fetchProfile(): Promise<AuthMeResponse> {
	const profile = await apiFetch<AuthMeResponse>('/trader/me');
	persistAuthUser(profile);
	return profile;
}

export async function updateProfile(payload: { first_name?: string; last_name?: string }) {
	const response = await apiFetch<AuthMeResponse>('/trader/me', {
		method: 'PATCH',
		body: JSON.stringify(payload),
	});

	persistAuthUser(response);
	return response;
}

export function persistAuthUser(user: AuthMeResponse) {
	localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
}

export async function logoutFromBackend(): Promise<void> {
	try {
		await supabase.auth.signOut();
	} finally {
		localStorage.removeItem('supabase_access_token');
		localStorage.removeItem(AUTH_USER_KEY);
	}
}

export async function initAtticBankTransferOrder(payload: {
	plan_id: string;
	account_size: string;
	amount_kobo: number;
	coupon_code?: string | null;
	challenge_type: string;
	phase: string;
	platform: 'ctrader' | 'mt5';
}): Promise<PaymentOrderResponse> {
	return apiFetch<PaymentOrderResponse>('/trader/orders/bank-transfer', {
		method: 'POST',
		body: JSON.stringify(payload),
	});
}

export async function refreshPaymentOrderStatus(providerOrderId: string): Promise<PaymentStatusRefreshResponse> {
	return apiFetch<PaymentStatusRefreshResponse>(`/trader/orders/${encodeURIComponent(providerOrderId)}`);
}

export async function fetchUserChallengeAccounts(): Promise<UserChallengeAccountListResponse> {
	return apiFetch<UserChallengeAccountListResponse>('/trader/challenges');
}

export async function fetchUserChallengeAccountDetail(challengeId: string): Promise<UserChallengeAccountDetailResponse> {
	return apiFetch<UserChallengeAccountDetailResponse>(`/trader/challenges/${encodeURIComponent(challengeId)}`);
}

export async function refreshChallengeAccount(challengeId: string): Promise<{ status: string; requested_at?: string }> {
	return apiFetch<{ status: string; requested_at?: string }>('/trader/challenges/refresh', {
		method: 'POST',
		body: JSON.stringify({ challenge_id: challengeId }),
	});
}

export async function fetchAtticAffiliateDashboard(): Promise<AffiliateDashboardResponse> {
	return apiFetch<AffiliateDashboardResponse>('/trader/affiliate/summary?scope=attic');
}

export async function requestAtticAffiliatePayout(): Promise<{ message: string; amount: number; status: string }> {
	return apiFetch<{ message: string; amount: number; status: string }>('/trader/affiliate/payouts?scope=attic', {
		method: 'POST',
	});
}