import { css } from 'lit';

export const chatPrompt = css`
  :host {
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 9999;
    font-family: system-ui, -apple-system, sans-serif;
  }

  /* Toggle Button with Glassmorphism */
  .toggle-button {
    position: relative;
    width: 60px;
    height: 60px;
    border-radius: 50%;
    background: linear-gradient(135deg, rgba(102, 126, 234, 0.9) 0%, rgba(118, 75, 162, 0.9) 100%);
    border: 1px solid rgba(255, 255, 255, 0.2);
    font-size: 24px;
    cursor: pointer;
    box-shadow:
      0 8px 32px rgba(0, 0, 0, 0.3),
      0 0 0 1px rgba(255, 255, 255, 0.1),
      inset 0 1px 0 rgba(255, 255, 255, 0.2);
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    display: flex;
    align-items: center;
    justify-content: center;
    backdrop-filter: blur(20px);
    animation: float 3s ease-in-out infinite;
  }

  @keyframes float {
    0%, 100% {
      transform: translateY(0px);
    }
    50% {
      transform: translateY(-5px);
    }
  }

  .toggle-button::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 50%;
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.2) 0%, transparent 50%, rgba(255, 255, 255, 0.1) 100%);
    opacity: 0;
    transition: opacity 0.3s ease;
  }

  .toggle-button:hover {
    transform: scale(1.1) rotate(5deg);
    box-shadow:
      0 12px 40px rgba(102, 126, 234, 0.5),
      0 0 0 1px rgba(255, 255, 255, 0.3),
      inset 0 1px 0 rgba(255, 255, 255, 0.3);
    animation: none;
  }

  .toggle-button:hover::before {
    opacity: 1;
  }

  .toggle-button.disabled {
    background: linear-gradient(135deg, rgba(107, 114, 128, 0.7) 0%, rgba(75, 85, 99, 0.7) 100%);
    cursor: not-allowed;
    opacity: 0.7;
    animation: none;
  }

  .toggle-button.disabled:hover {
    transform: none;
    box-shadow:
      0 8px 32px rgba(0, 0, 0, 0.3),
      0 0 0 1px rgba(255, 255, 255, 0.1);
  }

  .pro-badge {
    position: absolute;
    top: -5px;
    right: -5px;
    background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
    color: white;
    font-size: 9px;
    font-weight: bold;
    padding: 2px 6px;
    border-radius: 10px;
    box-shadow:
      0 4px 12px rgba(245, 158, 11, 0.4),
      0 0 0 1px rgba(255, 255, 255, 0.2);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.3);
    animation: badge-pulse 2s ease-in-out infinite;
  }

  @keyframes badge-pulse {
    0%, 100% {
      transform: scale(1);
      box-shadow:
        0 4px 12px rgba(245, 158, 11, 0.4),
        0 0 0 1px rgba(255, 255, 255, 0.2);
    }
    50% {
      transform: scale(1.1);
      box-shadow:
        0 6px 20px rgba(245, 158, 11, 0.6),
        0 0 0 1px rgba(255, 255, 255, 0.3);
    }
  }

  /* Chat Container with Glassmorphism */
  .chat-container {
    width: 380px;
    height: 600px;
    background: rgba(31, 41, 55, 0.85);
    backdrop-filter: blur(40px) saturate(180%);
    border-radius: 20px;
    box-shadow:
      0 25px 60px rgba(0, 0, 0, 0.4),
      0 0 0 1px rgba(255, 255, 255, 0.1),
      inset 0 1px 0 rgba(255, 255, 255, 0.1);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    animation: slideUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
    border: 1px solid rgba(255, 255, 255, 0.15);
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

  /* Header with Enhanced Glassmorphism */
  .chat-header {
    background: linear-gradient(135deg,
      rgba(102, 126, 234, 0.9) 0%,
      rgba(118, 75, 162, 0.9) 50%,
      rgba(102, 126, 234, 0.7) 100%);
    color: white;
    padding: 16px 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid rgba(255, 255, 255, 0.2);
    backdrop-filter: blur(20px);
    position: relative;
    overflow: hidden;
  }

  .chat-header::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg,
      transparent,
      rgba(255, 255, 255, 0.1),
      transparent);
    animation: headerShimmer 3s infinite;
  }

  @keyframes headerShimmer {
    0% { left: -100%; }
    100% { left: 100%; }
  }

  .chat-title {
    font-size: 16px;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 8px;
    position: relative;
    z-index: 1;
  }

  .tier-badge {
    font-size: 10px;
    padding: 4px 10px;
    border-radius: 12px;
    font-weight: 700;
    letter-spacing: 0.5px;
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.3);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    transition: all 0.3s ease;
  }

  .tier-badge:hover {
    transform: scale(1.05);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }

  .tier-badge.free {
    background: rgba(255, 255, 255, 0.2);
    color: white;
  }

  .tier-badge.basic {
    background: rgba(59, 130, 246, 0.8);
    color: white;
  }

  .tier-badge.pro {
    background: rgba(245, 158, 11, 0.8);
    color: white;
  }

  .tier-badge.enterprise {
    background: rgba(139, 92, 246, 0.8);
    color: white;
  }

  /* Quota Bar with Glassmorphism */
  .quota-bar {
    background: rgba(17, 24, 39, 0.7);
    padding: 12px 20px;
    border-bottom: 1px solid rgba(55, 65, 81, 0.5);
    backdrop-filter: blur(20px);
  }

  .quota-info {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
    font-size: 12px;
    color: #9ca3af;
  }

  .quota-label {
    font-weight: 500;
  }

  .quota-warning {
    color: #f59e0b;
    font-weight: 600;
    animation: pulse 2s infinite;
    background: rgba(245, 158, 11, 0.1);
    padding: 2px 8px;
    border-radius: 6px;
    border: 1px solid rgba(245, 158, 11, 0.3);
  }

  @keyframes pulse {
    0%, 100% {
      opacity: 1;
      box-shadow: 0 0 0 rgba(245, 158, 11, 0.4);
    }
    50% {
      opacity: 0.8;
      box-shadow: 0 0 10px rgba(245, 158, 11, 0.6);
    }
  }

  .quota-progress {
    height: 6px;
    background: rgba(55, 65, 81, 0.5);
    border-radius: 3px;
    overflow: hidden;
    position: relative;
    backdrop-filter: blur(10px);
  }

  .quota-fill {
    height: 100%;
    background: linear-gradient(90deg, #10b981 0%, #059669 100%);
    transition: width 0.8s cubic-bezier(0.34, 1.56, 0.64, 1);
    position: relative;
    overflow: hidden;
    box-shadow: 0 0 10px rgba(16, 185, 129, 0.4);
  }

  .quota-fill::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
    animation: progressShimmer 2s infinite;
  }

  @keyframes progressShimmer {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }

  .quota-fill.warning {
    background: linear-gradient(90deg, #f59e0b 0%, #dc2626 100%);
    box-shadow: 0 0 10px rgba(245, 158, 11, 0.4);
  }

  /* Messages Area with Enhanced Glassmorphism */
  .chat-messages {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
    background: rgba(17, 24, 39, 0.6);
    display: flex;
    flex-direction: column;
    gap: 12px;
    backdrop-filter: blur(20px);
  }

  .chat-messages::-webkit-scrollbar {
    width: 8px;
  }

  .chat-messages::-webkit-scrollbar-track {
    background: rgba(31, 41, 55, 0.5);
    border-radius: 4px;
  }

  .chat-messages::-webkit-scrollbar-thumb {
    background: rgba(75, 85, 99, 0.6);
    border-radius: 4px;
    transition: background 0.3s ease;
  }

  .chat-messages::-webkit-scrollbar-thumb:hover {
    background: rgba(75, 85, 99, 0.8);
  }

  /* Enhanced Messages with Glassmorphism */
  .message {
    padding: 12px 16px;
    border-radius: 16px;
    line-height: 1.5;
    font-size: 14px;
    max-width: 85%;
    word-wrap: break-word;
    animation: messageSlide 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
    backdrop-filter: blur(10px);
    border: 1px solid transparent;
    position: relative;
    overflow: hidden;
  }

  .message::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, transparent 50%, rgba(255, 255, 255, 0.05) 100%);
    opacity: 0;
    transition: opacity 0.3s ease;
  }

  .message:hover::before {
    opacity: 1;
  }

  @keyframes messageSlide {
    from {
      opacity: 0;
      transform: translateY(15px) scale(0.95);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  .message.user {
    background: linear-gradient(135deg,
      rgba(102, 126, 234, 0.9) 0%,
      rgba(118, 75, 162, 0.9) 100%);
    color: white;
    align-self: flex-end;
    border-bottom-right-radius: 6px;
    border: 1px solid rgba(255, 255, 255, 0.2);
    box-shadow:
      0 4px 15px rgba(102, 126, 234, 0.3),
      0 0 0 1px rgba(255, 255, 255, 0.1);
  }

  .message.system {
    background: rgba(30, 58, 95, 0.8);
    color: #93c5fd;
    align-self: flex-start;
    border-bottom-left-radius: 6px;
    border-left: 3px solid #3b82f6;
    border: 1px solid rgba(59, 130, 246, 0.3);
    box-shadow: 0 2px 10px rgba(30, 58, 95, 0.3);
  }

  .message.error {
    background: rgba(127, 29, 29, 0.8);
    color: #fca5a5;
    align-self: flex-start;
    border-bottom-left-radius: 6px;
    border-left: 3px solid #dc2626;
    border: 1px solid rgba(220, 38, 38, 0.3);
    box-shadow: 0 2px 10px rgba(127, 29, 29, 0.3);
  }

  .message.warning {
    background: rgba(120, 53, 15, 0.8);
    color: #fcd34d;
    align-self: flex-start;
    border-bottom-left-radius: 6px;
    border-left: 3px solid #f59e0b;
    border: 1px solid rgba(245, 158, 11, 0.3);
    box-shadow: 0 2px 10px rgba(120, 53, 15, 0.3);
  }

  .message.assistant {
    background: rgba(31, 41, 55, 0.8);
    color: #d1d5db;
    align-self: flex-start;
    border-bottom-left-radius: 6px;
    border: 1px solid rgba(55, 65, 81, 0.5);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  }

  .message a {
    color: inherit;
    text-decoration: underline;
    font-weight: 600;
    transition: opacity 0.3s ease;
  }

  .message a:hover {
    opacity: 0.8;
  }

  /* Enhanced Input Container */
  .chat-input-container {
    background: rgba(31, 41, 55, 0.8);
    border-top: 1px solid rgba(55, 65, 81, 0.5);
    padding: 16px;
    display: flex;
    gap: 12px;
    align-items: flex-end;
    backdrop-filter: blur(20px);
  }

  .chat-input {
    flex: 1;
    background: rgba(17, 24, 39, 0.8);
    border: 1px solid rgba(55, 65, 81, 0.6);
    border-radius: 12px;
    padding: 12px;
    color: #f3f4f6;
    font-size: 14px;
    font-family: inherit;
    resize: none;
    outline: none;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    backdrop-filter: blur(10px);
  }

  .chat-input:focus {
    border-color: rgba(102, 126, 234, 0.8);
    box-shadow:
      0 0 0 3px rgba(102, 126, 234, 0.15),
      0 4px 15px rgba(102, 126, 234, 0.2);
    transform: translateY(-1px);
  }

  .chat-input:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none !important;
  }

  .chat-input::placeholder {
    color: #6b7280;
  }

  .send-button {
    background: linear-gradient(135deg,
      rgba(102, 126, 234, 0.9) 0%,
      rgba(118, 75, 162, 0.9) 100%);
    color: white;
    border: none;
    border-radius: 12px;
    padding: 12px 20px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    white-space: nowrap;
    min-width: 100px;
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.2);
    box-shadow:
      0 4px 15px rgba(102, 126, 234, 0.3),
      0 0 0 1px rgba(255, 255, 255, 0.1);
    position: relative;
    overflow: hidden;
  }

  .send-button::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg,
      rgba(255, 255, 255, 0.2) 0%,
      transparent 50%,
      rgba(255, 255, 255, 0.1) 100%);
    transform: translateX(-100%) skewX(-15deg);
    transition: transform 0.6s;
  }

  .send-button:hover:not(:disabled)::before {
    transform: translateX(100%) skewX(-15deg);
  }

  .send-button:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow:
      0 8px 25px rgba(102, 126, 234, 0.4),
      0 0 0 1px rgba(255, 255, 255, 0.2);
  }

  .send-button:active:not(:disabled) {
    transform: translateY(0);
  }

  .send-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    background: rgba(75, 85, 99, 0.7);
    transform: none;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  }

  /* Mobile Responsive */
  @media (max-width: 480px) {
    :host {
      bottom: 10px;
      right: 10px;
    }

    .chat-container {
      width: calc(100vw - 20px);
      height: calc(100vh - 100px);
    }

    .toggle-button {
      width: 56px;
      height: 56px;
      font-size: 22px;
    }
  }
`;