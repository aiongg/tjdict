import { SubDefinition, ExampleItem, EditorCallbacks } from './types';
import { FieldVisibilityMenu, MenuItem } from './FieldVisibilityMenu';
import { ExampleItemEditor } from './ExampleItemEditor';
import { ChipInput } from './ChipInput';
import { getCircledNumber } from '../../utils/tools';

interface SubDefinitionEditorProps {
	subDef: SubDefinition;
	subIndex: number;
	posIndex: number;
	onUpdate: (updates: Partial<SubDefinition>) => void;
	onRemove: () => void;
	canEdit: boolean;
	callbacks: EditorCallbacks;
	totalSubDefs: number;
}

export function SubDefinitionEditor({
	subDef,
	subIndex,
	posIndex,
	onUpdate,
	onRemove,
	canEdit,
	callbacks,
	totalSubDefs
}: SubDefinitionEditorProps) {
	const subDefPath = `defs[${posIndex}].defs[${subIndex}]`;
	const { isFieldVisible, onToggleField, getAvailableFields } = callbacks;

	const handleArrayUpdate = (field: 'ex' | 'drv' | 'idm', itemIndex: number, updates: Partial<ExampleItem>) => {
		const arr = (subDef[field] || []) as ExampleItem[];
		const newArr = [...arr];
		newArr[itemIndex] = { ...newArr[itemIndex], ...updates };
		onUpdate({ [field]: newArr });
	};

	const handleArrayRemove = (field: 'ex' | 'drv' | 'idm', itemIndex: number) => {
		const arr = subDef[field] || [];
		onUpdate({ [field]: arr.filter((_, i) => i !== itemIndex) });
	};

	const handleArrayAdd = (field: 'ex' | 'drv' | 'idm', item: ExampleItem) => {
		const arr = (subDef[field] || []) as ExampleItem[];
		onUpdate({ [field]: [...arr, item] });
	};

	// Nested item management (for items within ex/drv/idm)
	const handleNestedAdd = (
		parentField: 'ex' | 'drv' | 'idm',
		parentIndex: number,
		nestedField: 'ex' | 'drv' | 'idm',
		item: ExampleItem
	) => {
		const parentArr = (subDef[parentField] || []) as ExampleItem[];
		const parent = parentArr[parentIndex];
		const nestedArr = (parent[nestedField] || []) as ExampleItem[];
		
		const newParentArr = [...parentArr];
		newParentArr[parentIndex] = {
			...parent,
			[nestedField]: [...nestedArr, item]
		};
		onUpdate({ [parentField]: newParentArr });
	};

	const handleNestedUpdate = (
		parentField: 'ex' | 'drv' | 'idm',
		parentIndex: number,
		nestedField: 'ex' | 'drv' | 'idm',
		nestedIndex: number,
		updates: Partial<ExampleItem>
	) => {
		const parentArr = (subDef[parentField] || []) as ExampleItem[];
		const parent = parentArr[parentIndex];
		const nestedArr = (parent[nestedField] || []) as ExampleItem[];
		
		const newNestedArr = [...nestedArr];
		newNestedArr[nestedIndex] = { ...newNestedArr[nestedIndex], ...updates };
		
		const newParentArr = [...parentArr];
		newParentArr[parentIndex] = {
			...parent,
			[nestedField]: newNestedArr
		};
		onUpdate({ [parentField]: newParentArr });
	};

	const handleNestedRemove = (
		parentField: 'ex' | 'drv' | 'idm',
		parentIndex: number,
		nestedField: 'ex' | 'drv' | 'idm',
		nestedIndex: number
	) => {
		const parentArr = (subDef[parentField] || []) as ExampleItem[];
		const parent = parentArr[parentIndex];
		const nestedArr = parent[nestedField] || [];
		
		const newParentArr = [...parentArr];
		newParentArr[parentIndex] = {
			...parent,
			[nestedField]: nestedArr.filter((_, i) => i !== nestedIndex)
		};
		onUpdate({ [parentField]: newParentArr });
	};

	// Build menu items
	const menuItems: MenuItem[] = [];
	
	// Add section creation items
	if (!subDef.ex || subDef.ex.length === 0) {
		menuItems.push({
			label: '+ Add Ex',
			onClick: () => handleArrayAdd('ex', { tw: '', en: [{ en: '' }] })
		});
	}
	if (!subDef.drv || subDef.drv.length === 0) {
		menuItems.push({
			label: '+ Add Drv',
			onClick: () => handleArrayAdd('drv', { tw: '', en: [{ en: '' }] })
		});
	}
	if (!subDef.idm || subDef.idm.length === 0) {
		menuItems.push({
			label: '+ Add Idm',
			onClick: () => handleArrayAdd('idm', { tw: '', en: [{ en: '' }] })
		});
	}
	
	// Add delete button
	if (totalSubDefs > 1) {
		menuItems.push({
			label: 'Delete definition',
			onClick: () => onRemove(),
			danger: true,
			divider: menuItems.length > 0
		});
	}

	return (
		<div className="sub-definition">
			<div className="sub-def-header compact-header">
				{totalSubDefs > 1 && (
					<span className="circled-number">{getCircledNumber(subIndex)}</span>
				)}
				
				{/* Inline flag labels */}
				{(isFieldVisible(subDefPath, 'bound') || isFieldVisible(subDefPath, 'takes_a2') || isFieldVisible(subDefPath, 'dup')) && (
					<div className="inline-flag-labels">
						{isFieldVisible(subDefPath, 'bound') && subDef.bound && (
							<span className="flag-label flag-bound"><b>B.</b></span>
						)}
						{isFieldVisible(subDefPath, 'takes_a2') && subDef.takes_a2 && (
							<span className="flag-label flag-takes-a2"><i>[á]</i></span>
						)}
						{isFieldVisible(subDefPath, 'dup') && subDef.dup && (
							<span className="flag-label flag-dup"><i>[x]</i></span>
						)}
					</div>
				)}
				
				{/* Inline English translation */}
				<div className="inline-material-field" style={{ flex: 1 }}>
					<label htmlFor={`field-${subDefPath}-en`}>en:</label>
					<textarea
						value={subDef.en || ''}
						onChange={(e) => onUpdate({ en: e.target.value })}
						disabled={!canEdit}
						placeholder=" "
						rows={1}
						id={`field-${subDefPath}-en`}
						style={{ resize: 'none', overflow: 'hidden' }}
						onInput={(e) => {
							// Auto-resize textarea
							const target = e.target as HTMLTextAreaElement;
							target.style.height = 'auto';
							target.style.height = target.scrollHeight + 'px';
						}}
					/>
				</div>

				<FieldVisibilityMenu
					path={subDefPath}
					availableFields={getAvailableFields(subDefPath)}
					isFieldVisible={isFieldVisible}
					onToggleField={onToggleField}
					canEdit={canEdit}
					menuItems={menuItems}
				/>
			</div>

			{/* Optional fields */}
			{isFieldVisible(subDefPath, 'mw') && (
				<div className="inline-material-field">
					<label htmlFor={`field-${subDefPath}-mw`}>mw:</label>
					<ChipInput
						values={subDef.mw || []}
						onChange={(values) => onUpdate({ mw: values.length > 0 ? values : undefined })}
						disabled={!canEdit}
						placeholder="Measure word(s)"
						id={`field-${subDefPath}-mw`}
					/>
				</div>
			)}

			{isFieldVisible(subDefPath, 'cat') && (
				<div className="material-field">
					<input
						type="text"
						value={subDef.cat || ''}
						onChange={(e) => onUpdate({ cat: e.target.value })}
						disabled={!canEdit}
						placeholder=" "
						id={`field-${subDefPath}-cat`}
					/>
					<label htmlFor={`field-${subDefPath}-cat`}>cat:</label>
				</div>
			)}

			{isFieldVisible(subDefPath, 'etym') && (
				<div className="material-field">
					<input
						type="text"
						value={subDef.etym || ''}
						onChange={(e) => onUpdate({ etym: e.target.value })}
						disabled={!canEdit}
						placeholder=" "
						id={`field-${subDefPath}-etym`}
					/>
					<label htmlFor={`field-${subDefPath}-etym`}>etym:</label>
				</div>
			)}

			{isFieldVisible(subDefPath, 'det') && (
				<div className="material-field">
					<input
						type="text"
						value={subDef.det || ''}
						onChange={(e) => onUpdate({ det: e.target.value })}
						disabled={!canEdit}
						placeholder=" "
						id={`field-${subDefPath}-det`}
					/>
					<label htmlFor={`field-${subDefPath}-det`}>det:</label>
				</div>
			)}

			{/* Alt array with ChipInput */}
			{isFieldVisible(subDefPath, 'alt') && (
				<div className="inline-material-field">
					<label htmlFor={`field-${subDefPath}-alt`}>alt:</label>
					<ChipInput
						values={subDef.alt || []}
						onChange={(values) => onUpdate({ alt: values.length > 0 ? values : undefined })}
						disabled={!canEdit}
						placeholder="Alternative forms"
						id={`field-${subDefPath}-alt`}
					/>
				</div>
			)}

			{/* Cf array with ChipInput */}
			{isFieldVisible(subDefPath, 'cf') && (
				<div className="inline-material-field">
					<label htmlFor={`field-${subDefPath}-cf`}>cf:</label>
					<ChipInput
						values={subDef.cf || []}
						onChange={(values) => onUpdate({ cf: values.length > 0 ? values : undefined })}
						disabled={!canEdit}
						placeholder="Cross-references"
						id={`field-${subDefPath}-cf`}
					/>
				</div>
			)}

		{/* Examples - only show if has items */}
		{subDef.ex && subDef.ex.length > 0 && (
			<div className="examples-section">
				{(subDef.ex || []).map((ex, exIdx) => (
					<ExampleItemEditor
						key={exIdx}
						item={ex}
						itemIndex={exIdx}
						path={subDefPath}
						fieldType="ex"
						onUpdate={(updates) => handleArrayUpdate('ex', exIdx, updates)}
						onRemove={() => handleArrayRemove('ex', exIdx)}
						canEdit={canEdit}
						callbacks={callbacks}
						nestingLevel={0}
						onAddNested={(field, item) => handleNestedAdd('ex', exIdx, field, item)}
						onUpdateNested={(field, idx, updates) => handleNestedUpdate('ex', exIdx, field, idx, updates)}
						onRemoveNested={(field, idx) => handleNestedRemove('ex', exIdx, field, idx)}
					/>
				))}
				{canEdit && (
					<button
						onClick={() => handleArrayAdd('ex', { tw: '', en: [{ en: '' }] })}
						className="btn-secondary btn-sm add-item-button"
					>
						+ Add ex
					</button>
				)}
			</div>
		)}

		{/* Derivatives - only show if has items */}
		{subDef.drv && subDef.drv.length > 0 && (
			<>
				{subDef.ex && subDef.ex.length > 0 && <div className="section-divider"></div>}
				<div className="derivatives-section">
					{(subDef.drv || []).map((drv, drvIdx) => (
						<ExampleItemEditor
							key={drvIdx}
							item={drv}
							itemIndex={drvIdx}
							path={subDefPath}
							fieldType="drv"
							onUpdate={(updates) => handleArrayUpdate('drv', drvIdx, updates)}
							onRemove={() => handleArrayRemove('drv', drvIdx)}
							canEdit={canEdit}
							callbacks={callbacks}
							nestingLevel={0}
							onAddNested={(field, item) => handleNestedAdd('drv', drvIdx, field, item)}
							onUpdateNested={(field, idx, updates) => handleNestedUpdate('drv', drvIdx, field, idx, updates)}
							onRemoveNested={(field, idx) => handleNestedRemove('drv', drvIdx, field, idx)}
						/>
					))}
					{canEdit && (
						<button
							onClick={() => handleArrayAdd('drv', { tw: '', en: [{ en: '' }] })}
							className="btn-secondary btn-sm add-item-button"
						>
							+ Add drv
						</button>
					)}
				</div>
			</>
		)}

		{/* Idioms - only show if has items */}
		{subDef.idm && subDef.idm.length > 0 && (
			<>
				{((subDef.ex && subDef.ex.length > 0) || (subDef.drv && subDef.drv.length > 0)) && (
					<div className="section-divider"></div>
				)}
				<div className="idioms-section">
					{(subDef.idm || []).map((idm, idmIdx) => (
						<ExampleItemEditor
							key={idmIdx}
							item={idm}
							itemIndex={idmIdx}
							path={subDefPath}
							fieldType="idm"
							onUpdate={(updates) => handleArrayUpdate('idm', idmIdx, updates)}
							onRemove={() => handleArrayRemove('idm', idmIdx)}
							canEdit={canEdit}
							callbacks={callbacks}
							nestingLevel={0}
							onAddNested={(field, item) => handleNestedAdd('idm', idmIdx, field, item)}
							onUpdateNested={(field, idx, updates) => handleNestedUpdate('idm', idmIdx, field, idx, updates)}
							onRemoveNested={(field, idx) => handleNestedRemove('idm', idmIdx, field, idx)}
						/>
					))}
					{canEdit && (
						<button
							onClick={() => handleArrayAdd('idm', { tw: '', en: [{ en: '' }] })}
							className="btn-secondary btn-sm add-item-button"
						>
							+ Add idm
						</button>
					)}
				</div>
			</>
		)}
		</div>
	);
}

