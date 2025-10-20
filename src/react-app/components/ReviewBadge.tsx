import { useState, useRef, useEffect } from 'react';

interface ReviewBadgeProps {
	currentStatus?: 'approved' | 'needs_work' | null;
	onStatusChange: (status: 'approved' | 'needs_work') => Promise<void>;
	compact?: boolean;
	disabled?: boolean;
	onDropdownOpenChange?: (isOpen: boolean) => void;
}

export function ReviewBadge({ currentStatus, onStatusChange, compact = false, disabled = false, onDropdownOpenChange }: ReviewBadgeProps) {
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

	const handleStatusClick = async (status: 'approved' | 'needs_work') => {
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
		return `${baseClass} review-badge--default`;
	};

	const getBadgeText = () => {
		if (currentStatus === 'approved') return '✓ Approve';
		if (currentStatus === 'needs_work') return '✗ Needs work';
		return 'Review';
	};

	const getCompactBadgeText = () => {
		if (currentStatus === 'approved') return '✓';
		if (currentStatus === 'needs_work') return '✗';
		return '○'; // Empty circle for no review
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
						className="review-badge-dropdown-item review-badge-dropdown-item--approve"
						onClick={() => handleStatusClick('approved')}
						disabled={isSubmitting}
						type="button"
					>
						✓ Approve
					</button>
					<button
						className="review-badge-dropdown-item review-badge-dropdown-item--needs-work"
						onClick={() => handleStatusClick('needs_work')}
						disabled={isSubmitting}
						type="button"
					>
						✗ Needs work
					</button>
				</div>
			)}
		</div>
	);
}

