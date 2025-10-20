import { useState } from 'react';
import { PosDefinition, SubDefinition, EditorCallbacks } from './types';
import { FieldVisibilityMenu, MenuItem } from './FieldVisibilityMenu';
import { SubDefinitionEditor } from './SubDefinitionEditor';
import { ChipInput } from './ChipInput';

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

	// Valid POS values
	const validPosValues = ['adj', 'adv', 'aux', 'conj', 'dem', 'excl', 'gp', 'ideo', 'inf', 'mp', 'mw', 'n', 'num', 'onom', 'pref', 'prep', 'pron', 'suf', 'v'];

	const menuItems: MenuItem[] = [
		{
			label: '+ Add definition',
			onClick: () => onAddSubDefinition()
		}
	];

	if (totalPosDefs > 1) {
		menuItems.push({
			label: 'Delete POS definition',
			onClick: () => onRemove(),
			danger: true,
			divider: true
		});
	}

	return (
		<div className="pos-definition">
			<div className="pos-def-header compact-header">
				<span 
					className="collapse-icon"
					onClick={() => setIsCollapsed(!isCollapsed)}
					style={{ cursor: 'pointer' }}
				>
					{isCollapsed ? '▶' : '▼'}
				</span>
				
				{/* POS chip input */}
				<div className="inline-material-field" style={{ flex: 1 }}>
					<label htmlFor={`field-${posDefPath}-pos`}>pos:</label>
					<ChipInput
						values={posDef.pos || []}
						onChange={(values) => onUpdate({ pos: values.length > 0 ? values : undefined })}
						disabled={!canEdit}
						placeholder="e.g., n, v, adj"
						allowedValues={validPosValues}
						id={`field-${posDefPath}-pos`}
					/>
				</div>

				<FieldVisibilityMenu
					path={posDefPath}
					availableFields={getAvailableFields(posDefPath)}
					isFieldVisible={isFieldVisible}
					onToggleField={onToggleField}
					canEdit={canEdit}
					menuItems={menuItems}
				/>
			</div>

			{!isCollapsed && (
				<div className="pos-def-content">
					{/* POS-level fields */}
					{isFieldVisible(posDefPath, 'mw') && (
						<div className="inline-material-field">
							<label htmlFor={`field-${posDefPath}-mw`}>mw:</label>
							<ChipInput
								values={posDef.mw || []}
								onChange={(values) => onUpdate({ mw: values.length > 0 ? values : undefined })}
								disabled={!canEdit}
								placeholder="Measure word(s)"
								id={`field-${posDefPath}-mw`}
							/>
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
				</div>
			)}
		</div>
	);
}

