import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../lib/queryClient';

interface User {
	id: number;
	email: string;
	role: string;
	nickname: string | null;
	totpEnabled: boolean;
}

interface SetupStatusResponse {
	needsSetup: boolean;
}

// Hook to get current user with caching
export function useCurrentUser() {
	return useQuery({
		queryKey: queryKeys.auth.user(),
		queryFn: async (): Promise<User | null> => {
			const response = await fetch('/api/auth/me', {
				credentials: 'include',
			});

			if (!response.ok) {
				if (response.status === 401 || response.status === 404) {
					return null;
				}
				throw new Error('Failed to fetch user');
			}

			return response.json();
		},
		staleTime: 5 * 60 * 1000, // 5 minutes - user data doesn't change often
		retry: (failureCount, error) => {
			// Don't retry on 401/404 (not authenticated)
			if (error instanceof Error && error.message.includes('401')) {
				return false;
			}
			return failureCount < 3;
		},
	});
}

// Hook to get setup status with very long caching
export function useSetupStatus() {
	return useQuery({
		queryKey: queryKeys.auth.setupStatus(),
		queryFn: async (): Promise<SetupStatusResponse> => {
			const response = await fetch('/api/auth/setup/status');
			if (!response.ok) {
				throw new Error('Failed to fetch setup status');
			}
			return response.json();
		},
		staleTime: 60 * 60 * 1000, // 1 hour - setup status rarely changes
		gcTime: 2 * 60 * 60 * 1000, // 2 hours in cache
		retry: 1, // Only retry once for setup status
	});
}

// Mutation for logout
export function useLogout() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async () => {
			const response = await fetch('/api/auth/logout', {
				method: 'POST',
				credentials: 'include',
			});

			if (!response.ok) {
				throw new Error('Failed to logout');
			}

			return response.json();
		},
		onSuccess: () => {
			// Clear all auth-related cache on logout
			queryClient.setQueryData(queryKeys.auth.user(), null);
			queryClient.invalidateQueries({ queryKey: queryKeys.auth.all });
			// Also clear entries cache since permissions might change
			queryClient.invalidateQueries({ queryKey: queryKeys.entries.all });
		},
	});
}

// Mutation for login (to be used in login flow)
export function useLogin() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (credentials: { email: string; password: string }) => {
			const response = await fetch('/api/auth/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(credentials),
				credentials: 'include',
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || 'Login failed');
			}

			return response.json();
		},
		onSuccess: () => {
			// Invalidate user query to refetch
			queryClient.invalidateQueries({ queryKey: queryKeys.auth.user() });
		},
	});
}

