import { createContext, ReactNode } from 'react';
import { useCurrentUser, useLogout } from '../hooks/useAuthQuery';

interface User {
	id: number;
	email: string;
	role: string;
	nickname: string | null;
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
	// Use React Query for user state
	const { data: user, isLoading: loading, refetch } = useCurrentUser();
	const logoutMutation = useLogout();

	const login = async () => {
		await refetch();
	};

	const logout = async () => {
		await logoutMutation.mutateAsync();
	};

	const checkAuth = async () => {
		await refetch();
	};

	return (
		<AuthContext.Provider value={{ user: user || null, loading, login, logout, checkAuth }}>
			{children}
		</AuthContext.Provider>
	);
}

