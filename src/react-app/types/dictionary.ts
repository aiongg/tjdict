// Shared dictionary types used across the application
// Re-export editor types for convenience
export type {
	TranslationVariant,
	PosDefinition,
	SubDefinition,
	ExampleItem,
	EntryData,
	EditorCallbacks,
} from '../components/editor/types';

// Database entry types
export interface Entry {
	id: number;
	head: string;
	sort_key: string;
	entry_data: string;
	source_file: string | null;
	created_at: string;
	updated_at: string;
	created_by: number | null;
	updated_by: number | null;
}

export interface EntryStatus {
	id: number;
	entry_id: number;
	user_id: number;
	status: 'draft' | 'submitted' | 'needs_work' | 'approved';
	reviewed_at: string;
	user_email: string;
	user_nickname: string | null;
}

export interface EntryComment {
	id: number;
	entry_id: number;
	user_id: number;
	comment: string;
	created_at: string;
	user_email: string;
	user_nickname: string | null;
}

export interface EntryWithReviews extends Entry {
	current_status: 'draft' | 'submitted' | 'needs_work' | 'approved';
	statuses: EntryStatus[];
	all_statuses: EntryStatus[];
	comments: EntryComment[];
	my_status?: EntryStatus;
}

