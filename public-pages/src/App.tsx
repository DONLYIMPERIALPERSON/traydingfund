import { useEffect } from 'react';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import RulesPage from './pages/RulesPage';
import ContactPage from './pages/ContactPage';
import FAQPage from './pages/FAQPage';
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
	const isFaqPage = window.location.pathname === '/faq';
	const isReferralPage = window.location.pathname.startsWith('/ref/');

	return (
		<>
			<div className="bg-black text-white text-xs sm:text-sm text-center py-2 px-4">
				<a
					href="/?currency=ngn#pricing"
					className="group inline-flex flex-wrap items-center justify-center gap-3"
				>
					<span className="inline-flex items-center gap-2 font-semibold">
						<span className="rounded-full bg-[#ffd700] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-black">
							New
						</span>
						<span>NGN Accounts Are Now Available</span>
					</span>
					<span className="inline-flex items-center justify-center rounded-full bg-[#0b9fb8] px-4 py-1 text-xs sm:text-sm font-semibold text-white transition group-hover:bg-[#008ea4]">
						View Now
					</span>
				</a>
			</div>
			<Navbar />
			{isReferralPage ? null : (isRulesPage ? <RulesPage /> : isFaqPage ? <FAQPage /> : isContactPage ? <ContactPage /> : <Home />)}
			<Footer />
		</>
	);
}
export default App;