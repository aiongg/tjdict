import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { Navigation } from '../components/Navigation';
import { ReviewPanel } from '../components/ReviewPanel.tsx';
import { PosDefinitionEditor } from '../components/editor/PosDefinitionEditor';
import { FieldVisibilityMenu } from '../components/editor/FieldVisibilityMenu';
import { PageImageViewer } from '../components/PageImageViewer';
import type { EntryData } from '../components/editor/types';

// Import types from shared editor types
import type { PosDefinition, SubDefinition } from '../components/editor/types';

interface Entry {
	id: number;
	head: string;
	entry_data: string;
	is_complete: number;
	updated_at: string;
}

export default function EntryEditorPage() {
	const { id } = useParams<{ id: string }>();
	const navigate = useNavigate();
	const { user } = useAuth();
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState('');
	const [, setEntry] = useState<Entry | null>(null);
	const [entryData, setEntryData] = useState<EntryData>({
		head: '',
		defs: [{
			pos: ['n'],
			defs: [{ en: '' }]
		}]
	});
	const [isComplete, setIsComplete] = useState(false);
	const [activeTab, setActiveTab] = useState<'edit' | 'reviews'>('edit');
	
	// Image viewer state
	const [imageViewerOpen, setImageViewerOpen] = useState(false);
	const [imageViewerPage, setImageViewerPage] = useState<number | null>(null);
	const isDesktop = useMediaQuery('(min-width: 1280px)');
	
	// Field visibility tracking using JSON path notation
	const [visibleFields, setVisibleFields] = useState<Map<string, Set<string>>>(new Map());

	const isNewEntry = id === 'new';
	const canEdit = user?.role === 'editor' || user?.role === 'admin';

	useEffect(() => {
		if (isNewEntry) {
			setLoading(false);
			return;
		}

		const fetchEntry = async () => {
			try {
				const response = await fetch(`/api/entries/${id}`);
				if (!response.ok) {
					throw new Error('Failed to fetch entry');
				}
				const data = await response.json();
				setEntry(data);
				setEntryData(JSON.parse(data.entry_data));
				setIsComplete(data.is_complete === 1);
			} catch (err) {
				setError(err instanceof Error ? err.message : 'Failed to load entry');
			} finally {
				setLoading(false);
			}
		};

		fetchEntry();
	}, [id, isNewEntry]);

	const handlePageClick = (pageNum: number | undefined) => {
		if (pageNum) {
			setImageViewerPage(pageNum);
			setImageViewerOpen(true);
		}
	};

	const handleCloseImageViewer = () => {
		setImageViewerOpen(false);
	};

	const handleSave = async () => {
		if (!canEdit) {
			setError('You do not have permission to edit entries');
			return;
		}

		setSaving(true);
		setError('');

		try {
			const url = isNewEntry ? '/api/entries' : `/api/entries/${id}`;
			const method = isNewEntry ? 'POST' : 'PUT';

			const response = await fetch(url, {
				method,
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					head: entryData.head,
					head_number: entryData.head_number || null,
					entry_data: entryData,
					is_complete: isComplete,
				}),
			});

			if (!response.ok) {
				throw new Error('Failed to save entry');
			}

			const saved = await response.json();

			if (isNewEntry) {
				// For new entries, navigate to the edit page for that entry
				navigate(`/entries/${saved.id}`);
			} else {
				// For existing entries, go back to the list
				setEntry(saved);
				navigate(-1); // Use browser back to preserve state
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to save entry');
		} finally {
			setSaving(false);
		}
	};


	// Helper to get/set nested values using JSON path
	const getByPath = (obj: unknown, path: string): unknown => {
		const keys = path.split(/[.[\]]+/).filter(k => k);
		let current: unknown = obj;
		for (const key of keys) {
			if (current && typeof current === 'object' && key in current) {
				current = (current as Record<string, unknown>)[key];
			} else {
				return undefined;
			}
		}
		return current;
	};

	const setByPath = (obj: unknown, path: string, value: unknown): unknown => {
		if (!path) return value;
		
		const keys = path.split(/[.[\]]+/).filter(k => k);
		const newObj = JSON.parse(JSON.stringify(obj)); // Deep clone
		let current: unknown = newObj;
		
		for (let i = 0; i < keys.length - 1; i++) {
			const key = keys[i];
			if (current && typeof current === 'object' && key in current) {
				current = (current as Record<string, unknown>)[key];
			}
		}
		
		if (current && typeof current === 'object') {
			(current as Record<string, unknown>)[keys[keys.length - 1]] = value;
		}
		
		return newObj;
	};

	// PosDefinition management
	const addPosDefinition = () => {
		setEntryData({
			...entryData,
			defs: [...entryData.defs, { pos: ['n'], defs: [{ en: '' }] }]
		});
	};

	const removePosDefinition = (index: number) => {
		if (entryData.defs.length === 1) return;
		const newDefs = entryData.defs.filter((_, i) => i !== index);
		setEntryData({ ...entryData, defs: newDefs });
	};

	const updatePosDefinition = (index: number, updates: Partial<PosDefinition>) => {
		const newDefs = [...entryData.defs];
		newDefs[index] = { ...newDefs[index], ...updates };
		setEntryData({ ...entryData, defs: newDefs });
	};

	// SubDefinition management
	const addSubDefinition = (posIndex: number) => {
		const newDefs = [...entryData.defs];
		newDefs[posIndex] = {
			...newDefs[posIndex],
			defs: [...newDefs[posIndex].defs, { en: '' }]
		};
		setEntryData({ ...entryData, defs: newDefs });
	};

	const removeSubDefinition = (posIndex: number, subIndex: number) => {
		const newDefs = [...entryData.defs];
		if (newDefs[posIndex].defs.length === 1) return;
		newDefs[posIndex] = {
			...newDefs[posIndex],
			defs: newDefs[posIndex].defs.filter((_, i) => i !== subIndex)
		};
		setEntryData({ ...entryData, defs: newDefs });
	};

	const updateSubDefinition = (posIndex: number, subIndex: number, updates: Partial<SubDefinition>) => {
		const newDefs = [...entryData.defs];
		const subDefs = [...newDefs[posIndex].defs];
		subDefs[subIndex] = { ...subDefs[subIndex], ...updates };
		newDefs[posIndex] = { ...newDefs[posIndex], defs: subDefs };
		setEntryData({ ...entryData, defs: newDefs });
	};


	// Field visibility management
	const isFieldVisible = (path: string, fieldName: string): boolean => {
		const fields = visibleFields.get(path);
		if (!fields) {
			// If not in map, check if field has a value in the data
			const obj = getByPath(entryData, path);
			if (obj && typeof obj === 'object' && fieldName in obj) {
				const value = (obj as Record<string, unknown>)[fieldName];
				// Show if field has a value (even empty string) or is an array
				return value !== undefined && value !== null;
			}
			return false;
		}
		return fields.has(fieldName);
	};

	const toggleFieldVisibility = (path: string, fieldName: string) => {
		const newVisibleFields = new Map(visibleFields);
		const fields = newVisibleFields.get(path) || new Set<string>();
		
		if (fields.has(fieldName)) {
			fields.delete(fieldName);
		} else {
			fields.add(fieldName);
			// If field doesn't exist in data, add it with empty value
			const obj = getByPath(entryData, path) as Record<string, unknown> | undefined;
			if (obj && !(fieldName in obj)) {
				let defaultValue: unknown;
				if (fieldName === 'alt' || fieldName === 'cf' || fieldName === 'ex' || fieldName === 'drv' || fieldName === 'idm') {
					defaultValue = [];
				} else if (fieldName === 'bound' || fieldName === 'dup' || fieldName === 'takes_a2') {
					defaultValue = false;
				} else {
					defaultValue = '';
				}
				const newData = setByPath(entryData, `${path}.${fieldName}`, defaultValue);
				setEntryData(newData as EntryData);
			}
		}
		
		newVisibleFields.set(path, fields);
		setVisibleFields(newVisibleFields);
	};

	const getAvailableFields = (path: string): string[] => {
		// Determine available fields based on path
		if (path === 'entry') {
			return ['head_number', 'page', 'etym'];
		} else if (path.match(/^defs\[\d+\]$/)) {
			// PosDefinition level
			return ['mw', 'etym'];
		} else if (path.match(/^defs\[\d+\]\.defs\[\d+\]$/)) {
			// SubDefinition level
			return ['mw', 'cat', 'etym', 'det', 'bound', 'dup', 'takes_a2', 'alt', 'cf'];
		} else if (path.match(/\.(ex|drv|idm)\[\d+\]$/)) {
			// ExampleItem level
			return ['mw', 'cat', 'etym', 'det', 'alt', 'cf'];
		} else if (path.match(/\.en\[\d+\]$/)) {
			// TranslationVariant level
			return ['mw', 'cat', 'etym', 'dup', 'alt'];
		}
		return [];
	};

	// Prepare editor callbacks for child components
	const editorCallbacks = {
		isFieldVisible,
		onToggleField: toggleFieldVisibility,
		getAvailableFields
	};

	if (loading) {
		return (
			<div>
				<Navigation />
				<div className="page-container">
					<p>Loading...</p>
				</div>
			</div>
		);
	}

	return (
		<div className={imageViewerOpen && isDesktop ? 'with-image-viewer' : ''}>
			<Navigation />
			<div className="page-container">
				<div className="editor-header">
					<h1>{isNewEntry ? 'New Entry' : 'Edit Entry'}</h1>
					<div className="editor-actions">
						{entryData.page && (
							<button 
								onClick={() => handlePageClick(entryData.page)} 
								className="btn-secondary"
								title="View dictionary page"
							>
								📖 View Page {entryData.page}
							</button>
						)}
						<button onClick={() => navigate(-1)} className="btn-secondary">
							Cancel
						</button>
						{canEdit && (
							<button onClick={handleSave} disabled={saving} className="btn-primary">
								{saving ? 'Saving...' : 'Save'}
							</button>
						)}
					</div>
				</div>

				{error && <div className="alert-error">{error}</div>}

				<div className="editor-tabs">
					<button
						className={`tab-button ${activeTab === 'edit' ? 'active' : ''}`}
						onClick={() => setActiveTab('edit')}
					>
						Edit
					</button>
					{!isNewEntry && (
						<button
							className={`tab-button ${activeTab === 'reviews' ? 'active' : ''}`}
							onClick={() => setActiveTab('reviews')}
						>
							Reviews
						</button>
					)}
				</div>

				{activeTab === 'edit' ? (
					<div className="compact-form">
						{/* Compact Entry Header */}
						<div className="entry-header-compact compact-header">
							<div className="inline-material-field" style={{ flex: 1 }}>
								<label htmlFor="field-head">head:</label>
								<input
									type="text"
									value={entryData.head}
									onChange={(e) => setEntryData({ ...entryData, head: e.target.value })}
									disabled={!canEdit}
									placeholder=" "
									id="field-head"
								/>
							</div>
							
							{/* Compact Done checkbox */}
							<button
								className={`done-checkbox ${isComplete ? 'checked' : ''}`}
								onClick={() => canEdit && setIsComplete(!isComplete)}
								disabled={!canEdit}
								title={isComplete ? 'Mark as incomplete' : 'Mark as complete'}
								type="button"
							>
								{isComplete ? '✓' : '○'}
							</button>
							
							<FieldVisibilityMenu
								path="entry"
								availableFields={getAvailableFields('entry')}
								isFieldVisible={isFieldVisible}
								onToggleField={toggleFieldVisibility}
								canEdit={canEdit}
							/>
						</div>

						{/* Head Number, Page & Etymology */}
						<div className="desktop-field-row">
							{isFieldVisible('entry', 'head_number') && (
								<div className="material-field">
									<input
										type="number"
										value={entryData.head_number || ''}
										onChange={(e) => setEntryData({ ...entryData, head_number: parseInt(e.target.value) || undefined })}
										disabled={!canEdit}
										placeholder=" "
										id="field-head-number"
									/>
									<label htmlFor="field-head-number">num:</label>
								</div>
							)}

						{isFieldVisible('entry', 'page') && (
							<div className="material-field">
								<input
									type="number"
									value={entryData.page || ''}
									onChange={(e) => setEntryData({ ...entryData, page: parseInt(e.target.value) || undefined })}
									disabled={!canEdit}
									placeholder=" "
									id="field-page"
								/>
								<label htmlFor="field-page">page:</label>
							</div>
						)}

							{isFieldVisible('entry', 'etym') && (
								<div className="material-field">
									<input
										type="text"
										value={entryData.etym || ''}
										onChange={(e) => setEntryData({ ...entryData, etym: e.target.value })}
										disabled={!canEdit}
										placeholder=" "
										id="field-etym"
									/>
									<label htmlFor="field-etym">etym:</label>
								</div>
							)}
						</div>


						{/* POS Definitions */}
						{entryData.defs.map((posDef, posIndex) => (
							<PosDefinitionEditor
								key={posIndex}
								posDef={posDef}
								posIndex={posIndex}
								onUpdate={(updates) => updatePosDefinition(posIndex, updates)}
								onRemove={() => removePosDefinition(posIndex)}
								onAddSubDefinition={() => addSubDefinition(posIndex)}
								onRemoveSubDefinition={(subIndex) => removeSubDefinition(posIndex, subIndex)}
								onUpdateSubDefinition={(subIndex, updates) => updateSubDefinition(posIndex, subIndex, updates)}
								canEdit={canEdit}
								callbacks={editorCallbacks}
								totalPosDefs={entryData.defs.length}
							/>
						))}
						{canEdit && (
							<button onClick={addPosDefinition} className="btn-secondary" style={{ marginTop: '1rem' }}>
								+ Add POS Definition
							</button>
						)}
					</div>
				) : (
					<div className="reviews-tab-content">
						<ReviewPanel entryId={parseInt(id!)} />
					</div>
				)}
			</div>

			{/* Page Image Viewer */}
			{imageViewerOpen && imageViewerPage && (
				<PageImageViewer
					pageNumber={imageViewerPage}
					isOpen={imageViewerOpen}
					onClose={handleCloseImageViewer}
					mode={isDesktop ? 'desktop' : 'mobile'}
				/>
			)}
		</div>
	);
}

