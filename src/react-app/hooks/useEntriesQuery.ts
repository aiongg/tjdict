import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../lib/queryClient';
import type { EntryData } from '../components/editor/types';

interface EntryStatus {
	id: number;
	entry_id: number;
	user_id: number;
	status: 'draft' | 'submitted' | 'needs_work' | 'approved';
	reviewed_at: string;
	user_email: string;
	user_nickname: string | null;
}

interface EntryComment {
	id: number;
	entry_id: number;
	user_id: number;
	comment: string;
	created_at: string;
	user_email: string;
	user_nickname: string | null;
}

interface Entry {
	id: number;
	head: string;
	sort_key: string;
	entry_data: string;
	source_file: string | null;
	created_at: string;
	updated_at: string;
	created_by: number | null;
	updated_by: number | null;
}

interface EntryWithReviews extends Entry {
	current_status: 'draft' | 'submitted' | 'needs_work' | 'approved';
	statuses: EntryStatus[];
	all_statuses: EntryStatus[];
	comments: EntryComment[];
	my_status?: EntryStatus;
}

interface EntriesListFilters extends Record<string, unknown> {
	page: number;
	pageSize?: number;
	q?: string;  // Search query - supports key:value syntax (head:, en:, tw:, etym:)
	status?: ('draft' | 'submitted' | 'needs_work' | 'approved')[];
	sortBy?: 'sort_key' | 'updated_at';
	sortOrder?: 'asc' | 'desc';
	dictPage?: number; // For dictionary page-based navigation
}

interface EntriesListResponse {
	entries: EntryWithReviews[];
	total?: number;
	page?: number;
	pageSize?: number;
	currentPage?: number;
	minPage?: number;
	maxPage?: number;
	totalEntries?: number;
}

// Hook to fetch paginated entries list
export function useEntriesList(filters: EntriesListFilters) {
	const hasFilters = filters.q || filters.status;
	const useOffsetPagination = hasFilters || filters.sortBy === 'updated_at';

	return useQuery({
		queryKey: queryKeys.entries.list(filters),
		queryFn: async (): Promise<EntriesListResponse> => {
			// Use different endpoint based on whether we have filters or sorting by updated_at
			let url: string;
			const params = new URLSearchParams();

			if (useOffsetPagination) {
				// Use offset-based pagination endpoint (for filters or date sorting)
				url = '/api/entries';
				params.set('page', filters.page.toString());
				params.set('pageSize', (filters.pageSize || 50).toString());
				params.set('sortBy', filters.sortBy || 'sort_key');
				params.set('sortOrder', filters.sortOrder || 'asc');

				if (filters.q) params.set('q', filters.q);
				if (filters.status && filters.status.length > 0) {
					filters.status.forEach(s => params.append('status', s));
				}
			} else {
				// Use dictionary page-based endpoint (for alphabetical sorting)
				url = `/api/entries/by-page/${filters.dictPage || filters.page}`;
				params.set('sortBy', filters.sortBy || 'sort_key');
				params.set('sortOrder', filters.sortOrder || 'asc');
			}

			const response = await fetch(`${url}?${params}`);
			if (!response.ok) {
				throw new Error('Failed to fetch entries');
			}

			return response.json();
		},
		staleTime: 60 * 1000, // 1 minute
		gcTime: 5 * 60 * 1000, // 5 minutes
	});
}

// Hook to fetch single entry
export function useEntry(id: string | number | undefined) {
	return useQuery({
		queryKey: queryKeys.entries.detail(id || 'new'),
		queryFn: async (): Promise<EntryWithReviews> => {
			if (!id || id === 'new') {
				throw new Error('Invalid entry ID');
			}

			const response = await fetch(`/api/entries/${id}`);
			if (!response.ok) {
				throw new Error('Failed to fetch entry');
			}

			return response.json();
		},
		enabled: !!id && id !== 'new', // Don't fetch for new entries
		staleTime: 30 * 1000, // 30 seconds - entry details change more frequently
		gcTime: 5 * 60 * 1000,
	});
}

// Mutation to create or update an entry
export function useUpdateEntry(id?: string | number) {
	const queryClient = useQueryClient();
	const isNew = !id || id === 'new';

	return useMutation({
		mutationFn: async (data: {
			head: string;
			head_number?: number;
			entry_data: EntryData;
		}) => {
			const url = isNew ? '/api/entries' : `/api/entries/${id}`;
			const method = isNew ? 'POST' : 'PUT';

			const response = await fetch(url, {
				method,
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(data),
			});

			if (!response.ok) {
				throw new Error('Failed to save entry');
			}

			return response.json();
		},
		onSuccess: (result) => {
			// Invalidate and refetch entry lists
			queryClient.invalidateQueries({ queryKey: queryKeys.entries.lists() });
			
			// If updating existing entry, update its detail cache
			if (!isNew) {
				queryClient.invalidateQueries({ queryKey: queryKeys.entries.detail(id) });
			}
			
			return result;
		},
	});
}

