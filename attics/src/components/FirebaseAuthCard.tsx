import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { loginWithBackend, updateProfile } from '../lib/traderAuth';
import './FirebaseAuthCard.css';

type FirebaseAuthCardProps = {
	title: string;
	subtitle: string;
};

type AuthStep = 'email' | 'password' | 'otp' | 'createPassword' | 'profile';

function toSafeAuthErrorMessage(err: unknown): string {
	if (err instanceof Error) {
		const message = err.message.toLowerCase();
		if (message.includes('failed to fetch') || message.includes('network')) return 'Network error. Please check your connection and try again.';
		if (message.includes('invalid login credentials') || message.includes('wrong password')) return 'Incorrect password. Please try again.';
		if (message.includes('user-not-found') || message.includes('user not found')) return 'No account found with that email address.';
	}

	return 'Unable to sign in right now. Please try again shortly.';
}

const FirebaseAuthCard: React.FC<FirebaseAuthCardProps> = ({ title, subtitle }) => {
	const navigate = useNavigate();
	const debugEnabled = String(import.meta.env.VITE_DEBUG_AUTH ?? 'true').toLowerCase() === 'true';
	const debugLog = (...args: unknown[]) => {
		if (debugEnabled) console.log('[attics-auth]', ...args);
	};
	const [error, setError] = useState('');
	const [info, setInfo] = useState('');
	const [loading, setLoading] = useState(false);
	const [step, setStep] = useState<AuthStep>('email');
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');
	const [otpCode, setOtpCode] = useState('');
	const [firstName, setFirstName] = useState('');
	const [lastName, setLastName] = useState('');
	const [otpAttemptsLeft, setOtpAttemptsLeft] = useState(4);
	const [otpCooldown, setOtpCooldown] = useState(0);
	const [showPassword, setShowPassword] = useState(false);
	const [showConfirmPassword, setShowConfirmPassword] = useState(false);
	const appBaseUrl = import.meta.env.VITE_APP_BASE_URL || window.location.origin;

	const otpLocked = otpAttemptsLeft <= 0;
	const otpResendDisabled = loading || otpCooldown > 0;

	useEffect(() => {
		if (otpCooldown <= 0) return;
		const timer = window.setInterval(() => setOtpCooldown((prev) => (prev > 0 ? prev - 1 : 0)), 1000);
		return () => window.clearInterval(timer);
	}, [otpCooldown]);

	useEffect(() => {
		if (step !== 'otp') {
			setOtpCooldown(0);
			setOtpAttemptsLeft(4);
		}
	}, [step]);

	const shouldPromptForName = (user?: { full_name: string | null; first_name?: string | null; last_name?: string | null }) => {
		if (!user) return false;
		return !(user.first_name?.trim() && user.last_name?.trim() && user.full_name?.trim());
	};

	const handleProfileCompletion = async () => {
		if (!firstName.trim() || !lastName.trim()) {
			setError('Please enter your first and last name');
			return;
		}

		setLoading(true);
		setError('');
		try {
			await updateProfile({ first_name: firstName.trim(), last_name: lastName.trim() });
			navigate('/dashboard');
		} catch (err) {
			setError(toSafeAuthErrorMessage(err));
		} finally {
			setLoading(false);
		}
	};

	const handleEmailSubmit = useCallback(async () => {
		if (!email.trim()) {
			setError('Please enter your email address');
			return;
		}

		setLoading(true);
		setError('');
		try {
			const baseUrl = import.meta.env.VITE_API_BASE_URL as string;
			debugLog('checking if email exists', { email: email.trim(), baseUrl });
			const response = await fetch(`${baseUrl}/auth/email-exists?email=${encodeURIComponent(email.trim())}`);
			if (!response.ok) throw new Error('Unable to verify email');
			const data = await response.json();
			if (data?.exists) {
				setStep('password');
			} else {
				const { error: otpError } = await supabase.auth.signInWithOtp({ email: email.trim() });
				if (otpError) throw otpError;
				setOtpAttemptsLeft(4);
				setOtpCooldown(60);
				setStep('otp');
			}
		} catch (err) {
			setError(toSafeAuthErrorMessage(err));
		} finally {
			setLoading(false);
		}
	}, [email]);

	const handlePasswordSubmit = useCallback(async () => {
		if (!password.trim()) {
			setError('Please enter your password');
			return;
		}

		setLoading(true);
		setError('');
		try {
			const { data, error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password: password.trim() });
			debugLog('password sign-in response', { hasSession: Boolean(data?.session), userEmail: data?.user?.email ?? null, error: signInError?.message ?? null });
			if (signInError) throw signInError;

			if (data?.session?.access_token) {
				localStorage.setItem('supabase_access_token', data.session.access_token);
				const user = await loginWithBackend();
				if (shouldPromptForName(user)) {
					setStep('profile');
					return;
				}
			}

			navigate('/dashboard');
		} catch (err) {
			setError(toSafeAuthErrorMessage(err));
		} finally {
			setLoading(false);
		}
	}, [email, navigate, password]);

	const handleOtpSubmit = useCallback(async () => {
		if (!otpCode.trim()) {
			setError('Please enter the OTP code');
			return;
		}

		if (otpLocked) {
			setError('You have reached the maximum OTP attempts. Please resend the code.');
			return;
		}

		setLoading(true);
		setError('');
		try {
			const { data, error: verifyError } = await supabase.auth.verifyOtp({ email: email.trim(), token: otpCode.trim(), type: 'email' });
			debugLog('otp verify response', { hasSession: Boolean(data?.session), userEmail: data?.user?.email ?? null, error: verifyError?.message ?? null });
			if (verifyError) {
				setOtpAttemptsLeft((prev) => Math.max(prev - 1, 0));
				throw verifyError;
			}

			if (data?.session?.access_token) {
				localStorage.setItem('supabase_access_token', data.session.access_token);
				await loginWithBackend();
			}

			setStep('createPassword');
		} catch (err) {
			setError(toSafeAuthErrorMessage(err));
		} finally {
			setLoading(false);
		}
	}, [email, otpCode, otpLocked]);

	const handleCreateAccount = useCallback(async () => {
		if (!password.trim()) return setError('Please enter a password');
		if (password !== confirmPassword) return setError('Passwords do not match');
		if (password.length < 6) return setError('Password must be at least 6 characters long');

		setLoading(true);
		setError('');
		try {
			const { data, error: updateError } = await supabase.auth.updateUser({ password: password.trim() });
			debugLog('create password response', { hasUser: Boolean(data?.user), userEmail: data?.user?.email ?? null, error: updateError?.message ?? null });
			if (updateError) throw updateError;

			if (data?.user) {
				const session = await supabase.auth.getSession();
				if (session.data.session?.access_token) {
					localStorage.setItem('supabase_access_token', session.data.session.access_token);
					const user = await loginWithBackend();
					if (shouldPromptForName(user)) {
						setStep('profile');
						return;
					}
				}
			}

			navigate('/dashboard');
		} catch (err) {
			setError(toSafeAuthErrorMessage(err));
		} finally {
			setLoading(false);
		}
	}, [confirmPassword, navigate, password]);

	const handleForgotPassword = useCallback(async () => {
		if (!email.trim()) return setError('Please enter your email address');

		setLoading(true);
		setError('');
		setInfo('');
		try {
			const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${appBaseUrl}/login` });
			if (error) throw error;
			setInfo('Password reset email sent. Check your inbox to continue.');
		} catch (err) {
			setError(toSafeAuthErrorMessage(err));
		} finally {
			setLoading(false);
		}
	}, [appBaseUrl, email]);

	const handleResendOtp = useCallback(async () => {
		setLoading(true);
		setError('');
		try {
			const { error } = await supabase.auth.signInWithOtp({ email: email.trim() });
			if (error) throw error;
			setOtpAttemptsLeft(4);
			setOtpCooldown(60);
		} catch (err) {
			setError(toSafeAuthErrorMessage(err));
		} finally {
			setLoading(false);
		}
	}, [email]);

	const resetToEmail = () => {
		setStep('email');
		setError('');
		setInfo('');
		setPassword('');
		setOtpCode('');
		setConfirmPassword('');
	};

	return (
		<div>
			<h2 className="form-title">{title}</h2>
			<p className="naira-auth-subtitle">{subtitle}</p>

			{step === 'email' && (
				<div className="naira-auth-stack">
					<label className="form-label naira-auth-label">Email</label>
					<div className="input-group">
						<i className="fas fa-envelope input-icon" />
						<input className="form-input" type="email" placeholder="Enter your email" value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleEmailSubmit()} disabled={loading} />
					</div>
					<button className="submit-button" type="button" disabled={loading || !email.trim()} onClick={handleEmailSubmit}>{loading ? 'Checking...' : 'Continue'}</button>
				</div>
			)}

			{step === 'password' && (
				<div className="naira-auth-stack">
					<div className="naira-auth-email-display"><span>{email}</span><button type="button" className="naira-auth-change-email" onClick={resetToEmail}>Change</button></div>
					<label className="form-label naira-auth-label">Password</label>
					<div className="input-group">
						<i className="fas fa-lock input-icon" />
						<input className="form-input" type={showPassword ? 'text' : 'password'} placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handlePasswordSubmit()} disabled={loading} />
						<button type="button" className="naira-auth-visibility" onClick={() => setShowPassword((prev) => !prev)}><i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`} /></button>
					</div>
					<div className="naira-auth-forgot"><button type="button" className="naira-auth-link" onClick={handleForgotPassword}>Forgot password?</button></div>
					<button className="submit-button" type="button" disabled={loading || !password.trim()} onClick={handlePasswordSubmit}>{loading ? 'Signing in...' : 'Sign In'}</button>
				</div>
			)}

			{step === 'otp' && (
				<div className="naira-auth-stack">
					<div className="naira-auth-email-display"><span>{email}</span><button type="button" className="naira-auth-change-email" onClick={resetToEmail}>Change</button></div>
					<p className="naira-auth-helper">Check your email for a verification code to create your account.</p>
					<div className="input-group">
						<i className="fas fa-key input-icon" />
						<input className="form-input" type="text" placeholder="Enter OTP" value={otpCode} onChange={(e) => setOtpCode(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleOtpSubmit()} disabled={loading || otpLocked} />
					</div>
					<button className="submit-button" type="button" disabled={loading || !otpCode.trim() || otpLocked} onClick={handleOtpSubmit}>{loading ? 'Please wait...' : 'Verify Code'}</button>
					<button className="submit-button naira-auth-secondary-btn" type="button" disabled={otpResendDisabled} onClick={handleResendOtp}>{otpResendDisabled ? `Resend in ${otpCooldown}s` : 'Send again'}</button>
				</div>
			)}

			{step === 'createPassword' && (
				<div className="naira-auth-stack">
					<div className="naira-auth-email-display"><span>{email}</span><button type="button" className="naira-auth-change-email" onClick={resetToEmail}>Change</button></div>
					<label className="form-label naira-auth-label">Create Password</label>
					<div className="input-group">
						<i className="fas fa-lock input-icon" />
						<input className="form-input" type={showPassword ? 'text' : 'password'} placeholder="Create password (min 6 characters)" value={password} onChange={(e) => setPassword(e.target.value)} disabled={loading} />
						<button type="button" className="naira-auth-visibility" onClick={() => setShowPassword((prev) => !prev)}><i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`} /></button>
					</div>
					<label className="form-label naira-auth-label">Confirm Password</label>
					<div className="input-group">
						<i className="fas fa-lock input-icon" />
						<input className="form-input" type={showConfirmPassword ? 'text' : 'password'} placeholder="Confirm password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleCreateAccount()} disabled={loading} />
						<button type="button" className="naira-auth-visibility" onClick={() => setShowConfirmPassword((prev) => !prev)}><i className={`fas ${showConfirmPassword ? 'fa-eye-slash' : 'fa-eye'}`} /></button>
					</div>
					<button className="submit-button" type="button" disabled={loading || !password.trim() || !confirmPassword.trim()} onClick={handleCreateAccount}>{loading ? 'Creating account...' : 'Create Account'}</button>
				</div>
			)}

			{step === 'profile' && (
				<div className="naira-auth-stack">
					<p className="naira-auth-helper">Please tell us your first and last name to complete your profile.</p>
					<label className="form-label naira-auth-label">First Name</label>
					<div className="input-group"><i className="fas fa-user input-icon" /><input className="form-input" type="text" placeholder="Enter your first name" value={firstName} onChange={(e) => setFirstName(e.target.value)} disabled={loading} /></div>
					<label className="form-label naira-auth-label">Last Name</label>
					<div className="input-group"><i className="fas fa-user input-icon" /><input className="form-input" type="text" placeholder="Enter your last name" value={lastName} onChange={(e) => setLastName(e.target.value)} disabled={loading} /></div>
					<button className="submit-button" type="button" disabled={loading || !firstName.trim() || !lastName.trim()} onClick={handleProfileCompletion}>{loading ? 'Saving...' : 'Save Profile'}</button>
				</div>
			)}

			{loading && <p className="naira-auth-helper">Please wait...</p>}
			{info && <p className="naira-auth-info">{info}</p>}
			{error && <p className="naira-auth-error">{error}</p>}
		</div>
	);
};

export default FirebaseAuthCard;