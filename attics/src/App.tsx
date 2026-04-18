import React, { useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import { supabase } from './lib/supabaseClient';

const requiredEnv = {
	VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
	VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
	VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
};

const missingEnvKeys = Object.entries(requiredEnv)
	.filter(([, value]) => !value)
	.map(([key]) => key);

const AUTH_STORAGE_KEY = 'supabase_access_token';
const MOBILE_BREAKPOINT = 900;

const isAuthenticated = () => Boolean(localStorage.getItem(AUTH_STORAGE_KEY));

const syncStoredAccessToken = (accessToken: string | null | undefined) => {
	if (accessToken) {
		localStorage.setItem(AUTH_STORAGE_KEY, accessToken);
		return;
	}

	localStorage.removeItem(AUTH_STORAGE_KEY);
};

const ProtectedRoute = ({ children }: { children: React.ReactElement }) => {
	if (!isAuthenticated()) {
		return <Navigate to="/login" replace />;
	}

	return children;
};

const PublicOnlyRoute = ({ children }: { children: React.ReactElement }) => {
	if (isAuthenticated()) {
		return <Navigate to="/dashboard" replace />;
	}

	return children;
};

const MobileOnlyGate = ({ children }: { children: React.ReactElement }) => {
	const [isMobileViewport, setIsMobileViewport] = useState(() => window.innerWidth < MOBILE_BREAKPOINT);

	useEffect(() => {
		const handleResize = () => setIsMobileViewport(window.innerWidth < MOBILE_BREAKPOINT);
		window.addEventListener('resize', handleResize);
		return () => window.removeEventListener('resize', handleResize);
	}, []);

	if (!isMobileViewport) {
		return (
			<div className="attics-dashboard-placeholder">
				<div className="attics-dashboard-card">
					<p className="attics-dashboard-kicker">MOBILE ACCESS ONLY</p>
					<h1>Attics is not available on desktop</h1>
					<p>Please use a mobile device to access Attics</p>
				</div>
			</div>
		);
	}

	return children;
};

function App() {
	const [authReady, setAuthReady] = useState(false);

	useEffect(() => {
		let isMounted = true;

		const initializeAuth = async () => {
			const { data } = await supabase.auth.getSession();
			if (!isMounted) return;

			syncStoredAccessToken(data.session?.access_token);
			setAuthReady(true);
		};

		void initializeAuth();

		const {
			data: { subscription },
		} = supabase.auth.onAuthStateChange((_event, session) => {
			syncStoredAccessToken(session?.access_token);
			if (isMounted) {
				setAuthReady(true);
			}
		});

		return () => {
			isMounted = false;
			subscription.unsubscribe();
		};
	}, []);

	if (missingEnvKeys.length > 0) {
		return (
			<div className="attics-dashboard-placeholder">
				<div className="attics-dashboard-card">
					<p className="attics-dashboard-kicker">ATTICS CONFIG REQUIRED</p>
					<h1>Missing environment variables</h1>
					<p>
						This app needs its environment configuration before it can render properly.
					</p>
					<div style={{ marginTop: '20px', textAlign: 'left' }}>
						{missingEnvKeys.map((key) => (
							<div key={key} style={{ padding: '8px 0', color: 'rgba(255,255,255,0.88)' }}>
								• {key}
							</div>
						))}
					</div>
					<p style={{ marginTop: '20px' }}>
						Create an <strong>.env</strong> file in <strong>attics/</strong> using <strong>.env.example</strong> as the template, then restart the dev server.
					</p>
				</div>
			</div>
		);
	}

	if (!authReady) {
		return null;
	}

	return (
		<MobileOnlyGate>
			<BrowserRouter>
				<Routes>
					<Route path="/" element={<HomePage />} />
					<Route
						path="/login"
						element={
							<PublicOnlyRoute>
								<LoginPage />
							</PublicOnlyRoute>
						}
					/>
					<Route
						path="/register"
						element={
							<PublicOnlyRoute>
								<LoginPage />
							</PublicOnlyRoute>
						}
					/>
					<Route
						path="/dashboard"
						element={
							<ProtectedRoute>
								<DashboardPage />
							</ProtectedRoute>
						}
					/>
					<Route
						path="*"
						element={<Navigate to="/" replace />}
					/>
				</Routes>
			</BrowserRouter>
		</MobileOnlyGate>
	);
}

export default App;