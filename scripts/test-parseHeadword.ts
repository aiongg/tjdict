#!/usr/bin/env tsx

// Test script to verify parseHeadword logic

const superscriptMap: { [key: string]: string } = {
	'⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4',
	'⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9'
};

function parseHeadword(head: string): { cleanHead: string; headNumber?: number } {
	const superscriptPattern = /[⁰¹²³⁴⁵⁶⁷⁸⁹]+$/;
	const match = head.match(superscriptPattern);
	
	if (match) {
		const superscriptNum = match[0];
		const regularNum = superscriptNum.split('').map(c => superscriptMap[c] || c).join('');
		const number = parseInt(regularNum, 10);
		const cleanHead = head.replace(superscriptPattern, '');
		return { cleanHead, headNumber: number };
	}
	
	const numberPattern = /\s*\((\d+)\)\s*$/;
	const numberMatch = head.match(numberPattern);
	
	if (numberMatch) {
		const number = parseInt(numberMatch[1], 10);
		const cleanHead = head.replace(numberPattern, '');
		return { cleanHead, headNumber: number };
	}
	
	return { cleanHead: head };
}

// Test cases
const testCases = [
	{ input: '·a¹', expected: { cleanHead: '·a', headNumber: 1 } },
	{ input: 'a²', expected: { cleanHead: 'a', headNumber: 2 } },
	{ input: 'chiah', expected: { cleanHead: 'chiah' } },
	{ input: 'chiah (1)', expected: { cleanHead: 'chiah', headNumber: 1 } },
	{ input: 'test¹⁰', expected: { cleanHead: 'test', headNumber: 10 } },
	{ input: 'plain-word', expected: { cleanHead: 'plain-word' } },
];

console.log('Testing parseHeadword function:\n');

let passed = 0;
let failed = 0;

for (const test of testCases) {
	const result = parseHeadword(test.input);
	const matches = JSON.stringify(result) === JSON.stringify(test.expected);
	
	if (matches) {
		console.log(`✅ PASS: "${test.input}" → ${JSON.stringify(result)}`);
		passed++;
	} else {
		console.log(`❌ FAIL: "${test.input}"`);
		console.log(`   Expected: ${JSON.stringify(test.expected)}`);
		console.log(`   Got:      ${JSON.stringify(result)}`);
		failed++;
	}
}

console.log(`\nResults: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);

