const marketGroups = [
  {
    title: 'Forex',
    symbols: [
      'EURUSD',
      'GBPUSD',
      'AUDUSD',
      'NZDUSD',
      'USDJPY',
      'USDCAD',
      'USDCHF',
      'EURGBP',
      'EURJPY',
      'GBPJPY',
      'AUDJPY',
      'NZDJPY',
    ],
  },
  {
    title: 'Metals',
    symbols: ['XAUUSD', 'XAGUSD'],
  },
  {
    title: 'Indices',
    symbols: ['US30', 'US500', 'USTEC', 'UK100', 'DE30'],
  },
  {
    title: 'Crypto',
    symbols: ['BTCUSD', 'ETHUSD'],
  },
  {
    title: 'Energies',
    symbols: ['USOIL', 'UKOIL'],
  },
];

export default function SupportedMarketsPage() {
  return (
    <main className="pt-28 pb-20 px-4">
      <section className="max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <p className="text-sm font-medium text-[#ffd700] uppercase tracking-wide mb-3">
            Supported Markets
          </p>
          <h1 className="text-3xl md:text-5xl font-semibold text-white">
            Supported Trading Instruments
          </h1>
          <p className="text-gray-300 mt-3 max-w-2xl mx-auto">
            Only the instruments listed below are allowed. Trading any unsupported asset will result in account breach.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {marketGroups.map((group) => (
            <div
              key={group.title}
              className="rounded-2xl border border-white/10 bg-white/5 p-6"
            >
              <h3 className="text-lg font-semibold text-white mb-4">{group.title}</h3>
              <div className="flex flex-wrap gap-2">
                {group.symbols.map((symbol) => (
                  <span
                    key={symbol}
                    className="rounded-full border border-white/15 bg-black/40 px-3 py-1 text-xs font-semibold text-gray-200"
                  >
                    {symbol}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}