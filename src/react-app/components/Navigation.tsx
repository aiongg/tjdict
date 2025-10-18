import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export function Navigation() {
	const { user, logout } = useAuth();
	const navigate = useNavigate();

	const handleLogout = async () => {
		await logout();
		navigate('/login');
	};

	const getRoleBadgeClass = (role: string) => {
		switch (role) {
			case 'admin': return 'badge-admin';
			case 'editor': return 'badge-editor';
			default: return 'badge-user';
		}
	};

	return (
		<nav className="nav-bar">
			<div className="nav-content">
				<div className="nav-links">
					<Link to="/dashboard" className="nav-brand">
						<strong>TJDict</strong>
					</Link>
					<Link to="/entries" className="nav-link">
						Dictionary
					</Link>
					{user?.role === 'admin' && (
						<Link to="/users" className="nav-link">
							Users
						</Link>
					)}
				</div>

				<div className="nav-user">
					<div className="nav-user-info">
						<span>{user?.email}</span>
						{user && (
							<span className={`badge ${getRoleBadgeClass(user.role)}`}>
								{user.role}
							</span>
						)}
					</div>
					<button onClick={handleLogout} className="btn-logout">
						Logout
					</button>
				</div>
			</div>
		</nav>
	);
}

