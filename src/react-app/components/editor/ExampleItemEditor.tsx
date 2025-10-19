import { ExampleItem, TranslationVariant, EditorCallbacks } from './types';
import { FieldVisibilityMenu } from './FieldVisibilityMenu';
import { TranslationVariantEditor } from './TranslationVariantEditor';

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

	return (
		<div className={`compact-item nested-level-${nestingLevel}`}>
			<div className="item-header">
				<span className="item-symbol">{getSymbol(fieldType)}</span>
				<FieldVisibilityMenu
					path={itemPath}
					availableFields={getAvailableFields(itemPath)}
					isFieldVisible={isFieldVisible}
					onToggleField={onToggleField}
					canEdit={canEdit}
				/>
				{canEdit && (
					<button
						onClick={onRemove}
						className="item-remove btn-icon btn-danger"
						title={`Remove ${fieldType}`}
					>
						✕
					</button>
				)}
			</div>

			{/* Taiwanese text */}
			<div className="material-field">
				<textarea
					value={item.tw || ''}
					onChange={(e) => onUpdate({ tw: e.target.value })}
					disabled={!canEdit}
					rows={1}
					placeholder=" "
					id={`field-${itemPath}-tw`}
				/>
				<label htmlFor={`field-${itemPath}-tw`}>tw:</label>
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
				{canEdit && (
					<button
						onClick={() => onUpdate({ en: [...(item.en || []), { en: '' }] })}
						className="btn-secondary btn-sm"
					>
						+ Add translation variant
					</button>
				)}
			</div>

			{/* Optional simple fields */}
			<div className="compact-field-row">
				{isFieldVisible(itemPath, 'mw') && (
					<div className="material-field">
						<input
							type="text"
							value={item.mw || ''}
							onChange={(e) => onUpdate({ mw: e.target.value })}
							disabled={!canEdit}
							placeholder=" "
							id={`field-${itemPath}-mw`}
						/>
						<label htmlFor={`field-${itemPath}-mw`}>mw:</label>
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
			</div>

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
			{nestingLevel < 2 && onAddNested && onUpdateNested && onRemoveNested && (
				<div className="nested-items">
					{/* Nested examples */}
					{item.ex && item.ex.length > 0 && (
						<div className="nested-section">
							<div className="section-label">¶ nested ex:</div>
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
							<div className="section-label">◊ nested drv:</div>
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
							<div className="section-label">※ nested idm:</div>
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

					{/* Add nested item buttons */}
					{canEdit && nestingLevel < 2 && (
						<div className="nested-actions">
							<button
								onClick={() => onAddNested('ex', { tw: '', en: [{ en: '' }] })}
								className="btn-secondary btn-sm"
							>
								+ Add nested ex
							</button>
							<button
								onClick={() => onAddNested('drv', { tw: '', en: [{ en: '' }] })}
								className="btn-secondary btn-sm"
							>
								+ Add nested drv
							</button>
							<button
								onClick={() => onAddNested('idm', { tw: '', en: [{ en: '' }] })}
								className="btn-secondary btn-sm"
							>
								+ Add nested idm
							</button>
						</div>
					)}
				</div>
			)}
		</div>
	);
}

