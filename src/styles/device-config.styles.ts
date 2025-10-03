import { css } from 'lit';

export const deviceConfigStyles = css`
  :host {
    display: block;
    min-height: 100vh;
    background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
    padding-bottom: 80px;
  }

  .config-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 20px;
  }

  .config-header {
    display: flex;
    align-items: center;
    gap: 15px;
    margin-bottom: 25px;
    background: white;
    padding: 20px;
    border-radius: 15px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  }

  .back-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    background: rgba(102, 126, 234, 0.1);
    color: #667eea;
    border: none;
    border-radius: 10px;
    cursor: pointer;
    transition: all 0.3s ease;
    font-size: 1.2rem;
  }

  .back-button:hover {
    background: rgba(102, 126, 234, 0.2);
    transform: translateX(-2px);
  }

  .logout-button {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 10px 20px;
    background: rgba(239, 68, 68, 0.1);
    color: #dc2626;
    border: 2px solid rgba(239, 68, 68, 0.2);
    border-radius: 10px;
    cursor: pointer;
    transition: all 0.3s ease;
    font-size: 0.9rem;
    font-weight: 600;
  }

  .logout-button:hover {
    background: rgba(239, 68, 68, 0.2);
    border-color: rgba(239, 68, 68, 0.3);
    transform: translateY(-2px);
  }

  .user-info {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 16px;
    background: rgba(102, 126, 234, 0.1);
    border-radius: 10px;
    color: #667eea;
    font-weight: 600;
    font-size: 0.9rem;
  }

  .header-text h1 {
    margin: 0;
    font-size: 1.8rem;
    font-weight: 700;
    color: #333;
  }

  .header-text p {
    margin: 5px 0 0;
    color: #666;
    font-size: 1rem;
  }

  .main-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 25px;
    margin-bottom: 25px;
  }

  .section {
    background: white;
    border-radius: 15px;
    padding: 25px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  }

  .section-title {
    font-size: 1.3rem;
    font-weight: 600;
    color: #333;
    margin-bottom: 20px;
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 15px;
  }

  .form-label {
    font-size: 0.9rem;
    font-weight: 500;
    color: #555;
  }

  .form-input {
    padding: 12px 15px;
    border: 2px solid #e1e5e9;
    border-radius: 10px;
    font-size: 1rem;
    transition: all 0.3s ease;
    background: #f8f9fa;
  }

  .form-input:focus {
    outline: none;
    border-color: #667eea;
    background: white;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
  }

  .checkbox-group {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: 10px;
  }

  .checkbox {
    width: 18px;
    height: 18px;
    accent-color: #667eea;
  }

  .connection-status {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 15px;
    border-radius: 10px;
    margin-bottom: 20px;
    font-weight: 500;
  }

  .connection-status.connected {
    background: rgba(16, 185, 129, 0.1);
    color: #059669;
    border: 2px solid rgba(16, 185, 129, 0.2);
  }

  .connection-status.disconnected {
    background: rgba(239, 68, 68, 0.1);
    color: #dc2626;
    border: 2px solid rgba(239, 68, 68, 0.2);
  }

  .connection-status.connecting {
    background: rgba(251, 191, 36, 0.1);
    color: #d97706;
    border: 2px solid rgba(251, 191, 36, 0.2);
  }

  .status-indicator {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    display: inline-block;
  }

  .status-indicator.connected {
    background: #10b981;
    box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.3);
  }

  .status-indicator.disconnected {
    background: #ef4444;
  }

  .status-indicator.connecting {
    background: #f59e0b;
    animation: pulse 1.5s infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }

  .button {
    padding: 12px 20px;
    border: none;
    border-radius: 10px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    width: 100%;
    margin-top: 10px;
  }

  .button.primary {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
  }

  .button.primary:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
  }

  .button.secondary {
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    color: white;
  }

  .button.secondary:hover {
    transform: translateY(-2px);
    box-shadow: 0 5px 15px rgba(16, 185, 129, 0.3);
  }

  .button.danger {
    background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
    color: white;
  }

  .button.warning {
    background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
    color: white;
  }

  .button:disabled {
    background: #9ca3af;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }

  .notification {
    padding: 15px;
    border-radius: 10px;
    margin-bottom: 20px;
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 0.9rem;
  }

  .notification.error {
    background: rgba(239, 68, 68, 0.1);
    color: #dc2626;
    border: 2px solid rgba(239, 68, 68, 0.2);
  }

  .notification.success {
    background: rgba(16, 185, 129, 0.1);
    color: #059669;
    border: 2px solid rgba(16, 185, 129, 0.2);
  }

  .notification.warning {
    background: rgba(251, 191, 36, 0.1);
    color: #d97706;
    border: 2px solid rgba(251, 191, 36, 0.2);
  }

  .notification.info {
    background: rgba(59, 130, 246, 0.1);
    color: #2563eb;
    border: 2px solid rgba(59, 130, 246, 0.2);
  }

  .notification-container {
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 1000;
    display: flex;
    flex-direction: column;
    gap: 10px;
    max-width: 400px;
  }

  .notification-item {
    padding: 16px 20px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 0.95rem;
    font-weight: 500;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
    animation: slideIn 0.3s ease-out;
    cursor: pointer;
    transition: transform 0.2s ease;
  }

  .notification-item:hover {
    transform: translateX(-5px);
  }

  @keyframes slideIn {
    from {
      transform: translateX(400px);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }

  .notification-item.success {
    background: linear-gradient(135deg, rgba(16, 185, 129, 0.95) 0%, rgba(5, 150, 105, 0.95) 100%);
    color: white;
    border: 2px solid rgba(255, 255, 255, 0.3);
  }

  .notification-item.error {
    background: linear-gradient(135deg, rgba(239, 68, 68, 0.95) 0%, rgba(220, 38, 38, 0.95) 100%);
    color: white;
    border: 2px solid rgba(255, 255, 255, 0.3);
  }

  .notification-item.warning {
    background: linear-gradient(135deg, rgba(251, 191, 36, 0.95) 0%, rgba(217, 119, 6, 0.95) 100%);
    color: white;
    border: 2px solid rgba(255, 255, 255, 0.3);
  }

  .notification-item.info {
    background: linear-gradient(135deg, rgba(59, 130, 246, 0.95) 0%, rgba(37, 99, 235, 0.95) 100%);
    color: white;
    border: 2px solid rgba(255, 255, 255, 0.3);
  }

  .notification-icon {
    font-size: 1.3rem;
    flex-shrink: 0;
  }

  .notification-message {
    flex: 1;
    line-height: 1.4;
  }

  .notification-close {
    background: rgba(255, 255, 255, 0.2);
    border: none;
    color: white;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1rem;
    transition: background 0.2s ease;
    flex-shrink: 0;
  }

  .notification-close:hover {
    background: rgba(255, 255, 255, 0.3);
  }

  .devices-section {
    background: white;
    border-radius: 15px;
    padding: 25px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
    grid-column: 1 / -1;
  }

  .device-type-selector {
    display: flex;
    gap: 12px;
    margin-bottom: 16px;
  }

  .type-option {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    padding: 14px 16px;
    background: #ffffff;
    border: 2px solid #e1e5e9;
    border-radius: 12px;
    cursor: pointer;
    user-select: none;
    color: #374151;
    transition: all 0.2s ease;
  }

  .type-option:hover {
    border-color: #667eea;
    box-shadow: 0 6px 16px rgba(102, 126, 234, 0.15);
    transform: translateY(-1px);
  }

  .type-option.selected {
    border-color: #667eea;
    background: linear-gradient(135deg, rgba(102,126,234,0.08) 0%, rgba(118,75,162,0.08) 100%);
    box-shadow: inset 0 0 0 2px rgba(102, 126, 234, 0.15);
  }

  .devices-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 20px;
    margin-top: 20px;
  }

  .device-card {
    background: #f8f9fa;
    border-radius: 15px;
    padding: 20px;
    border: 2px solid #e1e5e9;
    transition: all 0.3s ease;
  }

  .device-card.connected {
    border-color: #10b981;
    background: linear-gradient(135deg, rgba(16, 185, 129, 0.05) 0%, rgba(5, 150, 105, 0.05) 100%);
  }

  .device-card.disconnected {
    border-color: #ef4444;
    background: linear-gradient(135deg, rgba(239, 68, 68, 0.05) 0%, rgba(220, 38, 38, 0.05) 100%);
    opacity: 0.7;
  }

  .device-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 15px;
  }

  .device-name {
    font-size: 1.1rem;
    font-weight: 600;
    color: #333;
  }

  .device-status {
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 0.8rem;
    font-weight: 500;
    padding: 4px 8px;
    border-radius: 12px;
  }

  .device-status.connected {
    background: rgba(16, 185, 129, 0.1);
    color: #059669;
  }

  .device-status.disconnected {
    background: rgba(239, 68, 68, 0.1);
    color: #dc2626;
  }

  .device-info {
    margin-bottom: 15px;
  }

  .device-info-item {
    display: flex;
    justify-content: space-between;
    margin-bottom: 5px;
    font-size: 0.9rem;
  }

  .device-info-label {
    color: #666;
  }

  .device-info-value {
    color: #333;
    font-weight: 500;
    font-family: monospace;
  }

  .device-controls {
    display: flex;
    gap: 10px;
  }

  .toggle-button {
    flex: 1;
    padding: 12px;
    border: none;
    border-radius: 10px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
  }

  .toggle-button.on {
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    color: white;
  }

  .toggle-button.off {
    background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
    color: white;
  }

  .toggle-button:disabled {
    background: #9ca3af;
    cursor: not-allowed;
    opacity: 0.5;
  }

  .toggle-button:disabled:hover {
    transform: none;
  }

  .remove-button {
    background: #6b7280;
    color: white;
    border: none;
    padding: 12px 15px;
    border-radius: 10px;
    cursor: pointer;
    transition: all 0.3s ease;
  }

  .remove-button:hover {
    background: #ef4444;
  }

  .empty-state {
    text-align: center;
    padding: 60px 20px;
    color: #666;
  }

  .log-section {
    background: #1a1a1a;
    border-radius: 10px;
    padding: 15px;
    margin-top: 20px;
    max-height: 200px;
    overflow-y: auto;
    overflow-x: auto;
  }

  .log-entry {
    color: #e5e5e5;
    font-family: monospace;
    font-size: 0.8rem;
    margin-bottom: 5px;
    padding: 5px;
    border-radius: 3px;
  }

  .log-entry.info {
    background: rgba(59, 130, 246, 0.1);
    color: #93c5fd;
  }

  .log-entry.success {
    background: rgba(16, 185, 129, 0.1);
    color: #6ee7b7;
  }

  .log-entry.error {
    background: rgba(239, 68, 68, 0.1);
    color: #fca5a5;
  }

  .sensor-values {
    background: #f0f9ff;
    border: 1px solid #bae6fd;
    border-radius: 8px;
    padding: 12px;
    margin-bottom: 12px;
  }

  .sensor-value-item {
    display: flex;
    justify-content: space-between;
    padding: 6px 0;
    border-bottom: 1px solid #e0f2fe;
  }

  .sensor-value-item:last-child {
    border-bottom: none;
  }

  .sensor-value-label {
    color: #0369a1;
    font-weight: 500;
    font-size: 0.85rem;
  }

  .sensor-value {
    color: #0c4a6e;
    font-weight: 600;
    font-family: monospace;
  }

  .sensor-raw {
    background: #1e293b;
    color: #94a3b8;
    padding: 12px;
    border-radius: 8px;
    font-family: monospace;
    font-size: 0.75rem;
    white-space: pre-wrap;
    overflow-x: auto;
    margin-top: 12px;
  }

  .parser-help {
    margin-top: 8px;
    padding: 12px;
    background: #eff6ff;
    border-left: 3px solid #3b82f6;
    border-radius: 4px;
    font-size: 0.85rem;
    color: #1e40af;
    line-height: 1.6;
  }

  .parser-help code {
    background: #dbeafe;
    padding: 2px 6px;
    border-radius: 3px;
    font-family: monospace;
    color: #1e3a8a;
  }

  @media (max-width: 768px) {
    .main-grid {
      grid-template-columns: 1fr;
    }
    .devices-grid {
      grid-template-columns: 1fr;
    }
  }
`;