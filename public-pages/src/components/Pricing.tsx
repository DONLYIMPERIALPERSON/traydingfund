import Title from './Title';
import { plansData } from '../assets/dummy-data';
import { Clock3, Layers, Percent, ShieldAlert, Target, CircleDot } from 'lucide-react';
import { PrimaryButton } from './Buttons';
import { useRef, useState } from 'react';

export default function Pricing() {
    const mobileCardsContainerRef = useRef<HTMLDivElement | null>(null);
    const mobileCardRefs = useRef<Record<string, HTMLDivElement | null>>({});
    const [activeMobileTab, setActiveMobileTab] = useState(plansData[0]?.id ?? '');

    const getFeatureValue = (features: string[], key: string, fallback = '-') => {
        const found = features.find((item) => item.startsWith(`${key}:`));
        if (!found) return fallback;
        return found.split(':').slice(1).join(':').trim() || fallback;
    };

    const getTabLabel = (name: string) => name.replace(/account/i, '').replace('₦', '').trim();

    const scrollToMobileCard = (planId: string) => {
        const target = mobileCardRefs.current[planId];
        if (!target) return;
        setActiveMobileTab(planId);
        target.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' });
    };

    const handleMobileCardsScroll = () => {
        const container = mobileCardsContainerRef.current;
        if (!container) return;

        let closestId = activeMobileTab;
        let minDistance = Number.POSITIVE_INFINITY;

        plansData.forEach((plan) => {
            const el = mobileCardRefs.current[plan.id];
            if (!el) return;
            const distance = Math.abs(el.offsetLeft - container.scrollLeft);
            if (distance < minDistance) {
                minDistance = distance;
                closestId = plan.id;
            }
        });

        if (closestId && closestId !== activeMobileTab) {
            setActiveMobileTab(closestId);
        }
    };

    const getStatus = (plan: { desc: string; features: string[] }) => {
        const hasPausedTag = plan.desc.toLowerCase().includes('paused')
            || plan.features.some((item) => item.toLowerCase().includes('status: paused'));
        return hasPausedTag ? 'Paused' : 'Available';
    };

    const getPayout = (features: string[]) => {
        const has24hr = features.some((item) => item.toLowerCase().includes('24hr payout'));
        return has24hr ? '24hr' : '-';
    };

    const getMobileRows = (plan: { features: string[] }, status: string) => ([
        { label: 'Max DD', value: getFeatureValue(plan.features, 'Max Drawdown') },
        { label: 'Target', value: getFeatureValue(plan.features, 'Profit Target') },
        { label: 'Phases', value: getFeatureValue(plan.features, 'Phases') },
        { label: 'Profit Split', value: getFeatureValue(plan.features, 'Profit Split') },
        { label: 'Payout', value: getPayout(plan.features) },
        { label: 'Status', value: status },
    ]);

    const tableRows = [
        {
            label: 'Max DD',
            icon: ShieldAlert,
            getValue: (plan: { features: string[] }, _status: string) => getFeatureValue(plan.features, 'Max Drawdown'),
        },
        {
            label: 'Target',
            icon: Target,
            getValue: (plan: { features: string[] }, _status: string) => getFeatureValue(plan.features, 'Profit Target'),
        },
        {
            label: 'Phases',
            icon: Layers,
            getValue: (plan: { features: string[] }, _status: string) => getFeatureValue(plan.features, 'Phases'),
        },
        {
            label: 'Profit Split',
            icon: Percent,
            getValue: (plan: { features: string[] }, _status: string) => getFeatureValue(plan.features, 'Profit Split'),
        },
        {
            label: '24hr Payout',
            icon: Clock3,
            getValue: (plan: { features: string[] }, _status: string) => getPayout(plan.features),
        },
        {
            label: 'Status',
            icon: CircleDot,
            getValue: (_plan: { features: string[] }, status: string) => status,
        },
    ];

    return (
        <section id="pricing" className="py-20 bg-white/3 border-t border-white/6">
            <div className="w-full px-4">

                <Title
                    title="Trading"
                    heading="Choose Your NairaTrader Challenge"
                    description="Complete our Trading Objectives to become eligible to gain your Funded Account."
                />

                <div className="md:hidden flex items-center gap-2 overflow-x-auto pb-3 mb-1">
                    {plansData.map((plan) => (
                        <button
                            key={`${plan.id}-tab`}
                            onClick={() => scrollToMobileCard(plan.id)}
                            className={`shrink-0 px-4 py-2 rounded-full text-sm font-semibold border backdrop-blur-md transition ${
                                activeMobileTab === plan.id
                                    ? 'text-black bg-yellow-300 border-yellow-200 shadow-[0_0_12px_rgba(250,204,21,0.45)]'
                                    : 'text-white bg-white/10 border-white/20 hover:bg-white/20'
                            }`}
                        >
                            {getTabLabel(plan.name)}
                        </button>
                    ))}
                </div>

                <div>
                    <div className="hidden md:flex gap-3 overflow-x-auto pb-2 justify-center">
                        <div className="min-w-[170px] shrink-0 pt-5">
                            <div className="h-[58px]" />
                            {tableRows.map((row, rowIndex) => (
                                <div
                                    key={row.label}
                                    className="px-2 py-2 text-white text-sm font-medium mb-1.5 rounded-lg bg-white/5 border border-white/10"
                                >
                                    <div className="flex items-center gap-2">
                                        <row.icon className="w-3.5 h-3.5 text-yellow-300" />
                                        <span>{row.label}</span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {plansData.map((plan) => {
                            const status = getStatus(plan);
                            return (
                                <div
                                    key={plan.id}
                                    className="min-w-[170px] shrink-0"
                                >
                                    <div className="relative rounded-xl border border-white/20 bg-white/10 backdrop-blur-md shadow-[0_0_20px_rgba(255,255,255,0.06)] overflow-hidden transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_0_24px_rgba(255,255,255,0.12)]">
                                        <div className="absolute -top-8 -right-8 h-16 w-16 rounded-full bg-yellow-400/10 blur-xl" />
                                        <div className="relative px-3 py-3 bg-white/5">
                                            <div className="font-semibold text-white text-[13px]">{plan.name}</div>
                                            <div className="text-yellow-300 font-semibold text-sm mt-1">
                                                {plan.price}
                                            </div>
                                        </div>

                                        {tableRows.map((row, rowIndex) => (
                                            <div
                                                key={`${plan.id}-${row.label}`}
                                                className="px-3 py-2"
                                            >
                                                <div className={`rounded-lg bg-white/6 border border-white/10 px-2 py-1.5 text-xs ${row.label === 'Status' ? (status === 'Paused' ? 'text-red-300 font-semibold' : 'text-green-300 font-semibold') : 'text-gray-100'}`}>
                                                    {row.getValue(plan, status)}
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <PrimaryButton className="w-full mt-2 text-xs py-2 text-white bg-white/10 border border-white/25 backdrop-blur-md hover:bg-white/20 hover:border-white/35" disabled={status === 'Paused'}>
                                        {status === 'Paused' ? 'Paused' : 'Start Now'}
                                    </PrimaryButton>
                                </div>
                            );
                        })}
                    </div>

                    <div ref={mobileCardsContainerRef} onScroll={handleMobileCardsScroll} className="md:hidden flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory">
                        {plansData.map((plan) => {
                            const status = getStatus(plan);
                            const mobileRows = getMobileRows(plan, status);
                            return (
                                <div
                                    key={plan.id}
                                    className="min-w-[280px] shrink-0 snap-start"
                                    ref={(el) => {
                                        mobileCardRefs.current[plan.id] = el;
                                    }}
                                >
                                    <div className="rounded-xl border border-white/20 bg-white/10 backdrop-blur-md p-4 min-h-[330px] shadow-[0_0_18px_rgba(255,255,255,0.06)]">
                                        <div className="flex items-center justify-between mb-4">
                                            <h4 className="font-semibold text-white text-base">{plan.name}</h4>
                                            <span className="text-yellow-300 font-semibold text-base">{plan.price}</span>
                                        </div>
                                        <div className="space-y-2.5">
                                            {mobileRows.map((item) => (
                                                <div key={`${plan.id}-${item.label}`} className="flex items-center justify-between rounded-lg bg-white/6 border border-white/10 px-3 py-2.5">
                                                    <span className="text-gray-300 text-sm">{item.label}</span>
                                                    <span className={`text-sm font-semibold ${item.label === 'Status' ? (status === 'Paused' ? 'text-red-300' : 'text-green-300') : 'text-white'}`}>
                                                        {item.value}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <PrimaryButton className="w-full mt-2 text-xs py-2 text-white bg-white/10 border border-white/25 backdrop-blur-md hover:bg-white/20 hover:border-white/35" disabled={status === 'Paused'}>
                                        {status === 'Paused' ? 'Paused' : 'Start Now'}
                                    </PrimaryButton>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </section>
    );
};