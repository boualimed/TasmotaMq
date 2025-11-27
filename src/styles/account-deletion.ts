import { css } from 'lit';

export const deletionStyles = css`
    :host {
          display: block;
          min-height: 100vh;
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%);
          padding: 40px 20px;
        }

        .container {
          max-width: 700px;
          margin: 0 auto;
        }

        .header {
          text-align: center;
          margin-bottom: 40px;
        }

        .header-icon {
          font-size: 4rem;
          margin-bottom: 20px;
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }

        .header h1 {
          font-size: 2rem;
          color: #fca5a5;
          margin-bottom: 10px;
        }

        .header p {
          color: #cbd5e1;
          font-size: 1rem;
        }

        .card {
          background: rgba(30, 41, 59, 0.6);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(148, 163, 184, 0.2);
          border-radius: 16px;
          padding: 32px;
          margin-bottom: 20px;
        }

        .warning-box {
          background: rgba(239, 68, 68, 0.1);
          border: 2px solid rgba(239, 68, 68, 0.3);
          border-radius: 12px;
          padding: 24px;
          margin-bottom: 24px;
        }

        .warning-title {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 1.25rem;
          font-weight: 700;
          color: #fca5a5;
          margin-bottom: 12px;
        }

        .warning-list {
          list-style: none;
          padding: 0;
          margin: 16px 0;
        }

        .warning-list li {
          padding: 8px 0;
          color: #fecaca;
          display: flex;
          align-items: flex-start;
          gap: 10px;
        }

        .warning-list li::before {
          content: '⚠️';
          flex-shrink: 0;
        }

        .form-group {
          margin-bottom: 20px;
        }

        .form-label {
          display: block;
          color: #e2e8f0;
          font-weight: 600;
          margin-bottom: 8px;
        }

        .form-input {
          width: 100%;
          padding: 14px 18px;
          background: rgba(15, 23, 42, 0.5);
          border: 1px solid rgba(148, 163, 184, 0.2);
          border-radius: 10px;
          color: #f1f5f9;
          font-size: 1rem;
          font-family: inherit;
          box-sizing: border-box;
          transition: all 0.3s ease;
        }

        .form-input:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .form-input.error {
          border-color: #ef4444;
        }

        .verification-options {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-bottom: 24px;
        }

        .verification-option {
          padding: 16px;
          background: rgba(15, 23, 42, 0.5);
          border: 2px solid rgba(148, 163, 184, 0.2);
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.3s ease;
          text-align: center;
        }

        .verification-option:hover {
          border-color: #3b82f6;
          background: rgba(59, 130, 246, 0.1);
        }

        .verification-option.selected {
          border-color: #3b82f6;
          background: rgba(59, 130, 246, 0.2);
        }

        .verification-icon {
          font-size: 2rem;
          margin-bottom: 8px;
        }

        .verification-title {
          font-weight: 600;
          color: #f1f5f9;
        }

        .button-group {
          display: flex;
          gap: 12px;
          margin-top: 24px;
        }

        .button {
          flex: 1;
          padding: 14px 24px;
          border: none;
          border-radius: 10px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          font-family: inherit;
        }

        .button-primary {
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          color: white;
        }

        .button-primary:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 10px 25px rgba(59, 130, 246, 0.3);
        }

        .button-danger {
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
          color: white;
        }

        .button-danger:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 10px 25px rgba(239, 68, 68, 0.3);
        }

        .button-secondary {
          background: rgba(148, 163, 184, 0.2);
          color: #e2e8f0;
          border: 1px solid rgba(148, 163, 184, 0.3);
        }

        .button-secondary:hover {
          background: rgba(148, 163, 184, 0.3);
        }

        .button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .error-message {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: #fca5a5;
          padding: 12px 16px;
          border-radius: 8px;
          margin-bottom: 16px;
        }

        .success-box {
          background: rgba(34, 197, 94, 0.1);
          border: 2px solid rgba(34, 197, 94, 0.3);
          border-radius: 12px;
          padding: 24px;
          text-align: center;
        }

        .success-icon {
          font-size: 4rem;
          margin-bottom: 16px;
        }

        .success-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: #86efac;
          margin-bottom: 12px;
        }

        .grace-period-box {
          background: rgba(251, 146, 60, 0.1);
          border: 1px solid rgba(251, 146, 60, 0.3);
          border-radius: 8px;
          padding: 16px;
          margin: 16px 0;
        }

        .grace-period-text {
          color: #fdba74;
          font-weight: 600;
          margin-bottom: 8px;
        }

        .grace-period-date {
          font-size: 1.2rem;
          font-weight: 700;
          color: #fb923c;
        }

        .help-text {
          color: #94a3b8;
          font-size: 0.875rem;
          margin-top: 8px;
        }

        @media (max-width: 768px) {
          .verification-options {
            grid-template-columns: 1fr;
          }

          .button-group {
            flex-direction: column-reverse;
          }
        }
            /* 🆕 Processing Step */
  .processing-box {
    text-align: center;
    padding: 48px 24px;
  }

  .spinner-large {
    width: 64px;
    height: 64px;
    border: 4px solid #334155;
    border-top-color: #3b82f6;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  /* 🆕 Enhanced Grace Period Box */
  .grace-period-box {
    background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%);
    border: 2px solid #3b82f6;
    border-radius: 12px;
    padding: 24px;
    margin: 24px 0;
    text-align: center;
    box-shadow: 0 8px 24px rgba(59, 130, 246, 0.2);
  }

  .grace-period-label {
    font-size: 0.875rem;
    color: #93c5fd;
    margin-bottom: 12px;
    font-weight: 500;
  }

  .grace-period-date {
    font-size: 1.5rem;
    font-weight: 700;
    color: #60a5fa;
    margin: 8px 0;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  }

  .grace-period-time {
    font-size: 1.125rem;
    color: #93c5fd;
    margin: 4px 0;
  }

  .grace-period-days {
    font-size: 0.875rem;
    color: #bfdbfe;
    margin-top: 8px;
    font-style: italic;
  }

  /* 🆕 Deletion Summary Box */
  .deletion-summary-box {
    background: rgba(15, 23, 42, 0.5);
    border: 1px solid #334155;
    border-radius: 8px;
    padding: 20px;
    margin: 20px 0;
  }

  .summary-title {
    font-size: 1rem;
    font-weight: 600;
    color: #10b981;
    margin-bottom: 12px;
  }

  .summary-list {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .summary-list li {
    padding: 8px 0;
    color: #cbd5e1;
    font-size: 0.875rem;
    border-bottom: 1px solid #1e293b;
  }

  .summary-list li:last-child {
    border-bottom: none;
  }

  .summary-note {
    margin-top: 16px;
    padding: 12px;
    background: rgba(251, 191, 36, 0.1);
    border-left: 3px solid #fbbf24;
    color: #fcd34d;
    font-size: 0.813rem;
    border-radius: 4px;
  }

  /* 🆕 Info Box */
  .info-box {
    background: rgba(59, 130, 246, 0.1);
    border: 1px solid #3b82f6;
    border-radius: 8px;
    padding: 16px;
  }

  .info-title {
    font-size: 0.938rem;
    font-weight: 600;
    color: #60a5fa;
    margin-bottom: 12px;
  }

  .info-list {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .info-list li {
    padding: 6px 0;
    color: #cbd5e1;
    font-size: 0.875rem;
    line-height: 1.6;
  }

  .info-list li strong {
    color: #3b82f6;
  }

  /* 🆕 Countdown Timer */
  .countdown-box {
    background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
    border: 2px solid #475569;
    border-radius: 12px;
    padding: 24px;
    margin: 24px 0;
    text-align: center;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }

  .countdown-text {
    font-size: 0.938rem;
    color: #94a3b8;
    margin-bottom: 12px;
  }

  .countdown-number {
    font-size: 4rem;
    font-weight: 700;
    color: #3b82f6;
    line-height: 1;
    margin: 12px 0;
    text-shadow: 0 4px 8px rgba(59, 130, 246, 0.3);
    animation: pulse 1s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% {
      transform: scale(1);
      opacity: 1;
    }
    50% {
      transform: scale(1.05);
      opacity: 0.8;
    }
  }

  .countdown-label {
    font-size: 0.875rem;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  /* Enhanced Warning Box for Success Step */
  .warning-box {
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid #ef4444;
    border-radius: 8px;
    padding: 16px;
    margin: 16px 0;
  }

  .warning-box .info-title {
    color: #fcd34d;
  }

  /* Responsive adjustments */
  @media (max-width: 640px) {
    .countdown-number {
      font-size: 3rem;
    }

    .grace-period-date {
      font-size: 1.25rem;
    }

    .grace-period-time {
      font-size: 1rem;
    }
  }
      `;