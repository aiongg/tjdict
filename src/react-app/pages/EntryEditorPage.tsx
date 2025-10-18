import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Navigation } from '../components/Navigation';
import { ReviewPanel } from '../components/ReviewPanel.tsx';

interface TranslationVariant {
	en?: string;
	mw?: string;
	etym?: string;
	alt?: string[];
	[key: string]: unknown;
}

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
	en?: string | TranslationVariant[];
	mw?: string;
	etym?: string;
	alt?: string[];
	[key: string]: unknown;
}

interface DerivativeItem {
	tw: string;
	en?: string | TranslationVariant[];
	mw?: string;
	etym?: string;
	ex?: ExampleItem[];
	alt?: string[];
	[key: string]: unknown;
}

interface IdiomItem {
	tw: string;
	en?: string | TranslationVariant[];
	mw?: string;
	etym?: string;
	alt?: string[];
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
	const [, setEntry] = useState<Entry | null>(null);
	const [entryData, setEntryData] = useState<EntryData>({
		head: '',
		etym: '',
		defs: [{ pos: '', en: '' }]
	});
	const [isComplete, setIsComplete] = useState(false);
	const [activeTab, setActiveTab] = useState<'edit' | 'reviews'>('edit');
	const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
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
				setEntry(saved);
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to save entry');
		} finally {
			setSaving(false);
		}
	};

	const toggleSection = (key: string) => {
		const newCollapsed = new Set(collapsedSections);
		if (newCollapsed.has(key)) {
			newCollapsed.delete(key);
		} else {
			newCollapsed.add(key);
		}
		setCollapsedSections(newCollapsed);
	};

	const toggleDef = (index: number) => {
		const newCollapsed = new Set(collapsedDefs);
		if (newCollapsed.has(index)) {
			newCollapsed.delete(index);
		} else {
			newCollapsed.add(index);
		}
		setCollapsedDefs(newCollapsed);
	};

	const updateDef = (index: number, updates: Partial<DefinitionItem>) => {
		const newDefs = [...entryData.defs];
		newDefs[index] = { ...newDefs[index], ...updates };
		setEntryData({ ...entryData, defs: newDefs });
	};

	const addDef = () => {
		setEntryData({
			...entryData,
			defs: [...entryData.defs, { pos: '', en: '' }]
		});
	};

	const removeDef = (index: number) => {
		if (entryData.defs.length === 1) return;
		const newDefs = entryData.defs.filter((_, i) => i !== index);
		setEntryData({ ...entryData, defs: newDefs });
	};

	const addToArray = <T extends ExampleItem | DerivativeItem | IdiomItem>(
		defIndex: number,
		field: 'ex' | 'drv' | 'idm',
		item: T
	) => {
		const def = entryData.defs[defIndex];
		const arr = (def[field] || []) as T[];
		updateDef(defIndex, { [field]: [...arr, item] });
	};

	const removeFromArray = (defIndex: number, field: 'ex' | 'drv' | 'idm', itemIndex: number) => {
		const def = entryData.defs[defIndex];
		const arr = def[field] || [];
		updateDef(defIndex, { [field]: arr.filter((_, i) => i !== itemIndex) });
	};

	const updateArrayItem = <T extends ExampleItem | DerivativeItem | IdiomItem>(
		defIndex: number,
		field: 'ex' | 'drv' | 'idm',
		itemIndex: number,
		updates: Partial<T>
	) => {
		const def = entryData.defs[defIndex];
		const arr = (def[field] || []) as T[];
		const newArr = [...arr];
		newArr[itemIndex] = { ...(newArr[itemIndex] as T), ...updates };
		updateDef(defIndex, { [field]: newArr });
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
		<div>
			<Navigation />
			<div className="page-container">
				<div className="editor-header">
					<h1>{isNewEntry ? 'New Entry' : 'Edit Entry'}</h1>
					<div className="editor-actions">
						<button onClick={() => navigate('/entries')} className="btn-secondary">
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
						{/* Head */}
						<div className="material-field">
							<input
								type="text"
								value={entryData.head}
								onChange={(e) => setEntryData({ ...entryData, head: e.target.value })}
								disabled={!canEdit}
								placeholder=" "
								id="field-head"
							/>
							<label htmlFor="field-head">head:</label>
						</div>

						{/* Head Number & Etymology on desktop */}
						<div className="desktop-field-row">
							{entryData.head_number !== undefined && (
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

							{entryData.etym !== undefined && (
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

						{/* Completeness */}
						<div className="checkbox-field" onClick={() => canEdit && setIsComplete(!isComplete)}>
							<input
								type="checkbox"
								checked={isComplete}
								onChange={(e) => setIsComplete(e.target.checked)}
								disabled={!canEdit}
								id="field-complete"
							/>
							<label htmlFor="field-complete">Mark as complete</label>
						</div>

						{/* Definitions */}
						{entryData.defs.map((def, defIndex) => (
							<div key={defIndex} style={{ marginTop: '1.5rem' }} className={collapsedDefs.has(defIndex) ? 'definition-collapsed' : ''}>
								<div 
									className="compact-section-header" 
									onClick={() => toggleDef(defIndex)}
									style={{ marginBottom: '0.75rem' }}
								>
									<span className="collapse-icon">▼</span>
									<span>def {defIndex + 1}</span>
									{entryData.defs.length > 1 && canEdit && (
										<button
											onClick={(e) => {
												e.stopPropagation();
												removeDef(defIndex);
											}}
											className="item-remove"
											style={{ marginLeft: 'auto', position: 'relative', top: 'auto', right: 'auto' }}
										>
											✕
										</button>
									)}
								</div>

								{!collapsedDefs.has(defIndex) && (
									<div>
										{/* POS, Category, Measure Word - horizontal on desktop */}
										<div className="desktop-field-row">
											<div className="material-field">
												<input
													type="text"
													value={Array.isArray(def.pos) ? def.pos.join(', ') : (def.pos || '')}
													onChange={(e) => updateDef(defIndex, { pos: e.target.value })}
													disabled={!canEdit}
													placeholder=" "
													id={`field-pos-${defIndex}`}
												/>
												<label htmlFor={`field-pos-${defIndex}`}>pos:</label>
											</div>

											<div className="material-field">
												<input
													type="text"
													value={def.cat || ''}
													onChange={(e) => updateDef(defIndex, { cat: e.target.value })}
													disabled={!canEdit}
													placeholder=" "
													id={`field-cat-${defIndex}`}
												/>
												<label htmlFor={`field-cat-${defIndex}`}>cat:</label>
											</div>

											<div className="material-field">
												<input
													type="text"
													value={def.mw || ''}
													onChange={(e) => updateDef(defIndex, { mw: e.target.value })}
													disabled={!canEdit}
													placeholder=" "
													id={`field-mw-${defIndex}`}
												/>
												<label htmlFor={`field-mw-${defIndex}`}>mw:</label>
											</div>
										</div>

										{/* English */}
										<div className="material-field">
											<textarea
												value={def.en || ''}
												onChange={(e) => updateDef(defIndex, { en: e.target.value })}
												disabled={!canEdit}
												placeholder=" "
												rows={2}
												id={`field-en-${defIndex}`}
											/>
											<label htmlFor={`field-en-${defIndex}`}>en:</label>
										</div>

										{/* Examples */}
										<CompactSection
											title="¶ ex"
											collapsed={collapsedSections.has(`${defIndex}-ex`)}
											onToggle={() => toggleSection(`${defIndex}-ex`)}
										>
											{(def.ex || []).map((example, exIndex) => (
												<div key={exIndex} className="compact-item">
													{canEdit && (
														<button
															onClick={() => removeFromArray(defIndex, 'ex', exIndex)}
															className="item-remove btn-icon btn-danger"
														>
															✕
														</button>
													)}
													<div className="material-field">
														<textarea
															value={example.tw}
															onChange={(e) => updateArrayItem<ExampleItem>(
																defIndex, 'ex', exIndex, { tw: e.target.value }
															)}
															disabled={!canEdit}
															rows={1}
															placeholder=" "
															id={`field-ex-tw-${defIndex}-${exIndex}`}
														/>
														<label htmlFor={`field-ex-tw-${defIndex}-${exIndex}`}>tw:</label>
													</div>
													{Array.isArray(example.en) ? (
														<>
															{example.en.map((variant, varIdx) => (
																<div key={varIdx} className="compact-variant">
																	<div className="variant-label">{String.fromCharCode(97 + varIdx)}:</div>
																	{canEdit && (
																		<button
																			onClick={() => {
																				const newVariants = (example.en as TranslationVariant[]).filter((_, i) => i !== varIdx);
																				updateArrayItem<ExampleItem>(defIndex, 'ex', exIndex, { 
																					en: newVariants.length > 0 ? newVariants : '' 
																				});
																			}}
																			className="item-remove btn-icon btn-danger"
																		>
																			✕
																		</button>
																	)}
																	<div className="material-field">
																		<textarea
																			value={(variant as TranslationVariant).en || ''}
																			onChange={(e) => {
																				const newVariants = [...example.en as TranslationVariant[]];
																				newVariants[varIdx] = { ...newVariants[varIdx], en: e.target.value };
																				updateArrayItem<ExampleItem>(defIndex, 'ex', exIndex, { en: newVariants });
																			}}
																			disabled={!canEdit}
																			rows={1}
																			placeholder=" "
																			id={`field-ex-en-${defIndex}-${exIndex}-${varIdx}`}
																		/>
																		<label htmlFor={`field-ex-en-${defIndex}-${exIndex}-${varIdx}`}>en:</label>
																	</div>
																	<div className="compact-field-row">
																		<div className="material-field">
																			<input
																				type="text"
																				value={(variant as TranslationVariant).mw || ''}
																				onChange={(e) => {
																					const newVariants = [...example.en as TranslationVariant[]];
																					newVariants[varIdx] = { ...newVariants[varIdx], mw: e.target.value };
																					updateArrayItem<ExampleItem>(defIndex, 'ex', exIndex, { en: newVariants });
																				}}
																				disabled={!canEdit}
																				placeholder=" "
																				id={`field-ex-mw-${defIndex}-${exIndex}-${varIdx}`}
																			/>
																			<label htmlFor={`field-ex-mw-${defIndex}-${exIndex}-${varIdx}`}>mw:</label>
																		</div>
																		<div className="material-field">
																			<input
																				type="text"
																				value={(variant as TranslationVariant).etym || ''}
																				onChange={(e) => {
																					const newVariants = [...example.en as TranslationVariant[]];
																					newVariants[varIdx] = { ...newVariants[varIdx], etym: e.target.value };
																					updateArrayItem<ExampleItem>(defIndex, 'ex', exIndex, { en: newVariants });
																				}}
																				disabled={!canEdit}
																				placeholder=" "
																				id={`field-ex-etym-${defIndex}-${exIndex}-${varIdx}`}
																			/>
																			<label htmlFor={`field-ex-etym-${defIndex}-${exIndex}-${varIdx}`}>etym:</label>
																		</div>
																	</div>
																</div>
															))}
															{canEdit && (
																<button
																	onClick={() => {
																		const newVariants = [...example.en as TranslationVariant[], { en: '' }];
																		updateArrayItem<ExampleItem>(defIndex, 'ex', exIndex, { en: newVariants });
																	}}
																	className="section-add btn-secondary"
																>
																	+ variant
																</button>
															)}
														</>
													) : (
														<>
															<div className="material-field">
																<textarea
																	value={example.en || ''}
																	onChange={(e) => updateArrayItem<ExampleItem>(
																		defIndex, 'ex', exIndex, { en: e.target.value }
																	)}
																	disabled={!canEdit}
																	rows={1}
																	placeholder=" "
																	id={`field-ex-en-simple-${defIndex}-${exIndex}`}
																/>
																<label htmlFor={`field-ex-en-simple-${defIndex}-${exIndex}`}>en:</label>
															</div>
															{canEdit && (
																<button
																	onClick={() => {
																		const currentEn = (typeof example.en === 'string' ? example.en : '') || '';
																		const newVariants: TranslationVariant[] = [{ en: currentEn }];
																		updateArrayItem<ExampleItem>(defIndex, 'ex', exIndex, { en: newVariants });
																	}}
																	className="section-add btn-secondary"
																	style={{ fontSize: '0.75rem', padding: '0.125rem 0.5rem' }}
																>
																	+ variant
																</button>
															)}
														</>
													)}
												</div>
											))}
											{canEdit && (
												<button
													onClick={() => addToArray<ExampleItem>(defIndex, 'ex', { tw: '', en: '' })}
													className="section-add btn-secondary"
												>
													+
												</button>
											)}
										</CompactSection>

										{/* Derivatives */}
										<CompactSection
											title="◊ drv"
											collapsed={collapsedSections.has(`${defIndex}-drv`)}
											onToggle={() => toggleSection(`${defIndex}-drv`)}
										>
											{(def.drv || []).map((derivative, drvIndex) => (
												<div key={drvIndex} className="compact-item">
													{canEdit && (
														<button
															onClick={() => removeFromArray(defIndex, 'drv', drvIndex)}
															className="item-remove btn-icon btn-danger"
														>
															✕
														</button>
													)}
													<div className="material-field">
														<textarea
															value={derivative.tw}
															onChange={(e) => updateArrayItem<DerivativeItem>(
																defIndex, 'drv', drvIndex, { tw: e.target.value }
															)}
															disabled={!canEdit}
															rows={1}
															placeholder=" "
															id={`field-drv-tw-${defIndex}-${drvIndex}`}
														/>
														<label htmlFor={`field-drv-tw-${defIndex}-${drvIndex}`}>tw:</label>
													</div>
													{!Array.isArray(derivative.en) && (
														<div className="material-field">
															<input
																type="text"
																value={derivative.mw || ''}
																onChange={(e) => updateArrayItem<DerivativeItem>(
																	defIndex, 'drv', drvIndex, { mw: e.target.value }
																)}
																disabled={!canEdit}
																placeholder=" "
																id={`field-drv-mw-${defIndex}-${drvIndex}`}
															/>
															<label htmlFor={`field-drv-mw-${defIndex}-${drvIndex}`}>mw:</label>
														</div>
													)}
													{Array.isArray(derivative.en) ? (
														<>
															{derivative.en.map((variant, varIdx) => (
																<div key={varIdx} className="compact-variant">
																	<div className="variant-label">{String.fromCharCode(97 + varIdx)}:</div>
																	{canEdit && (
																		<button
																			onClick={() => {
																				const newVariants = (derivative.en as TranslationVariant[]).filter((_, i) => i !== varIdx);
																				updateArrayItem<DerivativeItem>(defIndex, 'drv', drvIndex, { 
																					en: newVariants.length > 0 ? newVariants : '' 
																				});
																			}}
																			className="item-remove btn-icon btn-danger"
																		>
																			✕
																		</button>
																	)}
																	<div className="material-field">
																		<textarea
																			value={(variant as TranslationVariant).en || ''}
																			onChange={(e) => {
																				const newVariants = [...derivative.en as TranslationVariant[]];
																				newVariants[varIdx] = { ...newVariants[varIdx], en: e.target.value };
																				updateArrayItem<DerivativeItem>(defIndex, 'drv', drvIndex, { en: newVariants });
																			}}
																			disabled={!canEdit}
																			rows={1}
																			placeholder=" "
																			id={`field-drv-en-${defIndex}-${drvIndex}-${varIdx}`}
																		/>
																		<label htmlFor={`field-drv-en-${defIndex}-${drvIndex}-${varIdx}`}>en:</label>
																	</div>
																	<div className="compact-field-row">
																		<div className="material-field">
																			<input
																				type="text"
																				value={(variant as TranslationVariant).mw || ''}
																				onChange={(e) => {
																					const newVariants = [...derivative.en as TranslationVariant[]];
																					newVariants[varIdx] = { ...newVariants[varIdx], mw: e.target.value };
																					updateArrayItem<DerivativeItem>(defIndex, 'drv', drvIndex, { en: newVariants });
																				}}
																				disabled={!canEdit}
																				placeholder=" "
																				id={`field-drv-mw-${defIndex}-${drvIndex}-${varIdx}`}
																			/>
																			<label htmlFor={`field-drv-mw-${defIndex}-${drvIndex}-${varIdx}`}>mw:</label>
																		</div>
																		<div className="material-field">
																			<input
																				type="text"
																				value={(variant as TranslationVariant).etym || ''}
																				onChange={(e) => {
																					const newVariants = [...derivative.en as TranslationVariant[]];
																					newVariants[varIdx] = { ...newVariants[varIdx], etym: e.target.value };
																					updateArrayItem<DerivativeItem>(defIndex, 'drv', drvIndex, { en: newVariants });
																				}}
																				disabled={!canEdit}
																				placeholder=" "
																				id={`field-drv-etym-${defIndex}-${drvIndex}-${varIdx}`}
																			/>
																			<label htmlFor={`field-drv-etym-${defIndex}-${drvIndex}-${varIdx}`}>etym:</label>
																		</div>
																	</div>
																</div>
															))}
															{canEdit && (
																<button
																	onClick={() => {
																		const newVariants = [...derivative.en as TranslationVariant[], { en: '' }];
																		updateArrayItem<DerivativeItem>(defIndex, 'drv', drvIndex, { en: newVariants });
																	}}
																	className="section-add btn-secondary"
																>
																	+ variant
																</button>
															)}
														</>
													) : (
														<>
															<div className="material-field">
																<textarea
																	value={derivative.en || ''}
																	onChange={(e) => updateArrayItem<DerivativeItem>(
																		defIndex, 'drv', drvIndex, { en: e.target.value }
																	)}
																	disabled={!canEdit}
																	rows={1}
																	placeholder=" "
																	id={`field-drv-en-simple-${defIndex}-${drvIndex}`}
																/>
																<label htmlFor={`field-drv-en-simple-${defIndex}-${drvIndex}`}>en:</label>
															</div>
															{canEdit && (
																<button
																	onClick={() => {
																		const currentEn = (typeof derivative.en === 'string' ? derivative.en : '') || '';
																		const currentMw = derivative.mw;
																		const newVariants: TranslationVariant[] = [{ en: currentEn, ...(currentMw && { mw: currentMw }) }];
																		updateArrayItem<DerivativeItem>(defIndex, 'drv', drvIndex, { en: newVariants });
																	}}
																	className="section-add btn-secondary"
																	style={{ fontSize: '0.75rem', padding: '0.125rem 0.5rem' }}
																>
																	+ variant
																</button>
															)}
														</>
													)}
												</div>
											))}
											{canEdit && (
												<button
													onClick={() => addToArray<DerivativeItem>(defIndex, 'drv', { tw: '', en: '' })}
													className="section-add btn-secondary"
												>
													+
												</button>
											)}
										</CompactSection>

										{/* Idioms */}
										<CompactSection
											title="※ idm"
											collapsed={collapsedSections.has(`${defIndex}-idm`)}
											onToggle={() => toggleSection(`${defIndex}-idm`)}
										>
											{(def.idm || []).map((idiom, idmIndex) => (
												<div key={idmIndex} className="compact-item">
													{canEdit && (
														<button
															onClick={() => removeFromArray(defIndex, 'idm', idmIndex)}
															className="item-remove btn-icon btn-danger"
														>
															✕
														</button>
													)}
													<div className="material-field">
														<textarea
															value={idiom.tw}
															onChange={(e) => updateArrayItem<IdiomItem>(
																defIndex, 'idm', idmIndex, { tw: e.target.value }
															)}
															disabled={!canEdit}
															rows={1}
															placeholder=" "
															id={`field-idm-tw-${defIndex}-${idmIndex}`}
														/>
														<label htmlFor={`field-idm-tw-${defIndex}-${idmIndex}`}>tw:</label>
													</div>
													{Array.isArray(idiom.en) ? (
														<>
															{idiom.en.map((variant, varIdx) => (
																<div key={varIdx} className="compact-variant">
																	<div className="variant-label">{String.fromCharCode(97 + varIdx)}:</div>
																	{canEdit && (
																		<button
																			onClick={() => {
																				const newVariants = (idiom.en as TranslationVariant[]).filter((_, i) => i !== varIdx);
																				updateArrayItem<IdiomItem>(defIndex, 'idm', idmIndex, { 
																					en: newVariants.length > 0 ? newVariants : '' 
																				});
																			}}
																			className="item-remove btn-icon btn-danger"
																		>
																			✕
																		</button>
																	)}
																	<div className="material-field">
																		<textarea
																			value={(variant as TranslationVariant).en || ''}
																			onChange={(e) => {
																				const newVariants = [...idiom.en as TranslationVariant[]];
																				newVariants[varIdx] = { ...newVariants[varIdx], en: e.target.value };
																				updateArrayItem<IdiomItem>(defIndex, 'idm', idmIndex, { en: newVariants });
																			}}
																			disabled={!canEdit}
																			rows={1}
																			placeholder=" "
																			id={`field-idm-en-${defIndex}-${idmIndex}-${varIdx}`}
																		/>
																		<label htmlFor={`field-idm-en-${defIndex}-${idmIndex}-${varIdx}`}>en:</label>
																	</div>
																	<div className="compact-field-row">
																		<div className="material-field">
																			<input
																				type="text"
																				value={(variant as TranslationVariant).mw || ''}
																				onChange={(e) => {
																					const newVariants = [...idiom.en as TranslationVariant[]];
																					newVariants[varIdx] = { ...newVariants[varIdx], mw: e.target.value };
																					updateArrayItem<IdiomItem>(defIndex, 'idm', idmIndex, { en: newVariants });
																				}}
																				disabled={!canEdit}
																				placeholder=" "
																				id={`field-idm-mw-${defIndex}-${idmIndex}-${varIdx}`}
																			/>
																			<label htmlFor={`field-idm-mw-${defIndex}-${idmIndex}-${varIdx}`}>mw:</label>
																		</div>
																		<div className="material-field">
																			<input
																				type="text"
																				value={(variant as TranslationVariant).etym || ''}
																				onChange={(e) => {
																					const newVariants = [...idiom.en as TranslationVariant[]];
																					newVariants[varIdx] = { ...newVariants[varIdx], etym: e.target.value };
																					updateArrayItem<IdiomItem>(defIndex, 'idm', idmIndex, { en: newVariants });
																				}}
																				disabled={!canEdit}
																				placeholder=" "
																				id={`field-idm-etym-${defIndex}-${idmIndex}-${varIdx}`}
																			/>
																			<label htmlFor={`field-idm-etym-${defIndex}-${idmIndex}-${varIdx}`}>etym:</label>
																		</div>
																	</div>
																</div>
															))}
															{canEdit && (
																<button
																	onClick={() => {
																		const newVariants = [...idiom.en as TranslationVariant[], { en: '' }];
																		updateArrayItem<IdiomItem>(defIndex, 'idm', idmIndex, { en: newVariants });
																	}}
																	className="section-add btn-secondary"
																>
																	+ variant
																</button>
															)}
														</>
													) : (
														<>
															<div className="material-field">
																<textarea
																	value={idiom.en || ''}
																	onChange={(e) => updateArrayItem<IdiomItem>(
																		defIndex, 'idm', idmIndex, { en: e.target.value }
																	)}
																	disabled={!canEdit}
																	rows={1}
																	placeholder=" "
																	id={`field-idm-en-simple-${defIndex}-${idmIndex}`}
																/>
																<label htmlFor={`field-idm-en-simple-${defIndex}-${idmIndex}`}>en:</label>
															</div>
															{canEdit && (
																<button
																	onClick={() => {
																		const currentEn = (typeof idiom.en === 'string' ? idiom.en : '') || '';
																		const newVariants: TranslationVariant[] = [{ en: currentEn }];
																		updateArrayItem<IdiomItem>(defIndex, 'idm', idmIndex, { en: newVariants });
																	}}
																	className="section-add btn-secondary"
																	style={{ fontSize: '0.75rem', padding: '0.125rem 0.5rem' }}
																>
																	+ variant
																</button>
															)}
														</>
													)}
												</div>
											))}
											{canEdit && (
												<button
													onClick={() => addToArray<IdiomItem>(defIndex, 'idm', { tw: '', en: '' })}
													className="section-add btn-secondary"
												>
													+
												</button>
											)}
										</CompactSection>
									</div>
								)}
							</div>
						))}

						{canEdit && (
							<button onClick={addDef} className="btn-secondary" style={{ marginTop: '1rem' }}>
								+ Add Definition
							</button>
						)}
					</div>
				) : (
					<div className="reviews-tab-content">
						<ReviewPanel entryId={parseInt(id!)} />
					</div>
				)}
			</div>
		</div>
	);
}

// Compact collapsible section component
function CompactSection({ 
	title, 
	collapsed, 
	onToggle, 
	children 
}: { 
	title: string; 
	collapsed: boolean; 
	onToggle: () => void; 
	children: React.ReactNode;
}) {
	return (
		<div className={`compact-section ${collapsed ? 'collapsed' : ''}`}>
			<div className="compact-section-header" onClick={onToggle}>
				<span className="collapse-icon">▼</span>
				<span>{title}</span>
			</div>
			<div className="compact-section-content">
				{children}
			</div>
		</div>
	);
}
