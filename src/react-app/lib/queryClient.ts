import { QueryClient, DefaultOptions } from '@tanstack/react-query';

// Query key factory for consistent cache keys
export const queryKeys = {
	entries: {
		all: ['entries'] as const,
		lists: () => [...queryKeys.entries.all, 'list'] as const,
		list: (filters: Record<string, unknown>) => [...queryKeys.entries.lists(), filters] as const,
		details: () => [...queryKeys.entries.all, 'detail'] as const,
		detail: (id: number | string) => [...queryKeys.entries.details(), id] as const,
		reviews: (id: number | string) => [...queryKeys.entries.detail(id), 'reviews'] as const,
	},
	auth: {
		all: ['auth'] as const,
		user: () => [...queryKeys.auth.all, 'user'] as const,
		setupStatus: () => [...queryKeys.auth.all, 'setup-status'] as const,
	},
} as const;

// Default options for all queries
const defaultOptions: DefaultOptions = {
	queries: {
		// Stale time: how long data is considered fresh
		// After this time, data will be refetched in the background
		staleTime: 60 * 1000, // 1 minute for most queries
		
		// Cache time: how long unused data stays in cache
		gcTime: 5 * 60 * 1000, // 5 minutes (formerly cacheTime)
		
		// Retry failed requests
		retry: 3,
		retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
		
		// Don't refetch on window focus (can be disruptive)
		refetchOnWindowFocus: false,
		
		// Do refetch on reconnect
		refetchOnReconnect: true,
		
		// Don't refetch on mount if data is fresh
		refetchOnMount: true,
	},
	mutations: {
		// Retry mutations once on network error
		retry: 1,
		retryDelay: 1000,
	},
};

// Create the query client
export const queryClient = new QueryClient({
	defaultOptions,
});

// Helper to log cache hits in development
if (import.meta.env.DEV) {
	let cacheHits = 0;
	let cacheMisses = 0;
	
	// Override getQueryData to log cache access
	const originalGetQueryData = queryClient.getQueryData.bind(queryClient);
	// @ts-expect-error - Overriding for development logging
	queryClient.getQueryData = (...args) => {
		const data = originalGetQueryData(...args);
		if (data !== undefined) {
			cacheHits++;
			console.log(`[Cache HIT] (${cacheHits} hits, ${cacheMisses} misses)`);
		} else {
			cacheMisses++;
			console.log(`[Cache MISS] (${cacheHits} hits, ${cacheMisses} misses)`);
		}
		return data;
	};
}

