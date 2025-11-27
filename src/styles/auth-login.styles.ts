// auth-login.styles.ts (Complete with Recovery UI Styles)
import { css } from 'lit';

export const authLoginStyles = css`
  :host {
    display: block;
    width: 100%;
    min-height: 100vh;
    background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%);
    position: relative;
    overflow-x: hidden;
  }

  /* Animated background particles */
  .auth-container::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-image:
      radial-gradient(circle at 20% 30%, rgba(59, 130, 246, 0.1) 0%, transparent 50%),
      radial-gradient(circle at 80% 70%, rgba(139, 92, 246, 0.1) 0%, transparent 50%),
      radial-gradient(circle at 50% 50%, rgba(59, 130, 246, 0.05) 0%, transparent 50%);
    animation: pulse-bg 8s ease-in-out infinite;
    pointer-events: none;
  }

  @keyframes pulse-bg {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0.8;
    }
  }

  /* Main container */
  .auth-container {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    padding: 40px 20px;
    z-index: 1;
  }

  /* Header section */
  .auth-header {
    text-align: center;
    margin-bottom: 40px;
    animation: fadeInDown 0.8s ease-out;
  }

  .auth-icon {
    width: 80px;
    height: 80px;
    margin: 0 auto 24px;
    font-size: 2.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
    border-radius: 20px;
    box-shadow: 0 20px 50px rgba(59, 130, 246, 0.3);
    animation: pulse-icon 3s ease-in-out infinite;
    position: relative;
    overflow: hidden;
  }

  .auth-icon::before {
    content: '';
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: linear-gradient(
      45deg,
      transparent,
      rgba(255, 255, 255, 0.1),
      transparent
    );
    transform: rotate(45deg);
    animation: shine 3s infinite;
  }

  @keyframes shine {
    0% { transform: translateX(-100%) translateY(-100%) rotate(45deg); }
    100% { transform: translateX(100%) translateY(100%) rotate(45deg); }
  }

  @keyframes pulse-icon {
    0%, 100% {
      transform: scale(1);
      box-shadow: 0 20px 50px rgba(59, 130, 246, 0.3);
    }
    50% {
      transform: scale(1.05);
      box-shadow: 0 25px 60px rgba(59, 130, 246, 0.5);
    }
  }

  .auth-header h1 {
    font-size: clamp(1.75rem, 4vw, 2.5rem);
    font-weight: 800;
    background: linear-gradient(135deg, #ffffff 0%, #e0e7ff 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    margin-bottom: 12px;
    letter-spacing: -0.02em;
  }

  .auth-header p {
    font-size: 1rem;
    color: #cbd5e1;
    font-weight: 400;
  }

  /* Body section */
  .auth-body {
    width: 100%;
    max-width: 440px;
    background: rgba(30, 41, 59, 0.6);
    backdrop-filter: blur(20px);
    border: 1px solid rgba(148, 163, 184, 0.2);
    border-radius: 24px;
    padding: 40px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    animation: fadeInUp 0.8s ease-out 0.2s both;
  }

  /* Tab switcher */
  .tab-switcher {
    display: flex;
    gap: 8px;
    background: rgba(15, 23, 42, 0.5);
    border-radius: 12px;
    padding: 6px;
    margin-bottom: 32px;
  }

  .tab {
    flex: 1;
    background: transparent;
    color: #94a3b8;
    border: none;
    padding: 12px 20px;
    font-size: 1rem;
    font-weight: 600;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.3s ease;
    font-family: inherit;
  }

  .tab:hover {
    color: #cbd5e1;
    background: rgba(59, 130, 246, 0.1);
  }

  .tab.active {
    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
    color: white;
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
  }

  /* Messages */
  .error-message,
  .success-message {
    padding: 16px 20px;
    border-radius: 12px;
    margin-bottom: 24px;
    font-size: 0.95rem;
    font-weight: 500;
    animation: slideDown 0.3s ease-out;
  }

  .error-message {
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.3);
    color: #fca5a5;
  }

  .success-message {
    background: rgba(34, 197, 94, 0.1);
    border: 1px solid rgba(34, 197, 94, 0.3);
    color: #86efac;
  }

  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  /* Form */
  form {
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .form-label {
    font-size: 0.95rem;
    font-weight: 600;
    color: #e2e8f0;
    letter-spacing: 0.01em;
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
    transition: all 0.3s ease;
    box-sizing: border-box;
  }

  .form-input::placeholder {
    color: #64748b;
  }

  .form-input:focus {
    outline: none;
    border-color: #3b82f6;
    background: rgba(15, 23, 42, 0.7);
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  .form-input:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* Select dropdown */
  select.form-input {
    cursor: pointer;
  }

  /* Password strength indicator */
  .password-strength {
    padding: 10px 14px;
    border-radius: 8px;
    font-size: 0.875rem;
    font-weight: 500;
    margin-top: 8px;
    opacity: 0;
    transform: translateY(-5px);
    transition: all 0.3s ease;
  }

  .password-strength.show {
    opacity: 1;
    transform: translateY(0);
  }

  .password-strength.weak {
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.3);
    color: #fca5a5;
  }

  .password-strength.medium {
    background: rgba(251, 146, 60, 0.1);
    border: 1px solid rgba(251, 146, 60, 0.3);
    color: #fdba74;
  }

  .password-strength.strong {
    background: rgba(34, 197, 94, 0.1);
    border: 1px solid rgba(34, 197, 94, 0.3);
    color: #86efac;
  }

  .password-strength strong {
    font-weight: 700;
  }

  /* Password requirements */
  .password-requirements {
    list-style: none;
    padding: 12px 0 0 0;
    margin: 0;
    font-size: 0.85rem;
    color: #94a3b8;
    line-height: 1.8;
  }

  .password-requirements li {
    position: relative;
    padding-left: 20px;
  }

  .password-requirements li::before {
    content: '•';
    position: absolute;
    left: 6px;
    color: #3b82f6;
  }

  /* Security section */
  .security-section {
    background: rgba(15, 23, 42, 0.3);
    border: 1px solid rgba(148, 163, 184, 0.1);
    border-radius: 12px;
    padding: 20px;
    margin-bottom: 24px;
  }

  .section-title {
    font-size: 1rem;
    font-weight: 700;
    color: #e2e8f0;
    margin: 0 0 8px 0;
  }

  .section-description {
    font-size: 0.875rem;
    color: #94a3b8;
    margin: 0 0 16px 0;
  }

  /* Submit button */
  .submit-button {
    width: 100%;
    padding: 16px;
    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
    color: white;
    border: none;
    border-radius: 12px;
    font-size: 1.05rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    box-shadow: 0 10px 30px rgba(59, 130, 246, 0.3);
    font-family: inherit;
    position: relative;
    overflow: hidden;
  }

  .submit-button::before {
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

  .submit-button:hover::before {
    left: 100%;
  }

  .submit-button:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 15px 40px rgba(59, 130, 246, 0.4);
  }

  .submit-button:active:not(:disabled) {
    transform: translateY(0);
  }

  .submit-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }

  /* Loading spinner */
  .loading {
    display: inline-block;
    width: 20px;
    height: 20px;
    border: 3px solid rgba(255, 255, 255, 0.3);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  /* Helper text */
  .helper-text {
    text-align: center;
    font-size: 0.9rem;
    color: #94a3b8;
    margin-top: 8px;
  }

  .helper-text a {
    color: #60a5fa;
    text-decoration: none;
    font-weight: 500;
    transition: color 0.3s ease;
  }

  .helper-text a:hover {
    color: #93c5fd;
    text-decoration: underline;
  }

  /* Recovery UI Styles */
  .recovery-container {
    width: 100%;
  }

  .back-button {
    background: transparent;
    border: 1px solid rgba(148, 163, 184, 0.2);
    color: #cbd5e1;
    padding: 10px 16px;
    border-radius: 8px;
    font-size: 0.95rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    margin-bottom: 24px;
    font-family: inherit;
  }

  .back-button:hover {
    background: rgba(59, 130, 246, 0.1);
    border-color: #3b82f6;
    color: #3b82f6;
  }

  .recovery-title {
    font-size: 1.5rem;
    font-weight: 700;
    color: #e2e8f0;
    margin-bottom: 24px;
    text-align: center;
  }

  .step-description {
    font-size: 0.95rem;
    color: #94a3b8;
    margin-bottom: 24px;
    text-align: center;
  }

  .recovery-methods {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .recovery-method-button {
    display: flex;
    align-items: center;
    gap: 16px;
    background: rgba(15, 23, 42, 0.5);
    border: 1px solid rgba(148, 163, 184, 0.2);
    border-radius: 12px;
    padding: 20px;
    cursor: pointer;
    transition: all 0.3s ease;
    text-align: left;
    font-family: inherit;
  }

  .recovery-method-button:hover {
    background: rgba(59, 130, 246, 0.1);
    border-color: #3b82f6;
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(59, 130, 246, 0.2);
  }

  .method-icon {
    font-size: 2rem;
    width: 60px;
    height: 60px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
    border-radius: 12px;
    flex-shrink: 0;
  }

  .method-content h3 {
    font-size: 1.1rem;
    font-weight: 700;
    color: #e2e8f0;
    margin: 0 0 4px 0;
  }

  .method-content p {
    font-size: 0.9rem;
    color: #94a3b8;
    margin: 0;
  }

  /* Modal Styles */
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.7);
    backdrop-filter: blur(10px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    animation: fadeIn 0.3s ease-out;
  }

  .modal-content {
    background: rgba(30, 41, 59, 0.95);
    border: 1px solid rgba(148, 163, 184, 0.3);
    border-radius: 20px;
    max-width: 500px;
    width: 90%;
    max-height: 90vh;
    overflow-y: auto;
    animation: slideUp 0.3s ease-out;
  }

  .recovery-key-modal {
    box-shadow: 0 25px 80px rgba(0, 0, 0, 0.5);
  }

  .modal-header {
    padding: 24px 24px 16px;
    border-bottom: 1px solid rgba(148, 163, 184, 0.2);
  }

  .modal-header h2 {
    font-size: 1.5rem;
    font-weight: 700;
    color: #e2e8f0;
    margin: 0;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .modal-body {
    padding: 24px;
  }

  .warning-box {
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.3);
    border-radius: 12px;
    padding: 16px;
    margin-bottom: 24px;
  }

  .warning-box p {
    color: #fca5a5;
    font-size: 0.95rem;
    margin: 0 0 8px 0;
    line-height: 1.5;
  }

  .warning-box p:last-child {
    margin-bottom: 0;
  }

  .warning-box strong {
    font-weight: 700;
    color: #fecaca;
  }

  .recovery-key-display {
    background: rgba(15, 23, 42, 0.7);
    border: 2px solid rgba(59, 130, 246, 0.3);
    border-radius: 12px;
    padding: 20px;
    margin-bottom: 24px;
    text-align: center;
  }

  .recovery-key-display code {
    font-family: 'Courier New', monospace;
    font-size: 1.1rem;
    color: #60a5fa;
    font-weight: 600;
    letter-spacing: 0.05em;
    word-break: break-all;
  }

  .modal-actions {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-bottom: 24px;
  }

  .action-button {
    width: 100%;
    padding: 14px 20px;
    border: none;
    border-radius: 10px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    font-family: inherit;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }

  .action-button.primary {
    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
    color: white;
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
  }

  .action-button.primary:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(59, 130, 246, 0.4);
  }

  .action-button.secondary {
    background: rgba(15, 23, 42, 0.5);
    border: 1px solid rgba(148, 163, 184, 0.3);
    color: #cbd5e1;
  }

  .action-button.secondary:hover {
    background: rgba(59, 130, 246, 0.1);
    border-color: #3b82f6;
    color: #3b82f6;
  }

  .checkbox-group {
    margin-bottom: 16px;
  }

  .checkbox-group label {
    display: flex;
    align-items: center;
    gap: 12px;
    cursor: pointer;
    color: #cbd5e1;
    font-size: 0.95rem;
  }

  .checkbox-group input[type="checkbox"] {
    width: 20px;
    height: 20px;
    cursor: pointer;
    accent-color: #3b82f6;
  }

  .modal-footer {
    padding: 16px 24px 24px;
    border-top: 1px solid rgba(148, 163, 184, 0.2);
  }

  /* Animations */
  @keyframes fadeInDown {
    from {
      opacity: 0;
      transform: translateY(-30px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(30px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(30px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  /* Responsive design */
  @media (max-width: 768px) {
    .auth-container {
      padding: 30px 20px;
    }

    .auth-header {
      margin-bottom: 30px;
    }

    .auth-icon {
      width: 70px;
      height: 70px;
      font-size: 2rem;
      border-radius: 18px;
    }

    .auth-header h1 {
      font-size: 1.75rem;
    }

    .auth-body {
      padding: 32px 24px;
      max-width: 100%;
    }

    .tab {
      padding: 10px 16px;
      font-size: 0.95rem;
    }

    .method-icon {
      width: 50px;
      height: 50px;
      font-size: 1.75rem;
    }

    .recovery-method-button {
      padding: 16px;
    }
  }

  @media (max-width: 480px) {
    .auth-container {
      padding: 20px 16px;
    }

    .auth-body {
      padding: 28px 20px;
      border-radius: 20px;
    }

    .form-input {
      padding: 12px 16px;
      font-size: 0.95rem;
    }

    .submit-button {
      padding: 14px;
      font-size: 1rem;
    }

    .tab {
      padding: 10px 12px;
      font-size: 0.9rem;
    }

    .section-title {
      font-size: 0.95rem;
    }

    .section-description {
      font-size: 0.85rem;
    }

    .recovery-title {
      font-size: 1.25rem;
    }

    .modal-content {
      width: 95%;
    }

    .modal-header h2 {
      font-size: 1.25rem;
    }

    .recovery-key-display code {
      font-size: 0.95rem;
    }
  }

  /* Focus visible for accessibility */
  *:focus-visible {
    outline: 2px solid #3b82f6;
    outline-offset: 2px;
  }

  /* Smooth transitions for all interactive elements */
  button,
  input,
  select {
    transition: all 0.3s ease;
  }
`;