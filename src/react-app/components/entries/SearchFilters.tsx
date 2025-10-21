import { ArrowDownAZ, CalendarArrowDown, Filter } from 'lucide-react';

export type StatusFilter = 'all' | 'draft' | 'submitted' | 'needs_work' | 'approved';

interface SearchFiltersProps {
	searchInput: string;
	onSearchInputChange: (value: string) => void;
	statusFilter: StatusFilter;
	onStatusFilterChange: (value: StatusFilter) => void;
	sortBy: 'sort_key' | 'updated_at';
	onSortByChange: (value: 'sort_key' | 'updated_at') => void;
	sortOrder: 'asc' | 'desc';
	onSortOrderChange: (value: 'asc' | 'desc') => void;
}

export function SearchFilters({
	searchInput,
	onSearchInputChange,
	statusFilter,
	onStatusFilterChange,
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
				<div className="sort-select-wrapper">
					<Filter size={16} className="sort-icon" />
					<select
						value={statusFilter}
						onChange={(e) => onStatusFilterChange(e.target.value as StatusFilter)}
						className="sort-select"
					>
						<option value="all">All</option>
						<option value="draft">Draft</option>
						<option value="submitted">Submitted</option>
						<option value="needs_work">Needs work</option>
						<option value="approved">Approved</option>
					</select>
				</div>

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

