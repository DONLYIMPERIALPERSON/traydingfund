import React from 'react';
import '../styles/DesktopLoginPage.css';
import FirebaseAuthCard from '../components/FirebaseAuthCard';

const LoginPage: React.FC = () => {
	return (
		<div className="login-page">
			<div className="login-container">
				<div className="hero-section">
					<span className="hero-watermark">MACHEFUNDED</span>
					<div className="hero-icon">
						<img src="/login-page-logo.png" alt="MacheFunded" className="hero-logo" />
					</div>
					<h1 className="hero-title">Welcome Back</h1>
					<p className="hero-subtitle">Sign in to continue your attic trading journey.</p>
				</div>

				<div className="auth-form">
					<div className="form-content">
						<FirebaseAuthCard title="" subtitle="" />
					</div>
				</div>
			</div>
		</div>
	);
};

export default LoginPage;