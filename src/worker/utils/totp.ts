// Base32 encoding/decoding for TOTP
const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Encode(buffer: Uint8Array): string {
	let bits = 0;
	let value = 0;
	let output = '';

	for (let i = 0; i < buffer.length; i++) {
		value = (value << 8) | buffer[i];
		bits += 8;

		while (bits >= 5) {
			output += BASE32_CHARS[(value >>> (bits - 5)) & 31];
			bits -= 5;
		}
	}

	if (bits > 0) {
		output += BASE32_CHARS[(value << (5 - bits)) & 31];
	}

	return output;
}

function base32Decode(input: string): Uint8Array {
	const cleanInput = input.toUpperCase().replace(/=+$/, '');
	let bits = 0;
	let value = 0;
	let index = 0;
	const output = new Uint8Array(Math.floor((cleanInput.length * 5) / 8));

	for (let i = 0; i < cleanInput.length; i++) {
		const charIndex = BASE32_CHARS.indexOf(cleanInput[i]);
		if (charIndex === -1) {
			throw new Error('Invalid base32 character');
		}

		value = (value << 5) | charIndex;
		bits += 5;

		if (bits >= 8) {
			output[index++] = (value >>> (bits - 8)) & 255;
			bits -= 8;
		}
	}

	return output;
}

// Generate TOTP secret
export function generateTOTPSecret(): string {
	const buffer = new Uint8Array(20);
	crypto.getRandomValues(buffer);
	return base32Encode(buffer);
}

// Generate TOTP token for current time
export async function generateTOTPToken(secret: string, timeStep?: number): Promise<string> {
	const time = timeStep || Math.floor(Date.now() / 1000 / 30);
	const secretBytes = base32Decode(secret);

	// Convert time to 8-byte buffer
	const timeBuffer = new ArrayBuffer(8);
	const timeView = new DataView(timeBuffer);
	timeView.setUint32(4, time, false);

	// Import key
	const key = await crypto.subtle.importKey(
		'raw',
		secretBytes,
		{ name: 'HMAC', hash: 'SHA-1' },
		false,
		['sign']
	);

	// Generate HMAC
	const signature = await crypto.subtle.sign('HMAC', key, timeBuffer);
	const signatureArray = new Uint8Array(signature);

	// Dynamic truncation
	const offset = signatureArray[signatureArray.length - 1] & 0xf;
	const binary =
		((signatureArray[offset] & 0x7f) << 24) |
		((signatureArray[offset + 1] & 0xff) << 16) |
		((signatureArray[offset + 2] & 0xff) << 8) |
		(signatureArray[offset + 3] & 0xff);

	const otp = binary % 1000000;
	return otp.toString().padStart(6, '0');
}

// Verify TOTP token
export async function verifyTOTPToken(secret: string, token: string): Promise<boolean> {
	// Check current time window and adjacent windows for clock skew
	const currentTime = Math.floor(Date.now() / 1000 / 30);

	for (let i = -1; i <= 1; i++) {
		const expectedToken = await generateTOTPToken(secret, currentTime + i);
		if (expectedToken === token) {
			return true;
		}
	}

	return false;
}

// Generate backup codes
export function generateBackupCodes(count: number = 10): string[] {
	const codes: string[] = [];
	for (let i = 0; i < count; i++) {
		const buffer = new Uint8Array(4);
		crypto.getRandomValues(buffer);
		const code = Array.from(buffer)
			.map(byte => byte.toString(16).padStart(2, '0'))
			.join('')
			.substring(0, 8);
		codes.push(code);
	}
	return codes;
}

// Generate QR code URL for TOTP
export function generateQRCodeUrl(email: string, secret: string, issuer: string = 'TJDict'): string {
	const label = encodeURIComponent(`${issuer}:${email}`);
	const params = new URLSearchParams({
		secret,
		issuer,
		algorithm: 'SHA1',
		digits: '6',
		period: '30'
	});
	return `otpauth://totp/${label}?${params.toString()}`;
}

// Verify backup code
export function verifyBackupCode(backupCodes: string[], code: string): { valid: boolean; remainingCodes: string[] } {
	const codeIndex = backupCodes.indexOf(code);
	if (codeIndex === -1) {
		return { valid: false, remainingCodes: backupCodes };
	}

	// Remove used backup code
	const remainingCodes = backupCodes.filter((_, index) => index !== codeIndex);
	return { valid: true, remainingCodes };
}

