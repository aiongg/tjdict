import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Navigation } from '../components/Navigation';

interface EntryData {
	head: string;
	etym?: string;
	defs: unknown[];
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

	// Debounce search input
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

	const getFirstDefinitionText = (entryDataStr: string): string => {
		try {
			const data: EntryData = JSON.parse(entryDataStr);
			if (data.defs && data.defs.length > 0) {
				const firstDef = data.defs[0] as { en?: string };
				return firstDef.en || '(no English translation)';
			}
			return '(no definition)';
		} catch {
			return '(error parsing entry)';
		}
	};

	const getPartOfSpeech = (entryDataStr: string): string => {
		try {
			const data: EntryData = JSON.parse(entryDataStr);
			if (data.defs && data.defs.length > 0) {
				const firstDef = data.defs[0] as { pos?: string | string[] };
				if (Array.isArray(firstDef.pos)) {
					return firstDef.pos.join(', ');
				}
				return firstDef.pos || '';
			}
			return '';
		} catch {
			return '';
		}
	};

	const getReviewSummary = (entry: EntryWithReviews): string => {
		const approved = entry.reviews.filter(r => r.status === 'approved').length;
		const total = entry.reviews.length;
		return total > 0 ? `${approved}/${total} approved` : 'No reviews';
	};

	const totalPages = Math.ceil(total / pageSize);

	return (
		<div className="entries-page">
			<Navigation />

			<div className="search-bar">
				<h1>Dictionary Entries</h1>

				<div className="search-controls">
					<input
						type="text"
						placeholder="Search entries..."
						value={searchInput}
						onChange={(e) => setSearchInput(e.target.value)}
						className="search-input"
					/>

					<div className="filter-toggles">
						<label className="checkbox-label">
							<input
								type="checkbox"
								checked={showIncompleteOnly}
								onChange={(e) => {
									setShowIncompleteOnly(e.target.checked);
									setPage(1);
								}}
							/>
							<span>Incomplete only</span>
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
							<span>Needs my review</span>
						</label>

						<button
							className="btn-secondary"
							onClick={() => setShowAdvanced(!showAdvanced)}
						>
							{showAdvanced ? 'Hide' : 'Show'} Advanced
						</button>
					</div>

					{showAdvanced && (
						<div className="advanced-filters">
							<input
								type="text"
								placeholder="Filter by headword..."
								value={headFilter}
								onChange={(e) => {
									setHeadFilter(e.target.value);
									setPage(1);
								}}
							/>

							<input
								type="text"
								placeholder="Filter by part of speech..."
								value={posFilter}
								onChange={(e) => {
									setPosFilter(e.target.value);
									setPage(1);
								}}
							/>

							<select
								value={sortBy}
								onChange={(e) => {
									setSortBy(e.target.value as 'sort_key' | 'updated_at');
									setPage(1);
								}}
							>
								<option value="sort_key">Sort: Alphabetical</option>
								<option value="updated_at">Sort: Recently Updated</option>
							</select>

							<select
								value={sortOrder}
								onChange={(e) => {
									setSortOrder(e.target.value as 'asc' | 'desc');
									setPage(1);
								}}
							>
								<option value="asc">Ascending</option>
								<option value="desc">Descending</option>
							</select>
						</div>
					)}
				</div>

				{(user?.role === 'editor' || user?.role === 'admin') && (
					<button className="btn-primary" onClick={handleNewEntry}>
						+ New Entry
					</button>
				)}

				<div className="results-info">
					{total > 0 ? `Showing ${entries.length} of ${total} entries` : 'No entries found'}
				</div>
			</div>

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
							<div
								key={entry.id}
								className="entry-item"
								onClick={() => handleEntryClick(entry.id)}
							>
								<div className="entry-header">
									<h3 className="entry-head">{entry.head}</h3>
									<div className="entry-badges">
										{!entry.is_complete && (
											<span className="badge badge-incomplete">Incomplete</span>
										)}
										{getPartOfSpeech(entry.entry_data) && (
											<span className="badge badge-pos">
												{getPartOfSpeech(entry.entry_data)}
											</span>
										)}
									</div>
								</div>

								<div className="entry-definition">
									{getFirstDefinitionText(entry.entry_data).substring(0, 100)}
									{getFirstDefinitionText(entry.entry_data).length > 100 && '...'}
								</div>

								<div className="entry-footer">
									<span className="entry-meta">
										{getReviewSummary(entry)}
									</span>
									<span className="entry-meta">
										Updated: {new Date(entry.updated_at).toLocaleDateString()}
									</span>
								</div>
							</div>
						))}

						{totalPages > 1 && (
							<div className="pagination">
								<button
									onClick={() => setPage(p => Math.max(1, p - 1))}
									disabled={page === 1}
									className="btn-secondary"
								>
									Previous
								</button>
								<span className="page-info">
									Page {page} of {totalPages}
								</span>
								<button
									onClick={() => setPage(p => Math.min(totalPages, p + 1))}
									disabled={page === totalPages}
									className="btn-secondary"
								>
									Next
								</button>
							</div>
						)}
					</>
				)}
			</div>
		</div>
	);
}

