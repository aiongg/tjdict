import { useState, useEffect } from 'react';

/**
 * Custom hook to detect if a media query matches
 * @param query - Media query string (e.g., '(min-width: 1280px)')
 * @returns boolean indicating if the query matches
 */
export function useMediaQuery(query: string): boolean {
	const [matches, setMatches] = useState<boolean>(() => {
		// Initialize with current match state (avoid hydration mismatch)
		if (typeof window !== 'undefined') {
			return window.matchMedia(query).matches;
		}
		return false;
	});

	useEffect(() => {
		const mediaQuery = window.matchMedia(query);
		
		// Update state if initial value was different
		setMatches(mediaQuery.matches);

		// Create event listener for changes
		const handler = (event: MediaQueryListEvent) => {
			setMatches(event.matches);
		};

		// Modern browsers
		mediaQuery.addEventListener('change', handler);

		// Cleanup
		return () => {
			mediaQuery.removeEventListener('change', handler);
		};
	}, [query]);

	return matches;
}

