#!/usr/bin/env tsx

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function importData() {
	const dataDir = path.join(__dirname, '..', 'data');
	const sqlDir = path.join(dataDir, 'sql-chunks');
	
	if (!fs.existsSync(sqlDir)) {
		console.error(`ERROR: SQL chunks directory not found: ${sqlDir}`);
		console.error('Please run "npm run migrate" first to generate SQL chunks.');
		process.exit(1);
	}
	
	// Get all SQL chunk files
	const chunkFiles = fs.readdirSync(sqlDir)
		.filter(f => f.startsWith('entries-') && f.endsWith('.sql'))
		.sort();
	
	if (chunkFiles.length === 0) {
		console.error('ERROR: No SQL chunk files found.');
		console.error('Please run "npm run migrate" first to generate SQL chunks.');
		process.exit(1);
	}
	
	console.log(`Found ${chunkFiles.length} SQL chunk files to import\n`);
	
	let successCount = 0;
	let failCount = 0;
	
	// Check if --remote flag is passed
	const isRemote = process.argv.includes('--remote');
	const remoteFlag = isRemote ? ' --remote' : '';
	const yesFlag = isRemote ? ' --yes' : ''; // Auto-confirm for remote to avoid prompts
	
	console.log(`Target: ${isRemote ? 'REMOTE (production)' : 'LOCAL'}\n`);
	
	for (let i = 0; i < chunkFiles.length; i++) {
		const chunkFile = chunkFiles[i];
		const chunkPath = path.join(sqlDir, chunkFile);
		
		console.log(`[${i + 1}/${chunkFiles.length}] Importing ${chunkFile}...`);
		
		try {
			execSync(`wrangler d1 execute prod_tjdict --file="${chunkPath}"${remoteFlag}${yesFlag}`, {
				stdio: 'inherit',
				cwd: path.join(__dirname, '..')
			});
			successCount++;
		} catch {
			console.error(`  ERROR: Failed to import ${chunkFile}`);
			failCount++;
			// Continue with next chunk instead of failing completely
		}
	}
	
	console.log('\n' + '='.repeat(60));
	console.log(`Import complete!`);
	console.log(`  Success: ${successCount}/${chunkFiles.length}`);
	if (failCount > 0) {
		console.log(`  Failed: ${failCount}/${chunkFiles.length}`);
	}
	console.log('='.repeat(60));
	
	if (failCount > 0) {
		process.exit(1);
	}
}

// Run import
importData().catch(error => {
	console.error('Import failed:', error);
	process.exit(1);
});

