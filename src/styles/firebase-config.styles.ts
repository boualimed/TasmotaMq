import { css } from 'lit';

// ============================================================================
// firebase-config.styles.ts - Modern Dark Theme
// ============================================================================

export const firebaseConfigStyles = css`
  :host {
    display: block;
  }

  .firebase-section {
    background: rgba(30, 41, 59, 0.6);
    backdrop-filter: blur(20px);
    border-radius: 16px;
    padding: 28px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(148, 163, 184, 0.2);
    margin-bottom: 25px;
  }

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;
    flex-wrap: wrap;
    gap: 16px;
  }

  .section-title {
    font-size: 1.4rem;
    font-weight: 700;
    color: #f1f5f9;
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .firebase-toggle {
    display: flex;
    align-items: center;
    gap: 14px;
  }

  .toggle-switch {
    position: relative;
    width: 60px;
    height: 32px;
  }

  .toggle-switch input {
    opacity: 0;
    width: 0;
    height: 0;
  }

  .toggle-slider {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(107, 114, 128, 0.5);
    transition: 0.4s;
    border-radius: 32px;
    border: 1px solid rgba(148, 163, 184, 0.3);
  }

  .toggle-slider:before {
    position: absolute;
    content: "";
    height: 24px;
    width: 24px;
    left: 4px;
    bottom: 3px;
    background-color: white;
    transition: 0.4s;
    border-radius: 50%;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }

  input:checked + .toggle-slider {
    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
    border-color: #3b82f6;
  }

  input:checked + .toggle-slider:before {
    transform: translateX(28px);
  }

  .toggle-label {
    font-weight: 600;
    color: #cbd5e1;
    font-size: 0.95rem;
  }

  .config-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 18px;
    margin-bottom: 24px;
  }

  .config-item {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .config-item.full-width {
    grid-column: 1 / -1;
  }

  .config-label {
    font-size: 0.95rem;
    font-weight: 600;
    color: #e2e8f0;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .required {
    color: #fca5a5;
  }

  .config-input {
    padding: 14px 18px;
    border: 1px solid rgba(148, 163, 184, 0.2);
    border-radius: 10px;
    font-size: 1rem;
    transition: all 0.3s ease;
    background: rgba(15, 23, 42, 0.5);
    color: #f1f5f9;
    box-sizing: border-box;
  }

  .config-input::placeholder {
    color: #64748b;
  }

  .config-input:focus {
    outline: none;
    border-color: #3b82f6;
    background: rgba(15, 23, 42, 0.7);
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  .config-input:disabled {
    background: rgba(15, 23, 42, 0.3);
    cursor: not-allowed;
    opacity: 0.5;
  }

  .help-text {
    font-size: 0.85rem;
    color: #94a3b8;
    margin-top: 4px;
    line-height: 1.4;
  }

  .button-group {
    display: flex;
    gap: 12px;
    margin-top: 24px;
  }

  .btn {
    flex: 1;
    padding: 14px 24px;
    border: none;
    border-radius: 12px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    position: relative;
    overflow: hidden;
  }

  .btn::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(255, 255, 255, 0.2),
      transparent
    );
    transition: left 0.5s;
  }

  .btn:hover::before {
    left: 100%;
  }

  .btn-primary {
    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
    color: white;
    box-shadow: 0 10px 30px rgba(59, 130, 246, 0.3);
  }

  .btn-primary:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 15px 40px rgba(59, 130, 246, 0.4);
  }

  .btn-secondary {
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    color: white;
    box-shadow: 0 10px 30px rgba(16, 185, 129, 0.3);
  }

  .btn-secondary:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 15px 40px rgba(16, 185, 129, 0.4);
  }

  .btn:disabled {
    background: #4b5563;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
    opacity: 0.6;
  }

  .btn:disabled::before {
    display: none;
  }

  .status-banner {
    padding: 14px 18px;
    border-radius: 12px;
    margin-bottom: 20px;
    font-size: 0.95rem;
    display: flex;
    align-items: center;
    gap: 12px;
    font-weight: 500;
    border: 1px solid;
  }

  .status-banner.success {
    background: rgba(16, 185, 129, 0.15);
    color: #6ee7b7;
    border-color: rgba(16, 185, 129, 0.3);
  }

  .status-banner.error {
    background: rgba(239, 68, 68, 0.15);
    color: #fca5a5;
    border-color: rgba(239, 68, 68, 0.3);
  }

  .status-banner.warning {
    background: rgba(251, 191, 36, 0.15);
    color: #fcd34d;
    border-color: rgba(251, 191, 36, 0.3);
  }

  .info-box {
    background: rgba(59, 130, 246, 0.1);
    border-left: 4px solid #3b82f6;
    padding: 18px;
    border-radius: 10px;
    margin-bottom: 20px;
  }

  .info-box-title {
    font-weight: 700;
    color: #93c5fd;
    margin-bottom: 10px;
    font-size: 1rem;
  }

  .info-box-content {
    font-size: 0.9rem;
    color: #cbd5e1;
    line-height: 1.6;
  }

  .info-box-content ol {
    margin: 10px 0;
    padding-left: 24px;
  }

  .info-box-content li {
    margin: 6px 0;
  }

  .info-box-content code {
    background: rgba(15, 23, 42, 0.6);
    color: #93c5fd;
    padding: 2px 8px;
    border-radius: 4px;
    font-family: 'Courier New', monospace;
    font-size: 0.85rem;
  }

  .sync-options {
    display: flex;
    flex-direction: column;
    gap: 14px;
    padding: 18px;
    background: rgba(15, 23, 42, 0.5);
    border-radius: 12px;
    margin-top: 20px;
    border: 1px solid rgba(148, 163, 184, 0.2);
  }

  .sync-option {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .checkbox {
    width: 20px;
    height: 20px;
    accent-color: #3b82f6;
    cursor: pointer;
  }

  .checkbox-label {
    font-size: 0.95rem;
    color: #e2e8f0;
    cursor: pointer;
  }

  .loading-spinner {
    display: inline-block;
    width: 18px;
    height: 18px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-radius: 50%;
    border-top-color: white;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  @media (max-width: 768px) {
    .firebase-section {
      padding: 20px;
    }

    .config-grid {
      grid-template-columns: 1fr;
    }

    .button-group {
      flex-direction: column;
    }
  }
`;