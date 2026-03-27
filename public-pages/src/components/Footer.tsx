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

                <div className="py-6 text-center text-xs md:text-sm text-gray-400 space-y-3">
                    <p>Copyright © 2026 by machefunded.com</p>
                    <p className="max-w-4xl mx-auto leading-relaxed">
                        Mache Solutions Ltd (Company No. 13945628) is registered in England &amp; Wales.
                        Registered office: 71-75 Shelton Street, Covent Garden, London, United Kingdom, WC2H 9JQ.
                    </p>
                    <p className="max-w-4xl mx-auto leading-relaxed">
                        Disclaimer: MacheFunded provides evaluation and educational services for traders and does not
                        offer investment advice or managed accounts. Trading involves risk and past performance is not
                        indicative of future results. Please trade responsibly.
                    </p>
                </div>
            </div>
        </footer>
    );
};