import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

interface UserPreferencesContextType {
    nsfwEnabled: boolean;
    isConfirmingNsfw: boolean;
    toggleNsfw: () => void;
    confirmNsfw: () => void;
    cancelNsfw: () => void;
}

const UserPreferencesContext = createContext<UserPreferencesContextType | null>(null);

export const useUserPreferences = () => {
    const ctx = useContext(UserPreferencesContext);
    if (!ctx) throw new Error('useUserPreferences must be used within UserPreferencesProvider');
    return ctx;
};

const NSFW_STORAGE_KEY = 'fedda_nsfw_enabled_v1';

export const UserPreferencesProvider = ({ children }: { children: ReactNode }) => {
    // Initial load from localStorage
    const [nsfwEnabled, setNsfwEnabled] = useState<boolean>(() => {
        try {
            const stored = localStorage.getItem(NSFW_STORAGE_KEY);
            return stored === 'true';
        } catch {
            return false;
        }
    });

    const [isConfirmingNsfw, setIsConfirmingNsfw] = useState(false);

    // Apply global CSS class for theme shifting when enabled
    useEffect(() => {
        if (nsfwEnabled) {
            document.documentElement.classList.add('nsfw-active');
        } else {
            document.documentElement.classList.remove('nsfw-active');
        }
    }, [nsfwEnabled]);

    // Save to localStorage on change
    useEffect(() => {
        try {
            localStorage.setItem(NSFW_STORAGE_KEY, String(nsfwEnabled));
        } catch {
            // ignore
        }
    }, [nsfwEnabled]);

    const toggleNsfw = () => {
        if (nsfwEnabled) {
            // Disable immediately, no confirmation needed
            setNsfwEnabled(false);
        } else {
            // Require confirmation to enable
            setIsConfirmingNsfw(true);
        }
    };

    const confirmNsfw = () => {
        setNsfwEnabled(true);
        setIsConfirmingNsfw(false);
    };

    const cancelNsfw = () => {
        setIsConfirmingNsfw(false);
    };

    return (
        <UserPreferencesContext.Provider value={{
            nsfwEnabled,
            isConfirmingNsfw,
            toggleNsfw,
            confirmNsfw,
            cancelNsfw
        }}>
            {children}
        </UserPreferencesContext.Provider>
    );
};
