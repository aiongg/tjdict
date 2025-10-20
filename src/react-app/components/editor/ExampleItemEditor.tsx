import { ExampleItem, EditorCallbacks } from './types';
import { FieldVisibilityMenu, MenuItem } from './FieldVisibilityMenu';
import { TranslationVariantEditor } from './TranslationVariantEditor';
import { ChipInput } from './ChipInput';

interface ExampleItemEditorProps {
	item: ExampleItem;
	itemIndex: number;
	path: string;
	fieldType: 'ex' | 'drv' | 'idm';
	onUpdate: (updates: Partial<ExampleItem>) => void;
	onRemove: () => void;
	canEdit: boolean;
	callbacks: EditorCallbacks;
	nestingLevel?: number;  // Track nesting depth (0 = top level, 1 = nested once, 2 = max)
	onAddNested?: (field: 'ex' | 'drv' | 'idm', item: ExampleItem) => void;
	onUpdateNested?: (field: 'ex' | 'drv' | 'idm', index: number, updates: Partial<ExampleItem>) => void;
	onRemoveNested?: (field: 'ex' | 'drv' | 'idm', index: number) => void;
}

export function ExampleItemEditor({
	item,
	itemIndex,
	path,
	fieldType,
	onUpdate,
	onRemove,
	canEdit,
	callbacks,
	nestingLevel = 0,
	onAddNested,
	onUpdateNested,
	onRemoveNested
}: ExampleItemEditorProps) {
	const itemPath = `${path}.${fieldType}[${itemIndex}]`;
	const { isFieldVisible, onToggleField, getAvailableFields } = callbacks;

	// Get symbol for field type
	const getSymbol = (type: string) => {
		switch (type) {
			case 'ex': return '¶';
			case 'drv': return '◊';
			case 'idm': return '※';
			default: return '•';
		}
	};

	// Build menu items
	const menuItems: MenuItem[] = [
		{
			label: '+ Add translation variant',
			onClick: () => onUpdate({ en: [...(item.en || []), { en: '' }] })
		}
	];
	
	// Add nested item options if nesting level allows
	if (nestingLevel < 2 && onAddNested) {
		menuItems.push(
			{
				label: '+ Add nested ex',
				onClick: () => onAddNested('ex', { tw: '', en: [{ en: '' }] })
			},
			{
				label: '+ Add nested drv',
				onClick: () => onAddNested('drv', { tw: '', en: [{ en: '' }] })
			},
			{
				label: '+ Add nested idm',
				onClick: () => onAddNested('idm', { tw: '', en: [{ en: '' }] })
			}
		);
	}
	
	// Add delete button
	menuItems.push({
		label: `Delete ${fieldType}`,
		onClick: () => onRemove(),
		danger: true,
		divider: true
	});

	return (
		<div className={`compact-item nested-level-${nestingLevel}`}>
			<div className="item-header compact-header">
				<span className="item-symbol">{getSymbol(fieldType)}</span>
				
				{/* Inline Taiwanese text */}
				<div className="inline-material-field" style={{ flex: 1 }}>
					<label htmlFor={`field-${itemPath}-tw`}>tw:</label>
					<textarea
						value={item.tw || ''}
						onChange={(e) => onUpdate({ tw: e.target.value })}
						disabled={!canEdit}
						rows={1}
						placeholder=" "
						id={`field-${itemPath}-tw`}
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
					path={itemPath}
					availableFields={getAvailableFields(itemPath)}
					isFieldVisible={isFieldVisible}
					onToggleField={onToggleField}
					canEdit={canEdit}
					menuItems={menuItems}
				/>
			</div>

		{/* English translations (array of TranslationVariants) */}
		<div className="translation-variants">
			{(item.en || []).map((variant, varIdx) => (
				<TranslationVariantEditor
					key={varIdx}
					variant={variant}
					variantIndex={varIdx}
					path={itemPath}
					onUpdate={(updates) => {
						const newEn = [...(item.en || [])];
						newEn[varIdx] = { ...newEn[varIdx], ...updates };
						onUpdate({ en: newEn });
					}}
					onRemove={() => {
						const newEn = (item.en || []).filter((_, i) => i !== varIdx);
						onUpdate({ en: newEn.length > 0 ? newEn : undefined });
					}}
					canEdit={canEdit}
					callbacks={callbacks}
					nestingLevel={nestingLevel}
					totalVariants={(item.en || []).length}
				/>
			))}
			</div>

			{/* Optional simple fields */}
			{isFieldVisible(itemPath, 'mw') && (
				<div className="inline-material-field">
					<label htmlFor={`field-${itemPath}-mw`}>mw:</label>
					<ChipInput
						values={item.mw || []}
						onChange={(values) => onUpdate({ mw: values.length > 0 ? values : undefined })}
						disabled={!canEdit}
						placeholder="Measure word(s)"
						id={`field-${itemPath}-mw`}
					/>
				</div>
			)}

			{isFieldVisible(itemPath, 'cat') && (
				<div className="material-field">
					<input
						type="text"
						value={item.cat || ''}
						onChange={(e) => onUpdate({ cat: e.target.value })}
						disabled={!canEdit}
						placeholder=" "
						id={`field-${itemPath}-cat`}
					/>
					<label htmlFor={`field-${itemPath}-cat`}>cat:</label>
				</div>
			)}

			{isFieldVisible(itemPath, 'etym') && (
				<div className="material-field">
					<input
						type="text"
						value={item.etym || ''}
						onChange={(e) => onUpdate({ etym: e.target.value })}
						disabled={!canEdit}
						placeholder=" "
						id={`field-${itemPath}-etym`}
					/>
					<label htmlFor={`field-${itemPath}-etym`}>etym:</label>
				</div>
			)}

			{isFieldVisible(itemPath, 'det') && (
				<div className="material-field">
					<input
						type="text"
						value={item.det || ''}
						onChange={(e) => onUpdate({ det: e.target.value })}
						disabled={!canEdit}
						placeholder=" "
						id={`field-${itemPath}-det`}
					/>
					<label htmlFor={`field-${itemPath}-det`}>det:</label>
				</div>
			)}

			{/* Alt array */}
			{isFieldVisible(itemPath, 'alt') && (
				<div className="array-field">
					<label>alt:</label>
					{(item.alt || []).map((alt, altIdx) => (
						<div key={altIdx} className="array-item">
							<input
								type="text"
								value={alt}
								onChange={(e) => {
									const newAlt = [...(item.alt || [])];
									newAlt[altIdx] = e.target.value;
									onUpdate({ alt: newAlt });
								}}
								disabled={!canEdit}
							/>
							{canEdit && (
								<button
									onClick={() => {
										const newAlt = (item.alt || []).filter((_, i) => i !== altIdx);
										onUpdate({ alt: newAlt });
									}}
									className="item-remove btn-icon btn-danger"
								>
									✕
								</button>
							)}
						</div>
					))}
					{canEdit && (
						<button
							onClick={() => onUpdate({ alt: [...(item.alt || []), ''] })}
							className="btn-secondary btn-sm"
						>
							+ Add alt
						</button>
					)}
				</div>
			)}

			{/* Cf array */}
			{isFieldVisible(itemPath, 'cf') && (
				<div className="array-field">
					<label>cf:</label>
					{(item.cf || []).map((cf, cfIdx) => (
						<div key={cfIdx} className="array-item">
							<input
								type="text"
								value={cf}
								onChange={(e) => {
									const newCf = [...(item.cf || [])];
									newCf[cfIdx] = e.target.value;
									onUpdate({ cf: newCf });
								}}
								disabled={!canEdit}
							/>
							{canEdit && (
								<button
									onClick={() => {
										const newCf = (item.cf || []).filter((_, i) => i !== cfIdx);
										onUpdate({ cf: newCf });
									}}
									className="item-remove btn-icon btn-danger"
								>
									✕
								</button>
							)}
						</div>
					))}
					{canEdit && (
						<button
							onClick={() => onUpdate({ cf: [...(item.cf || []), ''] })}
							className="btn-secondary btn-sm"
						>
							+ Add cf
						</button>
					)}
				</div>
			)}

			{/* Nested ex/drv/idm (only if nesting level < 2) */}
			{nestingLevel < 2 && onUpdateNested && onRemoveNested && (
				<div className="nested-items">
					{/* Nested examples */}
					{item.ex && item.ex.length > 0 && (
						<div className="nested-section">
							{item.ex.map((nestedItem, nestedIdx) => (
								<ExampleItemEditor
									key={nestedIdx}
									item={nestedItem}
									itemIndex={nestedIdx}
									path={itemPath}
									fieldType="ex"
									onUpdate={(updates) => onUpdateNested('ex', nestedIdx, updates)}
									onRemove={() => onRemoveNested('ex', nestedIdx)}
									canEdit={canEdit}
									callbacks={callbacks}
									nestingLevel={nestingLevel + 1}
								/>
							))}
						</div>
					)}

					{/* Nested derivatives */}
					{item.drv && item.drv.length > 0 && (
						<div className="nested-section">
							{item.drv.map((nestedItem, nestedIdx) => (
								<ExampleItemEditor
									key={nestedIdx}
									item={nestedItem}
									itemIndex={nestedIdx}
									path={itemPath}
									fieldType="drv"
									onUpdate={(updates) => onUpdateNested('drv', nestedIdx, updates)}
									onRemove={() => onRemoveNested('drv', nestedIdx)}
									canEdit={canEdit}
									callbacks={callbacks}
									nestingLevel={nestingLevel + 1}
								/>
							))}
						</div>
					)}

					{/* Nested idioms */}
					{item.idm && item.idm.length > 0 && (
						<div className="nested-section">
							{item.idm.map((nestedItem, nestedIdx) => (
								<ExampleItemEditor
									key={nestedIdx}
									item={nestedItem}
									itemIndex={nestedIdx}
									path={itemPath}
									fieldType="idm"
									onUpdate={(updates) => onUpdateNested('idm', nestedIdx, updates)}
									onRemove={() => onRemoveNested('idm', nestedIdx)}
									canEdit={canEdit}
									callbacks={callbacks}
									nestingLevel={nestingLevel + 1}
								/>
							))}
						</div>
					)}
				</div>
			)}
		</div>
	);
}

