import { useAuth } from '../hooks/useAuth';
import { useEntry, useSubmitReview } from '../hooks/useEntriesQuery';
import { StatusSelect } from './StatusSelect';
import { Timeline } from './Timeline';

interface ReviewPanelProps {
	entryId: number;
}

export function ReviewPanel({ entryId }: ReviewPanelProps) {
	const { user } = useAuth();
	
	// Use React Query to fetch entry data (shares cache with EntryEditorPage)
	const { data: entry, isLoading, error: queryError } = useEntry(entryId);
	const submitReviewMutation = useSubmitReview();

	const handleReviewStatusChange = async (status: 'draft' | 'submitted' | 'needs_work' | 'approved') => {
		// Use the mutation with optimistic updates
		await submitReviewMutation.mutateAsync({ entryId, status });
	};

	const getUserDisplay = (nickname: string | null, email: string) => {
		return nickname || email.split('@')[0];
	};

	if (isLoading) {
		return (
			<div className="review-panel">
				<h2>Reviews & Comments</h2>
				<div className="loading">Loading...</div>
			</div>
		);
	}

	if (queryError) {
		return (
			<div className="review-panel">
				<h2>Reviews & Comments</h2>
				<div className="error-message">{(queryError as Error).message}</div>
			</div>
		);
	}

	if (!entry) {
		return null;
	}

	const statuses = entry.statuses || [];
	const allStatuses = entry.all_statuses || [];
	const comments = entry.comments || [];
	const myStatus = entry.my_status;

	// Group current statuses by status type
	const draftStatuses = statuses.filter(s => s.status === 'draft');
	const submittedStatuses = statuses.filter(s => s.status === 'submitted');
	const needsWorkStatuses = statuses.filter(s => s.status === 'needs_work');
	const approvedStatuses = statuses.filter(s => s.status === 'approved');

	return (
		<div className="review-panel">
			<h2>Reviews & Comments</h2>

			{submitReviewMutation.isError && (
				<div className="error-message">
					{(submitReviewMutation.error as Error)?.message || 'Failed to submit status'}
				</div>
			)}

			{/* Current Review Status Section */}
			<div className="review-status-section">
				<div className="review-status-header">
					<h3>Current Review Status</h3>
					<StatusSelect
						currentStatus={myStatus?.status || null}
						onStatusChange={handleReviewStatusChange}
						disabled={submitReviewMutation.isPending}
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
			/>
		</div>
	);
}
