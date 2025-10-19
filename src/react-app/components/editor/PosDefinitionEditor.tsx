import { useState } from 'react';
import { PosDefinition, SubDefinition, EditorCallbacks } from './types';
import { FieldVisibilityMenu } from './FieldVisibilityMenu';
import { SubDefinitionEditor } from './SubDefinitionEditor';

interface PosDefinitionEditorProps {
	posDef: PosDefinition;
	posIndex: number;
	onUpdate: (updates: Partial<PosDefinition>) => void;
	onRemove: () => void;
	onAddSubDefinition: () => void;
	onRemoveSubDefinition: (subIndex: number) => void;
	onUpdateSubDefinition: (subIndex: number, updates: Partial<SubDefinition>) => void;
	canEdit: boolean;
	callbacks: EditorCallbacks;
	totalPosDefs: number;
}

export function PosDefinitionEditor({
	posDef,
	posIndex,
	onUpdate,
	onRemove,
	onAddSubDefinition,
	onRemoveSubDefinition,
	onUpdateSubDefinition,
	canEdit,
	callbacks,
	totalPosDefs
}: PosDefinitionEditorProps) {
	const [isCollapsed, setIsCollapsed] = useState(false);
	const posDefPath = `defs[${posIndex}]`;
	const { isFieldVisible, onToggleField, getAvailableFields } = callbacks;

	return (
		<div className="pos-definition">
			<div 
				className="pos-def-header" 
				onClick={() => setIsCollapsed(!isCollapsed)}
			>
				<span className="collapse-icon">{isCollapsed ? '▶' : '▼'}</span>
				<span className="pos-badge">{posDef.pos || 'unknown'}</span>
				<FieldVisibilityMenu
					path={posDefPath}
					availableFields={getAvailableFields(posDefPath)}
					isFieldVisible={isFieldVisible}
					onToggleField={onToggleField}
					canEdit={canEdit}
				/>
				{canEdit && totalPosDefs > 1 && (
					<button
						onClick={(e) => {
							e.stopPropagation();
							onRemove();
						}}
						className="item-remove btn-icon btn-danger"
						title="Remove POS definition"
					>
						✕
					</button>
				)}
			</div>

			{!isCollapsed && (
				<div className="pos-def-content">
					{/* POS field */}
					<div className="material-field">
						<input
							type="text"
							value={posDef.pos || ''}
							onChange={(e) => onUpdate({ pos: e.target.value })}
							disabled={!canEdit}
							placeholder=" "
							id={`field-${posDefPath}-pos`}
						/>
						<label htmlFor={`field-${posDefPath}-pos`}>pos:</label>
					</div>

					{/* POS-level fields */}
					<div className="compact-field-row">
						{isFieldVisible(posDefPath, 'mw') && (
							<div className="material-field">
								<input
									type="text"
									value={posDef.mw || ''}
									onChange={(e) => onUpdate({ mw: e.target.value })}
									disabled={!canEdit}
									placeholder=" "
									id={`field-${posDefPath}-mw`}
								/>
								<label htmlFor={`field-${posDefPath}-mw`}>mw:</label>
							</div>
						)}

						{isFieldVisible(posDefPath, 'etym') && (
							<div className="material-field">
								<input
									type="text"
									value={posDef.etym || ''}
									onChange={(e) => onUpdate({ etym: e.target.value })}
									disabled={!canEdit}
									placeholder=" "
									id={`field-${posDefPath}-etym`}
								/>
								<label htmlFor={`field-${posDefPath}-etym`}>etym:</label>
							</div>
						)}
					</div>

					{/* Sub-definitions */}
					<div className="sub-definitions">
						{posDef.defs.map((subDef, subIndex) => (
							<SubDefinitionEditor
								key={subIndex}
								subDef={subDef}
								subIndex={subIndex}
								posIndex={posIndex}
								onUpdate={(updates) => onUpdateSubDefinition(subIndex, updates)}
								onRemove={() => onRemoveSubDefinition(subIndex)}
								canEdit={canEdit}
								callbacks={callbacks}
								totalSubDefs={posDef.defs.length}
							/>
						))}
					</div>

					{/* Add sub-definition button */}
					{canEdit && (
						<button
							onClick={onAddSubDefinition}
							className="btn-secondary btn-sm"
						>
							+ Add definition
						</button>
					)}
				</div>
			)}
		</div>
	);
}

