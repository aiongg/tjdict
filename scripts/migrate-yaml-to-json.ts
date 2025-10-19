#!/usr/bin/env tsx

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import * as yaml from 'yaml';
import Ajv from 'ajv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load JSON schema
const schemaPath = path.join(__dirname, 'entry-schema.json');
const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));
const ajv = new Ajv({ allErrors: true });
const validate = ajv.compile(schema);

interface RawYAMLEntry {
	head?: string;
	page?: number;
	[key: string]: unknown;
}

interface ProcessedEntry {
	head: string;
	page: number | null;
	sort_key: string;
	entry_data: string;
	is_complete: number;
	source_file: string;
}

// Map of superscript numbers to regular numbers
const superscriptMap: { [key: string]: string } = {
	'⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4',
	'⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9'
};

// Extract headword and disambiguation number
function parseHeadword(head: string): { cleanHead: string; headNumber?: number } {
	// Find FIRST superscript number anywhere in the headword
	const superscriptPattern = /[⁰¹²³⁴⁵⁶⁷⁸⁹]+/g;
	const superscriptMatches = head.match(superscriptPattern);
	
	if (superscriptMatches && superscriptMatches.length > 0) {
		// Check if there are multiple numbers
		if (superscriptMatches.length > 1) {
			console.warn(`WARNING: Multiple superscript numbers found in headword "${head}"`);
		}
		
		const firstSuperscript = superscriptMatches[0];
		// Convert superscript to regular number
		const regularNum = firstSuperscript.split('').map(c => superscriptMap[c] || c).join('');
		const number = parseInt(regularNum, 10);
		// Remove the first occurrence of the number
		const cleanHead = head.replace(firstSuperscript, '');
		return { cleanHead, headNumber: number };
	}
	
	// Find FIRST parenthesized number anywhere in the headword
	const numberPattern = /\((\d+)\)/g;
	const numberMatches = head.match(numberPattern);
	
	if (numberMatches && numberMatches.length > 0) {
		// Check if there are multiple numbers
		if (numberMatches.length > 1) {
			console.warn(`WARNING: Multiple parenthesized numbers found in headword "${head}"`);
		}
		
		const firstMatch = numberMatches[0];
		const number = parseInt(firstMatch.match(/\d+/)![0], 10);
		// Remove the first occurrence of the number
		const cleanHead = head.replace(firstMatch, '').trim();
		return { cleanHead, headNumber: number };
	}
	
	return { cleanHead: head };
}

// Normalize headword for alphabetical sorting
function generateSortKey(head: string): string {
	const { cleanHead } = parseHeadword(head);
	return cleanHead
		.toLowerCase()
		// Remove diacritics (tone markers)
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		// Remove special characters but keep letters
		.replace(/[^a-z0-9]/g, '');
}

