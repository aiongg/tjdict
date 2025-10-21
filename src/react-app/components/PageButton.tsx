import { BookOpenText } from 'lucide-react';

interface PageButtonProps {
	pageNumber: number;
	onClick: (pageNumber: number) => void;
	variant?: 'list' | 'editor';
}

export function PageButton({ pageNumber, onClick, variant = 'list' }: PageButtonProps) {
	const handleClick = (e: React.MouseEvent) => {
		e.stopPropagation();
		onClick(pageNumber);
	};

	if (variant === 'list') {
		return (
			<button
				className="page-link-button"
				onClick={handleClick}
				title={`View dictionary page ${pageNumber}`}
			>
				<BookOpenText size={14} />
				<span>p. {pageNumber}</span>
			</button>
		);
	}

	return (
		<button
			onClick={handleClick}
			className="btn-secondary btn-page"
			title={`View dictionary page ${pageNumber}`}
		>
			<BookOpenText size={16} />
			<span>p. {pageNumber}</span>
		</button>
	);
}

