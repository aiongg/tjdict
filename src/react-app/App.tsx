import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "./hooks/useAuth";
import { useSetupStatus } from "./hooks/useAuthQuery";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { SetupPage } from "./pages/SetupPage";
import { LoginPage } from "./pages/LoginPage";
import { Setup2FAPage } from "./pages/Setup2FAPage";
import { DashboardPage } from "./pages/DashboardPage";
import { ChangePasswordPage } from "./pages/ChangePasswordPage";
import { UsersPage } from "./pages/UsersPage";
import EntriesPage from "./pages/EntriesPage";
import EntryEditorPage from "./pages/EntryEditorPage";
import { useEffect } from "react";
import "./App.css";

function App() {
	const { user, loading } = useAuth();
	const { data: setupStatus, isLoading: setupLoading } = useSetupStatus();
	const navigate = useNavigate();

	const needsSetup = setupStatus?.needsSetup ?? false;

	useEffect(() => {
		// If setup is needed and we're at root or login, redirect to setup
		if (needsSetup && (window.location.pathname === '/' || window.location.pathname === '/login')) {
			navigate('/setup');
		}
	}, [needsSetup, navigate]);

	if (loading || setupLoading) {
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
				path="/entries" 
				element={
					<ProtectedRoute>
						<EntriesPage />
					</ProtectedRoute>
				} 
			/>
			<Route 
				path="/entries/:id" 
				element={
					<ProtectedRoute>
						<EntryEditorPage />
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
