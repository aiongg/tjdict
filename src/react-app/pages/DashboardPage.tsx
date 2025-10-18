import { useAuth } from '../hooks/useAuth';
import { Navigation } from '../components/Navigation';

export function DashboardPage() {
	const { user } = useAuth();

	return (
		<div className="page-wide">
			<Navigation />

			<div className="card card-spacing">
				<h2>Welcome</h2>
				<div className="info-row">
					<strong>Email:</strong> {user?.email}
				</div>
				<div className="info-row">
					<strong>Role:</strong> {user?.role}
				</div>
				<div className="info-row">
					<strong>2FA Status:</strong>{' '}
					{user?.totpEnabled ? (
						<span className="status-success">Enabled ✓</span>
					) : (
						<span className="status-muted">Not Enabled</span>
					)}
				</div>
			</div>

			<div className="card">
				<h2>Taiwanese-English Dictionary</h2>
				<p className="text-muted">
					Dictionary editing functionality will be added here.
				</p>

				<div className="placeholder-box">
					<p>Dictionary editor coming soon...</p>
				</div>
			</div>
		</div>
	);
}

