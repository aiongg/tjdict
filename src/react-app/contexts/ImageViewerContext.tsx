import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface ImageViewerContextType {
  isOpen: boolean;
  currentPage: number | null;
  openViewer: (page: number) => void;
  closeViewer: () => void;
  setPage: (page: number) => void;
}

const ImageViewerContext = createContext<ImageViewerContextType | undefined>(undefined);

export function ImageViewerProvider({ children }: { children: ReactNode }) {
  // Initialize from localStorage if available
  const [isOpen, setIsOpen] = useState<boolean>(() => {
    const saved = localStorage.getItem('imageViewerOpen');
    return saved === 'true';
  });
  
  const [currentPage, setCurrentPage] = useState<number | null>(() => {
    const saved = localStorage.getItem('imageViewerPage');
    return saved ? parseInt(saved, 10) : null;
  });

  // Persist to localStorage whenever state changes
  useEffect(() => {
    localStorage.setItem('imageViewerOpen', isOpen.toString());
  }, [isOpen]);

  useEffect(() => {
    if (currentPage !== null) {
      localStorage.setItem('imageViewerPage', currentPage.toString());
    } else {
      localStorage.removeItem('imageViewerPage');
    }
  }, [currentPage]);

  const openViewer = (page: number) => {
    setCurrentPage(page);
    setIsOpen(true);
  };

  const closeViewer = () => {
    setIsOpen(false);
  };

  const setPage = (page: number) => {
    setCurrentPage(page);
  };

  return (
    <ImageViewerContext.Provider value={{ isOpen, currentPage, openViewer, closeViewer, setPage }}>
      {children}
    </ImageViewerContext.Provider>
  );
}

export function useImageViewer() {
  const context = useContext(ImageViewerContext);
  if (context === undefined) {
    throw new Error('useImageViewer must be used within an ImageViewerProvider');
  }
  return context;
}

