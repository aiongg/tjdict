import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export function LoginPage() {
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [totpToken, setTotpToken] = useState('');
	const [error, setError] = useState('');
	const [loading, setLoading] = useState(false);
	const [requiresTOTP, setRequiresTOTP] = useState(false);
	const navigate = useNavigate();
	const { login } = useAuth();

	const handleLogin = async (e: React.FormEvent) => {
		e.preventDefault();
		setError('');
		setLoading(true);

		try {
			const response = await fetch('/api/auth/login', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ email, password }),
				credentials: 'include',
			});

			const data = await response.json();

			if (response.ok) {
				if (data.requiresPasswordChange) {
					// Redirect to password change page
					navigate('/change-password');
				} else if (data.requiresTOTP) {
					// Show TOTP input
					setRequiresTOTP(true);
				} else if (data.requiresTOTPSetup) {
					// Redirect to 2FA setup
					navigate('/setup-2fa');
				} else {
					// Full login successful
					await login();
					navigate('/dashboard');
				}
			} else {
				setError(data.error || 'Login failed');
			}
		} catch (err) {
			setError('An error occurred. Please try again.');
			console.error('Login error:', err);
		} finally {
			setLoading(false);
		}
	};

	const handleVerifyTOTP = async (e: React.FormEvent) => {
		e.preventDefault();
		setError('');
		setLoading(true);

		try {
			const response = await fetch('/api/auth/verify-totp', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ token: totpToken }),
				credentials: 'include',
			});

			const data = await response.json();

			if (response.ok) {
				await login();
				navigate('/dashboard');
			} else {
				setError(data.error || 'Invalid token');
			}
		} catch (err) {
			setError('An error occurred. Please try again.');
			console.error('TOTP verification error:', err);
		} finally {
			setLoading(false);
		}
	};

	if (requiresTOTP) {
		return (
			<div className="page-container">
				<h1>Two-Factor Authentication</h1>
				<div className="card">
					<p style={{ marginBottom: '1.5rem', color: '#888' }}>
						Enter your 6-digit authentication code or a backup code.
					</p>

					{error && (
						<div className="alert-error">
							{error}
						</div>
					)}

					<form onSubmit={handleVerifyTOTP}>
						<div style={{ marginBottom: '1.5rem' }}>
							<label htmlFor="totpToken">
								Authentication Code
							</label>
							<input
								id="totpToken"
								type="text"
								value={totpToken}
								onChange={(e) => setTotpToken(e.target.value)}
								required
								autoFocus
								placeholder="000000"
								style={{
									width: '100%',
									textAlign: 'center',
									letterSpacing: '0.5em',
									fontFamily: 'monospace',
									fontSize: '1.5em',
								}}
							/>
						</div>

						<button
							type="submit"
							disabled={loading}
							style={{
								width: '100%',
								padding: '0.6em 1.2em',
								fontSize: '1em',
								marginBottom: '1rem',
							}}
						>
							{loading ? 'Verifying...' : 'Verify'}
						</button>

						<button
							type="button"
							onClick={() => {
								setRequiresTOTP(false);
								setTotpToken('');
								setError('');
							}}
							style={{
								width: '100%',
								padding: '0.6em 1.2em',
								fontSize: '1em',
								backgroundColor: 'transparent',
								border: '1px solid #333',
							}}
						>
							Back to Login
						</button>
					</form>
				</div>
			</div>
		);
	}

	return (
		<div className="page-container">
			<h1>TJDict Login</h1>
			<div className="card">
				{error && (
					<div className="alert-error">
						{error}
					</div>
				)}

				<form onSubmit={handleLogin}>
					<div style={{ marginBottom: '1rem' }}>
						<label htmlFor="email">
							Email Address
						</label>
						<input
							id="email"
							type="email"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							required
							autoFocus
							style={{ width: '100%' }}
						/>
					</div>

					<div style={{ marginBottom: '1.5rem' }}>
						<label htmlFor="password">
							Password
						</label>
						<input
							id="password"
							type="password"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							required
							style={{ width: '100%' }}
						/>
					</div>

					<button
						type="submit"
						disabled={loading}
						style={{
							width: '100%',
							padding: '0.6em 1.2em',
							fontSize: '1em',
						}}
					>
						{loading ? 'Logging in...' : 'Login'}
					</button>
				</form>
			</div>
		</div>
	);
}

