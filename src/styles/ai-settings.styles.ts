// ai-settings.styles.ts - Modern Dark Theme
import { css } from 'lit';

export const aiSettings = css`
  :host {
    display: block;
  }

  .ai-section {
    background: linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(139, 92, 246, 0.15) 100%);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(59, 130, 246, 0.3);
    border-radius: 16px;
    padding: 24px;
    margin-bottom: 20px;
    color: #f1f5f9;
    box-shadow: 0 8px 32px rgba(59, 130, 246, 0.2);
    position: relative;
    overflow: hidden;
  }

  .ai-section::before {
    content: '';
    position: absolute;
    top: -50%;
    right: -50%;
    width: 200%;
    height: 200%;
    background: radial-gradient(circle, rgba(59, 130, 246, 0.1) 0%, transparent 70%);
    animation: rotate 20s linear infinite;
    pointer-events: none;
  }

  @keyframes rotate {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  .ai-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 20px;
    position: relative;
    z-index: 1;
  }

  .ai-title {
    font-size: 1.3rem;
    font-weight: 700;
    display: flex;
    align-items: center;
    gap: 12px;
    background: linear-gradient(135deg, #ffffff 0%, #93c5fd 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .ai-status {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 16px;
    background: rgba(15, 23, 42, 0.6);
    border: 1px solid rgba(148, 163, 184, 0.3);
    border-radius: 24px;
    font-size: 0.9rem;
    font-weight: 600;
    color: #e2e8f0;
  }

  .status-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: #ef4444;
    animation: pulse-dot 2s infinite;
    box-shadow: 0 0 8px rgba(239, 68, 68, 0.5);
  }

  .status-dot.active {
    background: #10b981;
    box-shadow: 0 0 8px rgba(16, 185, 129, 0.5);
  }

  @keyframes pulse-dot {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.6; transform: scale(1.1); }
  }

  .form-group {
    margin-bottom: 18px;
    position: relative;
    z-index: 1;
  }

  .form-label {
    display: block;
    margin-bottom: 8px;
    font-size: 0.95rem;
    font-weight: 600;
    color: #e2e8f0;
    letter-spacing: 0.01em;
  }

  .form-input {
    width: 100%;
    padding: 12px 16px;
    border: 1px solid rgba(148, 163, 184, 0.3);
    border-radius: 10px;
    font-size: 0.95rem;
    background: rgba(15, 23, 42, 0.6);
    color: #f1f5f9;
    transition: all 0.3s ease;
    box-sizing: border-box;
  }

  .form-input::placeholder {
    color: #64748b;
  }

  .form-input:focus {
    outline: none;
    border-color: #3b82f6;
    background: rgba(15, 23, 42, 0.8);
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  .form-input:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    background: rgba(15, 23, 42, 0.4);
  }

  select.form-input {
    cursor: pointer;
  }

  .checkbox-group {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 18px;
    position: relative;
    z-index: 1;
  }

  .checkbox {
    width: 22px;
    height: 22px;
    cursor: pointer;
    accent-color: #3b82f6;
  }

  .button-group {
    display: flex;
    gap: 12px;
    margin-top: 20px;
    position: relative;
    z-index: 1;
  }

  .button {
    flex: 1;
    padding: 12px 20px;
    border: none;
    border-radius: 12px;
    font-size: 0.95rem;
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

  .button::before {
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

  .button:hover::before {
    left: 100%;
  }

  .button.primary {
    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
    color: white;
    box-shadow: 0 4px 15px rgba(59, 130, 246, 0.3);
  }

  .button.primary:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(59, 130, 246, 0.4);
  }

  .button.secondary {
    background: rgba(15, 23, 42, 0.6);
    color: #e2e8f0;
    border: 1px solid rgba(148, 163, 184, 0.3);
  }

  .button.secondary:hover:not(:disabled) {
    background: rgba(15, 23, 42, 0.8);
    border-color: rgba(148, 163, 184, 0.5);
    transform: translateY(-2px);
  }

  .button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none !important;
  }

  .button:disabled::before {
    display: none;
  }

  .help-text {
    font-size: 0.85rem;
    color: #94a3b8;
    margin-top: 6px;
    line-height: 1.5;
  }

  .model-selector {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
    gap: 12px;
    margin-top: 12px;
    position: relative;
    z-index: 1;
  }

  .model-option {
    padding: 12px 16px;
    background: rgba(15, 23, 42, 0.5);
    border: 2px solid rgba(148, 163, 184, 0.2);
    border-radius: 10px;
    cursor: pointer;
    text-align: center;
    transition: all 0.3s ease;
    font-size: 0.9rem;
    color: #cbd5e1;
    font-weight: 500;
  }

  .model-option:hover {
    background: rgba(15, 23, 42, 0.7);
    border-color: rgba(59, 130, 246, 0.4);
    transform: translateY(-2px);
  }

  .model-option.selected {
    background: rgba(59, 130, 246, 0.2);
    color: #93c5fd;
    border-color: #3b82f6;
    font-weight: 700;
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
  }

  .info-banner {
    background: rgba(59, 130, 246, 0.1);
    border: 1px solid rgba(59, 130, 246, 0.3);
    border-radius: 10px;
    padding: 14px 16px;
    margin-bottom: 18px;
    font-size: 0.9rem;
    line-height: 1.6;
    color: #cbd5e1;
    position: relative;
    z-index: 1;
  }

  .info-banner code {
    background: rgba(15, 23, 42, 0.6);
    color: #93c5fd;
    padding: 2px 8px;
    border-radius: 4px;
    font-family: 'Courier New', monospace;
    font-size: 0.85rem;
  }

  /* Responsive */
  @media (max-width: 768px) {
    .ai-section {
      padding: 20px;
    }

    .ai-title {
      font-size: 1.1rem;
    }

    .model-selector {
      grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
    }

    .button-group {
      flex-direction: column;
    }
  }
`;