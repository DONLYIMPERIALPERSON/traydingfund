import { supabase } from './supabaseClient';

const baseUrl = import.meta.env.VITE_API_BASE_URL as string;

const getAccessToken = async () => {
	const stored = localStorage.getItem('supabase_access_token');
	if (stored) return stored;

	const { data } = await supabase.auth.getSession();
	if (data.session?.access_token) {
		localStorage.setItem('supabase_access_token', data.session.access_token);
		return data.session.access_token;
	}

	return null;
};

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
	const token = await getAccessToken();

	const response = await fetch(`${baseUrl}${path}`, {
		...init,
		headers: {
			'Content-Type': 'application/json',
			...(token ? { Authorization: `Bearer ${token}` } : {}),
			...(init.headers ?? {}),
		},
	});

	if (!response.ok) {
		const text = await response.text();
		throw new Error(text || `Request failed (${response.status})`);
	}

	return response.json() as Promise<T>;
}