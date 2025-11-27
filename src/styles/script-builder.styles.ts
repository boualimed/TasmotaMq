// ============================================================================
// script-builder-modal.component.ts - CSS STYLES ONLY (Replace static styles)
// ============================================================================

import { css } from 'lit';

export const scriptBuilder = css`
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.8);
    backdrop-filter: blur(8px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 3000;
    animation: fadeIn 0.3s ease-out;
    padding: 20px;
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .modal-container {
    background: rgba(30, 41, 59, 0.98);
    backdrop-filter: blur(20px);
    border: 1px solid rgba(148, 163, 184, 0.3);
    border-radius: 20px;
    max-width: 1050px;
    max-height: 90vh;
    width: 100%;
    display: flex;
    flex-direction: column;
    box-shadow: 0 25px 80px rgba(0, 0, 0, 0.6);
    animation: slideUp 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
  }

  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(40px) scale(0.95);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  .modal-header {
    padding: 24px 28px;
    border-bottom: 1px solid rgba(148, 163, 184, 0.2);
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: rgba(15, 23, 42, 0.6);
    border-radius: 20px 20px 0 0;
  }

  .modal-title {
    font-size: 1.4rem;
    font-weight: 700;
    color: #f1f5f9;
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .device-badge {
    background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
    color: white;
    padding: 6px 14px;
    border-radius: 16px;
    font-size: 0.875rem;
    font-weight: 600;
    box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
  }

  .warning-banner {
    background: rgba(251, 191, 36, 0.15);
    border: 1px solid rgba(251, 191, 36, 0.3);
    color: #fcd34d;
    padding: 14px 18px;
    border-radius: 12px;
    font-size: 0.9rem;
    margin-bottom: 20px;
    display: flex;
    align-items: center;
    gap: 12px;
    font-weight: 500;
  }

  .modal-close {
    background: rgba(148, 163, 184, 0.1);
    border: 1px solid rgba(148, 163, 184, 0.2);
    color: #94a3b8;
    font-size: 1.8rem;
    cursor: pointer;
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 10px;
    transition: all 0.3s ease;
  }

  .modal-close:hover {
    background: rgba(239, 68, 68, 0.2);
    border-color: rgba(239, 68, 68, 0.3);
    color: #fca5a5;
    transform: rotate(90deg);
  }

  .modal-content {
    flex: 1;
    overflow-y: auto;
    padding: 28px;
  }

  .modal-content::-webkit-scrollbar {
    width: 10px;
  }

  .modal-content::-webkit-scrollbar-track {
    background: rgba(15, 23, 42, 0.5);
    border-radius: 5px;
  }

  .modal-content::-webkit-scrollbar-thumb {
    background: rgba(148, 163, 184, 0.4);
    border-radius: 5px;
  }

  .modal-content::-webkit-scrollbar-thumb:hover {
    background: rgba(148, 163, 184, 0.6);
  }

  .section {
    margin-bottom: 32px;
  }

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    gap: 16px;
    flex-wrap: wrap;
  }

  .section-title {
    font-size: 1.2rem;
    font-weight: 700;
    color: #f1f5f9;
  }

  .tabs {
    display: flex;
    gap: 8px;
    border-bottom: 2px solid rgba(148, 163, 184, 0.2);
    margin-bottom: 24px;
    overflow-x: auto;
  }

  .tab {
    padding: 12px 24px;
    background: transparent;
    border: none;
    color: #94a3b8;
    cursor: pointer;
    border-bottom: 3px solid transparent;
    transition: all 0.3s ease;
    font-weight: 600;
    font-size: 0.95rem;
    white-space: nowrap;
  }

  .tab.active {
    color: #8b5cf6;
    border-bottom-color: #8b5cf6;
  }

  .tab:hover:not(.active) {
    color: #cbd5e1;
    background: rgba(139, 92, 246, 0.05);
  }

  .template-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 18px;
  }

  .template-card {
    background: rgba(15, 23, 42, 0.6);
    border: 2px solid rgba(148, 163, 184, 0.2);
    border-radius: 12px;
    padding: 20px;
    cursor: pointer;
    transition: all 0.3s ease;
    position: relative;
    overflow: hidden;
  }

  .template-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(139, 92, 246, 0.1), transparent);
    transition: left 0.5s;
  }

  .template-card:hover::before {
    left: 100%;
  }

  .template-card:hover {
    border-color: #8b5cf6;
    transform: translateY(-4px);
    box-shadow: 0 8px 24px rgba(139, 92, 246, 0.3);
  }

  .template-card.selected {
    border-color: #8b5cf6;
    background: rgba(139, 92, 246, 0.15);
    box-shadow: 0 4px 16px rgba(139, 92, 246, 0.3);
  }

  .template-name {
    font-size: 1.05rem;
    font-weight: 700;
    color: #f1f5f9;
    margin-bottom: 10px;
  }

  .template-description {
    font-size: 0.875rem;
    color: #cbd5e1;
    line-height: 1.6;
    margin-bottom: 14px;
  }

  .template-meta {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }

  .template-badge {
    display: inline-block;
    background: rgba(139, 92, 246, 0.2);
    color: #c4b5fd;
    padding: 5px 12px;
    border-radius: 14px;
    font-size: 0.75rem;
    font-weight: 600;
    border: 1px solid rgba(139, 92, 246, 0.3);
  }

  .complexity-badge {
    background: rgba(16, 185, 129, 0.2);
    color: #6ee7b7;
    padding: 5px 12px;
    border-radius: 14px;
    font-size: 0.75rem;
    font-weight: 600;
    border: 1px solid rgba(16, 185, 129, 0.3);
  }

  .complexity-badge.intermediate {
    background: rgba(251, 191, 36, 0.2);
    color: #fcd34d;
    border-color: rgba(251, 191, 36, 0.3);
  }

  .complexity-badge.advanced {
    background: rgba(239, 68, 68, 0.2);
    color: #fca5a5;
    border-color: rgba(239, 68, 68, 0.3);
  }

  .config-form {
    background: rgba(15, 23, 42, 0.6);
    border: 1px solid rgba(148, 163, 184, 0.2);
    border-radius: 12px;
    padding: 24px;
    margin-top: 20px;
  }

  .form-group {
    margin-bottom: 20px;
  }

  .form-label {
    display: block;
    font-size: 0.95rem;
    font-weight: 600;
    color: #e2e8f0;
    margin-bottom: 8px;
  }

  .form-input {
    width: 100%;
    padding: 12px 16px;
    background: rgba(15, 23, 42, 0.8);
    border: 1px solid rgba(148, 163, 184, 0.3);
    border-radius: 10px;
    color: #f1f5f9;
    font-size: 0.95rem;
    transition: all 0.3s ease;
    box-sizing: border-box;
  }

  .form-input::placeholder {
    color: #64748b;
  }

  .form-input:focus {
    outline: none;
    border-color: #8b5cf6;
    background: rgba(15, 23, 42, 0.9);
    box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.15);
  }

  .form-help {
    font-size: 0.8rem;
    color: #94a3b8;
    margin-top: 6px;
    line-height: 1.4;
  }

  .button-group {
    display: flex;
    gap: 12px;
    margin-top: 24px;
    flex-wrap: wrap;
  }

  .button {
    padding: 12px 24px;
    border: none;
    border-radius: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    font-size: 0.95rem;
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
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
    transition: left 0.5s;
  }

  .button:hover::before {
    left: 100%;
  }

  .button.primary {
    background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
    color: white;
    box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
  }

  .button.primary:hover:not(:disabled) {
    background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%);
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(139, 92, 246, 0.4);
  }

  .button.secondary {
    background: rgba(71, 85, 105, 0.6);
    color: #e2e8f0;
    border: 1px solid rgba(148, 163, 184, 0.3);
  }

  .button.secondary:hover {
    background: rgba(71, 85, 105, 0.8);
    border-color: rgba(148, 163, 184, 0.4);
    transform: translateY(-2px);
  }

  .button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none !important;
  }

  .script-editor {
    background: rgba(15, 23, 42, 0.8);
    border: 1px solid rgba(148, 163, 184, 0.3);
    border-radius: 12px;
    padding: 20px;
    margin-top: 20px;
  }

  .section-editor {
    margin-bottom: 24px;
    background: rgba(30, 41, 59, 0.6);
    border: 1px solid rgba(148, 163, 184, 0.2);
    border-radius: 12px;
    padding: 16px;
  }

  .section-header-edit {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
    flex-wrap: wrap;
    gap: 12px;
  }

  .section-type {
    font-family: 'Courier New', monospace;
    color: #6ee7b7;
    font-weight: 700;
    font-size: 0.95rem;
    background: rgba(16, 185, 129, 0.1);
    padding: 6px 12px;
    border-radius: 8px;
    border: 1px solid rgba(16, 185, 129, 0.3);
  }

  .code-editor {
    width: 100%;
    min-height: 120px;
    background: rgba(15, 23, 42, 0.9);
    border: 1px solid rgba(148, 163, 184, 0.3);
    border-radius: 8px;
    padding: 14px;
    font-family: 'Courier New', monospace;
    font-size: 0.875rem;
    color: #6ee7b7;
    resize: vertical;
    transition: all 0.3s ease;
    box-sizing: border-box;
  }

  .code-editor:focus {
    outline: none;
    border-color: #8b5cf6;
    box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.15);
  }

  .code-editor:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .script-preview {
    background: rgba(15, 23, 42, 0.9);
    border: 1px solid rgba(148, 163, 184, 0.3);
    border-radius: 8px;
    padding: 16px;
    font-family: 'Courier New', monospace;
    font-size: 0.8rem;
    color: #6ee7b7;
    overflow-x: auto;
    white-space: pre-wrap;
    word-break: break-all;
    max-height: 300px;
    overflow-y: auto;
  }

  .script-preview::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }

  .script-preview::-webkit-scrollbar-track {
    background: rgba(15, 23, 42, 0.5);
  }

  .script-preview::-webkit-scrollbar-thumb {
    background: rgba(148, 163, 184, 0.3);
    border-radius: 4px;
  }

  .upload-progress {
    margin-top: 20px;
    background: rgba(15, 23, 42, 0.6);
    border: 1px solid rgba(148, 163, 184, 0.2);
    border-radius: 12px;
    padding: 18px;
  }

  .progress-text {
    font-size: 0.95rem;
    color: #e2e8f0;
    margin-bottom: 12px;
    font-weight: 600;
  }

  .progress-bar {
    height: 8px;
    background: rgba(71, 85, 105, 0.5);
    border-radius: 4px;
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
    transition: width 0.3s ease;
    box-shadow: 0 0 10px rgba(139, 92, 246, 0.5);
  }

  .script-item {
    background: rgba(15, 23, 42, 0.6);
    border: 1px solid rgba(148, 163, 184, 0.2);
    border-radius: 12px;
    padding: 20px;
  }

  .script-header {
    display: flex;
    justify-content: space-between;
    align-items: start;
    margin-bottom: 16px;
    gap: 16px;
    flex-wrap: wrap;
  }

  .script-info {
    flex: 1;
    min-width: 200px;
  }

  .script-name {
    font-size: 1.1rem;
    font-weight: 700;
    color: #f1f5f9;
    margin-bottom: 6px;
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
  }

  .script-meta {
    font-size: 0.875rem;
    color: #94a3b8;
    line-height: 1.6;
  }

  .script-actions {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
  }

  .icon-button {
    padding: 8px 16px;
    background: rgba(71, 85, 105, 0.6);
    border: 1px solid rgba(148, 163, 184, 0.3);
    border-radius: 8px;
    color: #e2e8f0;
    cursor: pointer;
    transition: all 0.3s ease;
    font-size: 0.875rem;
    font-weight: 600;
  }

  .icon-button:hover {
    background: rgba(71, 85, 105, 0.8);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  }

  .icon-button.danger {
    background: rgba(239, 68, 68, 0.2);
    border-color: rgba(239, 68, 68, 0.3);
    color: #fca5a5;
  }

  .icon-button.danger:hover {
    background: rgba(239, 68, 68, 0.3);
    border-color: rgba(239, 68, 68, 0.4);
  }

  .status-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 14px;
    border-radius: 16px;
    font-size: 0.8rem;
    font-weight: 600;
  }

  .status-badge.enabled {
    background: rgba(16, 185, 129, 0.2);
    color: #6ee7b7;
    border: 1px solid rgba(16, 185, 129, 0.3);
  }

  .status-badge.disabled {
    background: rgba(239, 68, 68, 0.2);
    color: #fca5a5;
    border: 1px solid rgba(239, 68, 68, 0.3);
  }

  .empty-state {
    text-align: center;
    padding: 60px 24px;
    color: #64748b;
  }

  .empty-icon {
    font-size: 4rem;
    margin-bottom: 16px;
    opacity: 0.4;
  }

  .empty-text {
    font-size: 1.05rem;
    font-weight: 600;
    color: #94a3b8;
    line-height: 1.6;
  }

  .checkbox-group {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .checkbox {
    width: 18px;
    height: 18px;
    accent-color: #8b5cf6;
    cursor: pointer;
  }

  /* Responsive Design */
  @media (max-width: 768px) {
    .modal-overlay {
      padding: 10px;
    }

    .modal-container {
      max-height: 95vh;
      border-radius: 16px;
    }

    .modal-header {
      padding: 18px 20px;
      border-radius: 16px 16px 0 0;
    }

    .modal-title {
      font-size: 1.2rem;
      flex-wrap: wrap;
    }

    .modal-content {
      padding: 20px;
    }

    .template-grid {
      grid-template-columns: 1fr;
    }

    .tabs {
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
    }

    .button-group {
      flex-direction: column;
    }

    .button {
      width: 100%;
    }

    .script-header {
      flex-direction: column;
    }

    .script-actions {
      width: 100%;
    }

    .icon-button {
      flex: 1;
    }
  }

  @media (max-width: 480px) {
    .modal-header {
      padding: 16px 18px;
    }

    .modal-title {
      font-size: 1.1rem;
    }

    .device-badge {
      font-size: 0.8rem;
      padding: 4px 10px;
    }

    .modal-content {
      padding: 16px;
    }

    .section-title {
      font-size: 1.05rem;
    }

    .tab {
      padding: 10px 16px;
      font-size: 0.875rem;
    }
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