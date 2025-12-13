import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

interface FocusModeContextType {
  isFocusMode: boolean;
  toggleFocusMode: () => void;
  exitFocusMode: () => void;
}

const FocusModeContext = createContext<FocusModeContextType | undefined>(undefined);

export const FocusModeProvider = ({ children }: { children: ReactNode }) => {
  const [isFocusMode, setIsFocusMode] = useState(() => {
    const stored = localStorage.getItem('hackmate_focus_mode');
    return stored === 'true';
  });

  const toggleFocusMode = useCallback(() => {
    setIsFocusMode(prev => {
      const newValue = !prev;
      localStorage.setItem('hackmate_focus_mode', String(newValue));
      return newValue;
    });
  }, []);

  const exitFocusMode = useCallback(() => {
    setIsFocusMode(false);
    localStorage.setItem('hackmate_focus_mode', 'false');
  }, []);

  // Keyboard listener for Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFocusMode) {
        exitFocusMode();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFocusMode, exitFocusMode]);

  return (
    <FocusModeContext.Provider value={{ isFocusMode, toggleFocusMode, exitFocusMode }}>
      {children}
    </FocusModeContext.Provider>
  );
};

export const useFocusMode = () => {
  const context = useContext(FocusModeContext);
  if (!context) {
    throw new Error('useFocusMode must be used within a FocusModeProvider');
  }
  return context;
};
