import { ArrowDownAZ, CalendarArrowDown } from 'lucide-react';

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
	onSortOrderChange,
}: SearchFiltersProps) {
	const handleSortChange = (value: 'sort_key' | 'updated_at') => {
		if (value === 'sort_key') {
			onSortByChange('sort_key');
			onSortOrderChange('asc');
		} else {
			onSortByChange('updated_at');
			onSortOrderChange('desc');
		}
	};

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
					Incomplete
				</label>

				<label className="checkbox-label">
					<input
						type="checkbox"
						checked={showNeedingReview}
						onChange={(e) => onShowNeedingReviewChange(e.target.checked)}
					/>
					Needs review
				</label>

				<div className="sort-select-wrapper">
					{sortBy === 'sort_key' ? (
						<ArrowDownAZ size={16} className="sort-icon" />
					) : (
						<CalendarArrowDown size={16} className="sort-icon" />
					)}
					<select
						value={sortBy}
						onChange={(e) => handleSortChange(e.target.value as 'sort_key' | 'updated_at')}
						className="sort-select"
					>
						<option value="sort_key">ABC</option>
						<option value="updated_at">Modified</option>
					</select>
				</div>
			</div>
		</div>
	);
}

