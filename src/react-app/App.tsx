import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "./hooks/useAuth";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { SetupPage } from "./pages/SetupPage";
import { LoginPage } from "./pages/LoginPage";
import { Setup2FAPage } from "./pages/Setup2FAPage";
import { DashboardPage } from "./pages/DashboardPage";
import { ChangePasswordPage } from "./pages/ChangePasswordPage";
import { UsersPage } from "./pages/UsersPage";
import { useState, useEffect } from "react";
import "./App.css";

function App() {
	const { user, loading } = useAuth();
	const [needsSetup, setNeedsSetup] = useState<boolean | null>(null);
	const navigate = useNavigate();

	useEffect(() => {
		// Check if setup is needed
		fetch('/api/setup/status')
			.then(res => res.json())
			.then(data => {
				setNeedsSetup(data.needsSetup);
				// If setup is needed and we're at root or login, redirect to setup
				if (data.needsSetup && (window.location.pathname === '/' || window.location.pathname === '/login')) {
					navigate('/setup');
				}
			})
			.catch(err => {
				console.error('Failed to check setup status:', err);
				setNeedsSetup(false);
			});
	}, [navigate]);

	if (loading || needsSetup === null) {
		return (
			<div style={{ textAlign: 'center', padding: '2rem' }}>
				<p>Loading...</p>
			</div>
		);
	}

	return (
		<Routes>
			<Route path="/setup" element={<SetupPage />} />
			<Route 
				path="/login" 
				element={user ? <Navigate to="/dashboard" replace /> : <LoginPage />} 
			/>
			<Route path="/setup-2fa" element={<Setup2FAPage />} />
			<Route path="/change-password" element={<ChangePasswordPage />} />
			<Route 
				path="/dashboard" 
				element={
					<ProtectedRoute>
						<DashboardPage />
					</ProtectedRoute>
				} 
			/>
			<Route 
				path="/users" 
				element={
					<ProtectedRoute>
						{user?.role === 'admin' ? <UsersPage /> : <Navigate to="/dashboard" replace />}
					</ProtectedRoute>
				} 
			/>
			<Route 
				path="/" 
				element={<Navigate to={user ? "/dashboard" : needsSetup ? "/setup" : "/login"} replace />} 
			/>
		</Routes>
	);
}

export default App;
