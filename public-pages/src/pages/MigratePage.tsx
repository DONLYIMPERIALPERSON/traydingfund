import { useEffect, useState } from 'react';
import { getSessionToken, useDescope } from '@descope/react-sdk';
import { motion } from 'framer-motion';
import DescopeAuthCard from '../components/DescopeAuthCard';
import { fetchBankList, type BankListItem } from '../lib/auth';

interface MigrationRequest {
	id: number;
	request_type: string;
	account_size: string;
	status: string;
	created_at: string;
	withdrawal_amount?: number;
}

const ACCOUNT_SIZES = ['₦200k', '₦400k', '₦600k', '₦800k', '₦1.5m', '₦3m'];

const MigratePage = () => {
	const descopeSdk = useDescope();
	const [isAuthenticated, setIsAuthenticated] = useState(false);

	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');
	const [success, setSuccess] = useState('');
	const [authError, setAuthError] = useState('');

	// Migration states
	const [migrationRequests, setMigrationRequests] = useState<MigrationRequest[]>([]);
	const [requestType, setRequestType] = useState<'phase2' | 'funded' | 'funded_request'>('phase2');
	const [accountSize, setAccountSize] = useState('');
	const [mt5Server, setMt5Server] = useState('');
	const [mt5AccountNumber, setMt5AccountNumber] = useState('');
	const [mt5Password, setMt5Password] = useState('');
	const [bankAccountNumber, setBankAccountNumber] = useState('');
	const [bankCode, setBankCode] = useState('');
	const [bankName, setBankName] = useState('');
	const [accountName, setAccountName] = useState('');
	const [verifyingBank, setVerifyingBank] = useState(false);
	const [banks, setBanks] = useState<BankListItem[]>([]);

	useEffect(() => {
		const checkAuth = async () => {
			const token = getSessionToken();
			if (token) {
				// First authenticate with backend
				try {
					const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/auth/login`, {
						method: 'POST',
						headers: {
							'Authorization': `Bearer ${token}`,
						},
					});

					if (response.ok) {
						setIsAuthenticated(true);
						loadMigrationRequests();
						loadBanks();
					} else {
						// Backend auth failed, stay unauthenticated
						setIsAuthenticated(false);
					}
				} catch (error) {
					console.error('Backend authentication failed:', error);
					setIsAuthenticated(false);
				}
			} else {
				setIsAuthenticated(false);
			}
		};
		checkAuth();
	}, []);

	const loadBanks = async () => {
		try {
			const bankData = await fetchBankList();
			setBanks(bankData.banks);
		} catch (error) {
			console.error('Failed to load banks:', error);
			// Keep empty array on error
		}
	};

	const loadMigrationRequests = async () => {
		try {
			const token = getSessionToken();
			const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/migration/requests/my`, {
				headers: {
					'Authorization': `Bearer ${token}`,
				},
			});

			if (response.ok) {
				const data = await response.json();
				setMigrationRequests(data);
			}
		} catch (error) {
			console.error('Failed to load migration requests:', error);
		}
	};

	const handleDescopeSuccess = async () => {
		setAuthError('');
		// Re-check authentication after successful Descope login
		const token = getSessionToken();
		if (token) {
			try {
				const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/auth/login`, {
					method: 'POST',
					headers: {
						'Authorization': `Bearer ${token}`,
					},
				});

				if (response.ok) {
					setIsAuthenticated(true);
					loadMigrationRequests();
					loadBanks();
				} else {
					setAuthError('Failed to authenticate with backend');
				}
			} catch (error) {
				setAuthError('Authentication failed');
			}
		}
	};

	const handleDescopeError = () => {
		setAuthError('Authentication failed. Please try again.');
	};

	const handleLogout = async () => {
		try {
			await descopeSdk.logout();
			setIsAuthenticated(false);
			setMigrationRequests([]);
		} catch (error) {
			console.error('Logout failed:', error);
		}
	};

	const verifyBankAccount = async () => {
		if (!bankAccountNumber || !bankCode) {
			setError('Please enter bank account number and select bank');
			return;
		}

		setVerifyingBank(true);
		setError('');

		try {
			const token = getSessionToken();
			const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/migration/verify-bank`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${token}`,
				},
				body: JSON.stringify({
					account_number: bankAccountNumber,
					bank_code: bankCode,
				}),
			});

			if (response.ok) {
				const data = await response.json();
				setBankName(data.bank_name);
				setAccountName(data.account_name);
				setSuccess('Bank account verified successfully!');
			} else {
				const errorData = await response.json();
				setError(errorData.detail || 'Bank verification failed');
			}
		} catch (error: any) {
			setError('Failed to verify bank account');
		} finally {
			setVerifyingBank(false);
		}
	};

	const submitMigrationRequest = async () => {
		if (!accountSize || !mt5Server || !mt5AccountNumber || !mt5Password) {
			setError('Please fill in all required fields');
			return;
		}

		if (requestType === 'funded' && (!bankAccountNumber || !bankCode || !accountName)) {
			setError('Please verify your bank account details');
			return;
		}

		setLoading(true);
		setError('');

		try {
			const token = getSessionToken();
			const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/migration/requests`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${token}`,
				},
				body: JSON.stringify({
					request_type: requestType,
					account_size: accountSize,
					mt5_server: mt5Server,
					mt5_account_number: mt5AccountNumber,
					mt5_password: mt5Password,
					bank_account_number: requestType === 'funded' ? bankAccountNumber : undefined,
					bank_code: requestType === 'funded' ? bankCode : undefined,
					bank_name: requestType === 'funded' ? bankName : undefined,
					account_name: requestType === 'funded' ? accountName : undefined,
				}),
			});

			if (response.ok) {
				setSuccess('Migration request submitted successfully!');
				loadMigrationRequests();
				// Reset form
				setAccountSize('');
				setMt5Server('');
				setMt5AccountNumber('');
				setMt5Password('');
				setBankAccountNumber('');
				setBankCode('');
				setBankName('');
				setAccountName('');
			} else {
				const errorData = await response.json();
				setError(errorData.detail || 'Failed to submit request');
			}
		} catch (error: any) {
			setError('Failed to submit migration request');
		} finally {
			setLoading(false);
		}
	};

	if (!isAuthenticated) {
		return (
			<div className="min-h-screen flex items-center justify-center p-4" style={{
				backgroundColor: '#000',
				backgroundImage: `
					radial-gradient(900px 450px at 50% 8%, rgba(255, 255, 255, 0.14), transparent 65%),
					radial-gradient(500px 260px at 88% 82%, rgba(255, 255, 255, 0.10), transparent 70%),
					linear-gradient(180deg, #0a0a0a 0%, #000000 100%)
				`
			}}>
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					className="bg-gradient-to-b from-yellow-300/35 via-yellow-300/10 to-transparent backdrop-blur-sm border border-white/6 rounded-3xl shadow-2xl p-8 w-full max-w-md"
				>
					<DescopeAuthCard
						title=""
						subtitle=""
						onSuccess={handleDescopeSuccess}
						onError={handleDescopeError}
					/>

					{authError && (
						<div className="text-red-400 text-sm text-center mt-4 bg-red-900/20 border border-red-500/30 rounded-lg p-3">{authError}</div>
					)}
				</motion.div>
			</div>
		);
	}

	return (
		<div className="min-h-screen p-4" style={{
			backgroundColor: '#000',
			backgroundImage: `
				radial-gradient(900px 450px at 50% 8%, rgba(255, 255, 255, 0.14), transparent 65%),
				radial-gradient(500px 260px at 88% 82%, rgba(255, 255, 255, 0.10), transparent 70%),
				linear-gradient(180deg, #0a0a0a 0%, #000000 100%)
			`
		}}>
			<div className="max-w-6xl mx-auto">
			{/* Dashboard Header */}
			<div className="bg-black/40 backdrop-blur-md border border-yellow-500/20 rounded-2xl p-6 mb-8">
				<div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
					<div>
						<h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Account Migration Portal</h1>
						<p className="text-gray-300 text-lg">Move from the old NairaTrader.is to the new NairaTrader.com</p>
					</div>
					<div className="flex items-center gap-4">
						<div className="flex items-center gap-3 px-4 py-2 bg-green-900/30 border border-green-500/30 rounded-lg">
							<div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
							<span className="text-green-300 text-sm font-medium">Online</span>
						</div>
						<button
							onClick={handleLogout}
							className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all duration-200 hover:shadow-lg hover:shadow-red-500/25 font-medium"
						>
							Logout
						</button>
					</div>
				</div>
			</div>

				{/* Migration Requests Status */}
				{migrationRequests.length > 0 && (
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						className="bg-black backdrop-blur-sm border border-yellow-500/30 rounded-3xl shadow-2xl p-8 mb-8"
					>
						<h2 className="text-2xl font-semibold mb-6 text-white">Your Migration Requests</h2>
						<div className="space-y-4">
							{migrationRequests.map((request) => (
								<div key={request.id} className="bg-black/50 border border-yellow-500/20 rounded-xl p-6 backdrop-blur-sm">
									<div className="flex justify-between items-center">
										<div>
											<p className="font-medium text-white text-lg">
												{request.request_type === 'phase2' ? 'Phase 2' :
												 request.request_type === 'funded_request' ? 'Funded Account' :
												 'Payout'} - {request.account_size}
											</p>
											<p className="text-sm text-gray-400 mt-1">
												Submitted: {new Date(request.created_at).toLocaleDateString()}
											</p>
											{request.withdrawal_amount && (
												<p className="text-sm text-green-400 mt-2">
													Withdrawal: ₦{request.withdrawal_amount.toLocaleString()}
												</p>
											)}
										</div>
										<span className={`px-4 py-2 rounded-full text-sm font-medium ${
											request.status === 'approved' ? 'bg-green-900/50 text-green-300 border border-green-500/30' :
											request.status === 'declined' ? 'bg-red-900/50 text-red-300 border border-red-500/30' :
											'bg-yellow-900/50 text-yellow-300 border border-yellow-500/30'
										}`}>
											{request.status.charAt(0).toUpperCase() + request.status.slice(1)}
										</span>
									</div>
								</div>
							))}
						</div>
					</motion.div>
				)}

				{/* New Migration Request Form */}
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					className="bg-black backdrop-blur-sm border border-yellow-500/30 rounded-3xl shadow-2xl p-8"
				>
					<h2 className="text-2xl font-semibold mb-8 text-white">Request Account Migration</h2>

					<div className="space-y-8">
						{/* Request Type Selection - Tab Style */}
						<div>
							<label className="block text-sm font-medium text-gray-300 mb-6">
								Choose Migration Type
							</label>
							<div className="flex flex-wrap gap-2 p-1 bg-gray-800/50 rounded-xl border border-gray-600/50 backdrop-blur-sm">
								<button
									onClick={() => setRequestType('phase2')}
									className={`flex-1 min-w-0 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
										requestType === 'phase2'
											? 'bg-yellow-400 text-black shadow-lg shadow-yellow-400/25'
											: 'text-gray-300 hover:text-white hover:bg-gray-700/50'
									}`}
								>
									Phase 2 Request
								</button>
								<button
									onClick={() => setRequestType('funded_request')}
									className={`flex-1 min-w-0 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
										requestType === 'funded_request'
											? 'bg-yellow-400 text-black shadow-lg shadow-yellow-400/25'
											: 'text-gray-300 hover:text-white hover:bg-gray-700/50'
									}`}
								>
									Funded Account Request
								</button>
								<button
									onClick={() => setRequestType('funded')}
									className={`flex-1 min-w-0 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
										requestType === 'funded'
											? 'bg-yellow-400 text-black shadow-lg shadow-yellow-400/25'
											: 'text-gray-300 hover:text-white hover:bg-gray-700/50'
									}`}
								>
									Payout Request
								</button>
							</div>
							<div className="mt-4 p-4 bg-gray-800/30 rounded-lg border border-gray-600/30">
								<p className="text-sm text-gray-400">
									{requestType === 'phase2' && 'Basic account migration - Transfer your existing trading account to our platform.'}
									{requestType === 'funded_request' && 'Request a funded account - Get access to our proprietary trading capital.'}
									{requestType === 'funded' && 'Withdrawal & payout - Transfer funds from your trading account to your bank.'}
								</p>
							</div>
						</div>

						{/* Account Size */}
						<div>
							<label className="block text-sm font-medium text-gray-300 mb-3">
								Account Size
							</label>
							<select
								value={accountSize}
								onChange={(e) => setAccountSize(e.target.value)}
								className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-yellow-300 focus:border-transparent backdrop-blur-sm"
								required
							>
								<option value="" className="bg-gray-800">Select account size</option>
								{ACCOUNT_SIZES.map((size) => (
									<option key={size} value={size} className="bg-gray-800">{size}</option>
								))}
							</select>
						</div>

						{/* MT5 Details */}
						<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
							<div>
								<label className="block text-sm font-medium text-gray-300 mb-3">
									Order Number
								</label>
								<input
									type="text"
									value={mt5Server}
									onChange={(e) => setMt5Server(e.target.value)}
									className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-yellow-300 focus:border-transparent backdrop-blur-sm"
									placeholder="Enter your order number"
									required
								/>
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-300 mb-3">
									MT5 Account Number
								</label>
								<input
									type="text"
									value={mt5AccountNumber}
									onChange={(e) => setMt5AccountNumber(e.target.value)}
									className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-yellow-300 focus:border-transparent backdrop-blur-sm"
									required
								/>
							</div>
						</div>

						<div>
							<label className="block text-sm font-medium text-gray-300 mb-3">
								MT5 Password
							</label>
							<input
								type="password"
								value={mt5Password}
								onChange={(e) => setMt5Password(e.target.value)}
								className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-yellow-300 focus:border-transparent backdrop-blur-sm"
								required
							/>
						</div>

						{/* Bank Details for Funded Migration */}
						{requestType === 'funded' && (
							<div className="border-t border-gray-600 pt-8">
								<h3 className="text-xl font-medium mb-6 text-white">Bank Account Details</h3>

								<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
									<div>
										<label className="block text-sm font-medium text-gray-300 mb-3">
											Bank Account Number
										</label>
										<input
											type="text"
											value={bankAccountNumber}
											onChange={(e) => setBankAccountNumber(e.target.value)}
											className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-yellow-300 focus:border-transparent backdrop-blur-sm"
											required
										/>
									</div>
									<div>
										<label className="block text-sm font-medium text-gray-300 mb-3">
											Bank
										</label>
										<select
											value={bankCode}
											onChange={(e) => setBankCode(e.target.value)}
											className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-yellow-300 focus:border-transparent backdrop-blur-sm"
											required
										>
											<option value="" className="bg-gray-800">Select bank</option>
											{banks.map((bank) => (
												<option key={bank.bank_code} value={bank.bank_code} className="bg-gray-800">
													{bank.bank_name}
												</option>
											))}
										</select>
									</div>
								</div>

								{!accountName && (
									<button
										onClick={verifyBankAccount}
										disabled={verifyingBank}
										className="w-full md:w-auto px-8 py-3 bg-yellow-300 text-black rounded-xl font-semibold hover:bg-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors mb-6"
									>
										{verifyingBank ? 'Verifying...' : 'Verify Bank Account'}
									</button>
								)}

								{accountName && (
									<div className="bg-green-900/30 border border-green-500/30 rounded-xl p-6 mb-6 backdrop-blur-sm">
										<p className="text-green-300 font-semibold text-lg">✓ Account Verified</p>
										<p className="text-green-200 mt-1">Account Name: {accountName}</p>
										<p className="text-green-200">Bank: {bankName}</p>
									</div>
								)}
							</div>
						)}

						{error && (
							<div className="text-red-300 text-sm text-center bg-red-900/30 border border-red-500/30 rounded-xl p-4 backdrop-blur-sm">
								{error}
							</div>
						)}

						{success && (
							<div className="text-green-300 text-sm text-center bg-green-900/30 border border-green-500/30 rounded-xl p-4 backdrop-blur-sm">
								{success}
							</div>
						)}

						<button
							onClick={submitMigrationRequest}
							disabled={loading || (requestType === 'funded' && !accountName)}
							className="w-full bg-yellow-300 text-black py-4 rounded-xl font-semibold hover:bg-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-lg"
						>
							{loading ? 'Submitting...' : 'Submit Migration Request'}
						</button>
					</div>
				</motion.div>
			</div>
		</div>
	);
};

export default MigratePage;