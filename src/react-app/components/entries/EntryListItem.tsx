import { TriangleAlert, CheckCircle, MessageSquare } from 'lucide-react';
import { EntryWithReviews, EntryData } from '../../types/dictionary';
import { EntryDisplay } from './EntryDisplay';
import { StatusSelect } from '../StatusSelect';
import { PageButton } from '../PageButton';

interface EntryListItemProps {
	entry: EntryWithReviews;
	isReviewDropdownOpen: boolean;
	onEntryClick: (id: number) => void;
	onPageClick: (pageNum: number | undefined) => void;
	onReviewStatusChange: (entryId: number, status: 'draft' | 'submitted' | 'needs_work' | 'approved') => Promise<void>;
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
		const approved = entry.statuses.filter(s => s.status === 'approved').length;
		const needsWork = entry.statuses.filter(s => s.status === 'needs_work').length;
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
				<span className="entry-meta-text entry-meta-icons">
					<span className="meta-icon-group">
						<CheckCircle size={14} className="icon-approved" />
						<span>{getReviewCounts().approved}</span>
					</span>
					<span className="meta-icon-group">
						<TriangleAlert size={14} className="icon-needs-work" />
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
				className="entry-status-select"
				onClick={(e) => e.stopPropagation()}
			>
				<StatusSelect
					currentStatus={entry.current_status}
					onStatusChange={(status) => onReviewStatusChange(entry.id, status)}
					compact={true}
					onDropdownOpenChange={onDropdownOpenChange}
				/>
			</div>
		</div>
	);
}

