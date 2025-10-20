import { useState, useEffect, useCallback, useRef } from 'react';
import { TransformWrapper, TransformComponent, ReactZoomPanPinchRef } from 'react-zoom-pan-pinch';

interface PageImageViewerProps {
	pageNumber: number;
	isOpen: boolean;
	onClose: () => void;
	mode: 'desktop' | 'mobile';
}

export function PageImageViewer({ pageNumber, isOpen, onClose, mode }: PageImageViewerProps) {
	const [currentPage, setCurrentPage] = useState(pageNumber);
	const [imageError, setImageError] = useState(false);
	const transformRef = useRef<ReactZoomPanPinchRef>(null);

	// Reset current page and transform when pageNumber prop changes
	useEffect(() => {
		setCurrentPage(pageNumber);
		setImageError(false);
		// Reset zoom/pan when page changes
		if (transformRef.current) {
			transformRef.current.resetTransform();
		}
	}, [pageNumber]);

	// Handle keyboard navigation
	useEffect(() => {
		if (!isOpen) return;

		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				onClose();
			} else if (e.key === 'ArrowLeft') {
				handlePrevPage();
			} else if (e.key === 'ArrowRight') {
				handleNextPage();
			}
		};

		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	}, [isOpen, currentPage, onClose]);

	const handlePrevPage = useCallback(() => {
		if (currentPage > 1) {
			setCurrentPage(currentPage - 1);
			setImageError(false);
			// Reset zoom/pan when changing pages
			if (transformRef.current) {
				transformRef.current.resetTransform();
			}
		}
	}, [currentPage]);

	const handleNextPage = useCallback(() => {
		if (currentPage < 588) {
			setCurrentPage(currentPage + 1);
			setImageError(false);
			// Reset zoom/pan when changing pages
			if (transformRef.current) {
				transformRef.current.resetTransform();
			}
		}
	}, [currentPage]);

	const handleImageError = () => {
		setImageError(true);
	};

	const getImageUrl = (page: number) => {
		const paddedPage = page.toString().padStart(3, '0');
		return `/api/images/tj_page_${paddedPage}.webp`;
	};

	if (!isOpen) return null;

	const canGoPrev = currentPage > 1;
	const canGoNext = currentPage < 588;

	return (
		<div className={`page-image-viewer ${mode}`}>
			{/* Close button */}
			<button
				className="page-viewer-close"
				onClick={onClose}
				aria-label="Close image viewer"
			>
				×
			</button>

			{/* Page navigation info */}
			<div className="page-viewer-header">
				<span className="page-viewer-page-num">Page {currentPage}</span>
			</div>

			{/* Image container with zoom/pan */}
			<div className="page-viewer-content">
				<TransformWrapper
					ref={transformRef}
					initialScale={1}
					minScale={1}
					maxScale={3}
					centerOnInit={mode === 'mobile'}
					limitToBounds={true}
					doubleClick={{ mode: 'reset' }}
				>
					<TransformComponent
						wrapperClass="page-viewer-transform-wrapper"
						contentClass="page-viewer-transform-content"
					>
						{imageError ? (
							<div className="page-viewer-error">
								<p>Failed to load image for page {currentPage}</p>
							</div>
						) : (
							<img
								src={getImageUrl(currentPage)}
								alt={`Dictionary page ${currentPage}`}
								onError={handleImageError}
								className="page-viewer-image"
							/>
						)}
					</TransformComponent>
				</TransformWrapper>
			</div>

			{/* Navigation controls */}
			<div className="page-viewer-nav">
				<button
					className="page-viewer-nav-btn prev"
					onClick={handlePrevPage}
					disabled={!canGoPrev}
					aria-label="Previous page"
				>
					‹
				</button>
				<button
					className="page-viewer-nav-btn next"
					onClick={handleNextPage}
					disabled={!canGoNext}
					aria-label="Next page"
				>
					›
				</button>
			</div>
		</div>
	);
}

