import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { ReviewBadge } from './ReviewBadge';
import { Timeline } from './Timeline';

interface EntryReview {
	id: number;
	entry_id: number;
	user_id: number;
	status: 'approved' | 'needs_work';
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
	const [reviews, setReviews] = useState<EntryReview[]>([]);
	const [allReviews, setAllReviews] = useState<EntryReview[]>([]);
	const [comments, setComments] = useState<EntryComment[]>([]);
	const [myReview, setMyReview] = useState<EntryReview | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');

	const fetchData = async () => {
		try {
			const response = await fetch(`/api/entries/${entryId}`);
			if (!response.ok) {
				throw new Error('Failed to fetch entry data');
			}
			const data = await response.json();
			
			// Get latest reviews per user (for current status section)
			setReviews(data.reviews || []);
			
			// Get all reviews (for timeline)
			setAllReviews(data.all_reviews || []);
			
			// Get comments
			setComments(data.comments || []);
			
			// Find current user's review
			const userReview = (data.reviews || []).find((r: EntryReview) => r.user_id === user?.id);
			setMyReview(userReview || null);
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

	const handleReviewStatusChange = async (status: 'approved' | 'needs_work') => {
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
			setError(err instanceof Error ? err.message : 'Failed to submit review');
			throw err; // Re-throw so ReviewBadge can handle it
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

	// Group current reviews by status
	const approvedReviews = reviews.filter(r => r.status === 'approved');
	const needsWorkReviews = reviews.filter(r => r.status === 'needs_work');

	return (
		<div className="review-panel">
			<h2>Reviews & Comments</h2>

			{error && <div className="error-message">{error}</div>}

			{/* Current Review Status Section */}
			<div className="review-status-section">
				<div className="review-status-header">
					<h3>Current Review Status</h3>
					<ReviewBadge
						currentStatus={myReview?.status || null}
						onStatusChange={handleReviewStatusChange}
					/>
				</div>

				<div className="review-status-summary">
					{reviews.length === 0 ? (
						<p className="text-muted">No reviews yet</p>
					) : (
						<>
							{approvedReviews.length > 0 && (
								<div className="review-status-group review-status-group--approved">
									<h4>✓ Approved ({approvedReviews.length})</h4>
									<ul className="reviewer-list">
										{approvedReviews.map(review => (
											<li key={review.id}>
												{getUserDisplay(review.user_nickname, review.user_email)}
											</li>
										))}
									</ul>
								</div>
							)}

							{needsWorkReviews.length > 0 && (
								<div className="review-status-group review-status-group--needs-work">
									<h4>✗ Needs Work ({needsWorkReviews.length})</h4>
									<ul className="reviewer-list">
										{needsWorkReviews.map(review => (
											<li key={review.id}>
												{getUserDisplay(review.user_nickname, review.user_email)}
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
				reviews={allReviews}
				currentUserId={user?.id}
				onCommentAdded={fetchData}
				onCommentDeleted={fetchData}
			/>
		</div>
	);
}
