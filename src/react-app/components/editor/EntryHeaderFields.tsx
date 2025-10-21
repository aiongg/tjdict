import { EntryData, EditorCallbacks } from './types';
import { FieldVisibilityMenu } from './FieldVisibilityMenu';
import { StatusSelect } from '../StatusSelect';

interface EntryHeaderFieldsProps {
	entryData: EntryData;
	canEdit: boolean;
	onEntryDataChange: (updates: Partial<EntryData>) => void;
	callbacks: EditorCallbacks;
	isNewEntry: boolean;
	myStatus: 'draft' | 'submitted' | 'needs_work' | 'approved' | null;
	onStatusChange: (status: 'draft' | 'submitted' | 'needs_work' | 'approved') => Promise<void>;
	isSubmittingStatus: boolean;
}

export function EntryHeaderFields({
	entryData,
	canEdit,
	onEntryDataChange,
	callbacks,
	isNewEntry,
	myStatus,
	onStatusChange,
	isSubmittingStatus,
}: EntryHeaderFieldsProps) {
	const { isFieldVisible, onToggleField, getAvailableFields } = callbacks;

	return (
		<div className="entry-header-compact">
			{/* Status badge on right */}
			<div className="entry-header-top-row">
				<div className="entry-header-badges">
					{!isNewEntry && (
						<StatusSelect
							currentStatus={myStatus}
							onStatusChange={onStatusChange}
							disabled={isSubmittingStatus}
						/>
					)}
				</div>
			</div>
			
			{/* Head field with menu */}
			<div className="compact-header">
				<div className="inline-material-field" style={{ flex: 1 }}>
					<label htmlFor="field-head">head:</label>
					<input
						type="text"
						value={entryData.head}
						onChange={(e) => onEntryDataChange({ head: e.target.value })}
						disabled={!canEdit}
						placeholder=" "
						id="field-head"
					/>
				</div>
				
				<FieldVisibilityMenu
					path="entry"
					availableFields={getAvailableFields('entry')}
					isFieldVisible={isFieldVisible}
					onToggleField={onToggleField}
					canEdit={canEdit}
				/>
			</div>
			
			{/* Additional fields stacked vertically */}
			{isFieldVisible('entry', 'head_number') && (
				<div className="material-field">
					<input
						type="number"
						value={entryData.head_number || ''}
						onChange={(e) => onEntryDataChange({ head_number: parseInt(e.target.value) || undefined })}
						disabled={!canEdit}
						placeholder=" "
						id="field-head-number"
					/>
					<label htmlFor="field-head-number">num:</label>
				</div>
			)}

			{isFieldVisible('entry', 'page') && (
				<div className="material-field">
					<input
						type="number"
						value={entryData.page || ''}
						onChange={(e) => onEntryDataChange({ page: parseInt(e.target.value) || undefined })}
						disabled={!canEdit}
						placeholder=" "
						id="field-page"
					/>
					<label htmlFor="field-page">page:</label>
				</div>
			)}

			{isFieldVisible('entry', 'etym') && (
				<div className="material-field">
					<input
						type="text"
						value={entryData.etym || ''}
						onChange={(e) => onEntryDataChange({ etym: e.target.value })}
						disabled={!canEdit}
						placeholder=" "
						id="field-etym"
					/>
					<label htmlFor="field-etym">etym:</label>
				</div>
			)}
		</div>
	);
}

