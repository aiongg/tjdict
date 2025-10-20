import { useState, useEffect, useLayoutEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { useImageViewer } from '../contexts/ImageViewerContext';
import { useEntriesList, useSubmitReview } from '../hooks/useEntriesQuery';
import { Navigation } from '../components/Navigation';
import { PaginationControls } from '../components/PaginationControls';
import { PageImageViewer } from '../components/PageImageViewer';
import { ReviewBadge } from '../components/ReviewBadge';
import { getCircledNumber } from '../utils/tools';
import { Headword } from '../components/entries/Headword';

interface TranslationVariant {
	en: string;
	mw?: string;
	etym?: string;
	dup?: boolean;
	alt?: string[];
	[key: string]: unknown;
}

interface PosDefinition {
	pos?: string[];  // Array of strings: ["n"], ["v", "adj"], etc. - optional for incomplete entries
	defs: SubDefinition[];
}

interface SubDefinition {
	en?: string;  // Simple string at definition level
	mw?: string;
	cat?: string;
	bound?: boolean;  // Bound morpheme flag
	dup?: boolean;  // Reduplication flag
	takes_a2?: boolean;  // Takes á tone flag
	alt?: string[];
	cf?: string[];
	det?: string;
	ex?: ExampleItem[];
	drv?: DerivativeItem[];
	idm?: IdiomItem[];
	[key: string]: unknown;
}

interface ExampleItem {
	tw: string;
	en?: TranslationVariant[];  // Always array for a/b/c variants
	mw?: string;
	etym?: string;
	alt?: string[];
	[key: string]: unknown;
}

interface DerivativeItem {
	tw: string;
	en?: TranslationVariant[];  // Always array for a/b/c variants
	mw?: string;
	etym?: string;
	alt?: string[];
	ex?: ExampleItem[];
	[key: string]: unknown;
}

interface IdiomItem {
	tw: string;
	en?: TranslationVariant[];  // Always array for a/b/c variants
	mw?: string;
	etym?: string;
	alt?: string[];
	ex?: ExampleItem[];
	[key: string]: unknown;
}

interface EntryData {
	head: string;
	head_number?: number;
	page?: number;
	etym?: string;
	defs: PosDefinition[];
}

interface Entry {
	id: number;
	head: string;
	sort_key: string;
	entry_data: string;
	is_complete: number;
	source_file: string | null;
	created_at: string;
	updated_at: string;
	created_by: number | null;
	updated_by: number | null;
}

interface EntryReview {
	id: number;
	entry_id: number;
	user_id: number;
	status: 'approved' | 'needs_work';
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

interface EntryWithReviews extends Entry {
	reviews: EntryReview[];
	all_reviews: EntryReview[];
	comments: EntryComment[];
	my_review?: EntryReview;
}

// Components for rendering dictionary entries
const ExtraDisplay = ({ data, bullet }: { data: ExampleItem | DerivativeItem | IdiomItem; bullet: string }) => {
	const hasEn = 'en' in data && data.en && Array.isArray(data.en);
	const hasAlt = 'alt' in data && Array.isArray(data.alt);
	const hasEx = 'ex' in data && Array.isArray((data as DerivativeItem | IdiomItem).ex);
	
	// Format translation variants (en is always TranslationVariant[])
	const renderTranslations = () => {
		if (!hasEn || !Array.isArray(data.en)) return null;
		
		const enArray = data.en;
		const labels = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
		const showLabels = enArray.length > 1; // Only show labels if multiple variants
		
	return enArray.map((variant, idx) => {
		const label = labels[idx] || `${idx + 1}`;
		const parts: React.ReactNode[] = [];
		
		// Add label only if there are multiple variants (semibold)
		if (showLabels) {
			parts.push(<span key="label" className="variant-label">{label}. </span>);
		}
		
		// Add measure word if present
		if (variant.mw) {
			parts.push(<span key="mw">({variant.mw}) </span>);
		}
		
		// Add etymology if present
		if (variant.etym) {
			parts.push(<span key="etym">({variant.etym}) </span>);
		}
		
		// Add translation
		if (variant.en) {
			parts.push(<span key="en">{variant.en}</span>);
		}
		
		// Add alternatives if present
		if (Array.isArray(variant.alt)) {
			variant.alt.forEach((alt: string, altIdx) => {
				parts.push(<span key={`alt-${altIdx}`}>; ≃ {alt}</span>);
			});
		}
		
		return (
			<div key={idx} className="en">
				{parts}
			</div>
		);
	});
};

return (
	<div className="ex">
		<span className="ex-tw">{bullet} {data.tw}</span>
		{renderTranslations()}
		{hasAlt && data.alt ? data.alt.map((alt, i) => (
			<span key={i} className="alt">; ≃ {alt}</span>
		)) : null}
			{hasEx && (data as DerivativeItem | IdiomItem).ex ? (data as DerivativeItem | IdiomItem).ex!.map((ex, i) => (
				<ExtraDisplay key={i} data={ex} bullet="¶" />
			)) : null}
		</div>
	);
};

// Display a single sub-definition variant
const SubDefDisplay = ({ subDef, num, hasSingleDef }: { subDef: SubDefinition; num?: number; hasSingleDef?: boolean }) => {
	// Render flag indicators
	const renderFlags = () => {
		const flags = [];
		if (subDef.bound) flags.push(<span key="bound" className="flag-bound"> <b>B.</b></span>);
		if (subDef.takes_a2) flags.push(<span key="takes_a2" className="flag-takes-a2"> <i>[á]</i></span>);
		if (subDef.dup) flags.push(<span key="dup" className="flag-dup"> <i>[x]</i></span>);
		return flags;
	};

	return (
		<div className="subdef">
			{num !== undefined && <span className="def-num">{getCircledNumber(num)}</span>}
			{/* For single definition, show flags after pos (handled in PosDefDisplay) */}
			{/* For multiple definitions, show flags before English */}
			{!hasSingleDef && renderFlags()}
			{subDef.cat && <span className="cat"> {subDef.cat}</span>}
			{subDef.mw && <span className="mw"> {subDef.mw}:</span>}
			{subDef.en && <span className="en"> {subDef.en}</span>}
			{Array.isArray(subDef.alt) && subDef.alt.map((alt, i) => (
				<span key={i} className="alt">; ≃ {alt}</span>
			))}
			{Array.isArray(subDef.cf) && subDef.cf.map((cf, i) => (
				<span key={i} className="cf">; cf {cf}</span>
			))}
			{subDef.det && <span className="det">; ⇒ {subDef.det}</span>}
			
			{Array.isArray(subDef.ex) && subDef.ex.map((ex, i) => (
				<ExtraDisplay key={`ex-${i}`} data={ex} bullet="¶" />
			))}
			{Array.isArray(subDef.drv) && subDef.drv.map((drv, i) => (
				<ExtraDisplay key={`drv-${i}`} data={drv} bullet="◊" />
			))}
			{Array.isArray(subDef.idm) && subDef.idm.map((idm, i) => (
				<ExtraDisplay key={`idm-${i}`} data={idm} bullet="∆" />
			))}
		</div>
	);
};

// Display a POS group with its definitions
const PosDefDisplay = ({ posDef }: { posDef: PosDefinition }) => {
	const hasSingleDef = posDef.defs.length === 1;
	
	// Render POS badges (multiple badges for multiple pos values)
	const renderPosBadges = () => {
		if (!posDef.pos || posDef.pos.length === 0) {
			return <span className="pos pos-missing">[no pos]</span>;
		}
		return posDef.pos.map((p, i) => (
			<span key={i} className="pos pos-badge">{p}</span>
		));
	};

	// Render flags for single definition (after pos)
	const renderFlagsAfterPos = () => {
		if (!hasSingleDef) return null;
		const subDef = posDef.defs[0];
		const flags = [];
		if (subDef.bound) flags.push(<span key="bound" className="flag-bound"> <b>B.</b></span>);
		if (subDef.takes_a2) flags.push(<span key="takes_a2" className="flag-takes-a2"> <i>[á]</i></span>);
		if (subDef.dup) flags.push(<span key="dup" className="flag-dup"> <i>[x]</i></span>);
		return flags;
	};
	
	return (
		<div className="pos-def">
			{renderPosBadges()}
			{hasSingleDef && renderFlagsAfterPos()}
			{hasSingleDef ? (
				<SubDefDisplay subDef={posDef.defs[0]} hasSingleDef={true} />
			) : (
				posDef.defs.map((subDef, i) => (
					<SubDefDisplay key={i} subDef={subDef} num={i + 1} hasSingleDef={false} />
				))
			)}
		</div>
	);
};

const EntryDisplay = ({ entryData }: { entryData: EntryData }) => {
	// Check if this is a simple det-only entry
	// Conditions: 1 pos def, 1 sub def, only det field is populated (and optionally head_number/etym at entry level)
	const isSimpleDetOnly = 
		entryData.defs.length === 1 && 
		entryData.defs[0].defs.length === 1 &&
		entryData.defs[0].defs[0].det &&
		!entryData.defs[0].defs[0].en &&
		!entryData.defs[0].defs[0].mw &&
		!entryData.defs[0].defs[0].cat &&
		!entryData.defs[0].defs[0].bound &&
		!entryData.defs[0].defs[0].dup &&
		!entryData.defs[0].defs[0].takes_a2 &&
		!entryData.defs[0].defs[0].alt &&
		!entryData.defs[0].defs[0].cf &&
		!entryData.defs[0].defs[0].ex &&
		!entryData.defs[0].defs[0].drv &&
		!entryData.defs[0].defs[0].idm;
	
	if (isSimpleDetOnly) {
		return (
			<div className="entry-display entry-display-simple">
				<Headword 
					head={entryData.head} 
					headNumber={entryData.head_number}
					etym={entryData.etym}
				/>
				<span className="det-simple"> ⇒ {entryData.defs[0].defs[0].det}</span>
			</div>
		);
	}
	
	return (
		<div className="entry-display">
			<div className="entry-headword">
				<Headword 
					head={entryData.head} 
					headNumber={entryData.head_number}
					etym={entryData.etym}
				/>
			</div>
			
			{entryData.defs.map((posDef, i) => (
				<PosDefDisplay key={i} posDef={posDef} />
			))}
		</div>
	);
};

export default function EntriesPage() {
	const { user } = useAuth();
	const navigate = useNavigate();
	const [searchParams, setSearchParams] = useSearchParams();
	
	// Parse URL parameters for initial state
	const getParam = (key: string, defaultValue: string = ''): string => {
		return searchParams.get(key) || defaultValue;
	};
	
	const getBoolParam = (key: string, defaultValue: boolean = false): boolean => {
		const value = searchParams.get(key);
		return value === 'true' ? true : value === 'false' ? false : defaultValue;
	};
	
	const getNumberParam = (key: string, defaultValue: number): number => {
		const value = searchParams.get(key);
		return value ? parseInt(value, 10) || defaultValue : defaultValue;
	};
	
	// Search and filter state from URL
	const [searchQuery, setSearchQuery] = useState(getParam('q'));
	const [searchInput, setSearchInput] = useState(getParam('q'));
	const [showIncompleteOnly, setShowIncompleteOnly] = useState(getBoolParam('incomplete'));
	const [showNeedingReview, setShowNeedingReview] = useState(getBoolParam('needsReview'));
	const [headFilter, setHeadFilter] = useState(getParam('head'));
	const [posFilter, setPosFilter] = useState(getParam('pos'));
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
	const hasFilters = searchQuery || showIncompleteOnly || showNeedingReview || headFilter || posFilter;
	
	// Build filter object for React Query
	const filters = {
		page: dictPage,
		dictPage: hasFilters ? undefined : dictPage,
		pageSize: 50,
		q: searchQuery || undefined,
		incomplete: showIncompleteOnly || undefined,
		needsReview: showNeedingReview || undefined,
		head: headFilter || undefined,
		pos: posFilter || undefined,
		sortBy,
		sortOrder,
	};
	
	// Use React Query to fetch entries
	const { data, isLoading: loading, error: queryError } = useEntriesList(filters);
	const entries = data?.entries || [];
	const minPage = data?.minPage || 1;
	const maxPage = data?.maxPage || 1;
	const error = queryError ? (queryError as Error).message : '';
	
	// Use mutation for review submission
	const submitReviewMutation = useSubmitReview();
	
	// Image viewer state
	const { isOpen: imageViewerOpen, currentPage: imageViewerPage, openViewer, closeViewer } = useImageViewer();
	const isDesktop = useMediaQuery('(min-width: 1280px)');
	const [showAdvanced, setShowAdvanced] = useState(getBoolParam('advanced'));
	
	// Sync state to URL whenever it changes
	useEffect(() => {
		const params = new URLSearchParams();
		
		// Add parameters only if they differ from defaults
		if (dictPage !== 1) params.set('page', dictPage.toString());
		if (searchQuery) params.set('q', searchQuery);
		if (showIncompleteOnly) params.set('incomplete', 'true');
		if (showNeedingReview) params.set('needsReview', 'true');
		if (headFilter) params.set('head', headFilter);
		if (posFilter) params.set('pos', posFilter);
		if (sortBy !== 'sort_key') params.set('sort', sortBy);
		if (sortOrder !== 'asc') params.set('order', sortOrder);
		if (showAdvanced) params.set('advanced', 'true');
		
		// Update URL without causing navigation
		setSearchParams(params, { replace: true });
	}, [dictPage, searchQuery, showIncompleteOnly, showNeedingReview, headFilter, posFilter, sortBy, sortOrder, showAdvanced, setSearchParams]);
	
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

	const getReviewSummary = (entry: EntryWithReviews): string => {
		const approved = entry.reviews.filter(r => r.status === 'approved').length;
		const needsWork = entry.reviews.filter(r => r.status === 'needs_work').length;
		const commentCount = entry.comments.length;

		const parts = [];
		parts.push(`${approved} ✓`);
		parts.push(`${needsWork} ✗`);
		parts.push(`${commentCount} 💬`);

		return parts.join(' • ');
	};

	const handleReviewStatusChange = async (entryId: number, status: 'approved' | 'needs_work') => {
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

			<div className="search-bar">
				<input
					type="text"
					placeholder="Search entries..."
					value={searchInput}
					onChange={(e) => setSearchInput(e.target.value)}
					className="search-input"
				/>

				<div className="search-filters">
					<label className="checkbox-label">
						<input
							type="checkbox"
							checked={showIncompleteOnly}
							onChange={(e) => {
								setShowIncompleteOnly(e.target.checked);
								setDictPage(1);
								setPageInputValue('1');
							}}
						/>
						Incomplete entries only
					</label>

					<label className="checkbox-label">
						<input
							type="checkbox"
							checked={showNeedingReview}
							onChange={(e) => {
								setShowNeedingReview(e.target.checked);
								setDictPage(1);
								setPageInputValue('1');
							}}
						/>
						Needs review
					</label>

					<button
						onClick={() => setShowAdvanced(!showAdvanced)}
						className="btn-secondary btn-sm"
					>
						{showAdvanced ? 'Hide' : 'Show'} Advanced Filters
					</button>
				</div>

				{showAdvanced && (
					<div className="advanced-filters">
						<div className="filter-row">
							<div className="filter-group">
								<label>Headword:</label>
								<input
									type="text"
									placeholder="Filter by headword..."
									value={headFilter}
									onChange={(e) => {
										setHeadFilter(e.target.value);
										setDictPage(1);
										setPageInputValue('1');
									}}
								/>
							</div>

							<div className="filter-group">
								<label>Part of Speech:</label>
								<input
									type="text"
									placeholder="e.g., n, v, adj"
									value={posFilter}
									onChange={(e) => {
										setPosFilter(e.target.value);
										setDictPage(1);
										setPageInputValue('1');
									}}
								/>
							</div>
						</div>

						<div className="filter-row">
							<div className="filter-group">
								<label>Sort By:</label>
								<select
									value={sortBy}
									onChange={(e) => setSortBy(e.target.value as 'sort_key' | 'updated_at')}
								>
									<option value="sort_key">Alphabetical</option>
									<option value="updated_at">Recently Updated</option>
								</select>
							</div>

							<div className="filter-group">
								<label>Order:</label>
								<select
									value={sortOrder}
									onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
								>
									<option value="asc">Ascending</option>
									<option value="desc">Descending</option>
								</select>
							</div>
						</div>
					</div>
				)}
			</div>

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
						{entries.map((entry) => {
							const entryData: EntryData = JSON.parse(entry.entry_data);
							const isReviewDropdownOpen = openReviewDropdown === entry.id;
							return (
							<div
								key={entry.id}
								className={`entry-item ${isReviewDropdownOpen ? 'review-dropdown-open' : ''}`}
								onClick={() => handleEntryClick(entry.id)}
							>
								{entryData.page && (
									<span 
										className="page-link"
										onClick={(e) => {
											e.stopPropagation();
											handlePageClick(entryData.page);
										}}
									>
										p. {entryData.page}
									</span>
								)}
								<div className="entry-meta-badges">
									{!entry.is_complete && (
										<span className="badge badge-incomplete">Incomplete</span>
									)}
									<span className="entry-meta-text">
										{getReviewSummary(entry)} • Updated: {new Date(entry.updated_at).toLocaleDateString()}
									</span>
								</div>
								
								<EntryDisplay entryData={entryData} />
								
								<div
									className="entry-review-badge"
									onClick={(e) => e.stopPropagation()}
								>
									<ReviewBadge
										currentStatus={entry.my_review?.status || null}
										onStatusChange={(status) => handleReviewStatusChange(entry.id, status)}
										compact={true}
										onDropdownOpenChange={(isOpen) => setOpenReviewDropdown(isOpen ? entry.id : null)}
									/>
								</div>
							</div>
						);
						})}
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
