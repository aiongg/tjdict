import { SubDefinition } from '../../types/dictionary';
import { getCircledNumber } from '../../utils/tools';
import { ExtraDisplay } from './ExtraDisplay';

interface SubDefDisplayProps {
	subDef: SubDefinition;
	num?: number;
	hasSingleDef?: boolean;
}

export function SubDefDisplay({ subDef, num, hasSingleDef }: SubDefDisplayProps) {
	// Render flag indicators
	const renderFlags = () => {
		const flags = [];
		if (subDef.bound) flags.push(<span key="bound" className="flag-bound"> <b>B.</b></span>);
		if (subDef.takes_a2) flags.push(<span key="takes_a2" className="flag-takes-a2"> <i>[á]</i></span>);
		if (subDef.dup) flags.push(<span key="dup" className="flag-dup"> <i>[x]</i></span>);
		return flags;
	};

	return (
		<div className="subdef">
			{num !== undefined && <span className="def-num">{getCircledNumber(num)}</span>}
			{/* For single definition, show flags after pos (handled in PosDefDisplay) */}
			{/* For multiple definitions, show flags before English */}
			{!hasSingleDef && renderFlags()}
			{subDef.cat && <span className="cat"> {subDef.cat}</span>}
			{subDef.mw && <span className="mw"> {subDef.mw.join(', ')}:</span>}
			{subDef.en && <span className="en"> {subDef.en}</span>}
			{Array.isArray(subDef.alt) && subDef.alt.map((alt, i) => (
				<span key={i} className="alt">; ≃ {alt}</span>
			))}
			{Array.isArray(subDef.cf) && subDef.cf.map((cf, i) => (
				<span key={i} className="cf">; cf {cf}</span>
			))}
			{subDef.det && <span className="det">; ⇒ {subDef.det}</span>}
			
			{Array.isArray(subDef.ex) && subDef.ex.map((ex, i) => (
				<ExtraDisplay key={`ex-${i}`} data={ex} bullet="¶" />
			))}
			{Array.isArray(subDef.drv) && subDef.drv.map((drv, i) => (
				<ExtraDisplay key={`drv-${i}`} data={drv} bullet="◊" />
			))}
			{Array.isArray(subDef.idm) && subDef.idm.map((idm, i) => (
				<ExtraDisplay key={`idm-${i}`} data={idm} bullet="∆" />
			))}
		</div>
	);
}

