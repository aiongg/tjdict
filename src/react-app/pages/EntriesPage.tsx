import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Navigation } from '../components/Navigation';

interface DefinitionItem {
	pos?: string | string[];
	cat?: string;
	en?: string;
	mw?: string;
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
	en?: string;
	[key: string]: unknown;
}

interface DerivativeItem {
	tw: string;
	en?: string;
	mw?: string;
	ex?: ExampleItem[];
	[key: string]: unknown;
}

interface IdiomItem {
	tw: string;
	en?: string;
	[key: string]: unknown;
}

interface EntryData {
	head: string;
	head_number?: number;
	etym?: string;
	defs: DefinitionItem[];
}

// Convert number to superscript
const toSuperscript = (num: number): string => {
	const superscriptMap: { [key: string]: string } = {
		'0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
		'5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹'
	};
	return num.toString().split('').map(d => superscriptMap[d] || d).join('');
};

// Circled numbers for definitions
const circledNumbers = ["⓿", "❶", "❷", "❸", "❹", "❺", "❻", "❼", "❽", "❾", "❿", "⓫", "⓬", "⓭", "⓮", "⓯", "⓰", "⓱", "⓲", "⓳", "⓴"];

const getCircledNum = (num: number): string => {
	if (num >= 0 && num <= 20) {
		return circledNumbers[num];
	}
	return num.toString();
};

// Format headword with superscript number if present
const formatHeadword = (head: string, headNumber?: number): string => {
	if (headNumber) {
		return `${head}${toSuperscript(headNumber)}`;
	}
	return head;
};

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
	status: 'pending' | 'approved' | 'needs_work';
	comment: string | null;
	reviewed_at: string;
	user_email: string;
}

interface EntryWithReviews extends Entry {
	reviews: EntryReview[];
	my_review?: EntryReview;
}

interface EntryListResponse {
	entries: EntryWithReviews[];
	total: number;
	page: number;
	pageSize: number;
}

// Components for rendering dictionary entries
const ExtraDisplay = ({ data, bullet }: { data: ExampleItem | DerivativeItem | IdiomItem; bullet: string }) => {
	const hasEn = 'en' in data && data.en;
	const hasMw = 'mw' in data && data.mw;
	const hasEx = 'ex' in data && data.ex && Array.isArray(data.ex);
	
	return (
		<div className="ex">
			<span className="ex-tw">{bullet} {data.tw}</span>
			{hasMw ? <span className="mw">{(data as DerivativeItem).mw}:</span> : null}
			{hasEn ? <span className="en"> {data.en}</span> : null}
			{hasEx ? (data.ex as ExampleItem[]).map((ex, i) => (
				<ExtraDisplay key={i} data={ex} bullet="¶" />
			)) : null}
		</div>
	);
};

const DefinitionDisplay = ({ def, num }: { def: DefinitionItem; num?: number }) => {
	const pos = Array.isArray(def.pos) ? def.pos.join(', ') : def.pos;
	
	return (
		<div className="defn">
			{num !== undefined && <span className="def-num">{getCircledNum(num)}</span>}
			{pos && <span className="pos">{pos}</span>}
			{def.cat && <span className="cat"> {def.cat}</span>}
			{def.mw && <span className="mw"> {def.mw}:</span>}
			{def.en && <span className="en"> {def.en}</span>}
			{def.alt && def.alt.map((alt, i) => (
				<span key={i} className="alt">; ≃ {alt}</span>
			))}
			{def.cf && def.cf.map((cf, i) => (
				<span key={i} className="cf">; cf {cf}</span>
			))}
			{def.det && <span className="det">; ⇒ {def.det}</span>}
			
			{def.ex && def.ex.map((ex, i) => (
				<ExtraDisplay key={`ex-${i}`} data={ex} bullet="¶" />
			))}
			{def.drv && def.drv.map((drv, i) => (
				<ExtraDisplay key={`drv-${i}`} data={drv} bullet="◊" />
			))}
			{def.idm && def.idm.map((idm, i) => (
				<ExtraDisplay key={`idm-${i}`} data={idm} bullet="∆" />
			))}
		</div>
	);
};

const EntryDisplay = ({ entryData }: { entryData: EntryData }) => {
	const hasSingleDef = entryData.defs.length === 1;
	
	return (
		<div className="entry-display">
			<div className="entry-headword">
				<span className="head">{formatHeadword(entryData.head, entryData.head_number)}</span>
				{entryData.etym && <span className="etym"> ({entryData.etym})</span>}
			</div>
			
			{hasSingleDef ? (
				<DefinitionDisplay def={entryData.defs[0]} />
			) : (
				entryData.defs.map((def, i) => (
					<DefinitionDisplay key={i} def={def} num={i + 1} />
				))
			)}
		</div>
	);
};

