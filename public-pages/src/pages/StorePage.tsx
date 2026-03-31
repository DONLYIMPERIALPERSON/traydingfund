const products = [
    {
        name: 'MacheFunded White Hoodie',
        image: '/store/white-hoodie.png',
        points: 2500,
    },
    {
        name: 'MacheFunded Black Hoodie',
        image: '/store/black-hoodie.png',
        points: 2500,
    },
    {
        name: 'MacheFunded Notebook',
        image: '/store/note-book.png',
        points: 750,
    },
    {
        name: 'MacheFunded Water Bottle',
        image: '/store/water-bottle.png',
        points: 900,
    },
];

export default function StorePage() {
    return (
        <main className="pt-28 pb-20 px-4">
            <section className="max-w-6xl mx-auto">
                <div className="grid gap-10 lg:grid-cols-[1.1fr_1fr] items-center mb-14">
                    <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#ffd700] mb-4">
                            Store
                        </p>
                        <h1 className="text-3xl md:text-5xl font-semibold text-white mb-4 leading-tight">
                            Buy challange or refer your friends and earn points
                        </h1>
                        <p className="text-gray-300 text-base md:text-lg max-w-xl">
                            Redeem your loyalty points for MacheFunded merch and rewards. Everything is currently out of stock, but we are restocking soon.
                        </p>
                    </div>
                    <div className="rounded-3xl border border-white/10 bg-white/5 p-8">
                        <div className="flex flex-col gap-4">
                            <h2 className="text-xl font-semibold text-white">How to earn points</h2>
                            <ul className="space-y-3 text-sm text-gray-300">
                                <li className="flex gap-3">
                                    <span className="mt-1 h-2 w-2 rounded-full bg-[#ffd700]" />
                                    <span>Purchase a challenge or pass milestones to earn loyalty points.</span>
                                </li>
                                <li className="flex gap-3">
                                    <span className="mt-1 h-2 w-2 rounded-full bg-[#ffd700]" />
                                    <span>Invite friends with your referral link to stack additional rewards.</span>
                                </li>
                                <li className="flex gap-3">
                                    <span className="mt-1 h-2 w-2 rounded-full bg-[#ffd700]" />
                                    <span>Points can be redeemed for exclusive merch drops and perks.</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {products.map((product) => (
                        <div
                            key={product.name}
                            className="flex h-full flex-col rounded-2xl border border-white/10 bg-white/5 p-5"
                        >
                            <div className="rounded-2xl bg-white/10 p-4 sm:p-5 flex items-center justify-center shadow-[0_20px_40px_rgba(0,0,0,0.35)] aspect-[3/4] sm:aspect-auto">
                                <img
                                    src={product.image}
                                    alt={product.name}
                                    className="h-full w-full object-contain drop-shadow-[0_18px_28px_rgba(0,0,0,0.45)] saturate-150 contrast-110"
                                    loading="lazy"
                                />
                            </div>
                            <div className="mt-5 flex flex-1 flex-col gap-3">
                                <h3 className="text-lg font-semibold text-white">{product.name}</h3>
                                <p className="text-sm text-gray-300">{product.points.toLocaleString()} points</p>
                                <button
                                    className="mt-auto w-full rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white/70 cursor-not-allowed"
                                    disabled
                                >
                                    Out of stocks
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </section>
        </main>
    );
}