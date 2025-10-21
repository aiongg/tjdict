import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { StatusSelect } from './StatusSelect';
import { Timeline } from './Timeline';

interface EntryStatus {
	id: number;
	entry_id: number;
	user_id: number;
	status: 'draft' | 'submitted' | 'needs_work' | 'approved';
	reviewed_at: string;
	user_email: string;
	user_nickname: string | null;
}

interface EntryComment {
	id: number;
	entry_id: number;
	user_id: number;
	comment: string;
	created_at: string;
	user_email: string;
	user_nickname: string | null;
}

interface ReviewPanelProps {
	entryId: number;
}

export function ReviewPanel({ entryId }: ReviewPanelProps) {
	const { user } = useAuth();
	const [statuses, setStatuses] = useState<EntryStatus[]>([]);
	const [allStatuses, setAllStatuses] = useState<EntryStatus[]>([]);
	const [comments, setComments] = useState<EntryComment[]>([]);
	const [myStatus, setMyStatus] = useState<EntryStatus | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');

	const fetchData = async () => {
		try {
			const response = await fetch(`/api/entries/${entryId}`);
			if (!response.ok) {
				throw new Error('Failed to fetch entry data');
			}
			const data = await response.json();
			
			// Get latest statuses per user (for current status section)
			setStatuses(data.statuses || []);
			
			// Get all statuses (for timeline)
			setAllStatuses(data.all_statuses || []);
			
			// Get comments
			setComments(data.comments || []);
			
			// Find current user's status
			const userStatus = (data.statuses || []).find((s: EntryStatus) => s.user_id === user?.id);
			setMyStatus(userStatus || null);
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to load data');
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchData();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [entryId]);

	const handleReviewStatusChange = async (status: 'draft' | 'submitted' | 'needs_work' | 'approved') => {
		setError('');

		try {
			const response = await fetch(`/api/entries/${entryId}/reviews`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ status })
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || 'Failed to submit review');
			}

			// Refresh data
			await fetchData();
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to submit status');
			throw err; // Re-throw so StatusSelect can handle it
		}
	};

	const getUserDisplay = (nickname: string | null, email: string) => {
		return nickname || email.split('@')[0];
	};

	if (loading) {
		return (
			<div className="review-panel">
				<h2>Reviews & Comments</h2>
				<div className="loading">Loading...</div>
			</div>
		);
	}

	// Group current statuses by status type
	const draftStatuses = statuses.filter(s => s.status === 'draft');
	const submittedStatuses = statuses.filter(s => s.status === 'submitted');
	const needsWorkStatuses = statuses.filter(s => s.status === 'needs_work');
	const approvedStatuses = statuses.filter(s => s.status === 'approved');

	return (
		<div className="review-panel">
			<h2>Reviews & Comments</h2>

			{error && <div className="error-message">{error}</div>}

			{/* Current Review Status Section */}
			<div className="review-status-section">
				<div className="review-status-header">
					<h3>Current Review Status</h3>
					<StatusSelect
						currentStatus={myStatus?.status || null}
						onStatusChange={handleReviewStatusChange}
					/>
				</div>

				<div className="review-status-summary">
					{statuses.length === 0 ? (
						<p className="text-muted">No statuses yet</p>
					) : (
						<>
							{draftStatuses.length > 0 && (
								<div className="review-status-group review-status-group--draft">
									<h4>◯ Draft ({draftStatuses.length})</h4>
									<ul className="reviewer-list">
										{draftStatuses.map(status => (
											<li key={status.id}>
												{getUserDisplay(status.user_nickname, status.user_email)}
											</li>
										))}
									</ul>
								</div>
							)}

							{submittedStatuses.length > 0 && (
								<div className="review-status-group review-status-group--submitted">
									<h4>→ Submitted ({submittedStatuses.length})</h4>
									<ul className="reviewer-list">
										{submittedStatuses.map(status => (
											<li key={status.id}>
												{getUserDisplay(status.user_nickname, status.user_email)}
											</li>
										))}
									</ul>
								</div>
							)}

							{needsWorkStatuses.length > 0 && (
								<div className="review-status-group review-status-group--needs-work">
									<h4>✗ Needs Work ({needsWorkStatuses.length})</h4>
									<ul className="reviewer-list">
										{needsWorkStatuses.map(status => (
											<li key={status.id}>
												{getUserDisplay(status.user_nickname, status.user_email)}
											</li>
										))}
									</ul>
								</div>
							)}

							{approvedStatuses.length > 0 && (
								<div className="review-status-group review-status-group--approved">
									<h4>✓ Approved ({approvedStatuses.length})</h4>
									<ul className="reviewer-list">
										{approvedStatuses.map(status => (
											<li key={status.id}>
												{getUserDisplay(status.user_nickname, status.user_email)}
											</li>
										))}
									</ul>
								</div>
							)}
						</>
					)}
				</div>
			</div>

			{/* Timeline Section */}
			<Timeline
				entryId={entryId}
				comments={comments}
				statuses={allStatuses}
				currentUserId={user?.id}
				onCommentAdded={fetchData}
				onCommentDeleted={fetchData}
			/>
		</div>
	);
}
