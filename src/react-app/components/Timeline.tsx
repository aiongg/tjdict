import { useState } from 'react';
import { useAddComment, useDeleteComment } from '../hooks/useEntriesQuery';

interface Status {
	id: number;
	user_id: number;
	status: 'draft' | 'submitted' | 'needs_work' | 'approved';
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
	| { type: 'status'; data: Status }
	| { type: 'comment'; data: Comment };

interface TimelineProps {
	entryId: number;
	comments: Comment[];
	statuses: Status[];
	currentUserId: number | undefined;
}

export function Timeline({ entryId, comments, statuses, currentUserId }: TimelineProps) {
	const [newComment, setNewComment] = useState('');
	const [error, setError] = useState('');
	
	const addCommentMutation = useAddComment();
	const deleteCommentMutation = useDeleteComment();

	// Combine and sort timeline items
	const timelineItems: TimelineItem[] = [
		...comments.map(c => ({ type: 'comment' as const, data: c })),
		...statuses.map(s => ({ type: 'status' as const, data: s }))
	].sort((a, b) => {
		const timeA = a.type === 'comment' ? new Date(a.data.created_at).getTime() : new Date(a.data.reviewed_at).getTime();
		const timeB = b.type === 'comment' ? new Date(b.data.created_at).getTime() : new Date(b.data.reviewed_at).getTime();
		return timeA - timeB; // Ascending order (oldest first)
	});

	const handleSubmitComment = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!newComment.trim() || addCommentMutation.isPending) return;

		setError('');

		try {
			await addCommentMutation.mutateAsync({
				entryId,
				comment: newComment.trim()
			});
			setNewComment('');
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to post comment');
		}
	};

	const handleDeleteComment = async (commentId: number) => {
		if (!confirm('Are you sure you want to delete this comment?')) return;

		setError('');

		try {
			await deleteCommentMutation.mutateAsync({ entryId, commentId });
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
							{item.type === 'status' ? (
								<div className="timeline-status">
									<span className="timeline-user">{getUserDisplay(item.data.user_nickname, item.data.user_email)}</span>
									{item.data.status === 'approved' ? (
										<span className="timeline-action timeline-action--approved"> approved this entry</span>
									) : item.data.status === 'needs_work' ? (
										<span className="timeline-action timeline-action--needs-work"> marked this as needs work</span>
									) : item.data.status === 'submitted' ? (
										<span className="timeline-action timeline-action--submitted"> submitted this entry</span>
									) : (
										<span className="timeline-action timeline-action--draft"> marked this as draft</span>
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
					disabled={addCommentMutation.isPending}
				/>
				<button
					type="submit"
					disabled={addCommentMutation.isPending || !newComment.trim()}
					className="btn-primary"
				>
					{addCommentMutation.isPending ? 'Posting...' : 'Post Comment'}
				</button>
			</form>
		</div>
	);
}