export default function EntriesPage() {
	const { user } = useAuth();
	const navigate = useNavigate();
	const [entries, setEntries] = useState<EntryWithReviews[]>([]);
	const [total, setTotal] = useState(0);
	const [page, setPage] = useState(1);
	const [pageSize] = useState(50);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');

	// Search and filter state
	const [searchQuery, setSearchQuery] = useState('');
	const [searchInput, setSearchInput] = useState('');
	const [showIncompleteOnly, setShowIncompleteOnly] = useState(false);
	const [showNeedingReview, setShowNeedingReview] = useState(false);
	const [headFilter, setHeadFilter] = useState('');
	const [posFilter, setPosFilter] = useState('');
	const [sortBy, setSortBy] = useState<'sort_key' | 'updated_at'>('sort_key');
	const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
	const [showAdvanced, setShowAdvanced] = useState(false);

	const fetchEntries = useCallback(async () => {
		setLoading(true);
		setError('');

		const params = new URLSearchParams({
			page: page.toString(),
			pageSize: pageSize.toString(),
			sortBy,
			sortOrder,
		});

		if (searchQuery) params.append('q', searchQuery);
		if (showIncompleteOnly) params.append('complete', 'false');
		if (showNeedingReview) params.append('needsReview', 'true');
		if (headFilter) params.append('head', headFilter);
		if (posFilter) params.append('pos', posFilter);

		try {
			const response = await fetch(`/api/entries?${params}`);
			if (!response.ok) {
				throw new Error('Failed to fetch entries');
			}

			const data: EntryListResponse = await response.json();
			setEntries(data.entries);
			setTotal(data.total);
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to load entries');
		} finally {
			setLoading(false);
		}
	}, [page, pageSize, searchQuery, showIncompleteOnly, showNeedingReview, headFilter, posFilter, sortBy, sortOrder]);

	useEffect(() => {
		fetchEntries();
	}, [fetchEntries]);

	// Debounced search
	useEffect(() => {
		const timer = setTimeout(() => {
			setSearchQuery(searchInput);
			setPage(1); // Reset to first page on new search
		}, 300);

		return () => clearTimeout(timer);
	}, [searchInput]);

	const handleEntryClick = (id: number) => {
		navigate(`/entries/${id}`);
	};

	const handleNewEntry = () => {
		navigate('/entries/new');
	};

	const getReviewSummary = (entry: EntryWithReviews): string => {
		if (!entry.reviews || entry.reviews.length === 0) {
			return 'No reviews';
		}

		const approved = entry.reviews.filter(r => r.status === 'approved').length;
		const needsWork = entry.reviews.filter(r => r.status === 'needs_work').length;
		const pending = entry.reviews.filter(r => r.status === 'pending').length;

		const parts = [];
		if (approved > 0) parts.push(`${approved} ✓`);
		if (needsWork > 0) parts.push(`${needsWork} ✗`);
		if (pending > 0) parts.push(`${pending} ⋯`);

		return parts.join(' • ');
	};

	const totalPages = Math.ceil(total / pageSize);
	const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

	const jumpToLetter = (letter: string) => {
		setHeadFilter(letter);
		setPage(1);
	};

	const goToPage = (pageNum: number) => {
		setPage(Math.max(1, Math.min(totalPages, pageNum)));
	};

	// Pagination component
	const PaginationControls = () => (
		<div className="pagination-container">
			<div className="letter-nav">
				{letters.map(letter => (
					<button
						key={letter}
						onClick={() => jumpToLetter(letter)}
						className={`letter-btn ${headFilter === letter ? 'active' : ''}`}
						title={`Jump to ${letter}`}
					>
						{letter}
					</button>
				))}
				{headFilter && (
					<button
						onClick={() => {
							setHeadFilter('');
							setPage(1);
						}}
						className="letter-btn clear-btn"
						title="Clear filter"
					>
						✕
					</button>
				)}
			</div>

			{totalPages > 1 && (
				<div className="pagination">
					<button
						onClick={() => goToPage(1)}
						disabled={page === 1}
						className="btn-secondary btn-sm"
					>
						« First
					</button>
					<button
						onClick={() => goToPage(page - 1)}
						disabled={page === 1}
						className="btn-secondary btn-sm"
					>
						‹ Prev
					</button>
					
					<div className="page-selector">
						<span className="page-info">Page</span>
						<input
							type="number"
							min="1"
							max={totalPages}
							value={page}
							onChange={(e) => {
								const num = parseInt(e.target.value);
								if (!isNaN(num)) goToPage(num);
							}}
							className="page-input"
						/>
						<span className="page-info">of {totalPages}</span>
					</div>

					<button
						onClick={() => goToPage(page + 1)}
						disabled={page === totalPages}
						className="btn-secondary btn-sm"
					>
						Next ›
					</button>
					<button
						onClick={() => goToPage(totalPages)}
						disabled={page === totalPages}
						className="btn-secondary btn-sm"
					>
						Last »
					</button>
				</div>
			)}
		</div>
	);

	return (
		<div className="entries-page">
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
								setPage(1);
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
								setPage(1);
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
										setPage(1);
									}}
								/>
							</div>

							<div className="filter-group">
								<label>Part of Speech:</label>
								<input
									type="text"
									placeholder="e.g., n., v., adj."
									value={posFilter}
									onChange={(e) => {
										setPosFilter(e.target.value);
										setPage(1);
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
			{!loading && !error && entries.length > 0 && <PaginationControls />}

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
							return (
							<div
								key={entry.id}
								className="entry-item"
								onClick={() => handleEntryClick(entry.id)}
							>
								<div className="entry-meta-badges">
									{!entry.is_complete && (
										<span className="badge badge-incomplete">Incomplete</span>
									)}
									<span className="entry-meta-text">
										{getReviewSummary(entry)} • Updated: {new Date(entry.updated_at).toLocaleDateString()}
									</span>
								</div>
								
								<EntryDisplay entryData={entryData} />
							</div>
						);
						})}
					</>
				)}
			</div>

			{/* Pagination at bottom */}
			{!loading && !error && entries.length > 0 && <PaginationControls />}
		</div>
	);
}
