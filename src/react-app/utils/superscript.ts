import { EntryData } from '../types/dictionary';

// Convert numbers to superscript in a string
export const convertNumbersToSuperscript = (str: string): string => {
	const superscriptMap: { [key: string]: string } = {
		'0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
		'5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹'
	};
	return str.replace(/\d/g, (digit) => superscriptMap[digit] || digit);
};

// Recursively process entry data to convert numbers in cf and alt fields to superscript
export const processEntryDataForSave = (data: EntryData): EntryData => {
	const processed = JSON.parse(JSON.stringify(data)); // Deep clone

	// Helper to process cf and alt arrays in any object
	const processFields = (obj: unknown): void => {
		if (!obj || typeof obj !== 'object') return;

		const record = obj as Record<string, unknown>;

		// Convert cf array
		if (Array.isArray(record.cf)) {
			record.cf = record.cf.map((item: unknown) => 
				typeof item === 'string' ? convertNumbersToSuperscript(item) : item
			);
		}

		// Convert alt array
		if (Array.isArray(record.alt)) {
			record.alt = record.alt.map((item: unknown) => 
				typeof item === 'string' ? convertNumbersToSuperscript(item) : item
			);
		}

		// Recursively process nested objects and arrays
		for (const key in record) {
			if (record[key] && typeof record[key] === 'object') {
				if (Array.isArray(record[key])) {
					(record[key] as unknown[]).forEach((item: unknown) => processFields(item));
				} else {
					processFields(record[key]);
				}
			}
		}
	};

	processFields(processed);
	return processed;
};

