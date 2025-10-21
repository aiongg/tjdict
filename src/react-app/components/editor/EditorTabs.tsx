interface EditorTabsProps {
	isNewEntry: boolean;
	activeTab: 'edit' | 'reviews';
	onTabChange: (tab: 'edit' | 'reviews') => void;
}

export function EditorTabs({
	isNewEntry,
	activeTab,
	onTabChange,
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
						Comments
					</button>
				)}
			</div>
		</div>
	);
}

