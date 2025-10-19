interface PaginationControlsProps {
	hasFilters: boolean | string;  // Can be boolean or string from filters
	entries: { id: number; [key: string]: unknown }[];
	dictPage: number;
	minPage: number;
	maxPage: number;
	pageInputValue: string;
	setPageInputValue: (value: string) => void;
	goToPage: (page: number) => void;
}

export const PaginationControls: React.FC<PaginationControlsProps> = ({
	hasFilters,
	entries,
	dictPage,
	minPage,
	maxPage,
	pageInputValue,
	setPageInputValue,
	goToPage,
}) => {
	if (hasFilters) {
		return (
			<div className="pagination-container">
				<div className="filter-info">
					Showing {entries.length} filtered result{entries.length !== 1 ? 's' : ''}
				</div>
			</div>
		);
	}

	return (
		<div className="pagination-container">
			<div className="pagination">
				<button
					onClick={() => goToPage(minPage)}
					disabled={dictPage === minPage}
					className="btn-secondary btn-sm"
				>
					« First
				</button>
				<button
					onClick={() => goToPage(dictPage - 1)}
					disabled={dictPage === minPage}
					className="btn-secondary btn-sm"
				>
					‹ Prev
				</button>
				
				<div className="page-selector">
					<span className="page-info">Page</span>
					<input
						type="text"
						value={pageInputValue}
						onChange={(e) => {
							console.log('[Input onChange] New value:', e.target.value);
							console.log('[Input onChange] Current dictPage:', dictPage);
							setPageInputValue(e.target.value);
						}}
						onKeyPress={(e) => {
							console.log('[Input onKeyPress] Key:', e.key, 'Value:', pageInputValue);
							if (e.key === 'Enter') {
								const pageNum = parseInt(pageInputValue);
								console.log('[Input onKeyPress] Parsed pageNum:', pageNum);
								if (!isNaN(pageNum)) {
									goToPage(pageNum);
								} else {
									console.log('[Input onKeyPress] Invalid input, resetting to:', dictPage);
									setPageInputValue(dictPage.toString());
								}
							}
						}}
						onFocus={(e) => {
							console.log('[Input onFocus] Focused with value:', e.target.value);
						}}
						onBlur={(e) => {
							console.log('[Input onBlur] Blurred with value:', e.target.value);
						}}
						className="page-input"
						placeholder="Go to page..."
					/>
					<span className="page-info">({minPage} - {maxPage})</span>
				</div>

				<button
					onClick={() => goToPage(dictPage + 1)}
					disabled={dictPage === maxPage}
					className="btn-secondary btn-sm"
				>
					Next ›
				</button>
				<button
					onClick={() => goToPage(maxPage)}
					disabled={dictPage === maxPage}
					className="btn-secondary btn-sm"
				>
					Last »
				</button>
			</div>
		</div>
	);
};

