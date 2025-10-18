#!/usr/bin/env tsx

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';

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

// Normalize headword for alphabetical sorting
function generateSortKey(head: string): string {
	return head
		.toLowerCase()
		// Remove diacritics (tone markers)
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		// Remove superscript numbers
		.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]/g, '')
		// Remove special characters but keep letters
		.replace(/[^a-z0-9]/g, '');
}

// Check if an entry is complete (has all en fields filled)
function isEntryComplete(data: unknown): boolean {
	if (!data || typeof data !== 'object') return true;
	
	const obj = data as Record<string, unknown>;
	
	for (const [key, value] of Object.entries(obj)) {
		if (key === 'en' && (value === '' || value === null || value === undefined)) {
			return false;
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
function normalizeEntry(rawEntry: RawYAMLEntry): { head: string; etym?: string; defs: unknown[] } {
	const { head, etym, ...rest } = rawEntry;
	
	if (!head) {
		throw new Error('Entry missing head field');
	}
	
	// Check if entry already has a defs array
	if (Array.isArray(rest.defs) && rest.defs.length > 0) {
		return {
			head,
			etym: etym as string | undefined,
			defs: rest.defs
		};
	}
	
	// Check if entry has numbered definitions (1, 2, 3, ...)
	const numberedDefs: unknown[] = [];
	let i = 1;
	while (rest[i.toString()]) {
		numberedDefs.push(rest[i.toString()]);
		i++;
	}
	
	if (numberedDefs.length > 0) {
		return {
			head,
			etym: etym as string | undefined,
			defs: numberedDefs
		};
	}
	
	// Otherwise, treat the entire entry (excluding head/etym) as a single definition
	return {
		head,
		etym: etym as string | undefined,
		defs: [rest]
	};
}

// Process a single YAML file
function processYAMLFile(filePath: string, isComplete: boolean): ProcessedEntry[] {
	console.log(`Processing ${filePath}...`);
	
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
}

// Main migration function
async function migrate() {
	const dataDir = path.join(__dirname, '..', 'data');
	const outputFile = path.join(dataDir, 'entries.json');
	const sqlOutputFile = path.join(dataDir, 'entries.sql');
	
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
	
	// Generate SQL INSERT statements
	console.log(`Generating SQL statements to ${sqlOutputFile}...`);
	
	const sqlStatements: string[] = [];
	const batchSize = 500;
	
	for (let i = 0; i < allEntries.length; i += batchSize) {
		const batch = allEntries.slice(i, i + batchSize);
		const values = batch.map(entry => {
			const escapedData = entry.entry_data.replace(/'/g, "''");
			return `('${entry.head.replace(/'/g, "''")}', '${entry.sort_key}', '${escapedData}', ${entry.is_complete}, '${entry.source_file}')`;
		});
		
		sqlStatements.push(
			`INSERT INTO entries (head, sort_key, entry_data, is_complete, source_file) VALUES\n${values.join(',\n')};\n`
		);
	}
	
	fs.writeFileSync(sqlOutputFile, sqlStatements.join('\n'));
	
	console.log('\nMigration complete!');
	console.log(`- JSON output: ${outputFile}`);
	console.log(`- SQL output: ${sqlOutputFile}`);
	console.log(`\nTo import into D1, run:`);
	console.log(`wrangler d1 execute prod_tjdict --file=data/entries.sql`);
}

// Run migration
migrate().catch(error => {
	console.error('Migration failed:', error);
	process.exit(1);
});

