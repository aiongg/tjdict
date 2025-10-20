import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Navigation } from '../components/Navigation';

export function DashboardPage() {
	const { user, checkAuth } = useAuth();
	const navigate = useNavigate();
	const [isEditingNickname, setIsEditingNickname] = useState(false);
	const [nickname, setNickname] = useState(user?.nickname || '');
	const [isSaving, setIsSaving] = useState(false);
	const [error, setError] = useState('');

	const handleEditNickname = () => {
		setNickname(user?.nickname || '');
		setIsEditingNickname(true);
		setError('');
	};

	const handleCancelEdit = () => {
		setNickname(user?.nickname || '');
		setIsEditingNickname(false);
		setError('');
	};

	const handleSaveNickname = async () => {
		if (!nickname.trim()) {
			setError('Nickname cannot be empty');
			return;
		}

		setIsSaving(true);
		setError('');

		try {
			const response = await fetch('/api/admin/users/me/nickname', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ nickname: nickname.trim() }),
				credentials: 'include'
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || 'Failed to update nickname');
			}

			await checkAuth(); // Refresh user data
			setIsEditingNickname(false);
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to update nickname');
		} finally {
			setIsSaving(false);
		}
	};

	return (
		<div className="dashboard-page">
			<Navigation />

			<div className="dashboard-content">
				<div className="page-header">
					<h1>Dashboard</h1>
				</div>

				<div className="card">
					<h2>Profile</h2>
					<div className="info-row">
						<strong>Email:</strong> <span>{user?.email}</span>
					</div>
					<div className="info-row">
						<strong>Nickname:</strong>
						{isEditingNickname ? (
							<div className="nickname-editor">
								<input
									type="text"
									value={nickname}
									onChange={(e) => setNickname(e.target.value)}
									disabled={isSaving}
									maxLength={50}
									placeholder="Enter nickname"
								/>
								<button
									onClick={handleSaveNickname}
									disabled={isSaving || !nickname.trim()}
									className="btn-primary btn-sm"
								>
									{isSaving ? 'Saving...' : 'Save'}
								</button>
								<button
									onClick={handleCancelEdit}
									disabled={isSaving}
									className="btn-secondary btn-sm"
								>
									Cancel
								</button>
								{error && <span className="error-text">{error}</span>}
							</div>
						) : (
							<>
								<span>{user?.nickname || user?.email?.split('@')[0]}</span>
								<button
									onClick={handleEditNickname}
									className="btn-icon"
									title="Edit nickname"
								>
									✎
								</button>
							</>
						)}
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
					Welcome to the TJDict editor!
				</p>

				<button
					onClick={() => navigate('/entries')}
					style={{
						padding: '0.75rem 1.5rem',
						fontSize: '1rem',
						marginTop: '1rem',
					}}
				>
					Go to Dictionary
				</button>
			</div>
			</div>
		</div>
	);
}

