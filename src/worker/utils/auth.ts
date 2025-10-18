import { JWTPayload } from '../types';

// Generate random salt
export function generateSalt(): string {
	const array = new Uint8Array(16);
	crypto.getRandomValues(array);
	return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// Hash password using Web Crypto API
export async function hashPassword(password: string, salt: string): Promise<string> {
	const encoder = new TextEncoder();
	const data = encoder.encode(password + salt);
	const hashBuffer = await crypto.subtle.digest('SHA-256', data);
	const hashArray = Array.from(new Uint8Array(hashBuffer));
	return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Verify password against hash
export async function verifyPassword(
	password: string,
	hash: string,
	salt: string
): Promise<boolean> {
	const computedHash = await hashPassword(password, salt);
	return computedHash === hash;
}

// JWT secret - in production, this should be from environment variable
const JWT_SECRET = 'your-secret-key-change-in-production';

// Generate JWT token
export async function generateJWT(payload: Omit<JWTPayload, 'iat' | 'exp'>): Promise<string> {
	const header = {
		alg: 'HS256',
		typ: 'JWT'
	};

	const now = Math.floor(Date.now() / 1000);
	const fullPayload: JWTPayload = {
		...payload,
		iat: now,
		exp: now + 60 * 60 * 24 * 7 // 7 days
	};

	const encodedHeader = base64UrlEncode(JSON.stringify(header));
	const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));
	const signatureInput = `${encodedHeader}.${encodedPayload}`;

	const signature = await sign(signatureInput, JWT_SECRET);
	return `${signatureInput}.${signature}`;
}

// Verify JWT token
export async function verifyJWT(token: string): Promise<JWTPayload | null> {
	try {
		const parts = token.split('.');
		if (parts.length !== 3) {
			return null;
		}

		const [encodedHeader, encodedPayload, signature] = parts;
		const signatureInput = `${encodedHeader}.${encodedPayload}`;

		// Verify signature
		const expectedSignature = await sign(signatureInput, JWT_SECRET);
		if (signature !== expectedSignature) {
			return null;
		}

		// Decode payload
		const payload: JWTPayload = JSON.parse(base64UrlDecode(encodedPayload));

		// Check expiration
		const now = Math.floor(Date.now() / 1000);
		if (payload.exp < now) {
			return null;
		}

		return payload;
	} catch (error) {
		console.error('JWT verification error:', error);
		return null;
	}
}

// Helper: Sign data with HMAC-SHA256
async function sign(data: string, secret: string): Promise<string> {
	const encoder = new TextEncoder();
	const key = await crypto.subtle.importKey(
		'raw',
		encoder.encode(secret),
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign']
	);
	const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
	const signatureArray = Array.from(new Uint8Array(signature));
	return base64UrlEncode(String.fromCharCode(...signatureArray));
}

// Helper: Base64 URL encode
function base64UrlEncode(str: string): string {
	const base64 = btoa(str);
	return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

// Helper: Base64 URL decode
function base64UrlDecode(str: string): string {
	let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
	while (base64.length % 4) {
		base64 += '=';
	}
	return atob(base64);
}

// Generate temporary token for TOTP verification flow
export async function generateTempToken(userId: number): Promise<string> {
	const payload = {
		userId,
		email: '',
		role: 'temp',
		temp: true
	};
	return generateJWT(payload);
}

