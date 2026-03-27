import { Mail, MessageCircle, Users } from 'lucide-react';

const socialLinks = [
    { name: 'Discord', color: '#5865F2', url: 'https://discord.gg/HR6QW83W6' },
    { name: 'X', color: '#ffffff', url: 'https://x.com/machefunded?s=21' },
    { name: 'Instagram', color: '#E1306C', url: 'https://www.instagram.com/machefunded?igsh=Y2g0d3BrbnFkbmNl&utm_source=qr' },
];

export default function ContactPage() {
    return (
        <main className="pt-28 pb-20 px-4">
            <section className="max-w-6xl mx-auto">
                <div className="text-center mb-10">
                    <p className="text-sm font-medium text-[#ffd700] uppercase tracking-wide mb-3">Contact</p>
                    <h1 className="text-3xl md:text-5xl font-semibold text-white">Get in touch with MacheFunded</h1>
                    <p className="text-gray-300 mt-3 max-w-2xl mx-auto">
                        Reach our team through phone, WhatsApp, or our social communities. We’re available to support you at every stage.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <MessageCircle className="w-5 h-5 text-[#ffd700]" />
                            <h3 className="text-white text-xl font-semibold">WhatsApp</h3>
                        </div>
                        <p className="text-gray-300 mb-4">Chat with our support team on WhatsApp.</p>
                        <a
                            href="https://wa.me/447888378812"
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center justify-between rounded-lg border border-white/15 bg-white/5 px-4 py-3 hover:bg-white/10 transition"
                        >
                            <span>+44 7888 378 812</span>
                            <MessageCircle className="w-4 h-4 text-green-400" />
                        </a>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <Mail className="w-5 h-5 text-[#ffd700]" />
                            <h3 className="text-white text-xl font-semibold">Email</h3>
                        </div>
                        <p className="text-gray-300 mb-4">Send us an email and we’ll respond quickly.</p>
                        <a
                            href="mailto:help@machefunded.com"
                            className="flex items-center justify-between rounded-lg border border-white/15 bg-white/5 px-4 py-3 hover:bg-white/10 transition"
                        >
                            <span>help@machefunded.com</span>
                            <Mail className="w-4 h-4 text-[#ffd700]" />
                        </a>
                    </div>

                    <div className="md:col-span-2 rounded-2xl border border-white/10 bg-white/5 p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <Users className="w-5 h-5 text-[#ffd700]" />
                            <h3 className="text-white text-xl font-semibold">Join our live community</h3>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {socialLinks.map((social) => (
                                <a
                                    key={social.name}
                                    href={social.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="rounded-lg border border-white/15 bg-white/5 px-4 py-3 text-sm font-medium hover:bg-white/10 transition text-center text-white"
                                >
                                    {social.name}
                                </a>
                            ))}
                        </div>
                    </div>

                    <div className="md:col-span-2 rounded-2xl border border-white/10 bg-white/5 p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <Users className="w-5 h-5 text-[#ffd700]" />
                            <h3 className="text-white text-xl font-semibold">Registered office</h3>
                        </div>
                        <div className="grid gap-3 text-gray-300 text-sm md:text-base">
                            <p><span className="text-white font-medium">Company:</span> Mache Solutions Ltd</p>
                            <p><span className="text-white font-medium">Company No:</span> 13945628</p>
                            <p className="leading-relaxed">
                                <span className="text-white font-medium">Registered Address:</span> 71-75 Shelton Street,
                                Covent Garden, London, United Kingdom, WC2H 9JQ
                            </p>
                        </div>
                    </div>
                </div>
            </section>
        </main>
    );
}
