// src/components/hero/LoginPromptModal.tsx
'use client';

import React from 'react';
import { Star, X, LogIn } from 'lucide-react';
import { createPortal } from 'react-dom';

interface LoginPromptModalProps {
    isOpen: boolean;
    onClose: () => void;
    onLogin: () => void;
    onSignup: () => void;
}

const LoginPromptModal: React.FC<LoginPromptModalProps> = ({
    isOpen,
    onClose,
    onLogin,
    onSignup
}) => {
    if (!isOpen) return null;

    return createPortal(
        <div
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
            onClick={onClose}
        >
            <div
                className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-sm w-full relative"
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    onClick={onClose}
                    className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    aria-label="Close modal"
                >
                    <X size={24} />
                </button>
                <div className="text-center">
                    <Star className="mx-auto mb-4 text-blue-500 dark:text-blue-400" size={48} />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                        Add to Favorites
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300 mb-6">
                        Sign in or create an account to add this figure to your favorites.
                    </p>

                    <div className="space-y-3">
                        <button
                            onClick={onLogin}
                            className="w-full bg-blue-600 dark:bg-blue-500 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
                        >
                            <LogIn size={18} />
                            Sign In
                        </button>

                        <button
                            onClick={onSignup}
                            className="w-full bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-semibold py-2 px-4 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                        >
                            Create Account
                        </button>

                        <button
                            onClick={onClose}
                            className="w-full text-gray-500 dark:text-gray-400 text-sm hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                        >
                            Maybe later
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default LoginPromptModal;
