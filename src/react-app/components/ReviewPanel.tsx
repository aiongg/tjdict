import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';

interface EntryReview {
	id: number;
	entry_id: number;
	user_id: number;
	status: 'pending' | 'approved' | 'needs_work';
	comment: string | null;
	reviewed_at: string;
	user_email: string;
}

interface ReviewPanelProps {
	entryId: number;
}

export function ReviewPanel({ entryId }: ReviewPanelProps) {
	const { user } = useAuth();
	const [reviews, setReviews] = useState<EntryReview[]>([]);
	const [myReview, setMyReview] = useState<EntryReview | null>(null);
	const [loading, setLoading] = useState(true);
	const [submitting, setSubmitting] = useState(false);
	const [status, setStatus] = useState<'approved' | 'needs_work'>('approved');
	const [comment, setComment] = useState('');
	const [error, setError] = useState('');

	const fetchReviews = async () => {
		try {
			const response = await fetch(`/api/entries/${entryId}/reviews`);
			if (!response.ok) {
				throw new Error('Failed to fetch reviews');
			}
			const data: EntryReview[] = await response.json();
			setReviews(data);
			
			// Find current user's review
			const userReview = data.find(r => r.user_id === user?.id);
			if (userReview) {
				setMyReview(userReview);
				setStatus(userReview.status === 'pending' ? 'approved' : userReview.status);
				setComment(userReview.comment || '');
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to load reviews');
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchReviews();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [entryId]);

	const handleSubmitReview = async () => {
		setSubmitting(true);
		setError('');

		try {
			const response = await fetch(`/api/entries/${entryId}/reviews`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ status, comment: comment || null })
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || 'Failed to submit review');
			}

			// Refresh reviews
			await fetchReviews();
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to submit review');
		} finally {
			setSubmitting(false);
		}
	};

	const handleDeleteReview = async () => {
		if (!confirm('Are you sure you want to delete your review?')) return;

		setSubmitting(true);
		setError('');

		try {
			const response = await fetch(`/api/entries/${entryId}/reviews`, {
				method: 'DELETE'
			});

			if (!response.ok) {
				throw new Error('Failed to delete review');
			}

			setMyReview(null);
			setStatus('approved');
			setComment('');
			await fetchReviews();
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to delete review');
		} finally {
			setSubmitting(false);
		}
	};

	const getStatusBadgeClass = (reviewStatus: string) => {
		switch (reviewStatus) {
			case 'approved': return 'badge-active';
			case 'needs_work': return 'badge-incomplete';
			default: return 'badge';
		}
	};

	const formatDate = (dateStr: string) => {
		const date = new Date(dateStr);
		return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
	};

	if (loading) {
		return (
			<div className="review-panel">
				<h3>Reviews</h3>
				<div className="loading">Loading reviews...</div>
			</div>
		);
	}

	return (
		<div className="review-panel">
			<h2>Entry Reviews</h2>

			{error && <div className="error-message">{error}</div>}

			{/* All Reviews List */}
			<div className="reviews-list">
				<h4>All Reviews ({reviews.length})</h4>
				{reviews.length === 0 ? (
					<p className="text-muted">No reviews yet</p>
				) : (
					<div className="review-items">
						{reviews.map((review) => (
							<div key={review.id} className="review-item">
								<div className="review-header">
									<span className="review-user">{review.user_email}</span>
									<span className={`badge ${getStatusBadgeClass(review.status)}`}>
										{review.status === 'approved' ? 'Approved' : 'Needs Work'}
									</span>
								</div>
								{review.comment && (
									<p className="review-comment">{review.comment}</p>
								)}
								<span className="review-date">{formatDate(review.reviewed_at)}</span>
							</div>
						))}
					</div>
				)}
			</div>

			{/* My Review Section */}
			<div className="my-review">
				<h4>My Review</h4>
				{myReview ? (
					<div className="my-review-status">
						<div className="status-display">
							<span className={`badge ${getStatusBadgeClass(myReview.status)}`}>
								{myReview.status === 'approved' ? 'Approved' : 'Needs Work'}
							</span>
							<span className="review-date">{formatDate(myReview.reviewed_at)}</span>
						</div>
						{myReview.comment && (
							<p className="review-comment">{myReview.comment}</p>
						)}
						<button
							onClick={handleDeleteReview}
							disabled={submitting}
							className="btn-secondary btn-sm"
						>
							Delete My Review
						</button>
					</div>
				) : (
					<p className="text-muted">You haven't reviewed this entry yet</p>
				)}

				<div className="review-form">
					<h5>{myReview ? 'Update Review' : 'Add Review'}</h5>
					
					<div className="form-group">
						<label>Status</label>
						<div className="radio-group">
							<label className="radio-label">
								<input
									type="radio"
									value="approved"
									checked={status === 'approved'}
									onChange={(e) => setStatus(e.target.value as 'approved')}
								/>
								<span>Approved</span>
							</label>
							<label className="radio-label">
								<input
									type="radio"
									value="needs_work"
									checked={status === 'needs_work'}
									onChange={(e) => setStatus(e.target.value as 'needs_work')}
								/>
								<span>Needs Work</span>
							</label>
						</div>
					</div>

					<div className="form-group">
						<label htmlFor="comment">Comment (optional)</label>
						<textarea
							id="comment"
							value={comment}
							onChange={(e) => setComment(e.target.value)}
							placeholder="Add a comment..."
							rows={3}
						/>
					</div>

					<button
						onClick={handleSubmitReview}
						disabled={submitting}
						className="btn-primary"
					>
						{submitting ? 'Submitting...' : (myReview ? 'Update Review' : 'Submit Review')}
					</button>
				</div>
			</div>
		</div>
	);
}

