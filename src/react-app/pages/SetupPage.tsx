import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export function SetupPage() {
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');
	const [error, setError] = useState('');
	const [loading, setLoading] = useState(false);
	const navigate = useNavigate();

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError('');

		if (password !== confirmPassword) {
			setError('Passwords do not match');
			return;
		}

		if (password.length < 8) {
			setError('Password must be at least 8 characters');
			return;
		}

		setLoading(true);

		try {
			const response = await fetch('/api/auth/setup/create-admin', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ email, password }),
				credentials: 'include',
			});

			const data = await response.json();

			if (response.ok) {
				// Redirect to 2FA setup
				navigate('/setup-2fa');
			} else {
				setError(data.error || 'Failed to create admin account');
			}
		} catch (err) {
			setError('An error occurred. Please try again.');
			console.error('Setup error:', err);
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="page-container">
			<h1>TJDict Setup</h1>
			<div className="card">
				<h2 style={{ marginTop: 0 }}>
					Create Admin Account
				</h2>
				<p style={{ marginBottom: '1.5rem', color: '#888' }}>
					Set up the first administrator account for the dictionary.
				</p>

				{error && (
					<div className="alert-error">
						{error}
					</div>
				)}

				<form onSubmit={handleSubmit}>
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
							style={{ width: '100%' }}
						/>
					</div>

					<div style={{ marginBottom: '1rem' }}>
						<label htmlFor="password">
							Password
						</label>
						<input
							id="password"
							type="password"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							required
							minLength={8}
							style={{ width: '100%' }}
						/>
					</div>

					<div style={{ marginBottom: '1.5rem' }}>
						<label htmlFor="confirmPassword">
							Confirm Password
						</label>
						<input
							id="confirmPassword"
							type="password"
							value={confirmPassword}
							onChange={(e) => setConfirmPassword(e.target.value)}
							required
							minLength={8}
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
						{loading ? 'Creating...' : 'Create Admin Account'}
					</button>
				</form>
			</div>
		</div>
	);
}

