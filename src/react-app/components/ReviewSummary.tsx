import { CheckCircle, TriangleAlert, MessageSquare } from 'lucide-react';

interface EntryStatus {
	id: number;
	status: 'draft' | 'submitted' | 'needs_work' | 'approved';
}

interface EntryComment {
	id: number;
}

interface ReviewSummaryProps {
	statuses: EntryStatus[];
	comments: EntryComment[];
}

export function ReviewSummary({ statuses, comments }: ReviewSummaryProps) {
	return (
		<div className="editor-review-summary">
			<span className="review-stat">
				<CheckCircle size={16} className="icon-approved" />
				<span>{statuses.filter(s => s.status === 'approved').length}</span>
			</span>
			<span className="review-stat">
				<TriangleAlert size={16} className="icon-needs-work" />
				<span>{statuses.filter(s => s.status === 'needs_work').length}</span>
			</span>
			<span className="review-stat">
				<MessageSquare size={16} className="icon-muted" />
				<span>{comments.length}</span>
			</span>
		</div>
	);
}