// Collapse a/b/c keys into an array
function collapseAlphaKeys(obj: unknown): unknown {
	if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
		return obj;
	}
	
	const objRecord = obj as Record<string, unknown>;
	
	// Check if object has a, b, c, etc. keys
	const alphaKeys = Object.keys(objRecord).filter(k => /^[a-z]$/.test(k)).sort();
	
	if (alphaKeys.length > 0) {
		// We have alpha keys, collapse them into an array of {en: "..."} objects
		const variants = alphaKeys.map(key => {
			const value = objRecord[key];
			
			// Handle null/undefined/empty values
			if (value === null || value === undefined) {
				return { en: "" };
			}
			
			// If it's a plain string, wrap it in {en: "..."}
			if (typeof value === 'string') {
				return { en: value };
			}
			
			// If it's already an object, check if it has an 'en' field
			if (typeof value === 'object' && !Array.isArray(value)) {
				const valueRecord = value as Record<string, unknown>;
				
				// If it already has an 'en' key, don't wrap - just recursively process its contents
				if ('en' in valueRecord) {
					// Recursively process all fields in the object
					const processed: Record<string, unknown> = {};
					for (const [k, v] of Object.entries(valueRecord)) {
						// Special handling for 'en' field - convert null/undefined to empty string
						if (k === 'en' && (v === null || v === undefined)) {
							processed[k] = "";
						} else if (Array.isArray(v)) {
							processed[k] = v.map(item => collapseAlphaKeys(item));
						} else if (typeof v === 'object' && v !== null) {
							processed[k] = collapseAlphaKeys(v);
						} else {
							processed[k] = v;
						}
					}
					return processed;
				}
				
				// Otherwise, recursively process and wrap
				const processed = collapseAlphaKeys(value);
				return { en: processed as string };
			}
			
			// For arrays or other types, just wrap
			return { en: value as string };
		});
		
		// Create new object without alpha keys
		const newObj: Record<string, unknown> = {};
		for (const [key, value] of Object.entries(objRecord)) {
			if (!/^[a-z]$/.test(key)) {
				newObj[key] = collapseAlphaKeys(value);
			}
		}
		
		// Add the variants as en array
		newObj.en = variants;
		return newObj;
	}
	
	// No alpha keys, just recursively process all values
	const newObj: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(objRecord)) {
		if ((key === 'tw' || key === 'mw') && (value === null || value === undefined)) {
			// Handle empty tw/mw fields
			newObj[key] = "";
		} else if (Array.isArray(value)) {
			newObj[key] = value.map(item => collapseAlphaKeys(item));
		} else if (typeof value === 'object' && value !== null) {
			newObj[key] = collapseAlphaKeys(value);
		} else {
			newObj[key] = value;
		}
	}
	return newObj;
}

// Apply collapseAlphaKeys ONLY to ex/drv/idm arrays (not to top-level SubDefinition)
function processExDrvIdmArrays(obj: unknown): unknown {
	if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
		return obj;
	}
	
	const objRecord = obj as Record<string, unknown>;
	const newObj: Record<string, unknown> = {};
	
	for (const [key, value] of Object.entries(objRecord)) {
		if ((key === 'ex' || key === 'drv' || key === 'idm') && Array.isArray(value)) {
			// Apply collapseAlphaKeys to each item in ex/drv/idm arrays
			newObj[key] = value.map(item => collapseAlphaKeys(item));
		} else if ((key === 'tw' || key === 'mw') && (value === null || value === undefined)) {
			// Preserve empty tw/mw fields as empty strings (incomplete entries)
			newObj[key] = "";
		} else if (Array.isArray(value)) {
			// Recursively process other arrays
			newObj[key] = value.map(item => processExDrvIdmArrays(item));
		} else if (typeof value === 'object' && value !== null) {
			// Recursively process objects
			newObj[key] = processExDrvIdmArrays(value);
		} else {
			newObj[key] = value;
		}
	}
	
	return newObj;
}

// Normalize fields to always be arrays if they can have multiple values
// Special handling: mw arrays are collapsed into comma-separated strings
function normalizeFieldsToArrays(obj: unknown): unknown {
	if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
		return obj;
	}
	
	const objRecord = obj as Record<string, unknown>;
	const newObj: Record<string, unknown> = {};
	
	// Fields that should always be arrays
	const arrayFields = ['alt', 'cf', 'ex', 'drv', 'idm'];
	
	for (const [key, value] of Object.entries(objRecord)) {
		if (key === 'mw' && Array.isArray(value)) {
			// Collapse mw array into comma-separated string
			newObj[key] = value.map(v => String(v)).join(', ');
		} else if (arrayFields.includes(key) && value !== undefined && value !== null && !Array.isArray(value)) {
			// Wrap single value in array
			newObj[key] = [value];
		} else if (Array.isArray(value)) {
			// Recursively process array items
			newObj[key] = value.map(item => normalizeFieldsToArrays(item));
		} else if (typeof value === 'object' && value !== null) {
			// Recursively process objects
			newObj[key] = normalizeFieldsToArrays(value);
		} else {
			newObj[key] = value;
		}
	}
	
	return newObj;
}

