import { Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';

export function Navigation() {
	const { user, logout } = useAuth();
	const navigate = useNavigate();
	const [theme, setTheme] = useState<'light' | 'dark'>('light');

	useEffect(() => {
		const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
		if (savedTheme) {
			setTheme(savedTheme);
			document.documentElement.setAttribute('data-theme', savedTheme);
		}
	}, []);

	const toggleTheme = () => {
		const newTheme = theme === 'light' ? 'dark' : 'light';
		setTheme(newTheme);
		localStorage.setItem('theme', newTheme);
		document.documentElement.setAttribute('data-theme', newTheme);
	};

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
					<button onClick={toggleTheme} className="btn-theme" title="Toggle theme">
						{theme === 'light' ? '🌙' : '☀️'}
					</button>
					<div className="nav-user-info">
						<span className="nav-email">{user?.email}</span>
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

