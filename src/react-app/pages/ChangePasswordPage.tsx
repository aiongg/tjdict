import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export function ChangePasswordPage() {
	const [currentPassword, setCurrentPassword] = useState('');
	const [newPassword, setNewPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');
	const [error, setError] = useState('');
	const [loading, setLoading] = useState(false);
	const navigate = useNavigate();

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError('');

		if (newPassword !== confirmPassword) {
			setError('Passwords do not match');
			return;
		}

		if (newPassword.length < 8) {
			setError('New password must be at least 8 characters');
			return;
		}

		setLoading(true);

		try {
			const response = await fetch('/api/auth/change-password', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ 
					currentPassword, 
					newPassword 
				}),
				credentials: 'include',
			});

			const data = await response.json();

			if (response.ok) {
				// Redirect to login with success message
				navigate('/login', { 
					state: { message: 'Password changed successfully. Please log in with your new password.' }
				});
			} else {
				setError(data.error || 'Failed to change password');
			}
		} catch (err) {
			setError('An error occurred. Please try again.');
			console.error('Password change error:', err);
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="page-container">
			<h1>Change Your Password</h1>
			<div className="card">
				<p style={{ marginBottom: '1.5rem', color: '#888' }}>
					You must change your temporary password before continuing.
				</p>

				{error && (
					<div className="alert-error">
						{error}
					</div>
				)}

				<form onSubmit={handleSubmit}>
					<div style={{ marginBottom: '1rem' }}>
						<label htmlFor="currentPassword">
							Current Password
						</label>
						<input
							id="currentPassword"
							type="password"
							value={currentPassword}
							onChange={(e) => setCurrentPassword(e.target.value)}
							required
							autoFocus
							style={{ width: '100%' }}
						/>
					</div>

					<div style={{ marginBottom: '1rem' }}>
						<label htmlFor="newPassword">
							New Password
						</label>
						<input
							id="newPassword"
							type="password"
							value={newPassword}
							onChange={(e) => setNewPassword(e.target.value)}
							required
							minLength={8}
							style={{ width: '100%' }}
						/>
					</div>

					<div style={{ marginBottom: '1rem' }}>
						<label htmlFor="confirmPassword">
							Confirm New Password
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

					<div style={{ marginBottom: '1.5rem', fontSize: '0.9em', color: '#888' }}>
						<strong>Password requirements:</strong>
						<ul style={{ margin: '0.5rem 0 0 1.5rem', paddingLeft: 0 }}>
							<li>At least 8 characters long</li>
						</ul>
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
						{loading ? 'Changing Password...' : 'Change Password'}
					</button>
				</form>
			</div>
		</div>
	);
}

