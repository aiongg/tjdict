import { Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Moon, Sun } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export function Navigation() {
	const { user, logout } = useAuth();
	const navigate = useNavigate();
	const [theme, setTheme] = useState<'light' | 'dark'>('light');
	const [menuOpen, setMenuOpen] = useState(false);
	const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

	useEffect(() => {
		const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
		if (savedTheme) {
			setTheme(savedTheme);
			document.documentElement.setAttribute('data-theme', savedTheme);
		}

		const handleResize = () => {
			setIsMobile(window.innerWidth < 768);
			if (window.innerWidth >= 768) {
				setMenuOpen(false);
			}
		};

		window.addEventListener('resize', handleResize);
		return () => window.removeEventListener('resize', handleResize);
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
		setMenuOpen(false);
	};

	const handleNavClick = () => {
		setMenuOpen(false);
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
				{isMobile ? (
					<>
						<div className="nav-mobile-header">
							<Link to="/dashboard" className="nav-logo-mobile" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}>
								<img src="/android-chrome-192x192.png" alt="TJDict" style={{ width: '32px', height: '32px' }} />
							</Link>
							<button className="hamburger" onClick={() => setMenuOpen(!menuOpen)}>
								☰
							</button>
						</div>
						{menuOpen && (
							<div className="mobile-menu">
								<div className="mobile-menu-content">
									<Link to="/dashboard" className="nav-link" onClick={handleNavClick}>
										Dashboard
									</Link>
									<Link to="/entries" className="nav-link" onClick={handleNavClick}>
										Dictionary
									</Link>
									{user?.role === 'admin' && (
										<Link to="/users" className="nav-link" onClick={handleNavClick}>
											Users
										</Link>
									)}
								<button onClick={toggleTheme} className="nav-link" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
									{theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
									<span>{theme === 'light' ? 'Dark Mode' : 'Light Mode'}</span>
								</button>
									<div style={{ padding: '0.75rem 1rem', borderTop: '1px solid var(--color-border)', marginTop: '0.5rem' }}>
										<div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
											{user?.email}
										</div>
										{user && (
											<span className={`badge ${getRoleBadgeClass(user.role)}`} style={{ marginTop: '0.25rem', display: 'inline-block' }}>
												{user.role}
											</span>
										)}
									</div>
									<button onClick={handleLogout} className="nav-link" style={{ color: 'var(--color-danger)' }}>
										Logout
									</button>
								</div>
							</div>
						)}
					</>
				) : (
					<>
						<div className="nav-links">
							<Link to="/dashboard" className="nav-brand" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
								<img src="/android-chrome-192x192.png" alt="TJDict" style={{ width: '32px', height: '32px' }} />
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
								{theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
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
					</>
				)}
			</div>
		</nav>
	);
}

