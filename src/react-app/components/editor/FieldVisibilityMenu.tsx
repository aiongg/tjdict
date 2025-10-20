import { useState, useEffect, useRef } from 'react';

export interface MenuItem {
	label: string;
	onClick: (e: React.MouseEvent) => void;
	danger?: boolean;
	divider?: boolean;
}

interface FieldVisibilityMenuProps {
	path: string;
	availableFields: string[];
	isFieldVisible: (path: string, field: string) => boolean;
	onToggleField: (path: string, field: string) => void;
	canEdit: boolean;
	menuItems?: MenuItem[];
}

export function FieldVisibilityMenu({
	path,
	availableFields,
	isFieldVisible,
	onToggleField,
	canEdit,
	menuItems = []
}: FieldVisibilityMenuProps) {
	const [isOpen, setIsOpen] = useState(false);
	const menuRef = useRef<HTMLDivElement>(null);

	// Close menu when clicking outside
	useEffect(() => {
		if (!isOpen) return;

		const handleClickOutside = (event: MouseEvent) => {
			if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
				setIsOpen(false);
			}
		};

		document.addEventListener('mousedown', handleClickOutside);
		return () => document.removeEventListener('mousedown', handleClickOutside);
	}, [isOpen]);

	if (!canEdit) return null;
	
	const hasContent = availableFields.length > 0 || menuItems.length > 0;
	if (!hasContent) return null;

	// Separate boolean flags from other fields
	const booleanFlags = ['bound', 'takes_a2', 'dup'];
	const regularFields = availableFields.filter(f => !booleanFlags.includes(f));
	const flagFields = availableFields.filter(f => booleanFlags.includes(f));

	// Get display label for field
	const getFieldLabel = (field: string): string => {
		switch (field) {
			case 'bound': return 'B.';
			case 'takes_a2': return '[á]';
			case 'dup': return '[x]';
			default: return field;
		}
	};

	return (
		<div className="field-visibility-menu" ref={menuRef}>
			<button
				className="menu-toggle"
				onClick={(e) => {
					e.stopPropagation();
					setIsOpen(!isOpen);
				}}
				title="Options"
			>
				⋮
			</button>
			{isOpen && (
				<div className="menu-dropdown">
					{/* Regular field toggles */}
					{regularFields.map(field => (
						<label key={field} className="menu-item">
							<input
								type="checkbox"
								checked={isFieldVisible(path, field)}
								onChange={() => {
									onToggleField(path, field);
								}}
							/>
							<span>{field}</span>
						</label>
					))}
					
					{/* Boolean flag toggles */}
					{flagFields.length > 0 && (
						<>
							{regularFields.length > 0 && <div className="menu-divider"></div>}
							{flagFields.map(field => (
								<label key={field} className="menu-item">
									<input
										type="checkbox"
										checked={isFieldVisible(path, field)}
										onChange={() => {
											onToggleField(path, field);
										}}
									/>
									<span>{getFieldLabel(field)}</span>
								</label>
							))}
						</>
					)}
					
					{/* Divider if we have fields and actions */}
					{availableFields.length > 0 && menuItems.length > 0 && (
						<div className="menu-divider"></div>
					)}
					
					{/* Action items */}
					{menuItems.map((item, index) => (
						<div key={index}>
							{item.divider && <div className="menu-divider"></div>}
							<button
								className={`menu-item menu-action ${item.danger ? 'menu-action-danger' : ''}`}
								onClick={(e) => {
									e.stopPropagation();
									item.onClick(e);
									setIsOpen(false);
								}}
							>
								{item.label}
							</button>
						</div>
					))}
				</div>
			)}
		</div>
	);
}

