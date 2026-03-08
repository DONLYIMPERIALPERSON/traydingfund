export default function Footer() {

    return (
        <footer className="bg-white/6 border-t border-white/6 pt-10 text-gray-300">
            <div className="max-w-6xl mx-auto px-6">
                <div className="flex flex-col md:flex-row items-start justify-between gap-10 py-10 border-b border-white/10">
                    <div>
                        <div className="flex items-center gap-2">
                            <img src='/logo.png' alt="MacheFunded logo" className="h-8 rounded-md" />
                            <span className="text-sm font-bold tracking-wide text-white">MACHEFUNDED</span>
                        </div>
                        <p className="max-w-[410px] mt-6 text-sm leading-relaxed">
                            MacheFunded empowers traders with clear objectives, fast rewards, and a global-first prop trading experience.
                        </p>
                    </div>
                </div>

                <p className="py-4 text-center text-sm text-gray-400">
                    Copyright © 2026 by machefunded.com
                </p>
            </div>
        </footer>
    );
};