import { createContext, useState, useEffect, ReactNode } from 'react';

interface User {
	id: number;
	email: string;
	role: string;
	totpEnabled: boolean;
}

interface AuthContextType {
	user: User | null;
	loading: boolean;
	login: () => Promise<void>;
	logout: () => Promise<void>;
	checkAuth: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
	const [user, setUser] = useState<User | null>(null);
	const [loading, setLoading] = useState(true);

	const checkAuth = async () => {
		try {
			const response = await fetch('/api/auth/me', {
				credentials: 'include',
			});

			if (response.ok) {
				const userData = await response.json();
				setUser(userData);
			} else {
				setUser(null);
			}
		} catch (error) {
			console.error('Auth check failed:', error);
			setUser(null);
		} finally {
			setLoading(false);
		}
	};

	const login = async () => {
		await checkAuth();
	};

	const logout = async () => {
		try {
			await fetch('/api/auth/logout', {
				method: 'POST',
				credentials: 'include',
			});
			setUser(null);
		} catch (error) {
			console.error('Logout failed:', error);
		}
	};

	useEffect(() => {
		checkAuth();
	}, []);

	return (
		<AuthContext.Provider value={{ user, loading, login, logout, checkAuth }}>
			{children}
		</AuthContext.Provider>
	);
}

