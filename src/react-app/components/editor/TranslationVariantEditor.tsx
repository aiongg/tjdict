import { TranslationVariant, EditorCallbacks } from './types';
import { FieldVisibilityMenu } from './FieldVisibilityMenu';

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

	return (
		<div className={`compact-variant nested-level-${nestingLevel}`}>
			<div className="variant-header">
				{showLabel && <div className="variant-label">{String.fromCharCode(97 + variantIndex)}:</div>}
				<FieldVisibilityMenu
					path={variantPath}
					availableFields={getAvailableFields(variantPath)}
					isFieldVisible={isFieldVisible}
					onToggleField={onToggleField}
					canEdit={canEdit}
				/>
				{canEdit && (
					<button
						onClick={onRemove}
						className="item-remove btn-icon btn-danger"
						title="Remove variant"
					>
						✕
					</button>
				)}
			</div>

			{/* English translation */}
			<div className="material-field">
				<textarea
					value={variant.en || ''}
					onChange={(e) => onUpdate({ en: e.target.value })}
					disabled={!canEdit}
					rows={1}
					placeholder=" "
					id={`field-${path}-en-${variantIndex}`}
				/>
				<label htmlFor={`field-${path}-en-${variantIndex}`}>en:</label>
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

			{/* Alt array */}
			{isFieldVisible(variantPath, 'alt') && (
				<div className="array-field">
					<label>alt:</label>
					{(variant.alt || []).map((alt, altIdx) => (
						<div key={altIdx} className="array-item">
							<input
								type="text"
								value={alt}
								onChange={(e) => {
									const newAlt = [...(variant.alt || [])];
									newAlt[altIdx] = e.target.value;
									onUpdate({ alt: newAlt });
								}}
								disabled={!canEdit}
							/>
							{canEdit && (
								<button
									onClick={() => {
										const newAlt = (variant.alt || []).filter((_, i) => i !== altIdx);
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
							onClick={() => onUpdate({ alt: [...(variant.alt || []), ''] })}
							className="btn-secondary btn-sm"
						>
							+ Add alt
						</button>
					)}
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

