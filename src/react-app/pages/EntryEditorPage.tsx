import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Navigation } from '../components/Navigation';
import { ReviewPanel } from '../components/ReviewPanel.tsx';

interface DefinitionItem {
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

interface ExampleItem {
	tw: string;
	en?: string;
	[key: string]: unknown;
}

interface DerivativeItem {
	tw: string;
	en?: string;
	mw?: string;
	ex?: ExampleItem[];
	[key: string]: unknown;
}

interface IdiomItem {
	tw: string;
	en?: string;
	[key: string]: unknown;
}

interface EntryData {
	head: string;
	head_number?: number;
	etym?: string;
	defs: DefinitionItem[];
}

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
	const [entry, setEntry] = useState<Entry | null>(null);
	const [entryData, setEntryData] = useState<EntryData>({
		head: '',
		etym: '',
		defs: [{ pos: '', en: '' }]
	});
	const [isComplete, setIsComplete] = useState(false);
	const [activeTab, setActiveTab] = useState<'edit' | 'reviews'>('edit');
	const [collapsedDefs, setCollapsedDefs] = useState<Set<number>>(new Set());

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
				navigate(`/entries/${saved.id}`);
			} else {
				// Refresh entry data
				const refreshResponse = await fetch(`/api/entries/${id}`);
				const refreshed = await refreshResponse.json();
				setEntry(refreshed);
				setEntryData(JSON.parse(refreshed.entry_data));
				setIsComplete(refreshed.is_complete === 1);
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to save entry');
		} finally {
			setSaving(false);
		}
	};

	const updateEntryData = (updates: Partial<EntryData>) => {
		setEntryData(prev => ({ ...prev, ...updates }));
	};

	const addDefinition = () => {
		setEntryData(prev => ({
			...prev,
			defs: [...prev.defs, { pos: '', en: '' }]
		}));
	};

	const removeDefinition = (index: number) => {
		setEntryData(prev => ({
			...prev,
			defs: prev.defs.filter((_, i) => i !== index)
		}));
	};

	const moveDefinition = (index: number, direction: 'up' | 'down') => {
		const newIndex = direction === 'up' ? index - 1 : index + 1;
		if (newIndex < 0 || newIndex >= entryData.defs.length) return;

		const newDefs = [...entryData.defs];
		[newDefs[index], newDefs[newIndex]] = [newDefs[newIndex], newDefs[index]];
		setEntryData(prev => ({ ...prev, defs: newDefs }));
	};

	const updateDefinition = (index: number, updates: Partial<DefinitionItem>) => {
		setEntryData(prev => ({
			...prev,
			defs: prev.defs.map((def, i) => i === index ? { ...def, ...updates } : def)
		}));
	};

	const addToArray = <T,>(defIndex: number, arrayKey: 'ex' | 'drv' | 'idm', newItem: T) => {
		setEntryData(prev => ({
			...prev,
			defs: prev.defs.map((def, i) => {
				if (i !== defIndex) return def;
				const currentArray = (def[arrayKey] as T[]) || [];
				return { ...def, [arrayKey]: [...currentArray, newItem] };
			})
		}));
	};

	const removeFromArray = (defIndex: number, arrayKey: 'ex' | 'drv' | 'idm', itemIndex: number) => {
		setEntryData(prev => ({
			...prev,
			defs: prev.defs.map((def, i) => {
				if (i !== defIndex) return def;
				const currentArray = (def[arrayKey] as unknown[]) || [];
				return { ...def, [arrayKey]: currentArray.filter((_, idx) => idx !== itemIndex) };
			})
		}));
	};

	const updateArrayItem = <T extends Record<string, unknown>>(
		defIndex: number,
		arrayKey: 'ex' | 'drv' | 'idm',
		itemIndex: number,
		updates: Partial<T>
	) => {
		setEntryData(prev => ({
			...prev,
			defs: prev.defs.map((def, i) => {
				if (i !== defIndex) return def;
				const currentArray = (def[arrayKey] as unknown as T[]) || [];
				return {
					...def,
					[arrayKey]: currentArray.map((item, idx) =>
						idx === itemIndex ? { ...(item as T), ...updates } : item
					)
				};
			})
		}));
	};

	const toggleDefCollapse = (index: number) => {
		setCollapsedDefs(prev => {
			const next = new Set(prev);
			if (next.has(index)) {
				next.delete(index);
			} else {
				next.add(index);
			}
			return next;
		});
	};

	if (loading) {
		return (
			<div className="editor-page">
				<Navigation />
				<div className="loading">Loading entry...</div>
			</div>
		);
	}

	return (
		<div className="editor-page">
			<Navigation />

			<div className="editor-header">
				<h1>{isNewEntry ? 'New Entry' : 'Edit Entry'}</h1>
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
				<div className="editor-actions">
					<button onClick={() => navigate('/entries')} className="btn-secondary">
						Cancel
					</button>
					{canEdit && activeTab === 'edit' && (
						<button onClick={handleSave} disabled={saving} className="btn-primary">
							{saving ? 'Saving...' : 'Save'}
						</button>
					)}
				</div>
			</div>

			{error && <div className="error-message">{error}</div>}

			<div className="editor-content-single">
				{activeTab === 'edit' ? (
					<div className="editor-form">
						{/* Headword Section */}
						<div className="form-section">
							<h2>Headword</h2>
							<div className="form-row">
								<div className="form-group">
									<label>Headword *</label>
									<input
										type="text"
										value={entryData.head}
										onChange={(e) => updateEntryData({ head: e.target.value })}
										disabled={!canEdit}
										placeholder="Enter headword..."
										required
									/>
								</div>
								<div className="form-group form-group-narrow">
									<label>Number</label>
									<input
										type="number"
										value={entryData.head_number || ''}
										onChange={(e) => updateEntryData({ 
											head_number: e.target.value ? parseInt(e.target.value) : undefined 
										})}
										disabled={!canEdit}
										placeholder="#"
										min="1"
									/>
									<span className="help-text">For homonyms (e.g., 1, 2, 3)</span>
								</div>
							</div>
							<div className="form-group">
								<label>Etymology</label>
								<input
									type="text"
									value={entryData.etym || ''}
									onChange={(e) => updateEntryData({ etym: e.target.value })}
									disabled={!canEdit}
									placeholder="Etymology (optional)"
								/>
							</div>
							<div className="form-group">
								<label className="checkbox-label">
									<input
										type="checkbox"
										checked={isComplete}
										onChange={(e) => setIsComplete(e.target.checked)}
										disabled={!canEdit}
									/>
									Mark as complete
								</label>
							</div>
						</div>

						{/* Definitions Section */}
						<div className="form-section">
							<div className="section-header">
								<h2>Definitions</h2>
								{canEdit && (
									<button onClick={addDefinition} className="btn-primary btn-sm">
										+ Add Definition
									</button>
								)}
							</div>

							{entryData.defs.map((def, defIndex) => {
								const isCollapsed = collapsedDefs.has(defIndex);
								const pos = Array.isArray(def.pos) ? def.pos.join(', ') : (def.pos || '');
								
								return (
								<div key={defIndex} className={`definition-item ${isCollapsed ? 'definition-collapsed' : 'definition-expanded'}`}>
									<div className="definition-header">
										<h3>Definition {defIndex + 1}</h3>
										<div className="definition-controls">
											<button
												onClick={() => toggleDefCollapse(defIndex)}
												className="btn-icon"
												title={isCollapsed ? 'Expand' : 'Collapse'}
											>
												{isCollapsed ? '▼' : '▲'}
											</button>
											{canEdit && entryData.defs.length > 1 && (
												<>
													{defIndex > 0 && (
														<button
															onClick={() => moveDefinition(defIndex, 'up')}
															className="btn-icon"
															title="Move up"
														>
															↑
														</button>
													)}
													{defIndex < entryData.defs.length - 1 && (
														<button
															onClick={() => moveDefinition(defIndex, 'down')}
															className="btn-icon"
															title="Move down"
														>
															↓
														</button>
													)}
													<button
														onClick={() => removeDefinition(defIndex)}
														className="btn-icon btn-danger"
														title="Delete definition"
													>
														✕
													</button>
												</>
											)}
										</div>
									</div>

									{/* Always show English when collapsed */}
									<div className="form-group">
										<label>English Translation *</label>
										<textarea
											value={def.en || ''}
											onChange={(e) => updateDefinition(defIndex, { en: e.target.value })}
											disabled={!canEdit}
											placeholder="English definition..."
											rows={2}
										/>
									</div>

									{/* Show rest when expanded */}
									{!isCollapsed && (
										<>
											<div className="form-row">
												<div className="form-group">
													<label>Part of Speech</label>
													<input
														type="text"
														value={pos}
														onChange={(e) => updateDefinition(defIndex, { pos: e.target.value })}
														disabled={!canEdit}
														placeholder="e.g., n., v., adj."
													/>
												</div>
												<div className="form-group">
													<label>Category</label>
													<input
														type="text"
														value={def.cat || ''}
														onChange={(e) => updateDefinition(defIndex, { cat: e.target.value })}
														disabled={!canEdit}
														placeholder="Category (optional)"
													/>
												</div>
											</div>

											<div className="form-row">
												<div className="form-group">
													<label>Measure Word</label>
													<input
														type="text"
														value={def.mw || ''}
														onChange={(e) => updateDefinition(defIndex, { mw: e.target.value })}
														disabled={!canEdit}
														placeholder="Measure word (optional)"
													/>
												</div>
												<div className="form-group">
													<label>Determinative</label>
													<input
														type="text"
														value={def.det || ''}
														onChange={(e) => updateDefinition(defIndex, { det: e.target.value })}
														disabled={!canEdit}
														placeholder="See also (optional)"
													/>
												</div>
											</div>

											{/* Examples */}
											<div className="nested-section">
												<div className="nested-header">
													<h4>Examples (¶)</h4>
													{canEdit && (
														<button
															onClick={() => addToArray<ExampleItem>(defIndex, 'ex', { tw: '', en: '' })}
															className="btn-secondary btn-sm"
														>
															+ Add Example
														</button>
													)}
												</div>
												{(def.ex || []).map((example, exIndex) => (
													<div key={exIndex} className="nested-item">
														<div className="nested-item-header">
															<span>Example {exIndex + 1}</span>
															{canEdit && (
																<button
																	onClick={() => removeFromArray(defIndex, 'ex', exIndex)}
																	className="btn-icon btn-danger"
																>
																	✕
																</button>
															)}
														</div>
														<div className="form-group">
															<label>Taiwanese</label>
															<textarea
																value={example.tw}
																onChange={(e) => updateArrayItem<ExampleItem>(
																	defIndex, 'ex', exIndex, { tw: e.target.value }
																)}
																disabled={!canEdit}
																placeholder="Taiwanese text..."
																rows={2}
															/>
														</div>
														<div className="form-group">
															<label>English</label>
															<textarea
																value={example.en || ''}
																onChange={(e) => updateArrayItem<ExampleItem>(
																	defIndex, 'ex', exIndex, { en: e.target.value }
																)}
																disabled={!canEdit}
																placeholder="English translation..."
																rows={2}
															/>
														</div>
													</div>
												))}
											</div>

											{/* Derivatives */}
											<div className="nested-section">
												<div className="nested-header">
													<h4>Derivatives (◊)</h4>
													{canEdit && (
														<button
															onClick={() => addToArray<DerivativeItem>(defIndex, 'drv', { tw: '', en: '' })}
															className="btn-secondary btn-sm"
														>
															+ Add Derivative
														</button>
													)}
												</div>
												{(def.drv || []).map((derivative, drvIndex) => (
													<div key={drvIndex} className="nested-item">
														<div className="nested-item-header">
															<span>Derivative {drvIndex + 1}</span>
															{canEdit && (
																<button
																	onClick={() => removeFromArray(defIndex, 'drv', drvIndex)}
																	className="btn-icon btn-danger"
																>
																	✕
																</button>
															)}
														</div>
														<div className="form-group">
															<label>Taiwanese</label>
															<textarea
																value={derivative.tw}
																onChange={(e) => updateArrayItem<DerivativeItem>(
																	defIndex, 'drv', drvIndex, { tw: e.target.value }
																)}
																disabled={!canEdit}
																placeholder="Taiwanese text..."
																rows={2}
															/>
														</div>
														<div className="form-row">
															<div className="form-group">
																<label>English</label>
																<textarea
																	value={derivative.en || ''}
																	onChange={(e) => updateArrayItem<DerivativeItem>(
																		defIndex, 'drv', drvIndex, { en: e.target.value }
																	)}
																	disabled={!canEdit}
																	placeholder="English translation..."
																	rows={2}
																/>
															</div>
															<div className="form-group">
																<label>Measure Word</label>
																<input
																	type="text"
																	value={derivative.mw || ''}
																	onChange={(e) => updateArrayItem<DerivativeItem>(
																		defIndex, 'drv', drvIndex, { mw: e.target.value }
																	)}
																	disabled={!canEdit}
																	placeholder="MW (optional)"
																/>
															</div>
														</div>
													</div>
												))}
											</div>

											{/* Idioms */}
											<div className="nested-section">
												<div className="nested-header">
													<h4>Idioms (∆)</h4>
													{canEdit && (
														<button
															onClick={() => addToArray<IdiomItem>(defIndex, 'idm', { tw: '', en: '' })}
															className="btn-secondary btn-sm"
														>
															+ Add Idiom
														</button>
													)}
												</div>
												{(def.idm || []).map((idiom, idmIndex) => (
													<div key={idmIndex} className="nested-item">
														<div className="nested-item-header">
															<span>Idiom {idmIndex + 1}</span>
															{canEdit && (
																<button
																	onClick={() => removeFromArray(defIndex, 'idm', idmIndex)}
																	className="btn-icon btn-danger"
																>
																	✕
																</button>
															)}
														</div>
														<div className="form-group">
															<label>Taiwanese</label>
															<textarea
																value={idiom.tw}
																onChange={(e) => updateArrayItem<IdiomItem>(
																	defIndex, 'idm', idmIndex, { tw: e.target.value }
																)}
																disabled={!canEdit}
																placeholder="Taiwanese text..."
																rows={2}
															/>
														</div>
														<div className="form-group">
															<label>English</label>
															<textarea
																value={idiom.en || ''}
																onChange={(e) => updateArrayItem<IdiomItem>(
																	defIndex, 'idm', idmIndex, { en: e.target.value }
																)}
																disabled={!canEdit}
																placeholder="English translation..."
																rows={2}
															/>
														</div>
													</div>
												))}
											</div>
										</>
									)}
								</div>
							)})}
						</div>
					</div>
				) : (
					<div className="reviews-tab-content">
						{!isNewEntry && entry && (
							<ReviewPanel entryId={parseInt(id!)} />
						)}
					</div>
				)}
			</div>
		</div>
	);
}
