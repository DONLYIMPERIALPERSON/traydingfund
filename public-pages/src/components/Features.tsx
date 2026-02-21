import { featuresData } from '../assets/dummy-data';
import Title from './Title';

export default function Features() {
    return (
        <section id="features" className="py-20 2xl:py-32">
            <div className="max-w-6xl mx-auto px-4">

                <Title
                    title="If you sabi trade,"
                    heading="We sabi pay!"
                    description=""
                />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {featuresData.map((feature, i) => (
                        <div
                            key={i}
                            className="rounded-2xl p-6 bg-white/3 border border-white/6 transition duration-300 hover:border-white/15 hover:-translate-y-1"
                        >
                            <div className="w-12 h-12 rounded-lg bg-yellow-300/20 flex items-center justify-center mb-4 text-yellow-300">
                                {feature.icon}
                            </div>
                            <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                            <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-line">
                                {feature.desc}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};