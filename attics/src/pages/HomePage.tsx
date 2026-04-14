import React from 'react';
import AtticHeader from '../components/AtticHeader';

const whiteSectionItems = [
	{
		title: 'Low-Cost Entry Opportunity',
		text: 'Start your trading journey without needing large capital.',
		icon: 'fa-seedling',
	},
	{
		title: 'Earn Your Challenge',
		text: 'Pass the Attic phase and unlock a full funded opportunity.',
		icon: 'fa-trophy',
	},
	{
		title: 'Simple & Transparent Rules',
		text: 'No hidden conditions — just clear objectives.',
		icon: 'fa-scale-balanced',
	},
	{
		title: 'Skill Over Capital',
		text: 'We focus on your performance, not your wallet.',
		icon: 'fa-chart-line',
	},
];

const HomePage: React.FC = () => {
	return (
		<div className="attics-home-page">
			<div className="attics-home-top">
				<AtticHeader />

				<div className="attics-home-shell">
					<section className="attics-home-headline-block">
						<h1 className="attics-home-title">
							Start From Nothing.
							<br />
							Trade Your Way Up.
						</h1>
						<p className="attics-home-subtitle">
							The MACHEFUNDED Attic Program gives skilled traders a chance to prove themselves — even without capital.
						</p>
						<p className="attics-home-subtitle attics-home-subtitle--secondary">
							Pass the Attic Challenge and unlock your funded journey.
						</p>
						<div className="attics-home-actions">
							<a href="/login" className="attics-home-primary">Start Now</a>
							<a href="https://discord.gg/HR6QW83W6" className="attics-home-secondary">Join Discord</a>
						</div>
					</section>
				</div>
			</div>

			<section className="attics-home-next-section">
				<div className="attics-home-shell">
					<div className="attics-home-next-section__inner">
						<div className="attics-home-benefits-list">
							{whiteSectionItems.map((item) => (
								<div key={item.title} className="attics-home-benefit-item">
									<div className="attics-home-benefit-icon">
										<i className={`fas ${item.icon}`} />
									</div>
									<div>
										<h3 className="attics-home-benefit-title">{item.title}</h3>
										<p className="attics-home-benefit-text">{item.text}</p>
									</div>
								</div>
							))}
						</div>
					</div>
				</div>
			</section>
		</div>
	);
};

export default HomePage;