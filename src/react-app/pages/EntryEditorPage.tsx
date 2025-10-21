import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { useImageViewer } from '../contexts/ImageViewerContext';
import { useEntry, useUpdateEntry, useSubmitReview } from '../hooks/useEntriesQuery';
import { Navigation } from '../components/Navigation';
import { ReviewPanel } from '../components/ReviewPanel.tsx';
import { PageImageViewer } from '../components/PageImageViewer';
import { 
	PosDefinitionEditor,
	EditorHeader,
	EditorTabs,
	EntryHeaderFields,
	type EntryData,
	type PosDefinition,
	type SubDefinition
} from '../components/editor';
import { processEntryDataForSave } from '../utils/superscript';

export default function EntryEditorPage() {
	const { id } = useParams<{ id: string }>();
	const navigate = useNavigate();
	const location = useLocation();
	const { user } = useAuth();
	
	const isNewEntry = id === 'new';
	const canEdit = user?.role === 'editor' || user?.role === 'admin';
	
	// Use React Query to fetch entry
	const { data: fetchedEntry, isLoading: loading, error: queryError } = useEntry(id);
	const updateEntryMutation = useUpdateEntry(id);
	const submitReviewMutation = useSubmitReview();
	
	// Local state for editing
	const [entryData, setEntryData] = useState<EntryData>({
		head: '',
		defs: [{
			pos: ['n'],
			defs: [{ en: '' }]
		}]
	});
	const [isComplete, setIsComplete] = useState(false);
	const [activeTab, setActiveTab] = useState<'edit' | 'reviews'>('edit');
	
	// Extract data from query result
	const reviews = fetchedEntry?.reviews || [];
	const comments = fetchedEntry?.comments || [];
	const myReview = fetchedEntry?.my_review || null;
	const error = queryError ? (queryError as Error).message : '';
	
	// Image viewer state
	const { isOpen: imageViewerOpen, currentPage: imageViewerPage, openViewer, closeViewer } = useImageViewer();
	const isDesktop = useMediaQuery('(min-width: 1280px)');
	
	// Field visibility tracking using JSON path notation
	const [visibleFields, setVisibleFields] = useState<Map<string, Set<string>>>(new Map());
	// Track explicitly hidden fields (to override the "has data" default visibility)
	const [hiddenFields, setHiddenFields] = useState<Map<string, Set<string>>>(new Map());

	// Populate entryData when fetchedEntry is loaded
	useEffect(() => {
		if (fetchedEntry && !isNewEntry) {
			setEntryData(JSON.parse(fetchedEntry.entry_data));
			setIsComplete(fetchedEntry.is_complete === 1);
		}
	}, [fetchedEntry, isNewEntry]);

	const handlePageClick = (pageNum: number | undefined) => {
		if (pageNum) {
			openViewer(pageNum);
		}
	};

	const handleCloseImageViewer = () => {
		closeViewer();
	};

	const handleSave = async () => {
		if (!canEdit) {
			return;
		}

		try {
			// Process entry data to convert numbers to superscript in cf and alt fields
			const processedEntryData = processEntryDataForSave(entryData);

			const result = await updateEntryMutation.mutateAsync({
				head: entryData.head,
				head_number: entryData.head_number || undefined,
				entry_data: processedEntryData,
				is_complete: isComplete,
			});

			if (isNewEntry) {
				// For new entries, navigate to the edit page for that entry
				navigate(`/entries/${result.id}`);
			} else {
				// For existing entries, go back to the list with preserved state
				const returnUrl = (location.state as { returnUrl?: string })?.returnUrl || '/entries';
				navigate(returnUrl);
			}
		} catch (err) {
			console.error('Failed to save entry:', err);
		}
	};

	const handleReviewStatusChange = async (status: 'approved' | 'needs_work') => {
		if (!id || isNewEntry) return;

		// Use the mutation with optimistic updates
		await submitReviewMutation.mutateAsync({ entryId: parseInt(id), status });
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
		// First check if explicitly hidden
		const hidden = hiddenFields.get(path);
		if (hidden && hidden.has(fieldName)) {
			return false;
		}
		
		// Then check if explicitly shown
		const fields = visibleFields.get(path);
		if (fields && fields.has(fieldName)) {
			return true;
		}
		
		// Finally, check if field has a value in the data (default visibility)
		// For top-level entry fields, check entryData directly
		if (path === 'entry') {
			const value = (entryData as unknown as Record<string, unknown>)[fieldName];
			// Don't show 'page' by default even if it has a value
			if (fieldName === 'page') {
				return false;
			}
			// Show 'head_number' and 'etym' if they have values
			return value !== undefined && value !== null && value !== '';
		}
		
		// For nested paths, use getByPath
		const obj = getByPath(entryData, path);
		if (obj && typeof obj === 'object' && fieldName in obj) {
			const value = (obj as Record<string, unknown>)[fieldName];
			// Show if field has a value (even empty string) or is an array
			return value !== undefined && value !== null;
		}
		return false;
	};

	const toggleFieldVisibility = (path: string, fieldName: string) => {
		// Check if field is currently visible (either in map or has data)
		const currentlyVisible = isFieldVisible(path, fieldName);
		
		// Special handling for boolean flags - they toggle the actual boolean value
		const isBooleanFlag = fieldName === 'bound' || fieldName === 'dup' || fieldName === 'takes_a2';
		
		if (currentlyVisible) {
			// Hide it: remove from visible, add to hidden
			const newVisibleFields = new Map(visibleFields);
			const visibleSet = newVisibleFields.get(path) || new Set<string>();
			visibleSet.delete(fieldName);
			newVisibleFields.set(path, visibleSet);
			setVisibleFields(newVisibleFields);
			
			const newHiddenFields = new Map(hiddenFields);
			const hiddenSet = newHiddenFields.get(path) || new Set<string>();
			hiddenSet.add(fieldName);
			newHiddenFields.set(path, hiddenSet);
			setHiddenFields(newHiddenFields);
			
			// For boolean flags, set value to false/undefined when hidden
			if (isBooleanFlag) {
				const newData = setByPath(entryData, `${path}.${fieldName}`, undefined);
				setEntryData(newData as EntryData);
			}
		} else {
			// Show it: remove from hidden, add to visible
			const newHiddenFields = new Map(hiddenFields);
			const hiddenSet = newHiddenFields.get(path) || new Set<string>();
			hiddenSet.delete(fieldName);
			newHiddenFields.set(path, hiddenSet);
			setHiddenFields(newHiddenFields);
			
			const newVisibleFields = new Map(visibleFields);
			const visibleSet = newVisibleFields.get(path) || new Set<string>();
			visibleSet.add(fieldName);
			newVisibleFields.set(path, visibleSet);
			setVisibleFields(newVisibleFields);
			
			// If field doesn't exist in data, add it with appropriate default value
			const obj = getByPath(entryData, path) as Record<string, unknown> | undefined;
			if (obj && !(fieldName in obj)) {
				let defaultValue: unknown;
				if (fieldName === 'alt' || fieldName === 'cf' || fieldName === 'ex' || fieldName === 'drv' || fieldName === 'idm') {
					defaultValue = [];
				} else if (isBooleanFlag) {
					// Boolean flags default to true when shown
					defaultValue = true;
				} else {
					defaultValue = '';
				}
				const newData = setByPath(entryData, `${path}.${fieldName}`, defaultValue);
				setEntryData(newData as EntryData);
			} else if (obj && isBooleanFlag) {
				// If boolean flag exists but is false/undefined, set it to true when showing
				const newData = setByPath(entryData, `${path}.${fieldName}`, true);
				setEntryData(newData as EntryData);
			}
		}
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
				<EditorHeader
					isNewEntry={isNewEntry}
					canEdit={canEdit}
					pageNumber={entryData.page}
					onPageClick={handlePageClick}
					onCancel={() => {
						const returnUrl = (location.state as { returnUrl?: string })?.returnUrl || '/entries';
						navigate(returnUrl);
					}}
					onSave={handleSave}
					isSaving={updateEntryMutation.isPending}
				/>

			{error && <div className="alert-error">{error}</div>}
			{updateEntryMutation.isError && (
				<div className="alert-error">
					Failed to save: {(updateEntryMutation.error as Error)?.message || 'Unknown error'}
				</div>
			)}

			<EditorTabs
				isNewEntry={isNewEntry}
				activeTab={activeTab}
				onTabChange={setActiveTab}
				myReviewStatus={myReview?.status || null}
				onReviewStatusChange={handleReviewStatusChange}
				isSubmittingReview={submitReviewMutation.isPending}
			/>

			{!isNewEntry && (
				<div className="editor-review-summary">
					<span>{reviews.filter(r => r.status === 'approved').length} ✓</span>
					<span>{reviews.filter(r => r.status === 'needs_work').length} ✗</span>
					<span>{comments.length} 💬</span>
				</div>
			)}

				{activeTab === 'edit' ? (
					<div className="compact-form">
						<EntryHeaderFields
							entryData={entryData}
							isComplete={isComplete}
							canEdit={canEdit}
							onEntryDataChange={(updates) => setEntryData({ ...entryData, ...updates })}
							onIsCompleteChange={setIsComplete}
							callbacks={editorCallbacks}
						/>

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

