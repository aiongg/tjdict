export interface User {
	id: number;
	email: string;
	password_hash: string;
	password_salt: string;
	role: 'user' | 'editor' | 'admin';
	totp_secret: string | null;
	totp_enabled: number;
	totp_backup_codes: string | null;
	is_active: number;
	last_login: string | null;
	created_at: string;
	updated_at: string;
}

export interface JWTPayload {
	userId: number;
	email: string;
	role: string;
	iat: number;
	exp: number;
}

export interface CreateAdminRequest {
	email: string;
	password: string;
}

export interface LoginRequest {
	email: string;
	password: string;
}

export interface VerifyTOTPRequest {
	token: string;
	tempUserId?: number;
}

export interface Setup2FARequest {
	totpToken: string;
}

export interface SetupStatusResponse {
	needsSetup: boolean;
}

export interface LoginResponse {
	requiresTOTP: boolean;
	tempToken?: string;
}

export interface UserResponse {
	id: number;
	email: string;
	role: string;
	totpEnabled: boolean;
}

export interface Setup2FAResponse {
	secret: string;
	qrCodeUrl: string;
	backupCodes: string[];
}

