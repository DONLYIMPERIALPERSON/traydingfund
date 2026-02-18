import Navbar from './components/Navbar';
import Home from './pages/Home';
import RulesPage from './pages/RulesPage';
import FaqPage from './pages/FaqPage';
import ContactPage from './pages/ContactPage';
import SoftBackdrop from './components/SoftBackdrop';
import Footer from './components/Footer';
import LenisScroll from './components/lenis';

function App() {
	const isRulesPage = window.location.pathname === '/rules';
	const isFaqPage = window.location.pathname === '/faq';
	const isContactPage = window.location.pathname === '/contact';

	return (
		<>
			<SoftBackdrop />
			<LenisScroll />
			<Navbar />
			{isRulesPage ? <RulesPage /> : isFaqPage ? <FaqPage /> : isContactPage ? <ContactPage /> : <Home />}
			<Footer />
		</>
	);
}
export default App;