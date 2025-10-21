import { EntryData } from '../../types/dictionary';
import { Headword } from './Headword';
import { PosDefDisplay } from './PosDefDisplay';

interface EntryDisplayProps {
	entryData: EntryData;
}

export function EntryDisplay({ entryData }: EntryDisplayProps) {
	// Check if this is a simple det-only entry
	// Conditions: 1 pos def, 1 sub def, only det field is populated (and optionally head_number/etym at entry level)
	const isSimpleDetOnly = 
		entryData.defs.length === 1 && 
		entryData.defs[0].defs.length === 1 &&
		entryData.defs[0].defs[0].det &&
		!entryData.defs[0].defs[0].en &&
		!entryData.defs[0].defs[0].mw &&
		!entryData.defs[0].defs[0].cat &&
		!entryData.defs[0].defs[0].bound &&
		!entryData.defs[0].defs[0].dup &&
		!entryData.defs[0].defs[0].takes_a2 &&
		!entryData.defs[0].defs[0].alt &&
		!entryData.defs[0].defs[0].cf &&
		!entryData.defs[0].defs[0].ex &&
		!entryData.defs[0].defs[0].drv &&
		!entryData.defs[0].defs[0].idm;
	
	if (isSimpleDetOnly) {
		return (
			<div className="entry-display entry-display-simple">
				<Headword 
					head={entryData.head} 
					headNumber={entryData.head_number}
					etym={entryData.etym}
				/>
				<span className="det-simple"> ⇒ {entryData.defs[0].defs[0].det}</span>
			</div>
		);
	}
	
	return (
		<div className="entry-display">
			<div className="entry-headword">
				<Headword 
					head={entryData.head} 
					headNumber={entryData.head_number}
					etym={entryData.etym}
				/>
			</div>
			
			{entryData.defs.map((posDef, i) => (
				<PosDefDisplay key={i} posDef={posDef} />
			))}
		</div>
	);
}

