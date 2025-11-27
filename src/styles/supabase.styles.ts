import { css } from 'lit';
export const supabaseStyles = css`
:host {
      display: block;
      padding: 20px;
      max-width: 800px;
      margin: 0 auto;
    }

    .header {
      display: flex;
      align-items: center;
      gap: 15px;
      margin-bottom: 30px;
    }

    .back-button {
      padding: 8px 16px;
      background: #6366f1;
      color: white;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-size: 1.2rem;
    }

    .back-button:hover {
      background: #4f46e5;
    }

    .title {
      font-size: 1.5rem;
      font-weight: 600;
      color: #1f2937;
    }

    .section {
      background: white;
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      margin-bottom: 20px;
    }

    .section-title {
      font-size: 1.2rem;
      font-weight: 600;
      color: #1f2937;
      margin-bottom: 20px;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .form-group {
      margin-bottom: 20px;
    }

    .form-label {
      display: block;
      margin-bottom: 8px;
      font-weight: 500;
      color: #374151;
    }

    .form-input {
      width: 100%;
      padding: 10px 12px;
      border: 2px solid #e5e7eb;
      border-radius: 8px;
      font-size: 0.95rem;
      transition: border-color 0.2s;
    }

    .form-input:focus {
      outline: none;
      border-color: #6366f1;
    }

    .form-input:disabled {
      background: #f3f4f6;
      cursor: not-allowed;
    }

    .checkbox-group {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 15px;
    }

    .checkbox {
      width: 20px;
      height: 20px;
      cursor: pointer;
    }

    .button {
      padding: 12px 24px;
      border: none;
      border-radius: 8px;
      font-size: 0.95rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    }

    .button.primary {
      background: #6366f1;
      color: white;
    }

    .button.primary:hover:not(:disabled) {
      background: #4f46e5;
    }

    .button.secondary {
      background: #e5e7eb;
      color: #374151;
    }

    .button.secondary:hover:not(:disabled) {
      background: #d1d5db;
    }

    .button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .button-group {
      display: flex;
      gap: 12px;
      margin-top: 20px;
    }

    .help-text {
      font-size: 0.85rem;
      color: #6b7280;
      margin-top: 6px;
    }

    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 0.85rem;
      font-weight: 500;
    }

    .status-badge.enabled {
      background: #dcfce7;
      color: #166534;
    }

    .status-badge.disabled {
      background: #fee2e2;
      color: #991b1b;
    }

    .info-box {
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 20px;
    }

    .info-box p {
      margin: 0;
      color: #1e40af;
      line-height: 1.5;
    }
      `;