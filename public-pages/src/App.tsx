import { useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import RulesPage from './pages/RulesPage';
import ContactPage from './pages/ContactPage';
import FAQPage from './pages/FAQPage';
import StorePage from './pages/StorePage';
import MacheMinutePage from './pages/MacheMinutePage';
import SupportedMarketsPage from './pages/SupportedMarketsPage';
import Footer from './components/Footer';

function App() {
	const location = useLocation();

	useEffect(() => {
		const path = location.pathname;
		if (!path.startsWith('/ref/')) return;

		const code = path.split('/ref/')[1]?.split('/')[0]?.trim();
		if (!code) return;

		// Backend tracking removed; keep referral routing client-side for now.
		window.location.replace('/');
	}, [location.pathname]);

	return (
		<>
			<Navbar />
			<Routes>
				<Route path="/" element={<Home />} />
				<Route path="/rules" element={<RulesPage />} />
				<Route path="/contact" element={<ContactPage />} />
				<Route path="/faq" element={<FAQPage />} />
				<Route path="/supported-markets" element={<SupportedMarketsPage />} />
				<Route path="/store" element={<StorePage />} />
				<Route path="/themacheminute" element={<MacheMinutePage />} />
				<Route path="/ref/:code" element={<Navigate to="/" replace />} />
				<Route path="*" element={<Navigate to="/" replace />} />
			</Routes>
			<Footer />
		</>
	);
}
export default App;