// Wrap simple string 'en' values in TranslationVariant array for ex/drv/idm items ONLY
// This should NOT wrap 'en' at the SubDefinition level
// NOTE: collapseAlphaKeys already creates [{en: "text"}] for a:/b:/c: patterns,
// so we only need to wrap when 'en' is a plain string
// Empty/null 'en' values are converted to empty strings (for incomplete entries to be filled in)
function wrapSimpleEnInArray(obj: unknown, inExDrvIdm: boolean = false): unknown {
	if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
		return obj;
	}
	
	const objRecord = obj as Record<string, unknown>;
	const newObj: Record<string, unknown> = {};
	
	for (const [key, value] of Object.entries(objRecord)) {
		if (key === 'ex' || key === 'drv' || key === 'idm') {
			// Entering ex/drv/idm arrays
			if (Array.isArray(value)) {
				newObj[key] = value.map(item => wrapSimpleEnInArray(item, true));
			} else {
				newObj[key] = value;
			}
		} else if (key === 'en' && inExDrvIdm) {
			// Inside ex/drv/idm: wrap simple string (including empty) OR leave array as-is
			if (typeof value === 'string') {
				newObj[key] = [{ en: value }];
			} else if (Array.isArray(value)) {
				// Already an array from collapseAlphaKeys, leave as-is
				newObj[key] = value;
			} else if (value === null || value === undefined) {
				// Empty/null - wrap as empty string for editors to fill in
				newObj[key] = [{ en: "" }];
			}
		} else if (key === 'en' && !inExDrvIdm) {
			// At SubDefinition level: keep string as-is (including empty)
			if (typeof value === 'string') {
				newObj[key] = value;
			} else if (Array.isArray(value)) {
				newObj[key] = value;
			} else if (value === null || value === undefined) {
				// Empty/null - convert to empty string for editors to fill in
				newObj[key] = "";
			}
		} else if (Array.isArray(value)) {
			// Recursively process array items
			newObj[key] = value.map(item => wrapSimpleEnInArray(item, inExDrvIdm));
		} else if (typeof value === 'object' && value !== null) {
			// Recursively process objects
			newObj[key] = wrapSimpleEnInArray(value, inExDrvIdm);
		} else {
			newObj[key] = value;
		}
	}
	
	return newObj;
}

// Ensure SubDefinition has an 'en' field (add empty string if missing)
// Also converts array 'en' values to strings at SubDefinition level
function ensureEnField(obj: unknown): unknown {
	if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
		return obj;
	}
	
	const objRecord = obj as Record<string, unknown>;
	const result = { ...objRecord };
	
	// If 'en' is an array at SubDefinition level, convert to string
	// (this handles cases like "en: [á]" in YAML)
	if ('en' in result && Array.isArray(result.en)) {
		// Join array elements with comma, or use first element if single
		const enArray = result.en as unknown[];
		if (enArray.length === 1) {
			result.en = String(enArray[0]);
		} else if (enArray.length > 1) {
			result.en = enArray.map(v => String(v)).join(', ');
		} else {
			result.en = "";
		}
	}
	
	// If this looks like a SubDefinition but has no 'en' field, add it
	if (!('en' in result)) {
		result.en = "";
	}
	
	return result;
}

