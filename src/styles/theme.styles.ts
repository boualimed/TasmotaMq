import { css } from 'lit';

/**
 * Shared theme styles with design tokens
 * Can be imported by any component for consistent styling
 */
export const themeStyles = css`
  /* Color Variables */
  :host {
    /* Primary Colors */
    --color-primary: #667eea;
    --color-primary-dark: #764ba2;
    --color-primary-light: rgba(102, 126, 234, 0.1);

    /* Success Colors */
    --color-success: #10b981;
    --color-success-dark: #059669;
    --color-success-light: rgba(16, 185, 129, 0.1);

    /* Error Colors */
    --color-error: #ef4444;
    --color-error-dark: #dc2626;
    --color-error-light: rgba(239, 68, 68, 0.1);

    /* Warning Colors */
    --color-warning: #f59e0b;
    --color-warning-dark: #d97706;
    --color-warning-light: rgba(251, 191, 36, 0.1);

    /* Info Colors */
    --color-info: #3b82f6;
    --color-info-dark: #2563eb;
    --color-info-light: rgba(59, 130, 246, 0.1);

    /* Neutral Colors */
    --color-white: #ffffff;
    --color-gray-50: #f9fafb;
    --color-gray-100: #f3f4f6;
    --color-gray-200: #e5e7eb;
    --color-gray-300: #d1d5db;
    --color-gray-400: #9ca3af;
    --color-gray-500: #6b7280;
    --color-gray-600: #4b5563;
    --color-gray-700: #374151;
    --color-gray-800: #1f2937;
    --color-gray-900: #111827;

    /* Background Gradients */
    --gradient-primary: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    --gradient-success: linear-gradient(135deg, #10b981 0%, #059669 100%);
    --gradient-error: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
    --gradient-warning: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
    --gradient-page: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);

    /* Spacing */
    --spacing-xs: 4px;
    --spacing-sm: 8px;
    --spacing-md: 16px;
    --spacing-lg: 24px;
    --spacing-xl: 32px;

    /* Border Radius */
    --radius-sm: 8px;
    --radius-md: 10px;
    --radius-lg: 12px;
    --radius-xl: 15px;
    --radius-2xl: 20px;

    /* Shadows */
    --shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.08);
    --shadow-md: 0 4px 20px rgba(0, 0, 0, 0.1);
    --shadow-lg: 0 8px 25px rgba(0, 0, 0, 0.15);
    --shadow-xl: 0 20px 60px rgba(0, 0, 0, 0.3);

    /* Transitions */
    --transition-fast: 0.15s ease;
    --transition-base: 0.3s ease;
    --transition-slow: 0.5s ease;

    /* Typography */
    --font-size-xs: 0.75rem;
    --font-size-sm: 0.85rem;
    --font-size-base: 1rem;
    --font-size-lg: 1.1rem;
    --font-size-xl: 1.3rem;
    --font-size-2xl: 1.8rem;
    --font-size-3xl: 2rem;

    --font-weight-normal: 400;
    --font-weight-medium: 500;
    --font-weight-semibold: 600;
    --font-weight-bold: 700;
  }
`;

/**
 * Common button styles that can be reused
 */
export const buttonStyles = css`
  .btn {
    padding: 12px 20px;
    border: none;
    border-radius: var(--radius-md);
    font-size: var(--font-size-base);
    font-weight: var(--font-weight-semibold);
    cursor: pointer;
    transition: all var(--transition-base);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }

  .btn-primary {
    background: var(--gradient-primary);
    color: white;
  }

  .btn-primary:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
  }

  .btn-success {
    background: var(--gradient-success);
    color: white;
  }

  .btn-success:hover {
    transform: translateY(-2px);
    box-shadow: 0 5px 15px rgba(16, 185, 129, 0.3);
  }

  .btn-danger {
    background: var(--gradient-error);
    color: white;
  }

  .btn-danger:hover {
    transform: translateY(-2px);
    box-shadow: 0 5px 15px rgba(239, 68, 68, 0.3);
  }

  .btn:disabled {
    background: var(--color-gray-400);
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
    opacity: 0.5;
  }
`;

/**
 * Common form input styles
 */
export const formStyles = css`
  .form-input {
    padding: 12px 15px;
    border: 2px solid var(--color-gray-200);
    border-radius: var(--radius-md);
    font-size: var(--font-size-base);
    transition: all var(--transition-base);
    background: var(--color-gray-50);
    width: 100%;
    box-sizing: border-box;
  }

  .form-input:focus {
    outline: none;
    border-color: var(--color-primary);
    background: var(--color-white);
    box-shadow: 0 0 0 3px var(--color-primary-light);
  }

  .form-label {
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-medium);
    color: var(--color-gray-600);
    display: block;
    margin-bottom: var(--spacing-sm);
  }
`;

/**
 * Common card styles
 */
export const cardStyles = css`
  .card {
    background: var(--color-white);
    border-radius: var(--radius-xl);
    padding: 25px;
    box-shadow: var(--shadow-md);
  }

  .card-header {
    font-size: var(--font-size-xl);
    font-weight: var(--font-weight-semibold);
    color: var(--color-gray-800);
    margin-bottom: var(--spacing-lg);
  }
`;