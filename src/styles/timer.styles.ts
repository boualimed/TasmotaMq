import { css } from "lit";

 export const timerStyles = css`
    /* Modal styles similar to rule-builder-modal */
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.7);
      backdrop-filter: blur(4px);
      z-index: 3000;
      display: flex;
      align-items: center;
      justify-content: center;
      animation: fadeIn 0.2s ease-in-out;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .modal-content {
      background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
      border-radius: 16px;
      width: 90%;
      max-width: 800px;
      max-height: 90vh;
      overflow: hidden;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
      border: 1px solid rgba(148, 163, 184, 0.2);
      display: flex;
      flex-direction: column;
      animation: slideUp 0.3s ease-out;
    }

    @keyframes slideUp {
      from {
        transform: translateY(50px);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }

    .modal-header {
      padding: 24px 28px;
      border-bottom: 1px solid rgba(148, 163, 184, 0.2);
      background: rgba(30, 41, 59, 0.5);
    }

    .modal-title {
      font-size: 1.5rem;
      font-weight: 700;
      color: #f1f5f9;
      margin: 0;
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .modal-body {
      flex: 1;
      overflow-y: auto;
      padding: 24px 28px;
    }

    .timer-list {
      display: grid;
      gap: 12px;
      margin-bottom: 24px;
    }

    .timer-item {
      background: rgba(30, 41, 59, 0.5);
      border: 1px solid rgba(148, 163, 184, 0.2);
      border-radius: 12px;
      padding: 16px;
      display: flex;
      align-items: center;
      gap: 12px;
      transition: all 0.2s ease;
      cursor: pointer;
    }

    .timer-item:hover {
      border-color: rgba(59, 130, 246, 0.4);
      background: rgba(30, 41, 59, 0.7);
    }

    .timer-item.active {
      border-color: #3b82f6;
      background: rgba(59, 130, 246, 0.15);
    }

    .timer-info {
      flex: 1;
    }

    .timer-number {
      font-size: 0.9rem;
      font-weight: 600;
      color: #94a3b8;
    }

    .timer-details {
      font-size: 0.85rem;
      color: #cbd5e1;
      margin-top: 4px;
    }

    .timer-actions {
      display: flex;
      gap: 8px;
    }

    .form-group {
      margin-bottom: 18px;
    }

    .form-label {
      font-size: 0.95rem;
      font-weight: 600;
      color: #e2e8f0;
      margin-bottom: 8px;
      display: block;
    }

    .form-input, .form-select {
      width: 100%;
      padding: 12px 16px;
      background: rgba(15, 23, 42, 0.5);
      border: 1px solid rgba(148, 163, 184, 0.2);
      border-radius: 10px;
      color: #f1f5f9;
      font-size: 1rem;
      transition: all 0.3s ease;
    }

    .form-input:focus, .form-select:focus {
      outline: none;
      border-color: #3b82f6;
      background: rgba(15, 23, 42, 0.7);
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }

    .checkbox-group {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-top: 8px;
    }

    .checkbox {
      width: 20px;
      height: 20px;
      accent-color: #3b82f6;
      cursor: pointer;
    }

    .button-group {
      display: flex;
      gap: 12px;
      margin-top: 24px;
    }

    .button {
      padding: 12px 24px;
      border: none;
      border-radius: 10px;
      font-size: 0.95rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      flex: 1;
    }

    .button.primary {
      background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
      color: white;
      box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
    }

    .button.primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(59, 130, 246, 0.4);
    }

    .button.secondary {
      background: rgba(148, 163, 184, 0.2);
      color: #e2e8f0;
      border: 1px solid rgba(148, 163, 184, 0.3);
    }

    .button.secondary:hover {
      background: rgba(148, 163, 184, 0.3);
    }

    .button.danger {
      background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
      color: white;
      box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
    }

    .empty-state {
      text-align: center;
      padding: 40px 20px;
      color: #64748b;
    }

    .empty-state-icon {
      font-size: 3rem;
      margin-bottom: 16px;
      opacity: 0.5;
    }

    .help-text {
      font-size: 0.85rem;
      color: #94a3b8;
      margin-top: 8px;
      line-height: 1.5;
    }

    .days-selector {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 8px;
      margin-top: 8px;
    }

    .day-button {
      padding: 8px;
      background: rgba(30, 41, 59, 0.5);
      border: 2px solid rgba(148, 163, 184, 0.2);
      border-radius: 8px;
      color: #cbd5e1;
      font-size: 0.85rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .day-button:hover {
      border-color: rgba(59, 130, 246, 0.4);
    }

    .day-button.active {
      background: rgba(59, 130, 246, 0.2);
      border-color: #3b82f6;
      color: #93c5fd;
    }
      .shield-warning {
    padding: 12px 16px;
    border-radius: 8px;
    margin-bottom: 16px;
    display: flex;
    align-items: center;
    gap: 12px;
    font-weight: 500;
  }

  .shield-warning.emergency {
    background: #fee2e2;
    color: #991b1b;
    border: 2px solid #dc2626;
  }

  .shield-warning.paused {
    background: #fef3c7;
    color: #92400e;
    border: 2px solid #f59e0b;
  }

  .shield-warning.blacklisted {
    background: #f3f4f6;
    color: #374151;
    border: 2px solid #6b7280;
  }

  .shield-status.ok {
    padding: 12px 16px;
    border-radius: 8px;
    margin-bottom: 16px;
    background: #d1fae5;
    color: #065f46;
    border: 2px solid #10b981;
    display: flex;
    align-items: center;
    gap: 12px;
    font-weight: 500;
  }

  .shield-warning .icon,
  .shield-status .icon {
    font-size: 20px;
  }
  `;