// Restructure definitions to have pos + nested defs structure
function restructureNestedDefs(defItem: unknown): unknown {
	if (!defItem || typeof defItem !== 'object' || Array.isArray(defItem)) {
		return defItem;
	}
	
	const def = defItem as Record<string, unknown>;
	
	// Check if this definition has numbered keys (1, 2, 3, etc.)
	const numberedKeys: string[] = [];
	for (const key of Object.keys(def)) {
		if (/^\d+$/.test(key)) {
			numberedKeys.push(key);
		}
	}
	
	if (numberedKeys.length > 0) {
		// Has numbered definitions - restructure
		const sortedKeys = numberedKeys.sort((a, b) => parseInt(a) - parseInt(b));
		const nestedDefs: unknown[] = sortedKeys.map(key => {
			let subDef = def[key];
			
			// Handle case where numbered item is null/undefined (empty entry)
			if (subDef === null || subDef === undefined) {
				subDef = { en: "" };
			}
			// Handle case where numbered item is just a plain string (e.g., "4: to strain...")
			else if (typeof subDef === 'string') {
				subDef = { en: subDef };
			}
			
			// Normalize arrays, then wrap simple en strings for ex/drv/idm, then ensure en field exists
			let processed = normalizeFieldsToArrays(subDef);
			processed = wrapSimpleEnInArray(processed);
			processed = ensureEnField(processed);
			return processed;
		});
		
		// Extract pos and other top-level fields
		const posValue = def.pos;
		const pos = typeof posValue === 'string' ? posValue : (Array.isArray(posValue) ? posValue[0] : '');
		
		const restructured: Record<string, unknown> = {
			pos,
			defs: nestedDefs
		};
		
		// Copy any other fields (but not the numbered ones or pos)
		for (const [key, value] of Object.entries(def)) {
			if (key !== 'pos' && !/^\d+$/.test(key)) {
				restructured[key] = value;
			}
		}
		
		return restructured;
	} else {
		// No numbered definitions - wrap in nested structure
		const posValue = def.pos;
		const pos = typeof posValue === 'string' ? posValue : (Array.isArray(posValue) ? posValue[0] : '');
		
		// Create a copy of def without the pos field
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const {pos: _unused, ...subDef} = def;
		
		// Normalize arrays, then wrap simple en strings for ex/drv/idm, then ensure en field exists
		let normalizedSubDef = normalizeFieldsToArrays(subDef);
		normalizedSubDef = wrapSimpleEnInArray(normalizedSubDef);
		normalizedSubDef = ensureEnField(normalizedSubDef);
		
		return {
			pos,
			defs: [normalizedSubDef]
		};
	}
}

// Check if an entry is complete (has all en fields filled)
function isEntryComplete(data: unknown): boolean {
	if (!data || typeof data !== 'object') return true;
	
	const obj = data as Record<string, unknown>;
	
	for (const [key, value] of Object.entries(obj)) {
		if (key === 'en') {
			// At SubDefinition level, en is a string
			if (typeof value === 'string') {
				if (value === '' || value === null || value === undefined) {
					return false;
				}
			}
			// At ex/drv/idm level, en is TranslationVariant[]
			else if (Array.isArray(value)) {
				for (const item of value) {
					if (typeof item === 'object' && item !== null) {
						const itemObj = item as Record<string, unknown>;
						if (!itemObj.en || itemObj.en === '' || itemObj.en === null) {
							return false;
						}
					}
				}
			}
		}
		if (typeof value === 'object' && value !== null) {
			if (!isEntryComplete(value)) return false;
		}
		if (Array.isArray(value)) {
			for (const item of value) {
				if (!isEntryComplete(item)) return false;
			}
		}
	}
	
	return true;
}

// Normalize entry structure to always have defs array
function normalizeEntry(rawEntry: RawYAMLEntry, currentPage: number | null): { head: string; head_number?: number; page?: number; etym?: string; defs: unknown[] } {
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const { head, etym, page: _page, ...rest } = rawEntry;
	
	if (!head) {
		throw new Error('Entry missing head field');
	}
	
	// Parse headword to extract disambiguation number
	const { cleanHead, headNumber } = parseHeadword(head);
	
	let defs: unknown[];
	
	// Check if entry already has a defs array
	if (Array.isArray(rest.defs) && rest.defs.length > 0) {
		defs = rest.defs;
	}
	// Check if entry has numbered definitions (1, 2, 3, ...) at the top level
	else {
		const numberedDefs: unknown[] = [];
		let i = 1;
		while (rest[i.toString()]) {
			numberedDefs.push(rest[i.toString()]);
			i++;
		}
		
		if (numberedDefs.length > 0) {
			// If we have numbered defs AND a pos at this level, we need to merge them
			// This handles YAML like: { pos: "inf", 1: {...}, 2: {...} }
			const hasPos = 'pos' in rest;
			if (hasPos) {
				// Create a single PosDefinition-like structure with the pos and numbered items
				defs = [{
					pos: rest.pos,
					...Object.fromEntries(
						numberedDefs.map((def, idx) => [(idx + 1).toString(), def])
					)
				}];
			} else {
				// No pos at this level, treat each numbered def as separate
				defs = numberedDefs;
			}
		} else {
			// Otherwise, treat the entire entry (excluding head/etym/page) as a single definition
			defs = [rest];
		}
	}
	
	// Process each definition:
	// 1. Apply collapseAlphaKeys ONLY to ex/drv/idm items (not SubDefinition.en)
	// 2. Restructure into pos + nested defs
	defs = defs.map(def => {
		const processed = processExDrvIdmArrays(def);
		return restructureNestedDefs(processed);
	});
	
	const result: { head: string; head_number?: number; page?: number; etym?: string; defs: unknown[] } = {
		head: cleanHead,
		defs: defs
	};
	
	if (headNumber !== undefined) {
		result.head_number = headNumber;
	}
	
	if (currentPage !== null) {
		result.page = currentPage;
	}
	
	if (etym) {
		result.etym = etym as string;
	}
	
	return result;
}

