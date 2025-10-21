import { useState, useRef, useEffect } from 'react';

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
		const baseClass = compact ? 'review-badge review-badge--compact' : 'review-badge';
		if (currentStatus === 'approved') return `${baseClass} review-badge--approved`;
		if (currentStatus === 'needs_work') return `${baseClass} review-badge--needs-work`;
		if (currentStatus === 'submitted') return `${baseClass} review-badge--submitted`;
		if (currentStatus === 'draft') return `${baseClass} review-badge--draft`;
		return `${baseClass} review-badge--default`;
	};

	const getBadgeText = () => {
		if (currentStatus === 'approved') return '✓ Approved';
		if (currentStatus === 'needs_work') return '✗ Needs work';
		if (currentStatus === 'submitted') return '→ Submitted';
		if (currentStatus === 'draft') return '◯ Draft';
		return 'Set status';
	};

	const getCompactBadgeText = () => {
		if (currentStatus === 'approved') return '✓';
		if (currentStatus === 'needs_work') return '✗';
		if (currentStatus === 'submitted') return '→';
		if (currentStatus === 'draft') return '◯';
		return '○'; // Empty circle for no status
	};

	return (
		<div className="review-badge-container" ref={dropdownRef}>
			<button
				className={getBadgeClass()}
				onClick={() => !disabled && setIsOpen(!isOpen)}
				disabled={disabled || isSubmitting}
				type="button"
			>
				{compact ? getCompactBadgeText() : getBadgeText()}
			</button>

			{isOpen && (
				<div className="review-badge-dropdown">
					<button
						className="review-badge-dropdown-item review-badge-dropdown-item--draft"
						onClick={() => handleStatusClick('draft')}
						disabled={isSubmitting}
						type="button"
					>
						◯ Draft
					</button>
					<button
						className="review-badge-dropdown-item review-badge-dropdown-item--submitted"
						onClick={() => handleStatusClick('submitted')}
						disabled={isSubmitting}
						type="button"
					>
						→ Submitted
					</button>
					<button
						className="review-badge-dropdown-item review-badge-dropdown-item--needs-work"
						onClick={() => handleStatusClick('needs_work')}
						disabled={isSubmitting}
						type="button"
					>
						✗ Needs work
					</button>
					<button
						className="review-badge-dropdown-item review-badge-dropdown-item--approve"
						onClick={() => handleStatusClick('approved')}
						disabled={isSubmitting}
						type="button"
					>
						✓ Approved
					</button>
				</div>
			)}
		</div>
	);
}

