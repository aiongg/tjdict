#!/usr/bin/env tsx

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface ProcessedEntry {
	head: string;
	page: number | null;
	sort_key: string;
	entry_data: string;
	is_complete: number;
	source_file: string;
}

// Generate SQL UPDATE statements from entries.json
async function generateSqlUpdates() {
	const dataDir = path.join(__dirname, '..', 'data');
	const buildDir = path.join(dataDir, 'build');
	const inputFile = path.join(buildDir, 'entries.json');
	const outputFile = path.join(buildDir, 'update-sort-keys.sql');
	
	console.log('Reading entries.json...');
	
	if (!fs.existsSync(inputFile)) {
		console.error(`ERROR: ${inputFile} does not exist`);
		console.error('Please run migrate-yaml-to-json.ts first to generate entries.json');
		process.exit(1);
	}
	
	const content = fs.readFileSync(inputFile, 'utf-8');
	const entries: ProcessedEntry[] = JSON.parse(content);
	
	console.log(`Found ${entries.length} entries`);
	console.log(`Generating SQL UPDATE statements to ${outputFile}...`);
	
	const sqlStatements: string[] = [
		`-- Update sort keys for all dictionary entries`,
		`-- Generated: ${new Date().toISOString()}`,
		`-- Total entries: ${entries.length}`,
		``,
		`-- This file updates the sort_key column to use syllable-aware, tone-aware sorting`,
		``,
	];
	
	for (const entry of entries) {
		// Parse the entry_data to get head_number
		const entryData = JSON.parse(entry.entry_data) as { head_number?: number };
		const headNumber = entryData.head_number;
		
		// Escape single quotes in head and sort_key for SQL
		const escapedHead = entry.head.replace(/'/g, "''");
		const escapedSortKey = entry.sort_key.replace(/'/g, "''");
		
		// Generate UPDATE statement
		// Match by head and head_number (or NULL if no head_number)
		if (headNumber !== undefined && headNumber !== null) {
			sqlStatements.push(
				`UPDATE entries SET sort_key = '${escapedSortKey}' WHERE head = '${escapedHead}' AND head_number = ${headNumber};`
			);
		} else {
			sqlStatements.push(
				`UPDATE entries SET sort_key = '${escapedSortKey}' WHERE head = '${escapedHead}' AND head_number IS NULL;`
			);
		}
	}
	
	// Write SQL file
	fs.writeFileSync(outputFile, sqlStatements.join('\n'));
	
	console.log(`\nSuccessfully generated ${outputFile}`);
	console.log(`Total UPDATE statements: ${entries.length}`);
	console.log(`\nTo apply these changes to your database, run:`);
	console.log(`  wrangler d1 execute prod_tjdict --file=data/build/update-sort-keys.sql`);
	console.log(`\nOr on your production server, execute the SQL file directly.`);
}

// Run the script
generateSqlUpdates().catch(error => {
	console.error('Failed to generate SQL updates:', error);
	process.exit(1);
});

