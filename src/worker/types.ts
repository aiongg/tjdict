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
	requires_password_change: number;
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
	requiresPasswordChange?: boolean;
	requiresTOTPSetup?: boolean;
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

// User management types
export interface CreateUserRequest {
	email: string;
	temporaryPassword: string;
	role: 'user' | 'editor' | 'admin';
}

export interface UpdateUserRequest {
	role?: 'user' | 'editor' | 'admin';
	isActive?: boolean;
}

export interface ChangePasswordRequest {
	currentPassword: string;
	newPassword: string;
	totpToken?: string;
}

export interface ResetPasswordResponse {
	temporaryPassword: string;
}

export interface UserListResponse {
	id: number;
	email: string;
	role: string;
	isActive: boolean;
	totpEnabled: boolean;
	requiresPasswordChange: boolean;
	lastLogin: string | null;
	createdAt: string;
}

// Dictionary types

// Entry data structure (stored as JSON in entry_data column)
// Note: All entries have a defs array with at least one DefinitionItem
// Even entries with a single definition are normalized to defs[0]
export interface EntryData {
	head: string;
	etym?: string;
	defs: DefinitionItem[];
}

export interface DefinitionItem {
	pos?: string | string[];
	cat?: string;
	en?: string;
	mw?: string;
	alt?: string[];
	cf?: string[];
	det?: string;
	ex?: ExampleItem[];
	drv?: DerivativeItem[];
	idm?: IdiomItem[];
	[key: string]: unknown;
}

export interface ExampleItem {
	tw: string;
	en?: string;
	[key: string]: unknown;
}

export interface DerivativeItem {
	tw: string;
	en?: string;
	mw?: string;
	ex?: ExampleItem[];
	[key: string]: unknown;
}

export interface IdiomItem {
	tw: string;
	en?: string;
	[key: string]: unknown;
}

// Database entry
export interface Entry {
	id: number;
	head: string;
	sort_key: string;
	entry_data: string;
	is_complete: number;
	source_file: string | null;
	created_at: string;
	updated_at: string;
	created_by: number | null;
	updated_by: number | null;
}

export interface EntryReview {
	id: number;
	entry_id: number;
	user_id: number;
	status: 'pending' | 'approved' | 'needs_work';
	comment: string | null;
	reviewed_at: string;
}

// API types
export interface EntryListResponse {
	entries: EntryWithReviews[];
	total: number;
	page: number;
	pageSize: number;
}

export interface EntryWithReviews extends Entry {
	reviews: EntryReviewWithUser[];
	my_review?: EntryReview;
}

export interface EntryReviewWithUser extends EntryReview {
	user_email: string;
}

export interface EntrySearchParams {
	q?: string;
	head?: string;
	pos?: string;
	complete?: boolean;
	needsReview?: boolean;
	page?: number;
	pageSize?: number;
	sortBy?: 'head' | 'updated_at';
	sortOrder?: 'asc' | 'desc';
}

export interface UpdateEntryRequest {
	entry_data: EntryData;
	is_complete?: boolean;
}

export interface CreateReviewRequest {
	status: 'approved' | 'needs_work';
	comment?: string;
}

