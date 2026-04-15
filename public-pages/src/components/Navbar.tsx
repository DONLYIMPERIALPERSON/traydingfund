import { MenuIcon, XIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

export default function Navbar() {
    const [isOpen, setIsOpen] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);

    const navLinks = [
        { name: 'Home', href: '/#', isSection: true, sectionId: 'home' },
        { name: 'Challenges', href: '/#pricing', isSection: true, sectionId: 'pricing' },
        { name: 'Attic Program', href: '/attic-program', isSection: false },
        { name: 'Recovery Form', href: '/recovery-form', isSection: false },
        { name: 'Store', href: '/store', isSection: false },
        { name: 'Trading Objectives', href: '/rules', isSection: false },
        { name: 'Blog', href: 'https://blog.machefunded.com', isSection: false },
        { name: 'FAQ', href: '/faq', isSection: false },
        { name: 'Contact', href: '/contact', isSection: false },
    ];

    const location = useLocation();

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 12);
        };

        handleScroll();
        window.addEventListener('scroll', handleScroll);

        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const handleNavClick = (link: typeof navLinks[0], e: React.MouseEvent) => {
        if (link.isSection && link.sectionId) {
            e.preventDefault();
            if (location.pathname !== '/') {
                // Navigate to home page first, then scroll
                window.location.href = link.href;
            } else {
                // Already on home page, just scroll
                const element = document.getElementById(link.sectionId);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth' });
                }
            }
        }
        // For non-section links, let the default href behavior work
    };

    return (
        <nav className={`fixed top-0 left-0 right-0 z-50 border-b transition-colors duration-300 ${isScrolled ? 'border-white/8 bg-[#0a2a33]' : 'border-white/8 bg-transparent'}`}>
            <div className='mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-3 md:px-6'>
                <Link to='/' className="flex items-center gap-2">
                    <img src='/transperent-logo.png' alt="MacheFunded logo" className="h-9 w-auto" />
                    <span className="text-lg font-bold tracking-wide">
                        <span className="text-white">MACHEFUNDED</span>
                    </span>
                </Link>

                <div className='hidden md:flex items-center gap-8 text-sm font-medium text-white/85'>
                    {navLinks.map((link) => (
                        link.isSection ? (
                            <a
                                href={link.href}
                                key={link.name}
                                onClick={(e) => handleNavClick(link, e)}
                                className="transition hover:text-white"
                            >
                                {link.name}
                            </a>
                        ) : (
                            <Link
                                to={link.href}
                                key={link.name}
                                onClick={(e) => handleNavClick(link, e)}
                                className="transition hover:text-white"
                            >
                                {link.name}
                            </Link>
                        )
                    ))}
                </div>

                <div className='hidden md:flex items-center gap-3'>
                    <a
                        href="https://trader.machefunded.com"
                        className='inline-flex items-center justify-center gap-2 rounded-full px-5 py-2 text-sm font-medium text-white bg-[#0b8ea6] hover:bg-[#0ea5bf] active:scale-95 transition-all'
                    >
                        Dashboard
                    </a>
                </div>

                <button onClick={() => setIsOpen(!isOpen)} className='md:hidden text-white'>
                    <MenuIcon className='size-6' />
                </button>
            </div>
            <div className={`flex flex-col items-center justify-center gap-6 text-lg font-medium fixed inset-0 bg-black/40 backdrop-blur-md z-50 transition-all duration-300 ${isOpen ? "translate-x-0" : "translate-x-full"}`}>
                {navLinks.map((link) => (
                    link.isSection ? (
                        <a
                            key={link.name}
                            href={link.href}
                            onClick={(e) => { handleNavClick(link, e); setIsOpen(false); }}
                        >
                            {link.name}
                        </a>
                    ) : (
                        <Link
                            key={link.name}
                            to={link.href}
                            onClick={(e) => { handleNavClick(link, e); setIsOpen(false); }}
                        >
                            {link.name}
                        </Link>
                    )
                ))}

                <a
                    href="https://trader.machefunded.com"
                    onClick={() => setIsOpen(false)}
                    className='inline-flex items-center justify-center gap-2 rounded-full px-5 py-2 text-sm font-medium text-white bg-[#008ea4] hover:bg-[#00798b] active:scale-95 transition-all'
                >
                    Dashboard
                </a>

                <button
                    onClick={() => setIsOpen(false)}
                    className="rounded-md bg-white p-2 text-gray-800 ring-white active:ring-2"
                >
                    <XIcon />
                </button>
            </div>
        </nav>
    );
};