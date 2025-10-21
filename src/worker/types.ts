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
	nickname: string | null;
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
	nickname: string | null;
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
	nickname: string | null;
	isActive: boolean;
	totpEnabled: boolean;
	requiresPasswordChange: boolean;
	lastLogin: string | null;
	createdAt: string;
}

// Dictionary types

// Translation variant (for multiple translations a/b/c)
export interface TranslationVariant {
	en: string;
	mw?: string[];  // Measure word(s) - array of strings
	cat?: string;
	etym?: string;
	dup?: boolean;  // Reduplication flag
	alt?: string[];
	ex?: ExampleItem[];
	[key: string]: unknown;
}

// Entry data structure (stored as JSON in entry_data column)
export interface EntryData {
	head: string;
	head_number?: number;  // Disambiguation number for homonyms (e.g., 1, 2, 3)
	page?: number;  // Page number in original dictionary
	etym?: string;
	defs: PosDefinition[];  // Array of definitions grouped by part of speech
}

// Top-level definition grouped by part of speech
export interface PosDefinition {
	pos?: string[];  // Part of speech (array of strings: ["n"], ["v", "adj"], etc.) - optional for incomplete entries
	mw?: string[];  // Measure word(s) - array of strings (can be at POS level)
	etym?: string;  // Etymology (can be at POS level)
	defs: SubDefinition[];  // Array of definition variants for this POS
}

// Individual definition variant within a POS
export interface SubDefinition {
	en?: string;  // English translation (simple string at definition level)
	mw?: string[];  // Measure word(s) - array of strings
	cat?: string;  // Category
	etym?: string;  // Etymology (can be at both entry and definition level)
	bound?: boolean;  // Bound morpheme flag
	dup?: boolean;  // Reduplication flag
	takes_a2?: boolean;  // Takes á tone flag
	alt?: string[];  // Alternatives
	cf?: string[];  // Cross-references
	det?: string;  // Details
	ex?: ExampleItem[];  // Examples
	drv?: DerivativeItem[];  // Derivatives
	idm?: IdiomItem[];  // Idioms
	[key: string]: unknown;
}

// Generic item for examples, derivatives, and idioms (all have the same structure)
// These can be nested recursively (e.g., drv can have ex, ex can have drv, etc.)
export interface ExampleItem {
	tw: string;
	en?: TranslationVariant[];  // Always array for a/b/c variants
	mw?: string[];  // Measure word(s) - array of strings
	cat?: string;
	etym?: string;
	det?: string;  // Details/notes
	alt?: string[];
	cf?: string[];
	ex?: ExampleItem[];  // Nested examples
	[key: string]: unknown;
}

// Type aliases for clarity
export type DerivativeItem = ExampleItem;
export type IdiomItem = ExampleItem;

// Database entry
export interface Entry {
	id: number;
	head: string;
	head_number: number | null;
	page: number | null;
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
	status: 'approved' | 'needs_work';
	reviewed_at: string;
}

export interface EntryComment {
	id: number;
	entry_id: number;
	user_id: number;
	comment: string;
	created_at: string;
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
	all_reviews: EntryReviewWithUser[];
	comments: EntryCommentWithUser[];
	my_review?: EntryReview;
}

export interface EntryReviewWithUser extends EntryReview {
	user_email: string;
	user_nickname: string | null;
}

export interface EntryCommentWithUser extends EntryComment {
	user_email: string;
	user_nickname: string | null;
}

export interface EntrySearchParams {
	q?: string;  // Search query - supports key:value syntax (head:, en:, tw:, etym:)
	complete?: boolean;
	needsReview?: boolean;
	page?: number;
	pageSize?: number;
	sortBy?: 'head' | 'updated_at' | 'sort_key';
	sortOrder?: 'asc' | 'desc';
}

export interface UpdateEntryRequest {
	entry_data: EntryData;
	is_complete?: boolean;
}

export interface CreateReviewRequest {
	status: 'approved' | 'needs_work';
}

export interface CreateCommentRequest {
	comment: string;
}

