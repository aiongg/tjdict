#!/usr/bin/env tsx

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import * as yaml from 'yaml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface RawYAMLEntry {
	head?: string;
	[key: string]: unknown;
}

interface ProcessedEntry {
	head: string;
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
	// Pattern to match superscript numbers at the end
	const superscriptPattern = /[⁰¹²³⁴⁵⁶⁷⁸⁹]+$/;
	const match = head.match(superscriptPattern);
	
	if (match) {
		const superscriptNum = match[0];
		// Convert superscript to regular number
		const regularNum = superscriptNum.split('').map(c => superscriptMap[c] || c).join('');
		const number = parseInt(regularNum, 10);
		const cleanHead = head.replace(superscriptPattern, '');
		return { cleanHead, headNumber: number };
	}
	
	// Pattern to match regular numbers (e.g., "chiah (1)")
	const numberPattern = /\s*\((\d+)\)\s*$/;
	const numberMatch = head.match(numberPattern);
	
	if (numberMatch) {
		const number = parseInt(numberMatch[1], 10);
		const cleanHead = head.replace(numberPattern, '');
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
		// We have alpha keys, collapse them into an array
		const variants = alphaKeys.map(key => {
			const value = objRecord[key];
			// Recursively process the variant
			return collapseAlphaKeys(value);
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
		if (Array.isArray(value)) {
			newObj[key] = value.map(item => collapseAlphaKeys(item));
		} else if (typeof value === 'object' && value !== null) {
			newObj[key] = collapseAlphaKeys(value);
		} else {
			newObj[key] = value;
		}
	}
	return newObj;
}

// Check if an entry is complete (has all en fields filled)
function isEntryComplete(data: unknown): boolean {
	if (!data || typeof data !== 'object') return true;
	
	const obj = data as Record<string, unknown>;
	
	for (const [key, value] of Object.entries(obj)) {
		if (key === 'en') {
			// Handle both string and array formats
			if (Array.isArray(value)) {
				// If it's an array, check each item
				for (const item of value) {
					if (typeof item === 'object' && item !== null) {
						const itemObj = item as Record<string, unknown>;
						if (!itemObj.en || itemObj.en === '' || itemObj.en === null) {
							return false;
						}
					} else if (!item || item === '') {
						return false;
					}
				}
			} else if (value === '' || value === null || value === undefined) {
				return false;
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
function normalizeEntry(rawEntry: RawYAMLEntry): { head: string; head_number?: number; etym?: string; defs: unknown[] } {
	const { head, etym, ...rest } = rawEntry;
	
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
	// Check if entry has numbered definitions (1, 2, 3, ...)
	else {
		const numberedDefs: unknown[] = [];
		let i = 1;
		while (rest[i.toString()]) {
			numberedDefs.push(rest[i.toString()]);
			i++;
		}
		
		if (numberedDefs.length > 0) {
			defs = numberedDefs;
		} else {
			// Otherwise, treat the entire entry (excluding head/etym) as a single definition
			defs = [rest];
		}
	}
	
	// Process each definition to collapse a/b/c keys
	defs = defs.map(def => collapseAlphaKeys(def));
	
	return {
		head: cleanHead,
		head_number: headNumber,
		etym: etym as string | undefined,
		defs: defs
	};
}

// Process a single YAML file
function processYAMLFile(filePath: string, isComplete: boolean): ProcessedEntry[] {
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
		
		for (const rawEntry of data) {
			if (!rawEntry || typeof rawEntry !== 'object') continue;
			
			try {
				const normalized = normalizeEntry(rawEntry as RawYAMLEntry);
				const complete = isComplete ? 1 : (isEntryComplete(normalized) ? 1 : 0);
				
				entries.push({
					head: normalized.head,
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
	
	// Process dictionary.yaml first (complete entries)
	const dictionaryFile = path.join(dataDir, 'dictionary.yaml');
	if (fs.existsSync(dictionaryFile)) {
		const entries = processYAMLFile(dictionaryFile, true);
		allEntries.push(...entries);
	}
	
	// Process p_*.yaml files (incomplete entries)
	const pFiles = files.filter(f => f.startsWith('p_') && f !== 'dictionary.yaml');
	pFiles.sort(); // Maintain alphabetical order
	
	for (const file of pFiles) {
		const filePath = path.join(dataDir, file);
		const entries = processYAMLFile(filePath, false);
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
		const statement = `INSERT INTO entries (head, head_number, sort_key, entry_data, is_complete, source_file) VALUES ('${entry.head.replace(/'/g, "''")}', ${headNumber}, '${entry.sort_key}', '${escapedData}', ${entry.is_complete}, '${entry.source_file}');\n`;
		
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

