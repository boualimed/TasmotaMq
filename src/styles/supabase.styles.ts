import { css } from 'lit';
// ============================================================================
// supabase.styles.ts - Modern Dark Theme
// ============================================================================

export const supabaseStyles = css`

  :host {
    display: block;
    min-height: 100vh;
    background:
      radial-gradient(ellipse at top right, rgba(99, 102, 241, 0.08) 0%, transparent 50%),
      radial-gradient(ellipse at bottom left, rgba(139, 92, 246, 0.08) 0%, transparent 50%),
      linear-gradient(180deg, #0a0f1e 0%, #0f172a 50%, #1e293b 100%);
    padding: 32px;
    position: relative;
    overflow-x: hidden;
  }

  :host::before {
    content: '';
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background:
      repeating-linear-gradient(
        0deg,
        rgba(255, 255, 255, 0.01) 0px,
        transparent 1px,
        transparent 40px,
        rgba(255, 255, 255, 0.01) 41px
      ),
      repeating-linear-gradient(
        90deg,
        rgba(255, 255, 255, 0.01) 0px,
        transparent 1px,
        transparent 40px,
        rgba(255, 255, 255, 0.01) 41px
      );
    pointer-events: none;
    z-index: 0;
  }

  .container {
    max-width: 800px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 28px;
    position: relative;
    z-index: 1;
  }

  /* Enhanced Header */
  .header {
    display: flex;
    align-items: center;
    gap: 20px;
    margin-bottom: 8px;
    animation: fadeInDown 0.8s ease-out;
  }

  .back-button {
    background: rgba(30, 41, 59, 0.6);
    backdrop-filter: blur(20px);
    border: 1px solid rgba(148, 163, 184, 0.2);
    color: #cbd5e1;
    padding: 14px 18px;
    border-radius: 14px;
    font-size: 1.2rem;
    cursor: pointer;
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    font-family: inherit;
    position: relative;
    overflow: hidden;
  }

  .back-button::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, transparent 50%, rgba(255, 255, 255, 0.1) 100%);
    transform: translateX(-100%) skewX(-15deg);
    transition: transform 0.6s;
  }

  .back-button:hover::before {
    transform: translateX(100%) skewX(-15deg);
  }

  .back-button:hover {
    background: rgba(59, 130, 246, 0.15);
    border-color: #3b82f6;
    color: #3b82f6;
    transform: translateY(-3px);
    box-shadow:
      0 12px 30px rgba(59, 130, 246, 0.25),
      0 0 0 1px rgba(59, 130, 246, 0.1);
  }

  .title {
    font-size: clamp(1.75rem, 3vw, 2.25rem);
    font-weight: 900;
    background: linear-gradient(135deg, #ffffff 0%, #a5b4fc 50%, #c4b5fd 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    flex: 1;
    letter-spacing: -0.02em;
    text-shadow: 0 0 40px rgba(165, 180, 252, 0.3);
    animation: titleGlow 3s ease-in-out infinite alternate;
  }

  @keyframes titleGlow {
    from { filter: drop-shadow(0 0 20px rgba(165, 180, 252, 0.2)); }
    to { filter: drop-shadow(0 0 30px rgba(196, 181, 253, 0.4)); }
  }

  .status-badge {
    padding: 10px 20px;
    border-radius: 24px;
    font-size: 0.85rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    backdrop-filter: blur(20px);
    border: 1px solid;
    position: relative;
    overflow: hidden;
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
  }

  .status-badge.enabled {
    background: linear-gradient(135deg, rgba(16, 185, 129, 0.25) 0%, rgba(5, 150, 105, 0.3) 100%);
    color: #6ee7b7;
    border-color: rgba(16, 185, 129, 0.4);
    box-shadow:
      0 8px 20px rgba(16, 185, 129, 0.3),
      inset 0 1px 0 rgba(255, 255, 255, 0.1);
  }

  .status-badge.disabled {
    background: linear-gradient(135deg, rgba(148, 163, 184, 0.25) 0%, rgba(100, 116, 139, 0.3) 100%);
    color: #cbd5e1;
    border-color: rgba(148, 163, 184, 0.4);
  }

  /* Enhanced Info Box */
  .info-box {
    background:
      linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.8) 100%);
    backdrop-filter: blur(24px) saturate(180%);
    border-radius: 20px;
    padding: 28px;
    border: 1px solid rgba(148, 163, 184, 0.15);
    box-shadow:
      0 20px 40px -12px rgba(0, 0, 0, 0.4),
      0 0 0 1px rgba(255, 255, 255, 0.05),
      inset 0 1px 0 0 rgba(255, 255, 255, 0.05);
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    overflow: hidden;
    animation: fadeInUp 0.8s ease-out 0.2s both;
  }

  .info-box::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(90deg,
      transparent 0%,
      #6366f1 25%,
      #8b5cf6 50%,
      #a855f7 75%,
      transparent 100%
    );
    transform: scaleX(0);
    transform-origin: left;
    transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .info-box:hover::before {
    transform: scaleX(1);
  }

  .info-box.warning {
    background: linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(220, 38, 38, 0.2) 100%);
    border-color: rgba(239, 68, 68, 0.3);
  }

  .info-box.warning::before {
    background: linear-gradient(90deg,
      transparent 0%,
      #ef4444 25%,
      #dc2626 50%,
      #b91c1c 75%,
      transparent 100%
    );
  }

  .info-box p {
    margin: 0 0 16px 0;
    color: #e2e8f0;
    font-size: 0.95rem;
    line-height: 1.6;
    font-weight: 500;
  }

  .info-box p:last-child {
    margin-bottom: 0;
  }

  .info-box strong {
    font-weight: 700;
    color: #f1f5f9;
  }

  .help-text {
    font-size: 0.875rem;
    color: #94a3b8;
    margin-top: 8px;
    font-weight: 500;
    line-height: 1.5;
  }

  /* Enhanced Sections */
  .section {
    background:
      linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.8) 100%);
    backdrop-filter: blur(24px) saturate(180%);
    border-radius: 24px;
    padding: 36px;
    border: 1px solid rgba(148, 163, 184, 0.15);
    box-shadow:
      0 25px 50px -12px rgba(0, 0, 0, 0.4),
      0 0 0 1px rgba(255, 255, 255, 0.05),
      inset 0 1px 0 0 rgba(255, 255, 255, 0.05);
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    overflow: hidden;
    animation: fadeInUp 0.8s ease-out 0.3s both;
  }

  .section::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(90deg,
      transparent 0%,
      #6366f1 25%,
      #8b5cf6 50%,
      #a855f7 75%,
      transparent 100%
    );
    transform: scaleX(0);
    transform-origin: left;
    transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .section:hover::before {
    transform: scaleX(1);
  }

  .section::after {
    content: '';
    position: absolute;
    inset: -1px;
    border-radius: 24px;
    padding: 1px;
    background: linear-gradient(135deg,
      rgba(99, 102, 241, 0.3) 0%,
      rgba(139, 92, 246, 0.3) 50%,
      transparent 100%
    );
    -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
    opacity: 0;
    transition: opacity 0.4s ease;
    pointer-events: none;
  }

  .section:hover::after {
    opacity: 1;
  }

  .section:hover {
    border-color: rgba(99, 102, 241, 0.3);
    transform: translateY(-6px);
    box-shadow:
      0 30px 60px -15px rgba(99, 102, 241, 0.25),
      0 0 0 1px rgba(99, 102, 241, 0.1),
      inset 0 1px 0 0 rgba(255, 255, 255, 0.1);
  }

  .section-title {
    font-size: 1.5rem;
    font-weight: 800;
    background: linear-gradient(135deg, #f1f5f9 0%, #e0e7ff 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    margin: 0 0 28px 0;
    display: flex;
    align-items: center;
    gap: 12px;
    letter-spacing: -0.02em;
  }

  /* Enhanced Form Elements */
  .checkbox-group {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 24px;
    padding: 16px 20px;
    background:
      linear-gradient(135deg, rgba(15, 23, 42, 0.6) 0%, rgba(30, 41, 59, 0.4) 100%);
    border-radius: 14px;
    border: 1px solid rgba(148, 163, 184, 0.15);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    overflow: hidden;
  }

  .checkbox-group::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(99, 102, 241, 0.1), transparent);
    transition: left 0.5s;
  }

  .checkbox-group:hover::before {
    left: 100%;
  }

  .checkbox-group:hover {
    background: linear-gradient(135deg, rgba(15, 23, 42, 0.8) 0%, rgba(30, 41, 59, 0.6) 100%);
    border-color: rgba(99, 102, 241, 0.3);
    transform: translateX(6px);
    box-shadow: 0 4px 16px rgba(99, 102, 241, 0.15);
  }

  .checkbox {
    width: 22px;
    height: 22px;
    cursor: pointer;
    accent-color: #3b82f6;
    border-radius: 6px;
    transform: scale(1.1);
    transition: all 0.3s ease;
  }

  .checkbox:checked {
    transform: scale(1.2);
    filter: drop-shadow(0 0 8px rgba(59, 130, 246, 0.6));
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-bottom: 24px;
  }

  .form-label {
    font-size: 1rem;
    font-weight: 700;
    color: #e2e8f0;
    letter-spacing: 0.01em;
  }

  .form-input {
    width: 100%;
    padding: 16px 20px;
    background:
      linear-gradient(135deg, rgba(15, 23, 42, 0.8) 0%, rgba(30, 41, 59, 0.6) 100%);
    border: 1px solid rgba(148, 163, 184, 0.2);
    border-radius: 14px;
    color: #f1f5f9;
    font-size: 1rem;
    font-family: inherit;
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    box-sizing: border-box;
    backdrop-filter: blur(10px);
  }

  .form-input::placeholder {
    color: #64748b;
    font-weight: 500;
  }

  .form-input:focus {
    outline: none;
    border-color: #3b82f6;
    background:
      linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(30, 41, 59, 0.8) 100%);
    box-shadow:
      0 0 0 3px rgba(59, 130, 246, 0.15),
      0 8px 20px rgba(59, 130, 246, 0.2);
    transform: translateY(-2px);
  }

  .form-input:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none !important;
    background: rgba(15, 23, 42, 0.4);
  }

  /* Enhanced Buttons */
  .button-group {
    display: flex;
    gap: 16px;
    margin-top: 36px;
    animation: fadeInUp 0.8s ease-out 0.4s both;
  }

  .button {
    flex: 1;
    padding: 18px 28px;
    border: none;
    border-radius: 14px;
    font-size: 1.05rem;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    overflow: hidden;
    letter-spacing: 0.3px;
    backdrop-filter: blur(10px);
  }

  .button::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.2) 0%, transparent 50%, rgba(255, 255, 255, 0.2) 100%);
    transform: translateX(-100%) skewX(-15deg);
    transition: transform 0.6s;
  }

  .button:hover::before {
    transform: translateX(100%) skewX(-15deg);
  }

  .button.primary {
    background: linear-gradient(135deg, #6366f1 0%, #4f46e5 50%, #4338ca 100%);
    color: white;
    box-shadow:
      0 12px 30px rgba(99, 102, 241, 0.4),
      inset 0 1px 0 rgba(255, 255, 255, 0.2);
    border: 1px solid rgba(99, 102, 241, 0.5);
  }

  .button.primary:hover:not(:disabled) {
    transform: translateY(-4px);
    box-shadow:
      0 20px 40px rgba(99, 102, 241, 0.5),
      0 0 20px rgba(99, 102, 241, 0.3),
      inset 0 1px 0 rgba(255, 255, 255, 0.3);
  }

  .button.secondary {
    background:
      linear-gradient(135deg, rgba(15, 23, 42, 0.8) 0%, rgba(30, 41, 59, 0.6) 100%);
    border: 1px solid rgba(148, 163, 184, 0.3);
    color: #cbd5e1;
  }

  .button.secondary:hover:not(:disabled) {
    background: rgba(59, 130, 246, 0.15);
    border-color: #3b82f6;
    color: #3b82f6;
    transform: translateY(-4px);
    box-shadow: 0 12px 30px rgba(59, 130, 246, 0.25);
  }

  .button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none !important;
    box-shadow: none !important;
  }

  /* Enhanced Loading Spinner */
  .loading-spinner {
    display: inline-block;
    width: 20px;
    height: 20px;
    border: 3px solid rgba(255, 255, 255, 0.3);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    margin-right: 12px;
    vertical-align: middle;
    box-shadow: 0 0 10px rgba(255, 255, 255, 0.3);
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  /* Animations */
  @keyframes fadeInDown {
    from {
      opacity: 0;
      transform: translateY(-30px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(30px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  /* Responsive Design */
  @media (max-width: 768px) {
    :host {
      padding: 24px;
    }

    .container {
      gap: 24px;
    }

    .header {
      flex-direction: column;
      gap: 16px;
      text-align: center;
    }

    .section {
      padding: 28px;
      border-radius: 20px;
    }

    .button-group {
      flex-direction: column;
    }

    .button {
      flex: none;
    }

    .form-input {
      padding: 14px 18px;
    }
  }

  @media (max-width: 480px) {
    :host {
      padding: 20px 16px;
    }

    .container {
      gap: 20px;
    }

    .section {
      padding: 24px;
      border-radius: 16px;
    }

    .checkbox-group {
      padding: 14px 16px;
    }

    .form-input {
      padding: 14px 16px;
      font-size: 0.95rem;
    }

    .button {
      padding: 16px 24px;
      font-size: 1rem;
    }

    .title {
      font-size: 1.5rem;
    }

    .section-title {
      font-size: 1.25rem;
    }
  }

  /* Accessibility Improvements */
  @media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
    }
  }

  /* Focus States for Accessibility */
  .button:focus,
  .form-input:focus,
  .back-button:focus {
    outline: 2px solid #6366f1;
    outline-offset: 2px;
  }

  .button.primary:focus-visible {
    box-shadow:
      0 0 0 3px rgba(99, 102, 241, 0.3),
      0 12px 30px rgba(99, 102, 241, 0.4);
  }

  /* High Contrast Mode Support */
  @media (prefers-contrast: high) {
    .section,
    .info-box,
    .checkbox-group {
      border-width: 2px;
    }

    .button.primary,
    .button.secondary {
      border: 2px solid currentColor;
    }
  }

`;