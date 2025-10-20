import { useState } from 'react';

interface Review {
	id: number;
	user_id: number;
	status: 'approved' | 'needs_work';
	reviewed_at: string;
	user_email: string;
	user_nickname: string | null;
}

interface Comment {
	id: number;
	user_id: number;
	comment: string;
	created_at: string;
	user_email: string;
	user_nickname: string | null;
}

type TimelineItem = 
	| { type: 'review'; data: Review }
	| { type: 'comment'; data: Comment };

interface TimelineProps {
	entryId: number;
	comments: Comment[];
	reviews: Review[];
	currentUserId: number | undefined;
	onCommentAdded: () => void;
	onCommentDeleted: (commentId: number) => void;
}

export function Timeline({ entryId, comments, reviews, currentUserId, onCommentAdded, onCommentDeleted }: TimelineProps) {
	const [newComment, setNewComment] = useState('');
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState('');

	// Combine and sort timeline items
	const timelineItems: TimelineItem[] = [
		...comments.map(c => ({ type: 'comment' as const, data: c })),
		...reviews.map(r => ({ type: 'review' as const, data: r }))
	].sort((a, b) => {
		const timeA = a.type === 'comment' ? new Date(a.data.created_at).getTime() : new Date(a.data.reviewed_at).getTime();
		const timeB = b.type === 'comment' ? new Date(b.data.created_at).getTime() : new Date(b.data.reviewed_at).getTime();
		return timeA - timeB; // Ascending order (oldest first)
	});

	const handleSubmitComment = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!newComment.trim() || isSubmitting) return;

		setIsSubmitting(true);
		setError('');

		try {
			const response = await fetch(`/api/entries/${entryId}/comments`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ comment: newComment.trim() })
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || 'Failed to post comment');
			}

			setNewComment('');
			onCommentAdded();
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to post comment');
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleDeleteComment = async (commentId: number) => {
		if (!confirm('Are you sure you want to delete this comment?')) return;

		try {
			const response = await fetch(`/api/entries/${entryId}/comments/${commentId}`, {
				method: 'DELETE'
			});

			if (!response.ok) {
				throw new Error('Failed to delete comment');
			}

			onCommentDeleted(commentId);
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to delete comment');
		}
	};

	const formatDate = (dateStr: string) => {
		const date = new Date(dateStr);
		return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
	};

	const getUserDisplay = (nickname: string | null, email: string) => {
		return nickname || email.split('@')[0];
	};

	return (
		<div className="timeline">
			<h3>Activity Timeline</h3>
			
			{error && <div className="error-message">{error}</div>}

			<div className="timeline-items">
				{timelineItems.length === 0 ? (
					<p className="text-muted">No activity yet</p>
				) : (
					timelineItems.map((item, index) => (
						<div key={`${item.type}-${item.data.id}-${index}`} className={`timeline-item timeline-item--${item.type}`}>
							{item.type === 'review' ? (
								<div className="timeline-review">
									<span className="timeline-user">{getUserDisplay(item.data.user_nickname, item.data.user_email)}</span>
									{item.data.status === 'approved' ? (
										<span className="timeline-action timeline-action--approved"> approved this entry</span>
									) : (
										<span className="timeline-action timeline-action--needs-work"> marked this as needs work</span>
									)}
									<span className="timeline-date">{formatDate(item.data.reviewed_at)}</span>
								</div>
							) : (
								<div className="timeline-comment">
									<div className="timeline-comment-header">
										<span className="timeline-user">{getUserDisplay(item.data.user_nickname, item.data.user_email)}</span>
										<span className="timeline-date">{formatDate(item.data.created_at)}</span>
										{item.data.user_id === currentUserId && (
											<button
												onClick={() => handleDeleteComment(item.data.id)}
												className="btn-icon btn-delete"
												title="Delete comment"
												type="button"
											>
												×
											</button>
										)}
									</div>
									<div className="timeline-comment-body">{item.data.comment}</div>
								</div>
							)}
						</div>
					))
				)}
			</div>

			<form onSubmit={handleSubmitComment} className="timeline-comment-form">
				<textarea
					value={newComment}
					onChange={(e) => setNewComment(e.target.value)}
					placeholder="Add a comment..."
					rows={3}
					disabled={isSubmitting}
				/>
				<button
					type="submit"
					disabled={isSubmitting || !newComment.trim()}
					className="btn-primary"
				>
					{isSubmitting ? 'Posting...' : 'Post Comment'}
				</button>
			</form>
		</div>
	);
}