// Process a single YAML file
function processYAMLFile(filePath: string, isComplete: boolean, defaultPage: number | null): ProcessedEntry[] {
	console.log(`Processing ${filePath}...`);
	
	try {
		const content = fs.readFileSync(filePath, 'utf-8');
		const data = yaml.parse(content);
		
		if (!Array.isArray(data)) {
			console.error(`  ERROR: ${filePath} does not contain an array`);
			return [];
		}
		
		const entries: ProcessedEntry[] = [];
		const fileName = path.basename(filePath);
		let currentPage = defaultPage;
		let validationErrors = 0;
		
		for (const rawEntry of data) {
			if (!rawEntry || typeof rawEntry !== 'object') continue;
			
			try {
				// Update current page if this entry has a page marker
				if ('page' in rawEntry && typeof rawEntry.page === 'number') {
					currentPage = rawEntry.page;
				}
				
				const normalized = normalizeEntry(rawEntry as RawYAMLEntry, currentPage);
				
				// Validate against schema
				const valid = validate(normalized);
				if (!valid) {
					const headValue = (normalized as { head?: string }).head || '<unknown>';
					console.error(`  SCHEMA VALIDATION ERROR for "${headValue}":`);
					
					// Print detailed errors
					if (validate.errors) {
						for (const err of validate.errors) {
							if (err.keyword === 'additionalProperties' && err.params && 'additionalProperty' in err.params) {
								console.error(`    ${err.instancePath}: has disallowed property "${err.params.additionalProperty}"`);
							} else {
								console.error(`    ${err.instancePath}: ${err.message}`);
							}
						}
					}
					
					validationErrors++;
					continue; // Skip invalid entries
				}
				
				const complete = isComplete ? 1 : (isEntryComplete(normalized) ? 1 : 0);
				
				entries.push({
					head: normalized.head,
					page: normalized.page !== undefined ? normalized.page : null,
					sort_key: generateSortKey(normalized.head),
					entry_data: JSON.stringify(normalized),
					is_complete: complete,
					source_file: fileName
				});
			} catch (error) {
				console.error(`  ERROR processing entry in ${fileName}:`, error);
			}
		}
		
		console.log(`  Processed ${entries.length} entries`);
		if (validationErrors > 0) {
			console.warn(`  ⚠️  ${validationErrors} entries failed schema validation and were skipped`);
		}
		return entries;
	} catch (error) {
		console.error(`  ERROR parsing ${filePath}:`, error);
		console.error(`  Skipping this file and continuing with others...`);
		return [];
	}
}

