import { apiFetch } from './api';

const AUTH_USER_KEY = 'nairatrader_auth_user';

export type AuthMeResponse = {
	id: number;
	email: string;
	full_name: string | null;
	first_name?: string | null;
	last_name?: string | null;
	nick_name?: string | null;
	role: string;
	status: string;
};

export async function loginWithBackend(): Promise<AuthMeResponse> {
	const user = await apiFetch<AuthMeResponse>('/trader/me');
	persistAuthUser(user);
	return user;
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