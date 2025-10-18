import { useState, useEffect } from 'react';
import { Navigation } from '../components/Navigation';

interface User {
	id: number;
	email: string;
	role: string;
	isActive: boolean;
	totpEnabled: boolean;
	requiresPasswordChange: boolean;
	lastLogin: string | null;
	createdAt: string;
}

export function UsersPage() {
	const [users, setUsers] = useState<User[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [showCreateModal, setShowCreateModal] = useState(false);
	const [showResetModal, setShowResetModal] = useState(false);
	const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
	const [tempPassword, setTempPassword] = useState('');

	// Create user form
	const [newEmail, setNewEmail] = useState('');
	const [newPassword, setNewPassword] = useState('');
	const [newRole, setNewRole] = useState<'user' | 'editor' | 'admin'>('user');

	useEffect(() => {
		loadUsers();
	}, []);

	const loadUsers = async () => {
		try {
			const response = await fetch('/api/admin/users', {
				credentials: 'include',
			});

			if (response.ok) {
				const data = await response.json();
				setUsers(data);
			} else {
				setError('Failed to load users');
			}
		} catch (err) {
			setError('An error occurred');
			console.error('Load users error:', err);
		} finally {
			setLoading(false);
		}
	};

	const generatePassword = () => {
		const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
		let password = "";
		for (let i = 0; i < 12; i++) {
			password += charset.charAt(Math.floor(Math.random() * charset.length));
		}
		setNewPassword(password);
	};

	const handleCreateUser = async (e: React.FormEvent) => {
		e.preventDefault();
		setError('');

		try {
			const response = await fetch('/api/admin/users', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					email: newEmail,
					temporaryPassword: newPassword,
					role: newRole,
				}),
				credentials: 'include',
			});

			const data = await response.json();

			if (response.ok) {
				setShowCreateModal(false);
				setNewEmail('');
				setNewPassword('');
				setNewRole('user');
				await loadUsers();
				alert(`User created successfully! Temporary password: ${newPassword}`);
			} else {
				setError(data.error || 'Failed to create user');
			}
		} catch (err) {
			setError('An error occurred');
			console.error('Create user error:', err);
		}
	};

	const handleResetPassword = async () => {
		if (!selectedUserId) return;

		try {
			const response = await fetch(`/api/admin/users/${selectedUserId}/reset-password`, {
				method: 'POST',
				credentials: 'include',
			});

			const data = await response.json();

			if (response.ok) {
				setTempPassword(data.temporaryPassword);
			} else {
				setError(data.error || 'Failed to reset password');
			}
		} catch (err) {
			setError('An error occurred');
			console.error('Reset password error:', err);
		}
	};

	const handleToggleActive = async (userId: number, isActive: boolean) => {
		try {
			const response = await fetch(`/api/admin/users/${userId}`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ isActive: !isActive }),
				credentials: 'include',
			});

			if (response.ok) {
				await loadUsers();
			} else {
				const data = await response.json();
				setError(data.error || 'Failed to update user');
			}
		} catch (err) {
			setError('An error occurred');
			console.error('Toggle active error:', err);
		}
	};

	const getRoleBadgeClass = (role: string) => {
		switch (role) {
			case 'admin': return 'badge-admin';
			case 'editor': return 'badge-editor';
			default: return 'badge-user';
		}
	};

	const formatDate = (date: string | null) => {
		if (!date) return 'Never';
		return new Date(date).toLocaleDateString();
	};

	if (loading) {
		return (
			<div className="users-page">
				<Navigation />
				<div className="users-content">
					<div className="loading">Loading users...</div>
				</div>
			</div>
		);
	}

	return (
		<div className="users-page">
			<Navigation />

			<div className="users-content">
				<div className="page-header">
					<h1>User Management</h1>
					<button onClick={() => setShowCreateModal(true)} className="btn-primary">
						+ Add User
					</button>
				</div>

				{error && (
					<div className="alert-error">
						{error}
					</div>
				)}

				<div className="card">
					<table className="table">
						<thead>
							<tr>
								<th>Email</th>
								<th>Role</th>
								<th>Status</th>
								<th>2FA</th>
								<th>Password</th>
								<th>Last Login</th>
								<th>Actions</th>
							</tr>
						</thead>
						<tbody>
							{users.map(user => (
								<tr key={user.id}>
									<td>{user.email}</td>
									<td>
										<span className={`badge ${getRoleBadgeClass(user.role)}`}>
											{user.role}
										</span>
									</td>
									<td>
										<span className={`badge ${user.isActive ? 'badge-active' : 'badge-inactive'}`}>
											{user.isActive ? 'Active' : 'Inactive'}
										</span>
									</td>
									<td>
										{user.totpEnabled ? '✓ Enabled' : '✗ Not Set Up'}
									</td>
									<td>
										{user.requiresPasswordChange ? (
											<span className="status-warning">⚠ Temp Password</span>
										) : (
											'Normal'
										)}
									</td>
									<td>{formatDate(user.lastLogin)}</td>
									<td>
										<div className="table-actions">
											<button
												className="btn-secondary btn-sm"
												onClick={() => {
													setSelectedUserId(user.id);
													setShowResetModal(true);
													setTempPassword('');
												}}
											>
												Reset Password
											</button>
											<button
												className="btn-secondary btn-sm"
												onClick={() => handleToggleActive(user.id, user.isActive)}
											>
												{user.isActive ? 'Deactivate' : 'Activate'}
											</button>
										</div>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</div>

			{/* Create User Modal */}
			{showCreateModal && (
				<div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
					<div className="modal-content card" onClick={(e) => e.stopPropagation()}>
						<h2>Create New User</h2>
						<form onSubmit={handleCreateUser}>
							<div className="form-group">
								<label htmlFor="email">Email Address</label>
								<input
									id="email"
									type="email"
									value={newEmail}
									onChange={(e) => setNewEmail(e.target.value)}
									required
								/>
							</div>

							<div className="form-group">
								<label htmlFor="role">Role</label>
								<select
									id="role"
									value={newRole}
									onChange={(e) => setNewRole(e.target.value as 'user' | 'editor' | 'admin')}
								>
									<option value="user">User</option>
									<option value="editor">Editor</option>
									<option value="admin">Admin</option>
								</select>
							</div>

							<div className="form-group">
								<label htmlFor="password">Temporary Password</label>
								<div className="form-row">
									<input
										id="password"
										type="text"
										value={newPassword}
										onChange={(e) => setNewPassword(e.target.value)}
										required
										minLength={8}
									/>
									<button
										type="button"
										onClick={generatePassword}
										className="btn-secondary"
									>
										Generate
									</button>
								</div>
							</div>

							<div className="modal-actions">
								<button type="submit" className="btn-primary">
									Create User
								</button>
								<button
									type="button"
									onClick={() => setShowCreateModal(false)}
									className="btn-secondary"
								>
									Cancel
								</button>
							</div>
						</form>
					</div>
				</div>
			)}

			{/* Reset Password Modal */}
			{showResetModal && (
				<div className="modal-overlay" onClick={() => setShowResetModal(false)}>
					<div className="modal-content card" onClick={(e) => e.stopPropagation()}>
						<h2>Reset Password</h2>
						
						{!tempPassword ? (
							<>
								<div className="alert-warning">
									⚠️ This will clear the user's 2FA settings and require them to set up 2FA again.
								</div>
								<p>Are you sure you want to reset the password for this user?</p>
								<div className="modal-actions">
									<button onClick={handleResetPassword} className="btn-danger">
										Reset Password
									</button>
									<button
										onClick={() => setShowResetModal(false)}
										className="btn-secondary"
									>
										Cancel
									</button>
								</div>
							</>
						) : (
							<>
								<p>New temporary password has been generated:</p>
								<div className="code-display">
									{tempPassword}
								</div>
								<div className="alert-warning">
									⚠️ Make sure to copy this password and send it to the user securely!
								</div>
								<button
									onClick={() => {
										navigator.clipboard.writeText(tempPassword);
										alert('Password copied to clipboard!');
									}}
									className="btn-primary"
								>
									Copy to Clipboard
								</button>
								<button
									onClick={() => setShowResetModal(false)}
									className="btn-secondary"
								>
									Close
								</button>
							</>
						)}
					</div>
				</div>
			)}
		</div>
	);
}
