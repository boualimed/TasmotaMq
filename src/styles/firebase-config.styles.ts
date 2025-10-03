import { css } from 'lit';

export const firebaseConfigStyles = css`
  :host {
    display: block;
  }

  .firebase-section {
    background: white;
    border-radius: 15px;
    padding: 25px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
    margin-bottom: 25px;
  }

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
  }

  .section-title {
    font-size: 1.3rem;
    font-weight: 600;
    color: #333;
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .firebase-toggle {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .toggle-switch {
    position: relative;
    width: 56px;
    height: 28px;
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
    background-color: #ccc;
    transition: 0.3s;
    border-radius: 28px;
  }

  .toggle-slider:before {
    position: absolute;
    content: "";
    height: 20px;
    width: 20px;
    left: 4px;
    bottom: 4px;
    background-color: white;
    transition: 0.3s;
    border-radius: 50%;
  }

  input:checked + .toggle-slider {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  }

  input:checked + .toggle-slider:before {
    transform: translateX(28px);
  }

  .toggle-label {
    font-weight: 600;
    color: #666;
  }

  .config-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 15px;
    margin-bottom: 20px;
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
    font-size: 0.9rem;
    font-weight: 500;
    color: #555;
    display: flex;
    align-items: center;
    gap: 5px;
  }

  .required {
    color: #ef4444;
  }

  .config-input {
    padding: 12px 15px;
    border: 2px solid #e1e5e9;
    border-radius: 10px;
    font-size: 1rem;
    transition: all 0.3s ease;
    background: #f8f9fa;
  }

  .config-input:focus {
    outline: none;
    border-color: #667eea;
    background: white;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
  }

  .config-input:disabled {
    background: #e5e7eb;
    cursor: not-allowed;
  }

  .help-text {
    font-size: 0.8rem;
    color: #666;
    margin-top: 4px;
  }

  .button-group {
    display: flex;
    gap: 12px;
    margin-top: 20px;
  }

  .btn {
    flex: 1;
    padding: 14px 20px;
    border: none;
    border-radius: 10px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }

  .btn-primary {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
  }

  .btn-primary:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
  }

  .btn-secondary {
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    color: white;
  }

  .btn-secondary:hover {
    transform: translateY(-2px);
    box-shadow: 0 5px 15px rgba(16, 185, 129, 0.3);
  }

  .btn:disabled {
    background: #9ca3af;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }

  .status-banner {
    padding: 12px 16px;
    border-radius: 10px;
    margin-bottom: 20px;
    font-size: 0.9rem;
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .status-banner.success {
    background: rgba(16, 185, 129, 0.1);
    color: #059669;
    border: 2px solid rgba(16, 185, 129, 0.2);
  }

  .status-banner.error {
    background: rgba(239, 68, 68, 0.1);
    color: #dc2626;
    border: 2px solid rgba(239, 68, 68, 0.2);
  }

  .status-banner.warning {
    background: rgba(251, 191, 36, 0.1);
    color: #d97706;
    border: 2px solid rgba(251, 191, 36, 0.2);
  }

  .info-box {
    background: #eff6ff;
    border-left: 4px solid #3b82f6;
    padding: 16px;
    border-radius: 8px;
    margin-bottom: 20px;
  }

  .info-box-title {
    font-weight: 600;
    color: #1e40af;
    margin-bottom: 8px;
  }

  .info-box-content {
    font-size: 0.9rem;
    color: #1e40af;
    line-height: 1.6;
  }

  .info-box-content ol {
    margin: 8px 0;
    padding-left: 20px;
  }

  .info-box-content li {
    margin: 4px 0;
  }

  .info-box-content code {
    background: #dbeafe;
    padding: 2px 6px;
    border-radius: 3px;
    font-family: monospace;
    font-size: 0.85rem;
  }

  .sync-options {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 16px;
    background: #f9fafb;
    border-radius: 10px;
    margin-top: 20px;
  }

  .sync-option {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .checkbox {
    width: 18px;
    height: 18px;
    accent-color: #667eea;
    cursor: pointer;
  }

  .checkbox-label {
    font-size: 0.9rem;
    color: #333;
    cursor: pointer;
  }

  .loading-spinner {
    display: inline-block;
    width: 16px;
    height: 16px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-radius: 50%;
    border-top-color: white;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  @media (max-width: 768px) {
    .config-grid {
      grid-template-columns: 1fr;
    }

    .button-group {
      flex-direction: column;
    }
  }
`;