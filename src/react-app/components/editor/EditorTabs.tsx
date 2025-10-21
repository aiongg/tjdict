import { ReviewBadge } from '../ReviewBadge';

interface EditorTabsProps {
	isNewEntry: boolean;
	activeTab: 'edit' | 'reviews';
	onTabChange: (tab: 'edit' | 'reviews') => void;
	myReviewStatus: 'approved' | 'needs_work' | null;
	onReviewStatusChange: (status: 'approved' | 'needs_work') => void;
	isSubmittingReview: boolean;
}

export function EditorTabs({
	isNewEntry,
	activeTab,
	onTabChange,
	myReviewStatus,
	onReviewStatusChange,
	isSubmittingReview,
}: EditorTabsProps) {
	return (
		<div className="editor-tabs-container">
			<div className="editor-tabs">
				<button
					className={`tab-button ${activeTab === 'edit' ? 'active' : ''}`}
					onClick={() => onTabChange('edit')}
				>
					Edit
				</button>
				{!isNewEntry && (
					<button
						className={`tab-button ${activeTab === 'reviews' ? 'active' : ''}`}
						onClick={() => onTabChange('reviews')}
					>
						Reviews
					</button>
				)}
			</div>
			{!isNewEntry && (
				<div className="editor-review-badge">
					<ReviewBadge
						currentStatus={myReviewStatus}
						onStatusChange={onReviewStatusChange}
						disabled={isSubmittingReview}
					/>
				</div>
			)}
		</div>
	);
}

