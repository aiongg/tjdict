import { useState, useRef, KeyboardEvent, ClipboardEvent, ChangeEvent } from 'react';

interface ChipInputProps {
	values: string[];
	onChange: (values: string[]) => void;
	disabled?: boolean;
	placeholder?: string;
	allowedValues?: string[];  // Optional enum validation
	id?: string;
}

export function ChipInput({ 
	values, 
	onChange, 
	disabled = false, 
	placeholder = 'Type and press Enter or comma...', 
	allowedValues,
	id 
}: ChipInputProps) {
	const [inputValue, setInputValue] = useState('');
	const [isFocused, setIsFocused] = useState(false);
	const [error, setError] = useState('');
	const inputRef = useRef<HTMLInputElement>(null);
	const containerRef = useRef<HTMLDivElement>(null);

	// Focus input when container is clicked
	const handleContainerClick = () => {
		if (!disabled && inputRef.current) {
			inputRef.current.focus();
		}
	};

	// Add a new chip
	const addChip = (chipValue: string) => {
		const trimmedValue = chipValue.trim();
		
		if (!trimmedValue) {
			return;
		}

		// Check for duplicates
		if (values.includes(trimmedValue)) {
			setError('Duplicate value not allowed');
			setTimeout(() => setError(''), 3000);
			return;
		}

		// Custom validation for allowed values
		if (allowedValues && !allowedValues.includes(trimmedValue)) {
			setError(`Invalid value. Allowed: ${allowedValues.join(', ')}`);
			setTimeout(() => setError(''), 3000);
			return;
		}

		// Add the chip
		onChange([...values, trimmedValue]);
		setInputValue('');
		setError('');
	};

	// Remove a chip by index
	const removeChip = (indexToRemove: number) => {
		onChange(values.filter((_, index) => index !== indexToRemove));
	};

	// Handle input change
	const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
		const newValue = e.target.value;
		
		// Check for comma - create chip if found
		if (newValue.includes(',')) {
			const chips = newValue.split(',').filter(chip => chip.trim());
			chips.forEach(chip => {
				if (chip.trim()) {
					addChip(chip);
				}
			});
			setInputValue('');
		} else {
			setInputValue(newValue);
		}
	};

	// Handle key down events
	const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
		// Enter key - add chip
		if (e.key === 'Enter') {
			e.preventDefault();
			if (inputValue.trim()) {
				addChip(inputValue);
			}
		}
		
		// Backspace - remove last chip if input is empty
		if (e.key === 'Backspace' && !inputValue && values.length > 0) {
			removeChip(values.length - 1);
		}

		// Escape - clear input and blur
		if (e.key === 'Escape') {
			setInputValue('');
			inputRef.current?.blur();
		}
	};

	// Handle paste event
	const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
		e.preventDefault();
		const pastedText = e.clipboardData.getData('text');
		const chips = pastedText.split(/[,\n]/).filter(chip => chip.trim());
		
		chips.forEach(chip => {
			if (chip.trim()) {
				addChip(chip);
			}
		});
	};

	return (
		<div className="chip-input-wrapper">
			<div
				ref={containerRef}
				className={`chip-input-container outlined ${isFocused ? 'focused' : ''} ${disabled ? 'disabled' : ''} ${error ? 'error' : ''}`}
				onClick={handleContainerClick}
			>
				<div className="chips-wrapper">
					{values.map((chip, index) => (
						<div key={index} className="chip">
							<span className="chip-text">{chip}</span>
							{!disabled && (
								<button
									type="button"
									className="chip-remove"
									onClick={(e) => {
										e.stopPropagation();
										removeChip(index);
									}}
									aria-label={`Remove ${chip}`}
								>
									<svg width="14" height="14" viewBox="0 0 14 14" fill="none">
										<path
											d="M14 1.41L12.59 0L7 5.59L1.41 0L0 1.41L5.59 7L0 12.59L1.41 14L7 8.41L12.59 14L14 12.59L8.41 7L14 1.41Z"
											fill="currentColor"
										/>
									</svg>
								</button>
							)}
						</div>
					))}
					
					<input
						ref={inputRef}
						type="text"
						className="chip-input"
						value={inputValue}
						onChange={handleInputChange}
						onKeyDown={handleKeyDown}
						onPaste={handlePaste}
						onFocus={() => setIsFocused(true)}
						onBlur={() => setIsFocused(false)}
						placeholder={values.length === 0 ? placeholder : ''}
						disabled={disabled}
						aria-label="Chip input"
						id={id}
					/>
				</div>
			</div>
			
			{error && (
				<div className="chip-input-error" role="alert">
					{error}
				</div>
			)}
		</div>
	);
}
