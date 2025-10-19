import { useState, useEffect, useRef } from 'react';

interface FieldVisibilityMenuProps {
	path: string;
	availableFields: string[];
	isFieldVisible: (path: string, field: string) => boolean;
	onToggleField: (path: string, field: string) => void;
	canEdit: boolean;
}

export function FieldVisibilityMenu({
	path,
	availableFields,
	isFieldVisible,
	onToggleField,
	canEdit
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
	
	// Debug: show button even if no fields to help diagnose issues
	if (availableFields.length === 0) {
		console.log('FieldVisibilityMenu: No available fields for path:', path);
	}

	return (
		<div className="field-visibility-menu" ref={menuRef}>
			<button
				className="menu-toggle"
				onClick={(e) => {
					e.stopPropagation();
					setIsOpen(!isOpen);
				}}
				title="Toggle field visibility"
			>
				⋮
			</button>
			{isOpen && (
				<div className="menu-dropdown">
					{availableFields.map(field => (
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
				</div>
			)}
		</div>
	);
}

