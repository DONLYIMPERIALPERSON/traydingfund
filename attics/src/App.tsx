import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';

const requiredEnv = {
	VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
	VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
	VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
};

const missingEnvKeys = Object.entries(requiredEnv)
	.filter(([, value]) => !value)
	.map(([key]) => key);

const isAuthenticated = () => Boolean(localStorage.getItem('supabase_access_token'));

const ProtectedRoute = ({ children }: { children: React.ReactElement }) => {
	if (!isAuthenticated()) {
		return <Navigate to="/login" replace />;
	}

	return children;
};

function App() {
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

	return (
		<BrowserRouter>
			<Routes>
				<Route path="/" element={<HomePage />} />
				<Route path="/login" element={<LoginPage />} />
				<Route path="/register" element={<LoginPage />} />
				<Route path="/dashboard" element={<DashboardPage />} />
				<Route
					path="*"
					element={<Navigate to="/" replace />}
				/>
			</Routes>
		</BrowserRouter>
	);
}

export default App;