// Mutation to submit a status with optimistic updates
export function useSubmitReview() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (data: { entryId: number | string; status: 'draft' | 'submitted' | 'needs_work' | 'approved' }) => {
			const response = await fetch(`/api/entries/${data.entryId}/reviews`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ status: data.status }),
			});

			if (!response.ok) {
				throw new Error('Failed to submit review');
			}

			return response.json();
		},
		onMutate: async ({ entryId, status }) => {
			// Normalize entryId to number for list updates, but keep original type for detail cache key
			const entryIdNum = typeof entryId === 'string' ? parseInt(entryId) : entryId;
			// Cancel any outgoing refetches
			await queryClient.cancelQueries({ queryKey: queryKeys.entries.lists() });
			await queryClient.cancelQueries({ queryKey: queryKeys.entries.detail(entryId) });

			// Snapshot the previous values
			const previousLists: Map<string, unknown> = new Map();
			
			// Get all list query caches
			queryClient.getQueriesData({ queryKey: queryKeys.entries.lists() }).forEach(([key, data]) => {
				previousLists.set(JSON.stringify(key), data);
			});

			const previousDetail = queryClient.getQueryData(queryKeys.entries.detail(entryId));

			// Optimistically update all list caches
			queryClient.getQueriesData({ queryKey: queryKeys.entries.lists() }).forEach(([key]) => {
				queryClient.setQueryData(key, (old: EntriesListResponse | undefined) => {
					if (!old) return old;

					return {
						...old,
						entries: old.entries.map((entry) => {
							if (entry.id === entryIdNum) {
								return {
									...entry,
									current_status: status,
									my_status: {
										id: 0, // Temporary ID
										entry_id: entryIdNum,
										user_id: 0, // Will be filled by server
										status,
										reviewed_at: new Date().toISOString(),
										user_email: '',
										user_nickname: null,
									},
								};
							}
							return entry;
						}),
					};
				});
			});

		// Optimistically update detail cache (use original entryId to match cache key)
		queryClient.setQueryData(
			queryKeys.entries.detail(entryId),
			(old: EntryWithReviews | undefined) => {
				if (!old) return old;

				const newMyStatus = {
					id: 0,
					entry_id: entryIdNum,
					user_id: old.my_status?.user_id || 0,
					status,
					reviewed_at: new Date().toISOString(),
					user_email: old.my_status?.user_email || '',
					user_nickname: old.my_status?.user_nickname || null,
				};

				// Update the statuses array (latest per user)
				// If the current user already has a status in the array, update it
				// Otherwise, add a new one
				const currentUserId = old.my_status?.user_id;
				const updatedStatuses = currentUserId
					? old.statuses.some(s => s.user_id === currentUserId)
						? old.statuses.map(s => s.user_id === currentUserId ? newMyStatus : s)
						: [...old.statuses, newMyStatus]
					: old.statuses;

				return {
					...old,
					current_status: status,
					my_status: newMyStatus,
					statuses: updatedStatuses,
				};
			}
		);

			return { previousLists, previousDetail };
		},
		onError: (_err, { entryId }, context) => {
			// Rollback optimistic updates on error
			if (context?.previousLists) {
				context.previousLists.forEach((data, key) => {
					queryClient.setQueryData(JSON.parse(key), data);
				});
			}

			if (context?.previousDetail) {
				queryClient.setQueryData(queryKeys.entries.detail(entryId), context.previousDetail);
			}
		},
		onSettled: (_data, _error, { entryId }) => {
			// Refetch to get the accurate data from server
			queryClient.invalidateQueries({ queryKey: queryKeys.entries.detail(entryId) });
			queryClient.invalidateQueries({ queryKey: queryKeys.entries.lists() });
		},
	});
}

// Mutation to add a comment
export function useAddComment() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (data: { entryId: number; comment: string }) => {
			const response = await fetch(`/api/entries/${data.entryId}/comments`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ comment: data.comment }),
			});

			if (!response.ok) {
				throw new Error('Failed to add comment');
			}

			return response.json();
		},
		onSuccess: (_, { entryId }) => {
			// Invalidate entry detail to refetch with new comment
			queryClient.invalidateQueries({ queryKey: queryKeys.entries.detail(entryId) });
		},
	});
}

// Mutation to delete a comment
export function useDeleteComment() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (data: { entryId: number; commentId: number }) => {
			const response = await fetch(`/api/entries/${data.entryId}/comments/${data.commentId}`, {
				method: 'DELETE',
			});

			if (!response.ok) {
				throw new Error('Failed to delete comment');
			}

			return response.json();
		},
		onSuccess: (_, { entryId }) => {
			// Invalidate entry detail to refetch without deleted comment
			queryClient.invalidateQueries({ queryKey: queryKeys.entries.detail(entryId) });
		},
	});
}

