import { supabase } from './supabaseClient';

const baseUrl = import.meta.env.VITE_API_BASE_URL as string;
const resolvedBaseUrl = (() => {
	if (!import.meta.env.DEV) return baseUrl;

	try {
		const parsed = new URL(baseUrl);
		if (['localhost', '127.0.0.1'].includes(parsed.hostname)) {
			return parsed.pathname.replace(/\/$/, '');
		}
	} catch {
		// keep original base url
	}

	return baseUrl;
})();
const debugEnabled = String(import.meta.env.VITE_DEBUG_AUTH ?? 'true').toLowerCase() === 'true';

const debugLog = (...args: unknown[]) => {
	if (debugEnabled) {
		console.log('[attics-api]', ...args);
	}
};

const getAccessToken = async () => {
	const { data } = await supabase.auth.getSession();
	debugLog('supabase session fetched', {
		hasSession: Boolean(data.session),
		hasAccessToken: Boolean(data.session?.access_token),
		userEmail: data.session?.user?.email ?? null,
	});

	if (data.session?.access_token) {
		localStorage.setItem('supabase_access_token', data.session.access_token);
		debugLog('stored new access token from supabase session');
		return data.session.access_token;
	}

	const stored = localStorage.getItem('supabase_access_token');
	if (stored) {
		debugLog('stored token exists but no active supabase session, clearing stale token', {
			preview: `${stored.slice(0, 12)}...`,
		});
		localStorage.removeItem('supabase_access_token');
	}

	debugLog('no access token available');
	return null;
};

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
	const token = await getAccessToken();
	const url = `${resolvedBaseUrl}${path}`;
	debugLog('request start', {
		url,
		baseUrl,
		resolvedBaseUrl,
		method: init.method ?? 'GET',
		hasToken: Boolean(token),
	});

	let response: Response;
	try {
		response = await fetch(url, {
			...init,
			headers: {
				'Content-Type': 'application/json',
				...(token ? { Authorization: `Bearer ${token}` } : {}),
				...(init.headers ?? {}),
			},
		});
	} catch (error) {
		debugLog('network failure', {
			url,
			message: error instanceof Error ? error.message : String(error),
		});
		throw error;
	}

	debugLog('request complete', {
		url,
		status: response.status,
		ok: response.ok,
	});

	if (!response.ok) {
		const text = await response.text();
		debugLog('request failed', { url, status: response.status, body: text });
		if (response.status === 401) {
			localStorage.removeItem('supabase_access_token');
			throw new Error(`401 Unauthorized: ${text || 'Invalid auth token'}`);
		}
		throw new Error(text || `Request failed (${response.status})`);
	}

	return response.json() as Promise<T>;
}