const MigratePage = () => {
	return (
		<div className="min-h-screen flex items-center justify-center px-6 py-20" style={{
			backgroundColor: '#000',
			backgroundImage: `
				radial-gradient(900px 450px at 50% 8%, rgba(255, 255, 255, 0.14), transparent 65%),
				radial-gradient(500px 260px at 88% 82%, rgba(255, 255, 255, 0.10), transparent 70%),
				linear-gradient(180deg, #0a0a0a 0%, #000000 100%)
			`
		}}>
			<a
				href="https://nairatrader.is/migrate"
				className="px-10 py-4 rounded-2xl bg-yellow-300 text-black text-lg font-semibold tracking-wide shadow-lg shadow-yellow-400/25 hover:bg-yellow-400 transition-colors"
			>
				CLICK HERE TO MIGRATE
			</a>
		</div>
	);
};

export default MigratePage;