import { EntryWithReviews, EntryData } from '../../types/dictionary';
import { EntryDisplay } from './EntryDisplay';
import { ReviewBadge } from '../ReviewBadge';

interface EntryListItemProps {
	entry: EntryWithReviews;
	isReviewDropdownOpen: boolean;
	onEntryClick: (id: number) => void;
	onPageClick: (pageNum: number | undefined) => void;
	onReviewStatusChange: (entryId: number, status: 'approved' | 'needs_work') => void;
	onDropdownOpenChange: (isOpen: boolean) => void;
}

export function EntryListItem({
	entry,
	isReviewDropdownOpen,
	onEntryClick,
	onPageClick,
	onReviewStatusChange,
	onDropdownOpenChange,
}: EntryListItemProps) {
	const entryData: EntryData = JSON.parse(entry.entry_data);
	
	const getReviewSummary = (): string => {
		const approved = entry.reviews.filter(r => r.status === 'approved').length;
		const needsWork = entry.reviews.filter(r => r.status === 'needs_work').length;
		const commentCount = entry.comments.length;

		const parts = [];
		parts.push(`${approved} ✓`);
		parts.push(`${needsWork} ✗`);
		parts.push(`${commentCount} 💬`);

		return parts.join(' • ');
	};

	return (
		<div
			key={entry.id}
			className={`entry-item ${isReviewDropdownOpen ? 'review-dropdown-open' : ''}`}
			onClick={() => onEntryClick(entry.id)}
		>
			{entryData.page && (
				<span 
					className="page-link"
					onClick={(e) => {
						e.stopPropagation();
						onPageClick(entryData.page);
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
					{getReviewSummary()} • Updated: {new Date(entry.updated_at).toLocaleDateString()}
				</span>
			</div>
			
			<EntryDisplay entryData={entryData} />
			
			<div
				className="entry-review-badge"
				onClick={(e) => e.stopPropagation()}
			>
				<ReviewBadge
					currentStatus={entry.my_review?.status || null}
					onStatusChange={(status) => onReviewStatusChange(entry.id, status)}
					compact={true}
					onDropdownOpenChange={onDropdownOpenChange}
				/>
			</div>
		</div>
	);
}

