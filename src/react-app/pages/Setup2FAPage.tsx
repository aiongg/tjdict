import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import QRCode from 'qrcode';
import { useAuth } from '../hooks/useAuth';

export function Setup2FAPage() {
	const [secret, setSecret] = useState('');
	const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
	const [backupCodes, setBackupCodes] = useState<string[]>([]);
	const [totpToken, setTotpToken] = useState('');
	const [error, setError] = useState('');
	const [loading, setLoading] = useState(false);
	const [showBackupCodes, setShowBackupCodes] = useState(false);
	const navigate = useNavigate();
	const { login } = useAuth();

	useEffect(() => {
		// Fetch 2FA setup data
		fetch('/api/auth/setup-2fa/init', {
			method: 'POST',
			credentials: 'include',
		})
			.then(res => {
				if (!res.ok) {
					throw new Error('Failed to initialize 2FA setup');
				}
				return res.json();
			})
			.then(async data => {
				setSecret(data.secret);
				setBackupCodes(data.backupCodes);

				// Generate QR code
				const qrDataUrl = await QRCode.toDataURL(data.qrCodeUrl);
				setQrCodeDataUrl(qrDataUrl);
			})
			.catch(err => {
				console.error('Failed to setup 2FA:', err);
				setError('Failed to initialize 2FA setup. Please try again.');
			});
	}, []);

	const handleVerify = async (e: React.FormEvent) => {
		e.preventDefault();
		setError('');
		setLoading(true);

		try {
			const response = await fetch('/api/auth/setup-2fa/verify', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ totpToken }),
				credentials: 'include',
			});

			const data = await response.json();

			if (response.ok) {
				setShowBackupCodes(true);
			} else {
				setError(data.error || 'Invalid token');
			}
		} catch (err) {
			setError('An error occurred. Please try again.');
			console.error('2FA setup error:', err);
		} finally {
			setLoading(false);
		}
	};

	const handleContinue = async () => {
		await login();
		navigate('/dashboard');
	};

	if (showBackupCodes) {
		return (
			<div className="page-container">
				<h1>Backup Codes</h1>
				<div className="card">
					<p style={{ marginBottom: '1.5rem', color: '#888' }}>
						Save these backup codes in a secure location. Each code can be used once 
						if you lose access to your authenticator app.
					</p>

					<div className="backup-codes" style={{ marginBottom: '1.5rem' }}>
						{backupCodes.map((code, index) => (
							<div key={index} style={{ padding: '0.25rem 0' }}>
								{code}
							</div>
						))}
					</div>

					<div className="alert-warning">
						⚠️ Make sure to save these codes before continuing!
					</div>

					<button
						onClick={handleContinue}
						style={{
							width: '100%',
							padding: '0.6em 1.2em',
							fontSize: '1em',
						}}
					>
						Continue to Dashboard
					</button>
				</div>
			</div>
		);
	}

	return (
		<div className="page-container">
			<h1>Set Up Two-Factor Authentication</h1>
			<div className="card">
				<p style={{ marginBottom: '1.5rem', color: '#888' }}>
					Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
				</p>

				{qrCodeDataUrl && (
					<div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
						<img src={qrCodeDataUrl} alt="QR Code" style={{ maxWidth: '100%' }} />
					</div>
				)}

				{secret && (
					<div style={{ marginBottom: '1.5rem' }}>
						<p style={{ marginBottom: '0.5rem', fontSize: '0.9em', color: '#888' }}>
							Or enter this code manually:
						</p>
						<div className="code-display" style={{ fontSize: '1.1em', letterSpacing: '0.1em' }}>
							{secret}
						</div>
					</div>
				)}

				{error && (
					<div className="alert-error">
						{error}
					</div>
				)}

				<form onSubmit={handleVerify}>
					<div style={{ marginBottom: '1.5rem' }}>
						<label htmlFor="totpToken">
							Enter the 6-digit code from your authenticator app
						</label>
						<input
							id="totpToken"
							type="text"
							value={totpToken}
							onChange={(e) => setTotpToken(e.target.value)}
							required
							placeholder="000000"
							maxLength={6}
							style={{
								width: '100%',
								fontSize: '1.5em',
								textAlign: 'center',
								letterSpacing: '0.5em',
								fontFamily: 'monospace',
							}}
						/>
					</div>

					<button
						type="submit"
						disabled={loading || !qrCodeDataUrl}
						style={{
							width: '100%',
							padding: '0.6em 1.2em',
							fontSize: '1em',
						}}
					>
						{loading ? 'Verifying...' : 'Verify and Enable 2FA'}
					</button>
				</form>
			</div>
		</div>
	);
}

