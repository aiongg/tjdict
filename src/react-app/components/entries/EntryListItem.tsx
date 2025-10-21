import { Check, X, MessageSquare } from 'lucide-react';
import { EntryWithReviews, EntryData } from '../../types/dictionary';
import { EntryDisplay } from './EntryDisplay';
import { ReviewBadge } from '../ReviewBadge';
import { PageButton } from '../PageButton';

interface EntryListItemProps {
	entry: EntryWithReviews;
	isReviewDropdownOpen: boolean;
	onEntryClick: (id: number) => void;
	onPageClick: (pageNum: number | undefined) => void;
	onReviewStatusChange: (entryId: number, status: 'approved' | 'needs_work') => Promise<void>;
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
	
	const getReviewCounts = () => {
		const approved = entry.reviews.filter(r => r.status === 'approved').length;
		const needsWork = entry.reviews.filter(r => r.status === 'needs_work').length;
		const commentCount = entry.comments.length;

		return { approved, needsWork, commentCount };
	};

	return (
		<div
			key={entry.id}
			className={`entry-item ${isReviewDropdownOpen ? 'review-dropdown-open' : ''}`}
			onClick={() => onEntryClick(entry.id)}
		>
			{entryData.page && (
				<PageButton
					pageNumber={entryData.page}
					onClick={onPageClick}
					variant="list"
				/>
			)}
			<div className="entry-meta-badges">
				{!entry.is_complete && (
					<span className="badge badge-incomplete">Incomplete</span>
				)}
				<span className="entry-meta-text entry-meta-icons">
					<span className="meta-icon-group">
						<Check size={14} className="icon-success" />
						<span>{getReviewCounts().approved}</span>
					</span>
					<span className="meta-icon-group">
						<X size={14} className="icon-danger" />
						<span>{getReviewCounts().needsWork}</span>
					</span>
					<span className="meta-icon-group">
						<MessageSquare size={14} className="icon-muted" />
						<span>{getReviewCounts().commentCount}</span>
					</span>
					<span>•</span>
					<span>Updated: {new Date(entry.updated_at).toLocaleDateString()}</span>
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

