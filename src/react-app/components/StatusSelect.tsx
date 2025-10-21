import { useState, useRef, useEffect } from 'react';
import { PenLine, Upload, TriangleAlert, CheckCircle } from 'lucide-react';

interface ReviewBadgeProps {
	currentStatus?: 'draft' | 'submitted' | 'needs_work' | 'approved' | null;
	onStatusChange: (status: 'draft' | 'submitted' | 'needs_work' | 'approved') => Promise<void>;
	compact?: boolean;
	disabled?: boolean;
	onDropdownOpenChange?: (isOpen: boolean) => void;
}

export function StatusSelect({ currentStatus, onStatusChange, compact = false, disabled = false, onDropdownOpenChange }: ReviewBadgeProps) {
	const [isOpen, setIsOpen] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const dropdownRef = useRef<HTMLDivElement>(null);

	// Notify parent when dropdown state changes
	useEffect(() => {
		onDropdownOpenChange?.(isOpen);
	}, [isOpen, onDropdownOpenChange]);

	// Close dropdown when clicking outside
	useEffect(() => {
		function handleClickOutside(event: MouseEvent) {
			if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
				setIsOpen(false);
			}
		}

		if (isOpen) {
			document.addEventListener('mousedown', handleClickOutside);
			return () => document.removeEventListener('mousedown', handleClickOutside);
		}
	}, [isOpen]);

	const handleStatusClick = async (status: 'draft' | 'submitted' | 'needs_work' | 'approved') => {
		if (isSubmitting) return;
		
		setIsSubmitting(true);
		try {
			await onStatusChange(status);
			setIsOpen(false);
		} catch (error) {
			console.error('Failed to update review status:', error);
		} finally {
			setIsSubmitting(false);
		}
	};

	const getBadgeClass = () => {
		const baseClass = compact ? 'status-select status-select--compact' : 'status-select';
		if (currentStatus === 'approved') return `${baseClass} status-select--approved`;
		if (currentStatus === 'needs_work') return `${baseClass} status-select--needs-work`;
		if (currentStatus === 'submitted') return `${baseClass} status-select--submitted`;
		if (currentStatus === 'draft') return `${baseClass} status-select--draft`;
		return `${baseClass} status-select--default`;
	};

	const getBadgeContent = () => {
		if (currentStatus === 'approved') return { icon: <CheckCircle size={16} />, text: 'Approved' };
		if (currentStatus === 'needs_work') return { icon: <TriangleAlert size={16} />, text: 'Needs work' };
		if (currentStatus === 'submitted') return { icon: <Upload size={16} />, text: 'Submitted' };
		if (currentStatus === 'draft') return { icon: <PenLine size={16} />, text: 'Draft' };
		return { icon: null, text: 'Set status' };
	};

	const getCompactBadgeContent = () => {
		if (currentStatus === 'approved') return <CheckCircle size={14} />;
		if (currentStatus === 'needs_work') return <TriangleAlert size={14} />;
		if (currentStatus === 'submitted') return <Upload size={14} />;
		if (currentStatus === 'draft') return <PenLine size={14} />;
		return <PenLine size={14} />; // Default to pen icon
	};

	const badgeContent = getBadgeContent();
	
	return (
		<div className="status-select-container" ref={dropdownRef}>
			<button
				className={getBadgeClass()}
				onClick={() => !disabled && setIsOpen(!isOpen)}
				disabled={disabled || isSubmitting}
				type="button"
			>
				{compact ? getCompactBadgeContent() : (
					<>
						{badgeContent.icon}
						{badgeContent.text}
					</>
				)}
			</button>

			{isOpen && (
				<div className="status-select-dropdown">
					<button
						className="status-select-dropdown-item status-select-dropdown-item--draft"
						onClick={() => handleStatusClick('draft')}
						disabled={isSubmitting}
						type="button"
					>
						<PenLine size={16} /> Draft
					</button>
					<button
						className="status-select-dropdown-item status-select-dropdown-item--submitted"
						onClick={() => handleStatusClick('submitted')}
						disabled={isSubmitting}
						type="button"
					>
						<Upload size={16} /> Submitted
					</button>
					<button
						className="status-select-dropdown-item status-select-dropdown-item--needs-work"
						onClick={() => handleStatusClick('needs_work')}
						disabled={isSubmitting}
						type="button"
					>
						<TriangleAlert size={16} /> Needs work
					</button>
					<button
						className="status-select-dropdown-item status-select-dropdown-item--approve"
						onClick={() => handleStatusClick('approved')}
						disabled={isSubmitting}
						type="button"
					>
						<CheckCircle size={16} /> Approved
					</button>
				</div>
			)}
		</div>
	);
}

