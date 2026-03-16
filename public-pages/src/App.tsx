import { useEffect } from 'react';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import RulesPage from './pages/RulesPage';
import ContactPage from './pages/ContactPage';
import Footer from './components/Footer';

function App() {
	useEffect(() => {
		const path = window.location.pathname;
		if (!path.startsWith('/ref/')) return;

		const code = path.split('/ref/')[1]?.split('/')[0]?.trim();
		if (!code) return;

		// Backend tracking removed; keep referral routing client-side for now.
		window.location.replace('/');
	}, []);

	const isRulesPage = window.location.pathname === '/rules';
	const isContactPage = window.location.pathname === '/contact';
	const isReferralPage = window.location.pathname.startsWith('/ref/');

	return (
		<>
			<Navbar />
			{isReferralPage ? null : (isRulesPage ? <RulesPage /> : isContactPage ? <ContactPage /> : <Home />)}
			<Footer />
		</>
	);
}
export default App;