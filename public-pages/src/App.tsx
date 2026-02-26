import { useEffect } from 'react';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import RulesPage from './pages/RulesPage';
import FaqPage from './pages/FaqPage';
import ContactPage from './pages/ContactPage';
import MigratePage from './pages/MigratePage';
import SoftBackdrop from './components/SoftBackdrop';
import Footer from './components/Footer';
import LenisScroll from './components/lenis';

const BACKEND_BASE_URL = import.meta.env.VITE_BACKEND_URL;

function App() {
	useEffect(() => {
		const path = window.location.pathname;
		if (!path.startsWith('/ref/')) return;

		const code = path.split('/ref/')[1]?.split('/')[0]?.trim();
		if (!code) return;

		if (!BACKEND_BASE_URL) {
			window.location.replace('/');
			return;
		}

		fetch(`${BACKEND_BASE_URL}/affiliate/click?affiliate_code=${encodeURIComponent(code)}`,
			{ method: 'POST' })
			.catch(() => {
				// ignore tracking errors
			})
			.finally(() => {
				window.location.replace('/');
			});
	}, []);

	const isRulesPage = window.location.pathname === '/rules';
	const isFaqPage = window.location.pathname === '/faq';
	const isContactPage = window.location.pathname === '/contact';
	const isMigratePage = window.location.pathname === '/migrate';
	const isReferralPage = window.location.pathname.startsWith('/ref/');

	return (
		<>
			<SoftBackdrop />
			<LenisScroll />
			{!isMigratePage && <Navbar />}
			{isReferralPage ? null : (isRulesPage ? <RulesPage /> : isFaqPage ? <FaqPage /> : isContactPage ? <ContactPage /> : isMigratePage ? <MigratePage /> : <Home />)}
			{!isMigratePage && <Footer />}
		</>
	);
}
export default App;