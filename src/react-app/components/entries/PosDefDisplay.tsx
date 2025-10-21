import { PosDefinition } from '../../types/dictionary';
import { SubDefDisplay } from './SubDefDisplay';

interface PosDefDisplayProps {
	posDef: PosDefinition;
}

export function PosDefDisplay({ posDef }: PosDefDisplayProps) {
	const hasSingleDef = posDef.defs.length === 1;
	
	// Render POS badges (multiple badges for multiple pos values)
	const renderPosBadges = () => {
		if (!posDef.pos || posDef.pos.length === 0) {
			return <span className="pos pos-missing">[no pos]</span>;
		}
		return posDef.pos.map((p, i) => (
			<span key={i} className="pos pos-badge">{p}</span>
		));
	};

	// Render flags for single definition (after pos)
	const renderFlagsAfterPos = () => {
		if (!hasSingleDef) return null;
		const subDef = posDef.defs[0];
		const flags = [];
		if (subDef.bound) flags.push(<span key="bound" className="flag-bound"> <b>B.</b></span>);
		if (subDef.takes_a2) flags.push(<span key="takes_a2" className="flag-takes-a2"> <i>[á]</i></span>);
		if (subDef.dup) flags.push(<span key="dup" className="flag-dup"> <i>[x]</i></span>);
		return flags;
	};
	
	return (
		<div className="pos-def">
			{renderPosBadges()}
			{hasSingleDef && renderFlagsAfterPos()}
			{hasSingleDef ? (
				<SubDefDisplay subDef={posDef.defs[0]} hasSingleDef={true} />
			) : (
				posDef.defs.map((subDef, i) => (
					<SubDefDisplay key={i} subDef={subDef} num={i + 1} hasSingleDef={false} />
				))
			)}
		</div>
	);
}

