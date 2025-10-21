import { ExampleItem } from '../../types/dictionary';

interface ExtraDisplayProps {
	data: ExampleItem;
	bullet: string;
}

export function ExtraDisplay({ data, bullet }: ExtraDisplayProps) {
	const hasEn = 'en' in data && data.en && Array.isArray(data.en);
	const hasAlt = 'alt' in data && Array.isArray(data.alt);
	const hasEx = 'ex' in data && Array.isArray(data.ex);
	
	// Format translation variants (en is always TranslationVariant[])
	const renderTranslations = () => {
		if (!hasEn || !Array.isArray(data.en)) return null;
		
		const enArray = data.en;
		const labels = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
		const showLabels = enArray.length > 1; // Only show labels if multiple variants
		
		return enArray.map((variant, idx) => {
			const label = labels[idx] || `${idx + 1}`;
			const parts: React.ReactNode[] = [];
			
			// Add label only if there are multiple variants (semibold)
			if (showLabels) {
				parts.push(<span key="label" className="variant-label">{label}. </span>);
			}
			
			// Add measure word if present
			if (variant.mw) {
				parts.push(<span key="mw">({variant.mw}) </span>);
			}
			
			// Add etymology if present
			if (variant.etym) {
				parts.push(<span key="etym">({variant.etym}) </span>);
			}
			
			// Add translation
			if (variant.en) {
				parts.push(<span key="en">{variant.en}</span>);
			}
			
			// Add alternatives if present
			if (Array.isArray(variant.alt)) {
				variant.alt.forEach((alt: string, altIdx) => {
					parts.push(<span key={`alt-${altIdx}`}>; ≃ {alt}</span>);
				});
			}
			
			return (
				<div key={idx} className="en">
					{parts}
				</div>
			);
		});
	};

	return (
		<div className="ex">
			<span className="ex-tw">{bullet} {data.tw}</span>
			{renderTranslations()}
			{hasAlt && data.alt ? data.alt.map((alt, i) => (
				<span key={i} className="alt">; ≃ {alt}</span>
			)) : null}
			{hasEx && data.ex ? data.ex.map((ex, i) => (
				<ExtraDisplay key={i} data={ex} bullet="¶" />
			)) : null}
		</div>
	);
}

