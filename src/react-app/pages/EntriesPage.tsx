import { useState, useEffect, useLayoutEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { useImageViewer } from '../contexts/ImageViewerContext';
import { useEntriesList, useSubmitReview } from '../hooks/useEntriesQuery';
import { Navigation } from '../components/Navigation';
import { PaginationControls } from '../components/PaginationControls';
import { PageImageViewer } from '../components/PageImageViewer';
import { SearchFilters, EntryListItem, type StatusFilter } from '../components/entries';

export default function EntriesPage() {
	const { user } = useAuth();
	const navigate = useNavigate();
	const [searchParams, setSearchParams] = useSearchParams();
	
	// Parse URL parameters for initial state
	const getParam = (key: string, defaultValue: string = ''): string => {
		return searchParams.get(key) || defaultValue;
	};
	
	const getNumberParam = (key: string, defaultValue: number): number => {
		const value = searchParams.get(key);
		return value ? parseInt(value, 10) || defaultValue : defaultValue;
	};
	
	// Search and filter state from URL
	const [searchQuery, setSearchQuery] = useState(getParam('q'));
	const [searchInput, setSearchInput] = useState(getParam('q'));
	const [statusFilter, setStatusFilter] = useState<StatusFilter>(
		(getParam('status') as StatusFilter) || 'all'
	);
	const [sortBy, setSortBy] = useState<'sort_key' | 'updated_at'>(
		(getParam('sort') as 'sort_key' | 'updated_at') || 'sort_key'
	);
	const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(
		(getParam('order') as 'asc' | 'desc') || 'asc'
	);
	
	// Page state
	const [dictPage, setDictPage] = useState(getNumberParam('page', 1));
	const [pageInputValue, setPageInputValue] = useState(getParam('page', '1'));
	const [openReviewDropdown, setOpenReviewDropdown] = useState<number | null>(null);
	
	// Check if any filters are active
	const hasFilters = searchQuery || statusFilter !== 'all';
	
	// Build filter object for React Query
	const filters = {
		page: dictPage,
		dictPage: hasFilters ? undefined : dictPage,
		pageSize: 50,
		q: searchQuery || undefined,
		status: statusFilter !== 'all' ? [statusFilter] : undefined,
		sortBy,
		sortOrder,
	};
	
	// Use React Query to fetch entries
	const { data, isLoading: loading, error: queryError } = useEntriesList(filters);
	const entries = data?.entries || [];
	
	// Calculate pagination based on response type
	let minPage = 1;
	let maxPage = 1;
	
	if (data?.minPage && data?.maxPage) {
		// Page-based pagination (alphabetical sorting)
		minPage = data.minPage;
		maxPage = data.maxPage;
	} else if (data?.total && data?.pageSize) {
		// Offset-based pagination (modified sorting or filters)
		minPage = 1;
		maxPage = Math.ceil(data.total / data.pageSize);
	}
	
	const error = queryError ? (queryError as Error).message : '';
	
	// Use mutation for review submission
	const submitReviewMutation = useSubmitReview();
	
	// Image viewer state
	const { isOpen: imageViewerOpen, currentPage: imageViewerPage, openViewer, closeViewer } = useImageViewer();
	const isDesktop = useMediaQuery('(min-width: 1280px)');
	
	// Sync state to URL whenever it changes
	useEffect(() => {
		const params = new URLSearchParams();
		
		// Add parameters only if they differ from defaults
		if (dictPage !== 1) params.set('page', dictPage.toString());
		if (searchQuery) params.set('q', searchQuery);
		if (statusFilter !== 'all') params.set('status', statusFilter);
		if (sortBy !== 'sort_key') params.set('sort', sortBy);
		if (sortOrder !== 'asc') params.set('order', sortOrder);
		
		// Update URL without causing navigation
		setSearchParams(params, { replace: true });
	}, [dictPage, searchQuery, statusFilter, sortBy, sortOrder, setSearchParams]);
	
	// Save scroll position before navigating away
	useEffect(() => {
		const saveScrollPosition = () => {
			const timestamp = Date.now();
			sessionStorage.setItem('entriesPageScrollY', window.scrollY.toString());
			sessionStorage.setItem('entriesPageScrollTimestamp', timestamp.toString());
		};
		
		// Save scroll position periodically while on the page
		const intervalId = setInterval(saveScrollPosition, 500);
		
		// Save when clicking a link
		const handleClick = (e: MouseEvent) => {
			const target = e.target as HTMLElement;
			if (target.closest('a') || target.closest('button')) {
				saveScrollPosition();
			}
		};
		document.addEventListener('click', handleClick);
		
		return () => {
			clearInterval(intervalId);
			document.removeEventListener('click', handleClick);
		};
	}, []);
	
	// Restore scroll position after entries load - use useLayoutEffect for better timing
	useLayoutEffect(() => {
		if (!loading && entries.length > 0) {
			const savedScroll = sessionStorage.getItem('entriesPageScrollY');
			const savedTimestamp = sessionStorage.getItem('entriesPageScrollTimestamp');
			
			if (savedScroll && savedTimestamp) {
				const timestamp = parseInt(savedTimestamp, 10);
				const age = Date.now() - timestamp;
				
				// Only restore if scroll position was saved in the last 5 minutes
				if (age < 5 * 60 * 1000) {
					const scrollY = parseInt(savedScroll, 10);
					
					// Use multiple strategies to ensure scroll happens after DOM paint
					const attemptScroll = () => {
						window.scrollTo(0, scrollY);
					};
					
					// Immediate attempt
					attemptScroll();
					
					// Retry with requestAnimationFrame
					requestAnimationFrame(() => {
						attemptScroll();
						
						// Final retry with small delay to ensure all images/content loaded
						setTimeout(attemptScroll, 50);
					});
					
					// Clear after restoration
					sessionStorage.removeItem('entriesPageScrollY');
					sessionStorage.removeItem('entriesPageScrollTimestamp');
				} else {
					// Clear stale scroll position
					sessionStorage.removeItem('entriesPageScrollY');
					sessionStorage.removeItem('entriesPageScrollTimestamp');
				}
			}
		}
	}, [loading, entries.length]);

	// Debounced search
	useEffect(() => {
		const timer = setTimeout(() => {
			if (searchQuery !== searchInput) {
				setSearchQuery(searchInput);
				setDictPage(1);
				setPageInputValue('1');
			}
		}, 300);

		return () => clearTimeout(timer);
	}, [searchInput, searchQuery]);

	const handleEntryClick = (id: number) => {
		// Don't navigate if user is selecting text
		const selection = window.getSelection();
		if (selection && selection.toString().length > 0) {
			return;
		}
		// Pass current search params to preserve state on return
		navigate(`/entries/${id}`, { state: { returnUrl: `/entries?${searchParams.toString()}` } });
	};

	const handleNewEntry = () => {
		navigate('/entries/new');
	};

	const handlePageClick = (pageNum: number | undefined) => {
		if (pageNum) {
			openViewer(pageNum);
		}
	};

	const handleCloseImageViewer = () => {
		closeViewer();
	};

	const handleReviewStatusChange = async (entryId: number, status: 'draft' | 'submitted' | 'needs_work' | 'approved') => {
		// Use the mutation with optimistic updates
		await submitReviewMutation.mutateAsync({ entryId, status });
	};

	const goToPage = (pageNum: number) => {
		console.log('[goToPage] Called with pageNum:', pageNum);
		const targetPage = Math.max(minPage, Math.min(maxPage, pageNum));
		console.log('[goToPage] Target page:', targetPage, 'minPage:', minPage, 'maxPage:', maxPage);
		console.log('[goToPage] Setting dictPage to:', targetPage);
		setDictPage(targetPage);
		console.log('[goToPage] Setting pageInputValue to:', targetPage.toString());
		setPageInputValue(targetPage.toString());
		console.log('[goToPage] Complete');
	};

	return (
		<div className={`entries-page ${imageViewerOpen && isDesktop ? 'with-image-viewer' : ''}`}>
			<Navigation />

			<div className="page-header">
				<h1>Dictionary Entries</h1>
				{(user?.role === 'editor' || user?.role === 'admin') && (
					<button onClick={handleNewEntry} className="btn-primary">
						+ New Entry
					</button>
				)}
			</div>

			<SearchFilters
				searchInput={searchInput}
				onSearchInputChange={(value) => setSearchInput(value)}
				statusFilter={statusFilter}
				onStatusFilterChange={(value) => {
					setStatusFilter(value);
					setDictPage(1);
					setPageInputValue('1');
				}}
				sortBy={sortBy}
				onSortByChange={(value) => {
					setSortBy(value);
					// Reset to page 1 when changing sort type (different pagination strategies)
					setDictPage(1);
					setPageInputValue('1');
				}}
				sortOrder={sortOrder}
				onSortOrderChange={(value) => setSortOrder(value)}
			/>

			{/* Pagination at top */}
			{!loading && !error && entries.length > 0 && (
				<PaginationControls
					hasFilters={hasFilters}
					entries={entries as unknown as { id: number; [key: string]: unknown }[]}
					dictPage={dictPage}
					minPage={minPage}
					maxPage={maxPage}
					pageInputValue={pageInputValue}
					setPageInputValue={setPageInputValue}
					goToPage={goToPage}
				/>
			)}

			<div className="entry-list">
				{loading ? (
					<div className="loading">Loading entries...</div>
				) : error ? (
					<div className="error">{error}</div>
				) : entries.length === 0 ? (
					<div className="empty-state">
						<p>No entries found matching your filters.</p>
					</div>
				) : (
					<>
						{entries.map((entry) => (
							<EntryListItem
								key={entry.id}
								entry={entry}
								isReviewDropdownOpen={openReviewDropdown === entry.id}
								onEntryClick={handleEntryClick}
								onPageClick={handlePageClick}
								onReviewStatusChange={handleReviewStatusChange}
								onDropdownOpenChange={(isOpen) => setOpenReviewDropdown(isOpen ? entry.id : null)}
							/>
						))}
					</>
				)}
			</div>

			{/* Pagination at bottom */}
			{!loading && !error && entries.length > 0 && (
				<PaginationControls
					hasFilters={hasFilters}
					entries={entries as unknown as { id: number; [key: string]: unknown }[]}
					dictPage={dictPage}
					minPage={minPage}
					maxPage={maxPage}
					pageInputValue={pageInputValue}
					setPageInputValue={setPageInputValue}
					goToPage={goToPage}
				/>
			)}

			{/* Page Image Viewer */}
			{imageViewerOpen && imageViewerPage && (
				<PageImageViewer
					pageNumber={imageViewerPage}
					isOpen={imageViewerOpen}
					onClose={handleCloseImageViewer}
					mode={isDesktop ? 'desktop' : 'mobile'}
				/>
			)}
		</div>
	);
}
