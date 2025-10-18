import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

export function DashboardPage() {
	const { user, logout } = useAuth();
	const navigate = useNavigate();

	const handleLogout = async () => {
		await logout();
		navigate('/login');
	};

	return (
		<div style={{ width: '100%', maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>
			<div style={{
				display: 'flex',
				justifyContent: 'space-between',
				alignItems: 'center',
				marginBottom: '2rem',
			}}>
				<h1 style={{ margin: 0, textAlign: 'left' }}>TJDict Dashboard</h1>
				<button onClick={handleLogout}>
					Logout
				</button>
			</div>

			<div className="card" style={{ marginBottom: '2rem' }}>
				<h2 style={{ marginTop: 0 }}>Welcome</h2>
				<div style={{ marginBottom: '1rem' }}>
					<strong>Email:</strong> {user?.email}
				</div>
				<div style={{ marginBottom: '1rem' }}>
					<strong>Role:</strong> {user?.role}
				</div>
				<div>
					<strong>2FA Status:</strong>{' '}
					{user?.totpEnabled ? (
						<span style={{ color: '#4ade80' }}>Enabled ✓</span>
					) : (
						<span style={{ color: '#888' }}>Not Enabled</span>
					)}
				</div>
			</div>

			<div className="card">
				<h2 style={{ marginTop: 0 }}>
					Taiwanese-English Dictionary
				</h2>
				<p style={{ color: '#888', marginBottom: '1.5rem' }}>
					Dictionary editing functionality will be added here.
				</p>

				<div style={{
					padding: '1rem',
					backgroundColor: '#1a1a1a',
					borderRadius: '4px',
					textAlign: 'center',
				}}>
					<p style={{ margin: 0, color: '#888' }}>
						Dictionary editor coming soon...
					</p>
				</div>
			</div>
		</div>
	);
}

