import { TranslationVariant, EditorCallbacks } from './types';
import { FieldVisibilityMenu, MenuItem } from './FieldVisibilityMenu';
import { ChipInput } from './ChipInput';

interface TranslationVariantEditorProps {
	variant: TranslationVariant;
	variantIndex: number;
	path: string;
	onUpdate: (updates: Partial<TranslationVariant>) => void;
	onRemove: () => void;
	canEdit: boolean;
	callbacks: EditorCallbacks;
	nestingLevel?: number;  // Track nesting depth
	totalVariants: number;  // Total number of variants
}

export function TranslationVariantEditor({
	variant,
	variantIndex,
	path,
	onUpdate,
	onRemove,
	canEdit,
	callbacks,
	nestingLevel = 0,
	totalVariants
}: TranslationVariantEditorProps) {
	const variantPath = `${path}.en[${variantIndex}]`;
	const { isFieldVisible, onToggleField, getAvailableFields } = callbacks;
	const showLabel = totalVariants > 1; // Only show label if multiple variants

	// Build menu items
	const menuItems: MenuItem[] = [
		{
			label: 'Delete variant',
			onClick: () => onRemove(),
			danger: true
		}
	];

	return (
		<div className={`compact-variant nested-level-${nestingLevel}`}>
			<div className="variant-header compact-header">
				{showLabel && <span className="variant-label">{String.fromCharCode(97 + variantIndex)}:</span>}
				
				{/* Inline English translation */}
				<div className="inline-material-field" style={{ flex: 1 }}>
					<label htmlFor={`field-${path}-en-${variantIndex}`}>en:</label>
					<textarea
						value={variant.en || ''}
						onChange={(e) => onUpdate({ en: e.target.value })}
						disabled={!canEdit}
						rows={1}
						placeholder=" "
						id={`field-${path}-en-${variantIndex}`}
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
					path={variantPath}
					availableFields={getAvailableFields(variantPath)}
					isFieldVisible={isFieldVisible}
					onToggleField={onToggleField}
					canEdit={canEdit}
					menuItems={menuItems}
				/>
			</div>

			{/* Boolean flags */}
			<div className="compact-field-row">
				{isFieldVisible(variantPath, 'dup') && (
					<label className="checkbox-field">
						<input
							type="checkbox"
							checked={variant.dup || false}
							onChange={(e) => onUpdate({ dup: e.target.checked || undefined })}
							disabled={!canEdit}
						/>
						<span>dup</span>
					</label>
				)}
			</div>

			{/* Optional fields */}
			<div className="compact-field-row">
				{isFieldVisible(variantPath, 'mw') && (
					<div className="material-field">
						<input
							type="text"
							value={variant.mw || ''}
							onChange={(e) => onUpdate({ mw: e.target.value })}
							disabled={!canEdit}
							placeholder=" "
							id={`field-${path}-mw-${variantIndex}`}
						/>
						<label htmlFor={`field-${path}-mw-${variantIndex}`}>mw:</label>
					</div>
				)}

				{isFieldVisible(variantPath, 'cat') && (
					<div className="material-field">
						<input
							type="text"
							value={variant.cat || ''}
							onChange={(e) => onUpdate({ cat: e.target.value })}
							disabled={!canEdit}
							placeholder=" "
							id={`field-${path}-cat-${variantIndex}`}
						/>
						<label htmlFor={`field-${path}-cat-${variantIndex}`}>cat:</label>
					</div>
				)}

				{isFieldVisible(variantPath, 'etym') && (
					<div className="material-field">
						<input
							type="text"
							value={variant.etym || ''}
							onChange={(e) => onUpdate({ etym: e.target.value })}
							disabled={!canEdit}
							placeholder=" "
							id={`field-${path}-etym-${variantIndex}`}
						/>
						<label htmlFor={`field-${path}-etym-${variantIndex}`}>etym:</label>
					</div>
				)}
			</div>

			{/* Alt array with ChipInput */}
			{isFieldVisible(variantPath, 'alt') && (
				<div className="inline-material-field" style={{ flex: 1 }}>
					<label htmlFor={`field-${path}-alt-${variantIndex}`}>alt:</label>
					<ChipInput
						values={variant.alt || []}
						onChange={(values) => onUpdate({ alt: values.length > 0 ? values : undefined })}
						disabled={!canEdit}
						placeholder="Alternative forms"
						id={`field-${path}-alt-${variantIndex}`}
					/>
				</div>
			)}

			{/* Nested examples (one level only) - only if nesting level allows */}
			{nestingLevel < 1 && isFieldVisible(variantPath, 'ex') && variant.ex && variant.ex.length > 0 && (
				<div className="nested-section">
					<div className="section-label">¶ nested ex:</div>
					{/* TODO: Render nested ExampleItems here (would need ExampleItemEditor import, but avoiding circular dep for now) */}
					<div className="info-text">Nested examples in translation variants (nesting level {nestingLevel + 1})</div>
				</div>
			)}
		</div>
	);
}

