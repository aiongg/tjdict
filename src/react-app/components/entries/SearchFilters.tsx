interface SearchFiltersProps {
	searchInput: string;
	onSearchInputChange: (value: string) => void;
	showIncompleteOnly: boolean;
	onShowIncompleteOnlyChange: (value: boolean) => void;
	showNeedingReview: boolean;
	onShowNeedingReviewChange: (value: boolean) => void;
	sortBy: 'sort_key' | 'updated_at';
	onSortByChange: (value: 'sort_key' | 'updated_at') => void;
	sortOrder: 'asc' | 'desc';
	onSortOrderChange: (value: 'asc' | 'desc') => void;
}

export function SearchFilters({
	searchInput,
	onSearchInputChange,
	showIncompleteOnly,
	onShowIncompleteOnlyChange,
	showNeedingReview,
	onShowNeedingReviewChange,
	sortBy,
	onSortByChange,
	sortOrder,
	onSortOrderChange,
}: SearchFiltersProps) {
	return (
		<div className="search-bar">
			<input
				type="text"
				placeholder="Search headword, or use en:, tw:, etym: prefixes..."
				value={searchInput}
				onChange={(e) => onSearchInputChange(e.target.value)}
				className="search-input"
			/>

			<div className="search-filters">
				<label className="checkbox-label">
					<input
						type="checkbox"
						checked={showIncompleteOnly}
						onChange={(e) => onShowIncompleteOnlyChange(e.target.checked)}
					/>
					Incomplete entries only
				</label>

				<label className="checkbox-label">
					<input
						type="checkbox"
						checked={showNeedingReview}
						onChange={(e) => onShowNeedingReviewChange(e.target.checked)}
					/>
					Needs review
				</label>

				<div className="filter-group">
					<label>Sort By:</label>
					<select
						value={sortBy}
						onChange={(e) => onSortByChange(e.target.value as 'sort_key' | 'updated_at')}
					>
						<option value="sort_key">Alphabetical</option>
						<option value="updated_at">Recently Updated</option>
					</select>
				</div>

				<div className="filter-group">
					<label>Order:</label>
					<select
						value={sortOrder}
						onChange={(e) => onSortOrderChange(e.target.value as 'asc' | 'desc')}
					>
						<option value="asc">Ascending</option>
						<option value="desc">Descending</option>
					</select>
				</div>
			</div>
		</div>
	);
}

