/**
 * Parse search query into field-specific terms
 * 
 * Supported syntax:
 * - Default: "text" → searches headword only
 * - head:text → searches headword
 * - en:text → searches English translations
 * - tw:text → searches Taiwanese text
 * - etym:text → searches etymology
 * - Multiple: "chia̍h en:eat" → searches headword for "chia̍h" AND English for "eat"
 * 
 * Examples:
 * - "chia̍h" → { head: "chia̍h" }
 * - "en:eat" → { en: "eat" }
 * - "chia̍h en:eat tw:食" → { head: "chia̍h", en: "eat", tw: "食" }
 * - "head:食 en:eat" → { head: "食", en: "eat" }
 */

export interface ParsedSearch {
	head?: string;
	en?: string;
	tw?: string;
	etym?: string;
}

const VALID_KEYS = ['head', 'en', 'tw', 'etym'] as const;
type SearchKey = typeof VALID_KEYS[number];

export function parseSearchQuery(query: string): ParsedSearch {
	if (!query || query.trim() === '') {
		return {};
	}

	const result: ParsedSearch = {};
	const trimmedQuery = query.trim();
	
	// Regular expression to match key:value pairs
	// Matches: key:value where value can contain spaces until the next key: or end of string
	const keyValueRegex = /(\w+):([^\s:]+(?:\s+(?!\w+:)[^\s:]+)*)/g;
	
	let matches: RegExpExecArray | null;
	const matchedRanges: Array<{ start: number; end: number }> = [];
	
	// Extract all key:value pairs
	while ((matches = keyValueRegex.exec(trimmedQuery)) !== null) {
		const key = matches[1].toLowerCase();
		const value = matches[2].trim();
		
		if (VALID_KEYS.includes(key as SearchKey) && value) {
			result[key as SearchKey] = value;
			matchedRanges.push({
				start: matches.index,
				end: matches.index + matches[0].length
			});
		}
	}
	
	// Extract text that's not part of any key:value pair (default to headword search)
	const unmatchedText: string[] = [];
	let lastEnd = 0;
	
	// Sort ranges by start position
	matchedRanges.sort((a, b) => a.start - b.start);
	
	for (const range of matchedRanges) {
		if (range.start > lastEnd) {
			const segment = trimmedQuery.substring(lastEnd, range.start).trim();
			if (segment) {
				unmatchedText.push(segment);
			}
		}
		lastEnd = range.end;
	}
	
	// Get any remaining text after the last match
	if (lastEnd < trimmedQuery.length) {
		const segment = trimmedQuery.substring(lastEnd).trim();
		if (segment) {
			unmatchedText.push(segment);
		}
	}
	
	// If there's unmatched text, add it to head search (or create head search if none exists)
	if (unmatchedText.length > 0) {
		const unmatchedString = unmatchedText.join(' ').trim();
		if (result.head) {
			// If head already exists from explicit head:, combine them
			result.head = `${result.head} ${unmatchedString}`;
		} else {
			result.head = unmatchedString;
		}
	}
	
	return result;
}

