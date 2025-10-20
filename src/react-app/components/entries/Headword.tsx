// Convert number to superscript
const toSuperscript = (num: number): string => {
	const superscriptMap: { [key: string]: string } = {
		'0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
		'5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹'
	};
	return num.toString().split('').map(d => superscriptMap[d] || d).join('');
};

// Parse headword into main part and variants
const parseHeadword = (head: string, headNumber?: number): { mainPart: string; variants: string } => {
	// Find the position of the first separator: /, |, or space
	const separators = ['/', '|', ' '];
	let firstSepPos = head.length;
	
	for (const sep of separators) {
		const pos = head.indexOf(sep);
		if (pos !== -1 && pos < firstSepPos) {
			firstSepPos = pos;
		}
	}
	
	// Split into main part and variants
	const mainPart = head.substring(0, firstSepPos);
	const variantsPart = head.substring(firstSepPos);
	
	// Add superscript number after main part if present
	const formattedMainPart = headNumber ? `${mainPart}${toSuperscript(headNumber)}` : mainPart;
	
	// Replace pipe with double vertical line for display
	const formattedVariants = variantsPart.replace(/\|/g, '║');
	
	return { 
		mainPart: formattedMainPart, 
		variants: formattedVariants 
	};
};

interface HeadwordProps {
	head: string;
	headNumber?: number;
	etym?: string;
	className?: string;
}

export function Headword({ head, headNumber, etym, className = '' }: HeadwordProps) {
	const { mainPart, variants } = parseHeadword(head, headNumber);
	
	return (
		<span className={`head ${className}`}>
			{mainPart}
			{variants && <span className="head-variants">{variants}</span>}
			{etym && <span className="etym"> ({etym})</span>}
		</span>
	);
}

