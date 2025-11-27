import { css } from 'lit';

export const chartStyles = css`
.chart-modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 2000;
      animation: fadeIn 0.2s ease-out;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .chart-container {
      background: #1f2937;
      border-radius: 12px;
      max-width: 95vw;
      max-height: 90vh;
      width: 1200px;
      display: flex;
      flex-direction: column;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
      animation: slideUp 0.3s ease-out;
    }

    @keyframes slideUp {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .chart-header {
      padding: 20px 24px;
      border-bottom: 1px solid #374151;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #111827;
      border-radius: 12px 12px 0 0;
    }

    .chart-title {
      font-size: 1.25rem;
      font-weight: 600;
      color: #f3f4f6;
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .device-badge {
      background: #3b82f6;
      color: white;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 0.875rem;
      font-weight: 500;
    }

    .chart-close {
      background: transparent;
      border: none;
      color: #9ca3af;
      font-size: 2rem;
      cursor: pointer;
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 6px;
      transition: all 0.2s;
    }

    .chart-close:hover {
      background: #374151;
      color: #f3f4f6;
    }

    .chart-controls {
      padding: 16px 24px;
      border-bottom: 1px solid #374151;
      display: flex;
      gap: 16px;
      align-items: center;
      flex-wrap: wrap;
      background: #1f2937;
    }

    .control-group {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .control-label {
      font-size: 0.875rem;
      color: #9ca3af;
      font-weight: 500;
    }

    .select {
      padding: 8px 12px;
      background: #111827;
      border: 1px solid #374151;
      border-radius: 6px;
      color: #f3f4f6;
      font-size: 0.875rem;
      cursor: pointer;
    }

    .select:focus {
      outline: none;
      border-color: #3b82f6;
    }

    .button {
      padding: 8px 16px;
      border: none;
      border-radius: 6px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
      font-size: 0.875rem;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .button.primary {
      background: #3b82f6;
      color: white;
    }

    .button.primary:hover:not(:disabled) {
      background: #2563eb;
    }

    .button.secondary {
      background: #374151;
      color: #d1d5db;
    }

    .button.secondary:hover {
      background: #4b5563;
    }

    .button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .chart-content {
      flex: 1;
      overflow-y: auto;
      padding: 24px;
    }

    .chart-canvas-container {
      background: #111827;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 20px;
    }

    canvas {
      max-width: 100%;
      height: 400px !important;
    }

    .metrics-selector {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 12px;
      margin-bottom: 20px;
    }

    .metric-item {
      background: #111827;
      border: 1px solid #374151;
      border-radius: 6px;
      padding: 12px;
      display: flex;
      align-items: center;
      gap: 10px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .metric-item:hover {
      border-color: #4b5563;
    }

    .metric-item.selected {
      border-color: #3b82f6;
      background: #1e3a8a;
    }

    .metric-checkbox {
      width: 18px;
      height: 18px;
      accent-color: #3b82f6;
      cursor: pointer;
    }

    .metric-color {
      width: 16px;
      height: 16px;
      border-radius: 3px;
    }

    .metric-label {
      flex: 1;
      font-size: 0.875rem;
      color: #f3f4f6;
    }

    .metric-unit {
      font-size: 0.75rem;
      color: #9ca3af;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 12px;
      margin-bottom: 20px;
    }

    .stat-card {
      background: #111827;
      border: 1px solid #374151;
      border-radius: 8px;
      padding: 16px;
    }

    .stat-label {
      font-size: 0.75rem;
      color: #9ca3af;
      margin-bottom: 4px;
    }

    .stat-value {
      font-size: 1.5rem;
      font-weight: 600;
      color: #f3f4f6;
    }

    .stat-unit {
      font-size: 0.875rem;
      color: #9ca3af;
      margin-left: 4px;
    }

    .loading {
      text-align: center;
      padding: 48px;
      color: #9ca3af;
    }

    .spinner {
      border: 3px solid #374151;
      border-top: 3px solid #3b82f6;
      border-radius: 50%;
      width: 40px;
      height: 40px;
      animation: spin 1s linear infinite;
      margin: 0 auto 16px;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .empty-state {
      text-align: center;
      padding: 48px;
      color: #6b7280;
    }

    .empty-icon {
      font-size: 3rem;
      margin-bottom: 12px;
      opacity: 0.5;
    }

    .error-message {
      background: #7f1d1d;
      border: 1px solid #991b1b;
      color: #fca5a5;
      padding: 12px 16px;
      border-radius: 6px;
      margin-bottom: 16px;
    }

`;