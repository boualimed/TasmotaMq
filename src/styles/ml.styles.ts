import { css } from 'lit';

export const mlStyles = css`
:host {
    display: block;
  }

  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(15, 23, 42, 0.95);
    backdrop-filter: blur(20px);
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    animation: fadeIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
      backdrop-filter: blur(0px);
    }
    to {
      opacity: 1;
      backdrop-filter: blur(20px);
    }
  }

  .modal-container {
    background: linear-gradient(135deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.98) 100%);
    backdrop-filter: blur(40px);
    border-radius: 24px;
    max-width: 1200px;
    width: 100%;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    box-shadow:
      0 25px 50px -12px rgba(0, 0, 0, 0.5),
      0 0 0 1px rgba(148, 163, 184, 0.1),
      inset 0 1px 0 rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(148, 163, 184, 0.2);
    overflow: hidden;
    animation: slideUp 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  }

  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(30px) scale(0.95);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  .modal-header {
    padding: 28px 32px;
    border-bottom: 1px solid rgba(148, 163, 184, 0.2);
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: rgba(30, 41, 59, 0.8);
    backdrop-filter: blur(20px);
  }

  .modal-title {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .modal-title h2 {
    margin: 0;
    font-size: 1.75rem;
    font-weight: 800;
    background: linear-gradient(135deg, #ffffff 0%, #e0e7ff 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    letter-spacing: -0.02em;
  }

  .modal-subtitle {
    margin: 4px 0 0 0;
    color: #94a3b8;
    font-size: 0.9rem;
    font-weight: 500;
  }

  .modal-icon {
    font-size: 2.5rem;
    background: linear-gradient(135deg, #3b82f6 0%, #6366f1 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .modal-close {
    background: rgba(148, 163, 184, 0.1);
    border: 1px solid rgba(148, 163, 184, 0.2);
    color: #94a3b8;
    width: 44px;
    height: 44px;
    border-radius: 12px;
    cursor: pointer;
    font-size: 1.25rem;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    overflow: hidden;
  }

  .modal-close::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
    transition: left 0.5s;
  }

  .modal-close:hover {
    background: rgba(239, 68, 68, 0.1);
    border-color: rgba(239, 68, 68, 0.3);
    color: #fca5a5;
    transform: scale(1.1) rotate(90deg);
  }

  .modal-close:hover::before {
    left: 100%;
  }

  .modal-tabs {
    display: flex;
    gap: 4px;
    padding: 0 32px;
    background: rgba(15, 23, 42, 0.6);
    border-bottom: 1px solid rgba(148, 163, 184, 0.2);
    backdrop-filter: blur(10px);
  }

  .tab-button {
    background: transparent;
    border: none;
    color: #64748b;
    padding: 16px 24px;
    cursor: pointer;
    font-size: 0.9rem;
    font-weight: 600;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    display: flex;
    align-items: center;
    gap: 8px;
    border-bottom: 3px solid transparent;
  }

  .tab-button:hover {
    color: #e2e8f0;
    background: rgba(59, 130, 246, 0.05);
  }

  .tab-button.active {
    color: #93c5fd;
    border-bottom-color: #3b82f6;
    background: rgba(59, 130, 246, 0.1);
  }

  .tab-icon {
    font-size: 1.1rem;
  }

  .modal-content {
    padding: 32px;
    overflow-y: auto;
    flex: 1;
    background:
      radial-gradient(circle at 20% 80%, rgba(59, 130, 246, 0.03) 0%, transparent 50%),
      radial-gradient(circle at 80% 20%, rgba(139, 92, 246, 0.03) 0%, transparent 50%);
  }

  .error-banner {
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.3);
    color: #fca5a5;
    padding: 16px 20px;
    border-radius: 12px;
    margin-bottom: 24px;
    display: flex;
    align-items: center;
    gap: 12px;
    font-weight: 500;
  }

  .error-icon {
    font-size: 1.2rem;
  }

  .loading-container {
    text-align: center;
    padding: 60px 32px;
    color: #64748b;
  }

  .spinner {
    width: 56px;
    height: 56px;
    border: 3px solid rgba(59, 130, 246, 0.1);
    border-top-color: #3b82f6;
    border-right-color: #8b5cf6;
    border-radius: 50%;
    animation: spin 1s cubic-bezier(0.68, -0.55, 0.265, 1.55) infinite;
    margin: 0 auto 20px;
    box-shadow: 0 0 20px rgba(59, 130, 246, 0.3);
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .tab-content {
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  /* Control Panels */
  .control-panel, .training-panel, .config-panel {
    background: rgba(15, 23, 42, 0.6);
    backdrop-filter: blur(20px);
    padding: 24px;
    border-radius: 16px;
    border: 1px solid rgba(148, 163, 184, 0.2);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  }

  .control-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 16px;
  }

  .control-group label {
    font-size: 0.9rem;
    font-weight: 600;
    color: #e2e8f0;
  }

  .control-group input[type="number"] {
    background: rgba(15, 23, 42, 0.8);
    border: 1px solid rgba(148, 163, 184, 0.2);
    color: #f1f5f9;
    padding: 10px 14px;
    border-radius: 10px;
    font-size: 0.9rem;
    transition: all 0.3s ease;
  }

  .control-group input[type="number"]:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  .control-group input[type="checkbox"] {
    accent-color: #3b82f6;
    margin-right: 8px;
  }

  /* Buttons */
  .button {
    padding: 12px 24px;
    border: none;
    border-radius: 12px;
    font-size: 0.9rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    overflow: hidden;
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }

  .button::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
    transition: left 0.5s;
  }

  .button:hover::before {
    left: 100%;
  }

  .button.primary {
    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
    color: white;
    box-shadow: 0 10px 30px rgba(59, 130, 246, 0.3);
  }

  .button.primary:hover {
    transform: translateY(-2px);
    box-shadow: 0 15px 40px rgba(59, 130, 246, 0.4);
  }

  .button.secondary {
    background: rgba(30, 41, 59, 0.8);
    border: 1px solid rgba(148, 163, 184, 0.2);
    color: #e2e8f0;
  }

  .button.secondary:hover {
    background: rgba(30, 41, 59, 0.9);
    border-color: rgba(148, 163, 184, 0.3);
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
  }

  .button:disabled {
    background: #4b5563;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
    opacity: 0.6;
  }

  .button:disabled::before {
    display: none;
  }

  /* Cards and Containers */
  .predictions-container, .anomalies-container, .metrics-panel {
    background: rgba(15, 23, 42, 0.6);
    backdrop-filter: blur(20px);
    padding: 24px;
    border-radius: 16px;
    border: 1px solid rgba(148, 163, 184, 0.2);
  }

  .prediction-card, .anomaly-card {
    background: rgba(30, 41, 59, 0.8);
    padding: 20px;
    border-radius: 12px;
    border: 1px solid rgba(148, 163, 184, 0.2);
    margin-bottom: 16px;
    transition: all 0.3s ease;
    position: relative;
    overflow: hidden;
  }

  .prediction-card:hover, .anomaly-card:hover {
    border-color: rgba(59, 130, 246, 0.4);
    transform: translateX(4px);
  }

  .prediction-card::before, .anomaly-card::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 3px;
    background: linear-gradient(to bottom, #3b82f6, #8b5cf6);
    opacity: 0;
    transition: opacity 0.3s ease;
  }

  .prediction-card:hover::before, .anomaly-card:hover::before {
    opacity: 1;
  }

  .prediction-header, .anomaly-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
  }

  .prediction-index, .anomaly-icon {
    font-weight: 700;
    color: #3b82f6;
  }

  .prediction-time, .anomaly-time {
    color: #94a3b8;
    font-size: 0.85rem;
  }

  .prediction-value {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
  }

  .value-main {
    font-size: 1.5rem;
    font-weight: 700;
    color: #f1f5f9;
  }

  .value-confidence {
    color: #94a3b8;
    font-size: 0.85rem;
  }

  .confidence-bar, .severity-bar {
    height: 6px;
    background: rgba(148, 163, 184, 0.2);
    border-radius: 3px;
    overflow: hidden;
    margin-top: 12px;
  }

  .confidence-fill {
    height: 100%;
    background: linear-gradient(90deg, #10b981, #059669);
    border-radius: 3px;
    transition: width 0.5s ease;
  }

  /* Anomaly Severity */
  .anomaly-card.critical {
    border-color: rgba(239, 68, 68, 0.4);
  }

  .anomaly-card.high {
    border-color: rgba(251, 146, 60, 0.4);
  }

  .anomaly-card.medium {
    border-color: rgba(251, 191, 36, 0.4);
  }

  .severity-badge {
    padding: 4px 12px;
    border-radius: 20px;
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
  }

  .severity-badge.critical {
    background: rgba(239, 68, 68, 0.2);
    color: #fca5a5;
    border: 1px solid rgba(239, 68, 68, 0.3);
  }

  .severity-badge.high {
    background: rgba(251, 146, 60, 0.2);
    color: #fdba74;
    border: 1px solid rgba(251, 146, 60, 0.3);
  }

  .severity-badge.medium {
    background: rgba(251, 191, 36, 0.2);
    color: #fde047;
    border: 1px solid rgba(251, 191, 36, 0.3);
  }

  .severity-fill.critical { background: linear-gradient(90deg, #ef4444, #dc2626); }
  .severity-fill.high { background: linear-gradient(90deg, #fb923c, #ea580c); }
  .severity-fill.medium { background: linear-gradient(90deg, #fbbf24, #d97706); }

  /* Stats Panels */
  .stats-panel {
    background: rgba(30, 41, 59, 0.8);
    padding: 20px;
    border-radius: 12px;
    border: 1px solid rgba(148, 163, 184, 0.2);
    margin-bottom: 20px;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 16px;
  }

  .stat-item {
    text-align: center;
  }

  .stat-label {
    display: block;
    font-size: 0.8rem;
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 4px;
  }

  .stat-value {
    display: block;
    font-size: 1.5rem;
    font-weight: 700;
    color: #f1f5f9;
  }

  .stat-value.anomaly {
    color: #ef4444;
  }

  /* Training Metrics */
  .metrics-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 16px;
    margin-top: 20px;
  }

  .metric-card {
    background: rgba(15, 23, 42, 0.8);
    padding: 16px;
    border-radius: 10px;
    border: 1px solid rgba(148, 163, 184, 0.2);
    text-align: center;
  }

  .metric-label {
    display: block;
    font-size: 0.8rem;
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 8px;
  }

  .metric-value {
    display: block;
    font-size: 1.25rem;
    font-weight: 700;
    color: #f1f5f9;
  }

  /* Quality Indicators */
  .quality-indicator {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 16px;
    border-radius: 10px;
    margin-top: 16px;
    font-weight: 600;
  }

  .quality-indicator.excellent {
    background: rgba(16, 185, 129, 0.1);
    color: #6ee7b7;
    border: 1px solid rgba(16, 185, 129, 0.2);
  }

  .quality-indicator.good {
    background: rgba(34, 197, 94, 0.1);
    color: #4ade80;
    border: 1px solid rgba(34, 197, 94, 0.2);
  }

  .quality-indicator.fair {
    background: rgba(251, 191, 36, 0.1);
    color: #fcd34d;
    border: 1px solid rgba(251, 191, 36, 0.2);
  }

  .quality-indicator.poor {
    background: rgba(239, 68, 68, 0.1);
    color: #fca5a5;
    border: 1px solid rgba(239, 68, 68, 0.2);
  }

  /* Form Styles */
  .config-form {
    display: flex;
    flex-direction: column;
    gap: 20px;
    margin-top: 20px;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .form-group label {
    font-size: 0.9rem;
    font-weight: 600;
    color: #e2e8f0;
  }

  .form-group input {
    background: rgba(15, 23, 42, 0.8);
    border: 1px solid rgba(148, 163, 184, 0.2);
    color: #f1f5f9;
    padding: 10px 14px;
    border-radius: 10px;
    font-size: 0.9rem;
    transition: all 0.3s ease;
  }

  .form-group input:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  .form-help {
    font-size: 0.8rem;
    color: #64748b;
    font-style: italic;
  }

  /* Empty States */
  .empty-state, .success-state {
    text-align: center;
    padding: 40px 32px;
    color: #64748b;
  }

  .empty-icon {
    font-size: 3rem;
    margin-bottom: 16px;
    opacity: 0.4;
  }

  .success-icon {
    font-size: 2rem;
    color: #10b981;
    margin-bottom: 12px;
  }

  /* Backend Info */
  .backend-info {
    background: rgba(15, 23, 42, 0.6);
    padding: 20px;
    border-radius: 12px;
    border: 1px solid rgba(148, 163, 184, 0.2);
    margin-top: 20px;
  }

  .info-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 12px;
    margin-top: 12px;
  }

  .info-item {
    display: flex;
    justify-content: space-between;
    padding: 8px 0;
    border-bottom: 1px solid rgba(148, 163, 184, 0.1);
  }

  .info-label {
    color: #94a3b8;
    font-weight: 500;
  }

  .info-value {
    color: #e2e8f0;
    font-weight: 600;
    font-family: 'Courier New', monospace;
  }

  /* Footer */
  .modal-footer {
    padding: 24px 32px;
    border-top: 1px solid rgba(148, 163, 184, 0.2);
    display: flex;
    justify-content: flex-end;
    background: rgba(30, 41, 59, 0.8);
    backdrop-filter: blur(20px);
  }

  /* Scrollbar Styling */
  .modal-content::-webkit-scrollbar {
    width: 8px;
  }

  .modal-content::-webkit-scrollbar-track {
    background: rgba(15, 23, 42, 0.4);
    border-radius: 4px;
  }

  .modal-content::-webkit-scrollbar-thumb {
    background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
    border-radius: 4px;
    border: 2px solid rgba(15, 23, 42, 0.4);
  }

  .modal-content::-webkit-scrollbar-thumb:hover {
    background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%);
  }

  /* Responsive Design */
  @media (max-width: 768px) {
    .modal-overlay {
      padding: 16px;
    }

    .modal-container {
      max-height: 95vh;
      border-radius: 20px;
    }

    .modal-header {
      padding: 24px;
    }

    .modal-content {
      padding: 24px;
    }

    .modal-tabs {
      padding: 0 24px;
      overflow-x: auto;
    }

    .tab-button {
      padding: 12px 16px;
      font-size: 0.85rem;
    }

    .stats-grid, .metrics-grid {
      grid-template-columns: repeat(2, 1fr);
    }

    .control-panel, .training-panel, .config-panel {
      padding: 20px;
    }
  }

  @media (max-width: 480px) {
    .modal-header {
      padding: 20px;
    }

    .modal-content {
      padding: 20px;
    }

    .stats-grid, .metrics-grid {
      grid-template-columns: 1fr;
    }

    .prediction-value {
      flex-direction: column;
      align-items: flex-start;
      gap: 8px;
    }
  }
`;