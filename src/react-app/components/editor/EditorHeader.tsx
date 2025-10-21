interface EditorHeaderProps {
	isNewEntry: boolean;
	canEdit: boolean;
	pageNumber?: number;
	onPageClick: (pageNum: number | undefined) => void;
	onCancel: () => void;
	onSave: () => void;
	isSaving: boolean;
}

export function EditorHeader({
	isNewEntry,
	canEdit,
	pageNumber,
	onPageClick,
	onCancel,
	onSave,
	isSaving,
}: EditorHeaderProps) {
	return (
		<div className="editor-header">
			<h1>{isNewEntry ? 'New Entry' : 'Edit Entry'}</h1>
			<div className="editor-actions">
				{pageNumber && (
					<button 
						onClick={() => onPageClick(pageNumber)} 
						className="btn-secondary"
						title="View dictionary page"
					>
						📖 p. {pageNumber}
					</button>
				)}
				<button 
					onClick={onCancel} 
					className="btn-secondary"
				>
					Cancel
				</button>
				{canEdit && (
					<button 
						onClick={onSave} 
						disabled={isSaving} 
						className="btn-primary"
					>
						{isSaving ? 'Saving...' : 'Save'}
					</button>
				)}
			</div>
		</div>
	);
}

