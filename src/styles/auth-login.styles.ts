import { css } from 'lit';

export const authLoginStyles = css`
  :host {
    display: block;
    min-height: 100vh;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
  }

  .auth-container {
    background: white;
    border-radius: 20px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    max-width: 420px;
    width: 100%;
    overflow: hidden;
  }

  .auth-header {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    padding: 40px 30px;
    text-align: center;
    color: white;
  }

  .auth-header h1 {
    margin: 0 0 10px;
    font-size: 2rem;
    font-weight: 700;
  }

  .auth-header p {
    margin: 0;
    opacity: 0.9;
    font-size: 1rem;
  }

  .auth-icon {
    font-size: 3rem;
    margin-bottom: 15px;
  }

  .auth-body {
    padding: 40px 30px;
  }

  .tab-switcher {
    display: flex;
    gap: 10px;
    margin-bottom: 30px;
    background: #f5f7fa;
    padding: 5px;
    border-radius: 12px;
  }

  .tab {
    flex: 1;
    padding: 12px;
    border: none;
    background: transparent;
    border-radius: 8px;
    font-size: 1rem;
    font-weight: 600;
    color: #666;
    cursor: pointer;
    transition: all 0.3s ease;
  }

  .tab.active {
    background: white;
    color: #667eea;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .form-group {
    margin-bottom: 20px;
  }

  .form-label {
    display: block;
    margin-bottom: 8px;
    font-weight: 600;
    color: #333;
    font-size: 0.9rem;
  }

  .form-input {
    width: 100%;
    padding: 14px 16px;
    border: 2px solid #e1e5e9;
    border-radius: 12px;
    font-size: 1rem;
    transition: all 0.3s ease;
    background: #f8f9fa;
    box-sizing: border-box;
  }

  .form-input:focus {
    outline: none;
    border-color: #667eea;
    background: white;
    box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
  }

  .password-strength {
    margin-top: 8px;
    padding: 8px 12px;
    border-radius: 8px;
    font-size: 0.85rem;
    display: none;
  }

  .password-strength.show {
    display: block;
  }

  .password-strength.weak {
    background: rgba(239, 68, 68, 0.1);
    color: #dc2626;
  }

  .password-strength.medium {
    background: rgba(251, 191, 36, 0.1);
    color: #d97706;
  }

  .password-strength.strong {
    background: rgba(16, 185, 129, 0.1);
    color: #059669;
  }

  .password-requirements {
    margin-top: 8px;
    font-size: 0.8rem;
    color: #666;
    line-height: 1.6;
  }

  .password-requirements li {
    margin: 4px 0;
  }

  .submit-button {
    width: 100%;
    padding: 16px;
    border: none;
    border-radius: 12px;
    font-size: 1.1rem;
    font-weight: 700;
    color: white;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    cursor: pointer;
    transition: all 0.3s ease;
    margin-top: 10px;
  }

  .submit-button:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4);
  }

  .submit-button:disabled {
    background: #9ca3af;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }

  .error-message {
    padding: 12px 16px;
    background: rgba(239, 68, 68, 0.1);
    color: #dc2626;
    border-radius: 10px;
    margin-bottom: 20px;
    border: 2px solid rgba(239, 68, 68, 0.2);
    font-size: 0.9rem;
  }

  .success-message {
    padding: 12px 16px;
    background: rgba(16, 185, 129, 0.1);
    color: #059669;
    border-radius: 10px;
    margin-bottom: 20px;
    border: 2px solid rgba(16, 185, 129, 0.2);
    font-size: 0.9rem;
  }

  .helper-text {
    text-align: center;
    margin-top: 20px;
    color: #666;
    font-size: 0.9rem;
  }

  .loading {
    display: inline-block;
    width: 20px;
    height: 20px;
    border: 3px solid rgba(255, 255, 255, 0.3);
    border-radius: 50%;
    border-top-color: white;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  @media (max-width: 480px) {
    .auth-header {
      padding: 30px 20px;
    }

    .auth-body {
      padding: 30px 20px;
    }

    .auth-header h1 {
      font-size: 1.6rem;
    }
  }
`;