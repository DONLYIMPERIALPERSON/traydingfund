import React, { useEffect, useState } from 'react';

const navItems = [
	{ label: 'Program', href: 'https://machefunded.com/attic-program' },
	{ label: 'Main Site', href: 'https://machefunded.com' },
];

const AtticHeader: React.FC = () => {
	const [isOpen, setIsOpen] = useState(false);
	const [isScrolled, setIsScrolled] = useState(false);

	useEffect(() => {
		const handleScroll = () => {
			setIsScrolled(window.scrollY > 12);
		};

		handleScroll();
		window.addEventListener('scroll', handleScroll);

		return () => window.removeEventListener('scroll', handleScroll);
	}, []);

	return (
		<header className={`attics-site-header ${isScrolled ? 'is-scrolled' : ''}`}>
			<div className="attics-site-header__inner">
				<a href="/" className="attics-site-brand">
					<img src="/login-page-logo.png" alt="MacheFunded" className="attics-site-brand__logo" />
					<span className="attics-site-brand__wordmark">ATTICS</span>
				</a>

				<nav className="attics-site-nav">
					{navItems.map((item) => (
						<a key={item.label} href={item.href} className="attics-site-nav__link">
							{item.label}
						</a>
					))}
				</nav>

				<div className="attics-site-mobile-trigger">
					<a href="/login" className="attics-site-mobile-signin">Sign in</a>
					<button type="button" className="attics-site-menu-btn" onClick={() => setIsOpen((prev) => !prev)}>
					<i className="fas fa-bars" />
					</button>
				</div>
			</div>

			<div className={`attics-site-mobile-menu ${isOpen ? 'is-open' : ''}`}>
				{navItems.map((item) => (
					<a key={item.label} href={item.href} className="attics-site-mobile-link" onClick={() => setIsOpen(false)}>
						{item.label}
					</a>
				))}
				<button type="button" className="attics-site-mobile-close" onClick={() => setIsOpen(false)}>
					<i className="fas fa-times" />
				</button>
			</div>
		</header>
	);
};

export default AtticHeader;