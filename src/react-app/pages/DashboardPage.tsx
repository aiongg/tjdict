import { useAuth } from '../hooks/useAuth';
import { Navigation } from '../components/Navigation';

export function DashboardPage() {
	const { user } = useAuth();

	return (
		<div className="dashboard-page">
			<Navigation />

			<div className="dashboard-content">
				<div className="page-header">
					<h1>Dashboard</h1>
				</div>

				<div className="card">
					<h2>Welcome</h2>
					<div className="info-row">
						<strong>Email:</strong> <span>{user?.email}</span>
					</div>
					<div className="info-row">
						<strong>Role:</strong> <span>{user?.role}</span>
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
						Use the Dictionary link in the navigation to browse and edit dictionary entries.
					</p>

					<div className="placeholder-box">
						<p>Welcome to the TJDict editor!</p>
					</div>
				</div>
			</div>
		</div>
	);
}

