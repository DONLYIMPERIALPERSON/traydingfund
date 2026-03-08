import { MenuIcon, XIcon } from 'lucide-react';
import { useState } from 'react';

export default function Navbar() {
    const [isOpen, setIsOpen] = useState(false);

    const navLinks = [
        { name: 'Home', href: '/#', isSection: true, sectionId: 'home' },
        { name: 'Challenges', href: '/#pricing', isSection: true, sectionId: 'pricing' },
        { name: 'Rules', href: '/rules', isSection: false },
        { name: 'Contact', href: '/contact', isSection: false },
    ];

    const handleNavClick = (link: typeof navLinks[0], e: React.MouseEvent) => {
        if (link.isSection && link.sectionId) {
            e.preventDefault();
            if (window.location.pathname !== '/') {
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
        <nav className='fixed top-3 md:top-5 left-0 right-0 z-50 px-4'>
            <div className='max-w-6xl mx-auto flex items-center justify-between bg-white rounded-2xl p-3 shadow-[0_0_24px_rgba(0,0,0,0.1)]'>
                <a href='/#' className="flex items-center gap-2">
                    <img src='/logo.png' alt="MacheFunded logo" className="h-8" />
                    <span className="text-lg font-bold tracking-wide text-[#008ea4]">MACHEFUNDED</span>
                </a>

                <div className='hidden md:flex items-center gap-8 text-sm font-medium text-gray-900'>
                    {navLinks.map((link) => (
                        <a href={link.href} key={link.name} onClick={(e) => handleNavClick(link, e)} className="hover:text-black/70 transition">
                            {link.name}
                        </a>
                    ))}
                </div>

                <div className='hidden md:flex items-center gap-3'>
                    <a
                        href="https://app.traydingfund.com"
                        className='inline-flex items-center justify-center gap-2 rounded-full px-5 py-2 text-sm font-medium text-white bg-[#008ea4] hover:bg-[#00798b] active:scale-95 transition-all'
                    >
                        Dashboard
                    </a>
                </div>

                <button onClick={() => setIsOpen(!isOpen)} className='md:hidden text-gray-900'>
                    <MenuIcon className='size-6' />
                </button>
            </div>
            <div className={`flex flex-col items-center justify-center gap-6 text-lg font-medium fixed inset-0 bg-black/40 backdrop-blur-md z-50 transition-all duration-300 ${isOpen ? "translate-x-0" : "translate-x-full"}`}>
                {navLinks.map((link) => (
                    <a key={link.name} href={link.href} onClick={(e) => { handleNavClick(link, e); setIsOpen(false); }}>
                        {link.name}
                    </a>
                ))}

                <a
                    href="https://app.traydingfund.com"
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