// Main migration function
async function migrate() {
	const dataDir = path.join(__dirname, '..', 'data');
	const outputFile = path.join(dataDir, 'entries.json');
	
	console.log('Starting YAML to JSON migration...\n');
	
	// Get all YAML files
	const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.yaml'));
	
	const allEntries: ProcessedEntry[] = [];
	
	// Process dictionary.yaml first (complete entries, multi-page)
	const dictionaryFile = path.join(dataDir, 'dictionary.yaml');
	if (fs.existsSync(dictionaryFile)) {
		const entries = processYAMLFile(dictionaryFile, true, null);
		allEntries.push(...entries);
	}
	
	// Process p_*.yaml files (incomplete entries)
	const pFiles = files.filter(f => f.startsWith('p_') && f !== 'dictionary.yaml');
	pFiles.sort(); // Maintain alphabetical order
	
	for (const file of pFiles) {
		const filePath = path.join(dataDir, file);
		
		// Extract page number from filename
		// p_XXX.yaml = single page XXX
		// p_XXX-YYY.yaml = multi-page file, page markers in YAML
		let defaultPage: number | null = null;
		const singlePageMatch = file.match(/^p_(\d+)\.yaml$/);
		if (singlePageMatch) {
			defaultPage = parseInt(singlePageMatch[1], 10);
		}
		
		const entries = processYAMLFile(filePath, false, defaultPage);
		allEntries.push(...entries);
	}
	
	console.log(`\nTotal entries processed: ${allEntries.length}`);
	
	// Write JSON output
	console.log(`\nWriting JSON to ${outputFile}...`);
	fs.writeFileSync(outputFile, JSON.stringify(allEntries, null, 2));
	
	// Write SQL files in chunks (max 50KB per file to stay well under 100KB limit)
	const sqlDir = path.join(dataDir, 'sql-chunks');
	if (!fs.existsSync(sqlDir)) {
		fs.mkdirSync(sqlDir, { recursive: true });
	}
	
	console.log(`Generating SQL statements in chunks to ${sqlDir}...`);
	
	// Clear existing chunks
	if (fs.existsSync(sqlDir)) {
		const existingChunks = fs.readdirSync(sqlDir).filter(f => f.startsWith('entries-'));
		existingChunks.forEach(f => fs.unlinkSync(path.join(sqlDir, f)));
	}
	
	const maxChunkSize = 40 * 1024; // 40KB per chunk (well under 100KB limit)
	let chunkIndex = 1;
	let currentChunk: string[] = [];
	let currentSize = 0;
	
	const initChunk = () => {
		const header = `-- Dictionary entries import (chunk ${chunkIndex})
-- Generated: ${new Date().toISOString()}

`;
		currentChunk = [header];
		currentSize = header.length;
	};
	
	initChunk();
	
	// Generate INSERT statements one at a time
	for (const entry of allEntries) {
		const escapedData = entry.entry_data.replace(/'/g, "''");
		const parsedData = JSON.parse(entry.entry_data) as { head_number?: number };
		const headNumber = parsedData.head_number ? parsedData.head_number.toString() : 'NULL';
		const pageNumber = entry.page !== null ? entry.page.toString() : 'NULL';
		const statement = `INSERT INTO entries (head, head_number, page, sort_key, entry_data, is_complete, source_file) VALUES ('${entry.head.replace(/'/g, "''")}', ${headNumber}, ${pageNumber}, '${entry.sort_key}', '${escapedData}', ${entry.is_complete}, '${entry.source_file}');\n`;
		
		// Check if adding this statement would exceed chunk size
		if (currentSize + statement.length > maxChunkSize && currentChunk.length > 1) {
			// Write current chunk
			const chunkFile = path.join(sqlDir, `entries-${chunkIndex.toString().padStart(3, '0')}.sql`);
			fs.writeFileSync(chunkFile, currentChunk.join(''));
			
			// Start new chunk
			chunkIndex++;
			initChunk();
		}
		
		currentChunk.push(statement);
		currentSize += statement.length;
	}
	
	// Write final chunk
	if (currentChunk.length > 1) {
		const chunkFile = path.join(sqlDir, `entries-${chunkIndex.toString().padStart(3, '0')}.sql`);
		fs.writeFileSync(chunkFile, currentChunk.join(''));
	}
	
	console.log(`\nGenerated ${chunkIndex} SQL chunk files`);
	
	console.log('\nMigration complete!');
	console.log(`- JSON output: ${outputFile}`);
	console.log(`- SQL chunks: ${sqlDir}/entries-*.sql`);
	console.log(`\nTo import into D1, run:`);
	console.log(`npm run import-data`);
}

// Run migration
migrate().catch(error => {
	console.error('Migration failed:', error);
	process.exit(1);
});

