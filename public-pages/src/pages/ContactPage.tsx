import { Building2, Clock3, MapPin, MessageCircle, Phone, Users } from 'lucide-react';

const socialLinks = [
    { name: 'Discord', color: '#5865F2', url: 'https://discord.com/invite/WyPx9cm7R7' },
    { name: 'Telegram', color: '#0088CC', url: 'https://t.me/nairatrader' },
    { name: 'TikTok', color: '#ffffff', url: 'https://www.tiktok.com/@nairatrader_FX' },
    { name: 'X', color: '#ffffff', url: 'https://x.com/naira_trader' },
];

export default function ContactPage() {
    return (
        <main className="pt-28 pb-20 px-4">
            <section className="max-w-6xl mx-auto">
                <div className="text-center mb-10">
                    <p className="text-sm font-medium text-yellow-400 uppercase tracking-wide mb-3">Contact</p>
                    <h1 className="text-3xl md:text-5xl font-semibold text-white">Get in touch with NairaTrader</h1>
                    <p className="text-gray-300 mt-3 max-w-2xl mx-auto">
                        Reach our team through phone, WhatsApp, or our social communities. We’re available to support you at every stage.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <Building2 className="w-5 h-5 text-yellow-400" />
                            <h3 className="text-white text-xl font-semibold">Head Office</h3>
                        </div>
                        <div className="flex items-start gap-3 text-gray-300">
                            <MapPin className="w-4 h-4 mt-1 text-yellow-400" />
                            <p>2, Akin Osiyemi, Allen Avenue.</p>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <Phone className="w-5 h-5 text-yellow-400" />
                            <h3 className="text-white text-xl font-semibold">Phone Numbers</h3>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <p className="text-xs uppercase tracking-wide text-gray-400 mb-2">Calls only</p>
                                <a href="tel:08021495027" className="flex items-center justify-between rounded-lg border border-white/15 bg-white/5 px-4 py-3 hover:bg-white/10 transition">
                                    <span>08021495027</span>
                                    <Phone className="w-4 h-4 text-yellow-400" />
                                </a>
                            </div>

                            <div>
                                <p className="text-xs uppercase tracking-wide text-gray-400 mb-2">WhatsApp only</p>
                                <a href="https://wa.me/09040001503" target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-lg border border-green-400/40 bg-green-500/10 px-4 py-3 hover:bg-green-500/20 transition">
                                    <span>09040001503</span>
                                    <MessageCircle className="w-4 h-4 text-green-400" />
                                </a>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <Users className="w-5 h-5 text-yellow-400" />
                            <h3 className="text-white text-xl font-semibold">Join our live community</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            {socialLinks.map((social) => (
                                <a
                                    key={social.name}
                                    href={social.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="rounded-lg border border-white/15 bg-white/5 px-4 py-3 text-sm font-medium hover:bg-white/10 transition"
                                    style={{ color: social.color }}
                                >
                                    {social.name}
                                </a>
                            ))}
                        </div>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <Clock3 className="w-5 h-5 text-yellow-400" />
                            <h3 className="text-white text-xl font-semibold">Working Hours</h3>
                        </div>
                        <p className="text-white font-medium">9am to 5pm</p>
                        <p className="text-gray-300 text-sm mt-1">Mondays to Fridays only</p>
                    </div>
                </div>
            </section>
        </main>
    );
}
