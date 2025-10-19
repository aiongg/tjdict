// Shared types for editor components

// Translation variant (for multiple translations a/b/c)
export interface TranslationVariant {
	en: string;
	mw?: string;
	cat?: string;
	etym?: string;
	alt?: string[];
	ex?: ExampleItem[];  // One level of nesting
	[key: string]: unknown;
}

// Top-level definition grouped by part of speech
export interface PosDefinition {
	pos: string;  // Part of speech (single string: "n", "v", "adj", etc.)
	mw?: string;  // Measure word (can be at POS level)
	etym?: string;  // Etymology (can be at POS level)
	defs: SubDefinition[];  // Array of definition variants for this POS
}

// Individual definition variant within a POS
export interface SubDefinition {
	en?: string;  // English translation (simple string at definition level)
	mw?: string;  // Measure word
	cat?: string;  // Category
	etym?: string;  // Etymology
	alt?: string[];  // Alternatives
	cf?: string[];  // Cross-references
	det?: string;  // Details
	ex?: ExampleItem[];  // Examples
	drv?: ExampleItem[];  // Derivatives (uses ExampleItem structure)
	idm?: ExampleItem[];  // Idioms (uses ExampleItem structure)
	[key: string]: unknown;
}

// Generic item for examples, derivatives, and idioms (all have the same structure)
// These can be nested recursively up to 2 levels
export interface ExampleItem {
	tw: string;
	en?: TranslationVariant[];  // Always array for a/b/c variants
	mw?: string;
	cat?: string;
	etym?: string;
	det?: string;  // Details/notes
	alt?: string[];
	cf?: string[];
	ex?: ExampleItem[];  // Nested examples (one level deep)
	drv?: ExampleItem[];  // Nested derivatives (one level deep)
	idm?: ExampleItem[];  // Nested idioms (one level deep)
	[key: string]: unknown;
}

// Entry data structure (stored as JSON in entry_data column)
export interface EntryData {
	head: string;
	head_number?: number;  // Disambiguation number for homonyms
	page?: number;  // Page number in original dictionary
	etym?: string;
	defs: PosDefinition[];  // Array of definitions grouped by part of speech
}

export interface EditorCallbacks {
	isFieldVisible: (path: string, field: string) => boolean;
	onToggleField: (path: string, field: string) => void;
	getAvailableFields: (path: string) => string[];
}

