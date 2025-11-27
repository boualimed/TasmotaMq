import { css } from 'lit';

export const deviceConfigStyles = css`
  :host {
    display: block;
    min-height: 100vh;
    //background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%);
    background: linear-gradient(135deg,rgb(163, 189, 249) 0%,rgb(50, 72, 107) 50%, #0f172a 100%);
    padding-bottom: 80px;
    position: relative;
    overflow-x: hidden; /* FIXED: Prevent horizontal overflow */
  }

  /* Animated background particles */
  :host::before {
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;
    background:
      radial-gradient(circle at 20% 30%, rgba(59, 130, 246, 0.07) 0%, transparent 45%),
      radial-gradient(circle at 80% 70%, rgba(139, 92, 246, 0.07) 0%, transparent 45%);
    opacity: 0.8;
  }

  @keyframes pulse-bg {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.8; }
  }

  .config-container {
    position: relative;
    z-index: 1;
    max-width: 1400px;
    margin: 0 auto;
    padding: 20px;
  }

  /* Header Section - FIXED: Added higher z-index and proper positioning */
  .config-header {
    display: flex;
    align-items: center;
    gap: 15px;
    margin-bottom: 30px;
    background: rgba(30, 41, 59, 0.98);
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);
    padding: 18px 24px;
    border-radius: 16px;
    border: 1px solid rgba(148, 163, 184, 0.2);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
    position: relative;
    z-index: 50;
  }

  .back-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    background: rgba(59, 130, 246, 0.1);
    color: #60a5fa;
    border: 1px solid rgba(59, 130, 246, 0.2);
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.3s ease;
    font-size: 1.3rem;
  }

  .back-button:hover {
    background: rgba(59, 130, 246, 0.2);
    transform: translateX(-3px);
    border-color: rgba(59, 130, 246, 0.4);
  }

  .header-text {
    flex: 1;
  }

  .header-text h1 {
    margin: 0;
    font-size: clamp(1.5rem, 3vw, 2rem);
    font-weight: 800;
    background: linear-gradient(135deg, #ffffff 0%, #e0e7ff 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    letter-spacing: -0.02em;
  }

  .header-text p {
    margin: 6px 0 0;
    color: #cbd5e1;
    font-size: 0.95rem;
  }

  .user-info {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 16px;
    background: rgba(59, 130, 246, 0.1);
    border: 1px solid rgba(59, 130, 246, 0.2);
    border-radius: 10px;
    color: #93c5fd;
    font-weight: 600;
    font-size: 0.9rem;
  }

  .logout-button {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 18px;
    background: rgba(239, 68, 68, 0.1);
    color: #fca5a5;
    border: 1px solid rgba(239, 68, 68, 0.2);
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
/* Config Button */
  .config-button {
    background: rgba(30, 41, 59, 0.8);
    border: 1px solid rgba(148, 163, 184, 0.2);
    color: #e2e8f0;
    padding: 10px 14px;
    border-radius: 10px;
    cursor: pointer;
    font-size: 1.3rem;
    transition: all 0.3s ease;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .config-button:hover {
    background: rgba(59, 130, 246, 0.2);
    border-color: rgba(59, 130, 246, 0.3);
    transform: rotate(90deg);
  }

  .config-button {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    padding: 12px 22px;
    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
    color: white;
    border: none;
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.3s ease;
    font-size: 0.95rem;
    font-weight: 600;
    box-shadow: 0 4px 15px rgba(59, 130, 246, 0.3);
    position: relative;
    overflow: hidden;
  }

  .config-button::before {
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

  .config-button:hover::before {
    left: 100%;
  }

  .config-button:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(59, 130, 246, 0.4);
  }

  .config-button:active {
    transform: translateY(0);
  }

  .config-icon {
    font-size: 1.3rem;
    animation: rotate 2s linear infinite;
    animation-play-state: paused;
    transition: transform 0.3s ease;
  }

  .config-button:hover .settings-icon {
    animation-play-state: running;
  }

  @keyframes rotate {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  /* Main Grid */
  .main-grid-updated {
    display: grid;
    grid-template-columns: 1fr;
    gap: 24px;
    position: relative;
    z-index: 1; /* FIXED: Ensure content stays below header */
  }

  @media (min-width: 1024px) {
    .main-grid-updated {
      grid-template-columns: 2fr 1fr;
    }
  }

  /* Section Cards */
  .section {
    background: rgba(30, 41, 59, 0.6);
    border-radius: 16px;
    padding: 28px;
    box-shadow: 0 10px 24px rgba(0,0,0,0.25);
    border: 1px solid rgba(148, 163, 184, 0.2);
    transition: all 0.3s ease;
    max-width: 100%; /* FIXED: Prevent overflow */
    overflow: hidden; /* FIXED: Contain content */
  }

  .section:hover {
    border-color: rgba(148, 163, 184, 0.3);
  }

  .devices-section-full {
    background: rgba(30, 41, 59, 0.6);
    backdrop-filter: blur(8px);
    border-radius: 16px;
    padding: 28px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(148, 163, 184, 0.2);
    max-width: 100%; /* FIXED: Prevent overflow */
    overflow: hidden; /* FIXED: Contain content */
    box-sizing: border-box; /* FIXED: Include padding in width calculation */
  }

  .section-title {
    font-size: 1.4rem;
    font-weight: 700;
    color: #f1f5f9;
    margin-bottom: 24px;
    display: flex;
    align-items: center;
    gap: 10px;
  }

  /* Form Elements */
  .form-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 18px;
  }

  .form-label {
    font-size: 0.95rem;
    font-weight: 600;
    color: #e2e8f0;
    letter-spacing: 0.01em;
  }

  .form-input {
    padding: 14px 18px;
    background: rgba(15, 23, 42, 0.5);
    border: 1px solid rgba(148, 163, 184, 0.2);
    border-radius: 10px;
    color: #f1f5f9;
    font-size: 1rem;
    transition: all 0.3s ease;
    max-width: 100%; /* FIXED: Prevent overflow */
    box-sizing: border-box; /* FIXED: Include padding in width */
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

  select.form-input {
    cursor: pointer;
  }

  .checkbox-group {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: 10px;
  }

  .checkbox {
    width: 20px;
    height: 20px;
    accent-color: #3b82f6;
    cursor: pointer;
  }

  /* Connection Status */
  .connection-status {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px 18px;
    border-radius: 12px;
    margin-bottom: 24px;
    font-weight: 600;
    font-size: 0.95rem;
    border: 1px solid;
  }

  .connection-status.connected {
    background: rgba(16, 185, 129, 0.1);
    color: #6ee7b7;
    border-color: rgba(16, 185, 129, 0.3);
  }

  .connection-status.disconnected {
    background: rgba(239, 68, 68, 0.1);
    color: #fca5a5;
    border-color: rgba(239, 68, 68, 0.3);
  }

  .connection-status.connecting {
    background: rgba(251, 191, 36, 0.1);
    color: #fcd34d;
    border-color: rgba(251, 191, 36, 0.3);
  }

  .connection-status.failed {
    background: rgba(220, 38, 38, 0.1);
    color: #f87171;
    border-color: rgba(220, 38, 38, 0.3);
  }

  .status-indicator {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    display: inline-block;
  }

  .status-indicator.connected {
    background: #10b981;
    box-shadow: 0 0 8px rgba(16, 185, 129, 0.5);
  }

  .status-indicator.disconnected {
    background: #ef4444;
  }

  .status-indicator.connecting {
    background: #f59e0b;
    animation: pulse 1.5s infinite;
  }

  .status-indicator.unknown {
    background: #6b7280;
  }

  .status-indicator.disabled {
    background: #9ca3af;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.5; transform: scale(1.1); }
  }

  /* Buttons */
  .button {
    padding: 14px 24px;
    border: none;
    border-radius: 12px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    width: 100%;
    margin-top: 10px;
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
    background: linear-gradient(
      90deg,
      transparent,
      rgba(255, 255, 255, 0.2),
      transparent
    );
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
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    color: white;
    box-shadow: 0 10px 30px rgba(16, 185, 129, 0.3);
  }

  .button.secondary:hover {
    transform: translateY(-2px);
    box-shadow: 0 15px 40px rgba(16, 185, 129, 0.4);
  }

  .button.danger {
    background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
    color: white;
    box-shadow: 0 10px 30px rgba(239, 68, 68, 0.3);
  }

  .button.danger:hover {
    transform: translateY(-2px);
    box-shadow: 0 15px 40px rgba(239, 68, 68, 0.4);
  }

  .button.warning {
    background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
    color: white;
    box-shadow: 0 10px 30px rgba(251, 191, 36, 0.3);
  }

  .button.warning:hover {
    transform: translateY(-2px);
    box-shadow: 0 15px 40px rgba(251, 191, 36, 0.4);
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

  /* Notifications - FIXED: Better positioning to prevent page stretch */
  .notification-container {
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 2000; /* FIXED: Higher z-index to stay above everything */
    display: flex;
    flex-direction: column;
    gap: 12px;
    max-width: 420px;
    pointer-events: none; /* FIXED: Allow clicks through container */
  }

  .notification-item {
    padding: 18px 22px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    gap: 14px;
    font-size: 0.95rem;
    font-weight: 500;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.4);
    animation: slideIn 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
    cursor: pointer;
    transition: transform 0.2s ease;
    backdrop-filter: blur(2px);
    pointer-events: auto; /* FIXED: Re-enable clicks on notifications */
    max-width: 100%; /* FIXED: Prevent overflow */
    word-wrap: break-word; /* FIXED: Break long words */
  }

  .notification-item:hover {
    transform: translateX(-5px);
  }

  @keyframes slideIn {
    from {
      transform: translateX(450px);
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
    border: 1px solid rgba(255, 255, 255, 0.2);
  }

  .notification-item.error {
    background: linear-gradient(135deg, rgba(239, 68, 68, 0.95) 0%, rgba(220, 38, 38, 0.95) 100%);
    color: white;
    border: 1px solid rgba(255, 255, 255, 0.2);
  }

  .notification-item.warning {
    background: linear-gradient(135deg, rgba(251, 191, 36, 0.95) 0%, rgba(217, 119, 6, 0.95) 100%);
    color: white;
    border: 1px solid rgba(255, 255, 255, 0.2);
  }

  .notification-item.info {
    background: linear-gradient(135deg, rgba(59, 130, 246, 0.95) 0%, rgba(37, 99, 235, 0.95) 100%);
    color: white;
    border: 1px solid rgba(255, 255, 255, 0.2);
  }

  .notification-icon {
    font-size: 1.4rem;
    flex-shrink: 0;
  }

  .notification-message {
    flex: 1;
    line-height: 1.5;
    word-break: break-word; /* FIXED: Break long text */
  }

  .notification-close {
    background: rgba(255, 255, 255, 0.2);
    border: none;
    color: white;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.1rem;
    transition: background 0.2s ease;
    flex-shrink: 0;
  }

  .notification-close:hover {
    background: rgba(255, 255, 255, 0.3);
  }

  /* Device Type Selector */
  .device-type-selector {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
    margin-bottom: 24px;
  }

  .type-option {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 18px 12px;
    background: rgba(15, 23, 42, 0.5);
    border: 2px solid rgba(148, 163, 184, 0.2);
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.3s ease;
    font-size: 0.9rem;
    color: #cbd5e1;
  }

  .type-option:hover {
    background: rgba(15, 23, 42, 0.8);
    border-color: rgba(59, 130, 246, 0.4);
    transform: translateY(-2px);
  }

  .type-option.selected {
    background: rgba(59, 130, 246, 0.15);
    border-color: #3b82f6;
    color: #93c5fd;
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
  }

  .type-option > div:first-child {
    font-size: 2.2rem;
    margin-bottom: 8px;
  }

  /* Device Cards */
  .devices-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 20px;
    margin-top: 24px;
  }

 .device-card {
  background: rgba(15, 23, 42, 0.5);
  border-radius: 16px;
  padding: 22px 22px 22px 56px; /* CHANGED: Added left padding for drag handle */
  border: 1px solid rgba(148, 163, 184, 0.2);
  transition: all 0.3s ease;
  position: relative;
  max-width: 100%;
  box-sizing: border-box;
  cursor: grab; /* ADDED: Show it's draggable */
  user-select: none;
}

  .device-card.connected {
    border-color: rgba(16, 185, 129, 0.4);
    box-shadow: 0 0 20px rgba(16, 185, 129, 0.1);
  }

  .device-card:hover {
    border-color: rgba(148, 163, 184, 0.4);
    transform: translateY(-2px);
  }

  .device-card.disabled {
    opacity: 0.6;
  }

  .device-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
    gap: 12px; /* FIXED: Add gap for better spacing */
    flex-wrap: wrap; /* FIXED: Allow wrapping on small screens */
  }

  .device-name {
    font-size: 1.15rem;
    font-weight: 600;
    color: #f1f5f9;
    display: flex;
    align-items: center;
    gap: 8px;
    word-break: break-word; /* FIXED: Break long device names */
  }

  .device-status {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.8rem;
    font-weight: 600;
    padding: 6px 12px;
    border-radius: 20px;
    border: 1px solid;
    white-space: nowrap; /* FIXED: Prevent status text from wrapping */
  }

  .device-status.connected {
    background: rgba(16, 185, 129, 0.15);
    color: #6ee7b7;
    border-color: rgba(16, 185, 129, 0.3);
  }

  .device-status.disconnected {
    background: rgba(239, 68, 68, 0.15);
    color: #fca5a5;
    border-color: rgba(239, 68, 68, 0.3);
  }

  .device-status.unknown {
    background: rgba(107, 114, 128, 0.15);
    color: #9ca3af;
    border-color: rgba(107, 114, 128, 0.3);
  }

  .device-info {
    margin-bottom: 16px;
  }

  .device-info-item {
    display: flex;
    justify-content: space-between;
    padding: 8px 0;
    border-bottom: 1px solid rgba(148, 163, 184, 0.1);
    font-size: 0.9rem;
    gap: 12px; /* FIXED: Add gap */
  }

  .device-info-item:last-child {
    border-bottom: none;
  }

  .device-info-label {
    color: #94a3b8;
    font-weight: 500;
    flex-shrink: 0; /* FIXED: Prevent label from shrinking */
  }

  .device-info-value {
    color: #e2e8f0;
    font-weight: 600;
    font-family: 'Courier New', monospace;
    word-break: break-all; /* FIXED: Break long values */
    text-align: right; /* FIXED: Align right */
  }

  /* Device Controls */
  .device-controls {
    display: flex;
    gap: 10px;
    margin-top: 16px;
    flex-wrap: wrap;
  }

  .toggle-button {
    flex: 1;
    padding: 12px 16px;
    border: none;
    border-radius: 10px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    min-width: 100px;
  }

  .toggle-button.on {
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    color: white;
    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
  }

  .toggle-button.off {
    background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
    color: white;
    box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
  }

  .toggle-button:hover:not(:disabled) {
    transform: translateY(-2px);
  }

  .toggle-button:disabled {
    background: #4b5563;
    cursor: not-allowed;
    opacity: 0.5;
    transform: none;
  }

  .remove-button {
    background: rgba(107, 114, 128, 0.3);
    color: #e2e8f0;
    border: 1px solid rgba(148, 163, 184, 0.2);
    padding: 12px 16px;
    border-radius: 10px;
    cursor: pointer;
    transition: all 0.3s ease;
    font-size: 1.1rem;
  }

  .remove-button:hover {
    background: rgba(239, 68, 68, 0.8);
    border-color: rgba(239, 68, 68, 0.4);
    transform: scale(1.05);
  }

  /* Dimmer Control */
  .dimmer-control {
    display: flex;
    flex-direction: column;
    width: 100%;
    gap: 8px;
  }

  .dimmer-control input[type="range"] {
    -webkit-appearance: none;
    appearance: none;
    width: 100%;
    height: 8px;
    border-radius: 4px;
    background: linear-gradient(to right, rgba(59, 130, 246, 0.3) 0%, #3b82f6 100%);
    outline: none;
    transition: opacity 0.2s;
  }

  .dimmer-control input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: #3b82f6;
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(59, 130, 246, 0.5);
    transition: all 0.2s ease;
  }

  .dimmer-control input[type="range"]::-webkit-slider-thumb:hover {
    background: #2563eb;
    transform: scale(1.2);
  }

  .dimmer-control input[type="range"]::-moz-range-thumb {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: #3b82f6;
    cursor: pointer;
    border: none;
    box-shadow: 0 2px 8px rgba(59, 130, 246, 0.5);
  }

  /* Shutter Control */
  .shutter-control {
    display: flex;
    flex-direction: column;
    width: 100%;
    gap: 10px;
  }

  .shutter-control input[type="range"] {
    -webkit-appearance: none;
    appearance: none;
    width: 100%;
    height: 8px;
    border-radius: 4px;
    background: linear-gradient(to right, #dc2626 0%, #10b981 100%);
    outline: none;
  }

  .shutter-control input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: #3b82f6;
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(59, 130, 246, 0.5);
    border: 2px solid white;
  }

  /* Sensor Data */
  .sensor-data-container {
    margin-top: 16px;
    padding: 16px;
    background: rgba(15, 23, 42, 0.6);
    border-radius: 12px;
    border: 1px solid rgba(148, 163, 184, 0.2);
  }

  .sensor-header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 12px;
    padding-bottom: 10px;
    border-bottom: 1px solid rgba(148, 163, 184, 0.2);
  }

  .sensor-icon {
    font-size: 1.5rem;
  }

  .sensor-display-name {
    font-size: 0.95rem;
    font-weight: 600;
    color: #f1f5f9;
  }

  .sensor-values {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 10px;
  }

  .sensor-value-item {
    background: rgba(30, 41, 59, 0.5);
    padding: 10px 14px;
    border-radius: 8px;
    border: 1px solid rgba(148, 163, 184, 0.2);
  }

  .sensor-value-label {
    font-size: 0.75rem;
    color: #94a3b8;
    margin-bottom: 4px;
    text-transform: capitalize;
  }

  .sensor-value {
    font-size: 1.1rem;
    font-weight: 700;
    color: #e2e8f0;
    word-break: break-word; /* FIXED: Break long values */
  }

  .sensor-raw-toggle {
    margin-top: 12px;
  }

  .sensor-raw-summary {
  cursor: pointer;
    font-size: 0.8rem;
    color: #64748b;
    padding: 8px 12px;
    background: rgba(15, 23, 42, 0.5);
    border-radius: 6px;
    transition: all 0.2s ease;
  }

  .sensor-raw-summary:hover {
    color: #94a3b8;
    background: rgba(30, 41, 59, 0.5);
  }

  .sensor-raw {
    margin-top: 8px;
    padding: 12px;
    background: #0f172a;
    border: 1px solid rgba(148, 163, 184, 0.2);
    border-radius: 8px;
    font-size: 0.75rem;
    color: #6ee7b7;
    overflow-x: auto;
    max-height: 250px;
    overflow-y: auto;
  }

  /* Activity Log */
  .log-section {
    background: #0f172a;
    border-radius: 12px;
    padding: 16px;
    margin-top: 20px;
    max-height: 250px;
    overflow-y: auto;
    border: 1px solid rgba(148, 163, 184, 0.2);
  }

  .log-entry {
    color: #cbd5e1;
    font-family: 'Courier New', monospace;
    font-size: 0.8rem;
    margin-bottom: 6px;
    padding: 6px 10px;
    border-radius: 4px;
    word-break: break-word; /* FIXED: Break long log messages */
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

  .log-entry.warning {
    background: rgba(251, 191, 36, 0.1);
    color: #fcd34d;
  }

  /* Empty State */
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 60px 24px;
    color: #64748b;
    text-align: center;
  }

  .empty-state > div:first-child {
    font-size: 3.5rem;
    margin-bottom: 20px;
    opacity: 0.4;
  }

  .empty-state > div:nth-child(2) {
    font-size: 1.2rem;
    font-weight: 600;
    color: #94a3b8;
    margin-bottom: 8px;
  }

  /* Side Navigation */
  .side-nav {
    position: fixed;
    top: 0;
    right: -450px;
    width: 450px;
    height: 100vh;
    background: rgba(15, 23, 42, 0.98);
    backdrop-filter: blur(8px);
    box-shadow: -10px 0 50px rgba(0, 0, 0, 0.5);
    transition: right 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
    z-index: 1500; /* FIXED: Below notifications but above content */
    display: flex;
    flex-direction: column;
    border-left: 1px solid rgba(148, 163, 184, 0.2);
  }

  .side-nav.open {
    right: 0;
  }

  .side-nav-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100vh;
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(4px);
    z-index: 1400; /* FIXED: Below side-nav */
    animation: fadeIn 0.3s ease-in-out;
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .side-nav-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 24px 28px;
    border-bottom: 1px solid rgba(148, 163, 184, 0.2);
    background: rgba(30, 41, 59, 0.5);
  }

  .side-nav-header h2 {
    margin: 0;
    font-size: 1.4rem;
    color: #f1f5f9;
    font-weight: 700;
  }

  .side-nav-close {
    background: rgba(148, 163, 184, 0.1);
    border: 1px solid rgba(148, 163, 184, 0.2);
    color: #94a3b8;
    font-size: 1.8rem;
    cursor: pointer;
    padding: 8px;
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 10px;
    transition: all 0.2s ease;
  }

  .side-nav-close:hover {
    background: rgba(239, 68, 68, 0.2);
    border-color: rgba(239, 68, 68, 0.3);
    color: #fca5a5;
    transform: rotate(90deg);
  }

  .side-nav-content {
    flex: 1;
    overflow-y: auto;
    padding: 28px;
  }

  .side-nav-content::-webkit-scrollbar {
    width: 8px;
  }

  .side-nav-content::-webkit-scrollbar-track {
    background: rgba(15, 23, 42, 0.5);
  }

  .side-nav-content::-webkit-scrollbar-thumb {
    background: rgba(148, 163, 184, 0.3);
    border-radius: 4px;
  }

  .side-nav-content::-webkit-scrollbar-thumb:hover {
    background: rgba(148, 163, 184, 0.5);
  }

  /* Side Nav Menu */
  .side-nav-menu {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .side-nav-menu-item {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 18px 20px;
    background: rgba(30, 41, 59, 0.5);
    border: 1px solid rgba(148, 163, 184, 0.2);
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.3s ease;
    text-align: left;
    width: 100%;
  }

  .side-nav-menu-item:hover {
    background: rgba(30, 41, 59, 0.8);
    border-color: rgba(59, 130, 246, 0.4);
    transform: translateX(-4px);
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.2);
  }

  .menu-icon {
    font-size: 1.6rem;
    min-width: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .menu-content {
    flex: 1;
  }

  .menu-title {
    font-size: 1.05rem;
    font-weight: 600;
    color: #f1f5f9;
    margin-bottom: 4px;
  }

  .menu-subtitle {
    font-size: 0.85rem;
    color: #94a3b8;
  }

  .menu-arrow {
    font-size: 1.4rem;
    color: #64748b;
    transition: transform 0.2s ease;
  }

  .side-nav-menu-item:hover .menu-arrow {
    transform: translateX(4px);
    color: #3b82f6;
  }

  .section-content {
    display: flex;
    flex-direction: column;
    gap: 18px;
  }

  .back-to-menu {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 16px;
    background: rgba(30, 41, 59, 0.5);
    border: 1px solid rgba(148, 163, 184, 0.2);
    border-radius: 8px;
    color: #94a3b8;
    cursor: pointer;
    font-size: 0.9rem;
    transition: all 0.2s ease;
    margin-bottom: 12px;
  }

  .back-to-menu:hover {
    background: rgba(30, 41, 59, 0.8);
    color: #e2e8f0;
    border-color: rgba(148, 163, 184, 0.3);
    transform: translateX(-2px);
  }

  .section-title {
    font-size: 1.3rem;
    font-weight: 700;
    color: #f1f5f9;
    margin-bottom: 20px;
  }

  /* Automation Section */
  .device-automation-section {
    margin-top: 16px;
    padding-top: 16px;
    border-top: 1px solid rgba(148, 163, 184, 0.2);
  }

  .device-automation-section.unavailable {
    opacity: 0.5;
    pointer-events: none;
  }

  .automation-toggle-group {
    display: flex;
    gap: 12px;
    margin-bottom: 12px;
    flex-wrap: wrap;
  }

  .automation-option {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 16px;
    background: rgba(15, 23, 42, 0.5);
    border: 2px solid rgba(148, 163, 184, 0.2);
    border-radius: 10px;
    transition: all 0.2s;
    flex: 1 1 calc(50% - 6px); /* FIXED: Max 2 per row, with gap consideration */
    min-width: 140px; /* FIXED: Minimum width to prevent too much squishing */
    cursor: pointer;
  }

  .automation-option:hover:not(.disabled) {
    border-color: rgba(59, 130, 246, 0.4);
    background: rgba(15, 23, 42, 0.7);
  }

  .automation-option.active {
    border-color: #3b82f6;
    background: rgba(59, 130, 246, 0.15);
  }

  .automation-option.disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .automation-option label {
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.9rem;
    color: #e2e8f0;
    margin: 0;
    font-weight: 500;
  }

  .automation-option.disabled label {
    cursor: not-allowed;
  }

  /* ADDED: Stack vertically on very small cards */
  @media (max-width: 400px) {
    .automation-option {
      flex: 1 1 100%; /* Stack vertically on very small screens */
    }
  }

  .complexity-badge {
    background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
    color: #0f172a;
    padding: 2px 8px;
    border-radius: 6px;
    font-size: 0.65rem;
    font-weight: 700;
    letter-spacing: 0.5px;
  }

  .count-badge {
    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
    color: white;
    padding: 2px 10px;
    border-radius: 12px;
    font-size: 0.7rem;
    font-weight: 700;
    animation: pulse-badge 2s infinite;
  }

  @keyframes pulse-badge {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.8; transform: scale(1.05); }
  }

  .automation-actions {
  display: flex;
  gap: 10px;
}
  .automation-actions.unavailable {
    opacity: 0.5;
    pointer-events: none;
  }


  /* Chart Button */
  .chart-button-container {
    margin-top: 16px;
    padding-top: 16px;
    border-top: 1px solid rgba(148, 163, 184, 0.2);
  }

  .chart-button {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }

  /* Validation Details */
  .validation-details {
    background: rgba(15, 23, 42, 0.6);
    border-radius: 8px;
    padding: 12px;
    border-left: 3px solid #dc2626;
    margin-top: 10px;
  }

  .validation-details summary {
    font-weight: 600;
    cursor: pointer;
    user-select: none;
    padding: 4px;
  }

  .validation-details[open] summary {
    margin-bottom: 12px;
    padding-bottom: 12px;
    border-bottom: 1px solid rgba(148, 163, 184, 0.2);
  }

  .parser-help {
    margin-top: 8px;
    padding: 12px;
    background: rgba(59, 130, 246, 0.1);
    border-left: 3px solid #3b82f6;
    border-radius: 6px;
    font-size: 0.85rem;
    color: #93c5fd;
    line-height: 1.6;
  }

  .parser-help code {
    background: rgba(59, 130, 246, 0.2);
    padding: 2px 8px;
    border-radius: 4px;
    font-family: 'Courier New', monospace;
    color: #bfdbfe;
  }

  /* Responsive Design */
  @media (max-width: 1024px) {
    .main-grid-updated {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 768px) {
    .config-container {
      padding: 16px;
    }

    .config-header {
      flex-wrap: wrap;
      gap: 12px;
      padding: 16px 18px;
    }

    .header-text h1 {
      font-size: 1.5rem;
    }

    .device-type-selector {
      grid-template-columns: repeat(2, 1fr);
      gap: 10px;
    }

    .devices-grid {
      grid-template-columns: 1fr;
    }

    .side-nav {
      width: 100%;
      right: -100%;
    }

    .notification-container {
      max-width: calc(100% - 40px);
      right: 10px; /* FIXED: Better mobile positioning */
    }

    .notification-item {
      font-size: 0.9rem; /* FIXED: Smaller text on mobile */
      padding: 14px 18px; /* FIXED: Smaller padding */
    }
  }

  @media (max-width: 480px) {
    .config-header {
      padding: 14px 16px;
    }

    .section {
      padding: 20px;
    }

    .device-card {
      padding: 18px;
    }


    .automation-option {
      width: 100%;
    }

    .notification-container {
      top: 10px; /* FIXED: Better top margin */
      right: 10px;
      left: 10px; /* FIXED: Add left constraint */
      max-width: none; /* FIXED: Use full width on very small screens */
    }
  }

  /*
/* --- Base Input (for context) --- */
  .form-input {
    background-color: #1e293b; /* slate-800 */
    border: 1px solid #475569; /* slate-600 */
    color: #f1f5f9; /* slate-100 */
    border-radius: 8px;
    padding: 10px 14px;
    transition: border-color 0.2s ease, box-shadow 0.2s ease;
  }

  /* --- Error States --- */
  .form-group.has-error .form-input {
    border-color: #ef4444; /* red-500 */
    background-color: rgba(153, 27, 27, 0.15); /* Darker red tint */
  }

  .field-error {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 8px;
    padding: 10px 14px;
    background: rgba(127, 29, 29, 0.25); /* Dark red background */
    border-left: 4px solid #ef4444; /* red-500 */
    border-radius: 8px;
    font-size: 0.875rem;
    color: #fca5a5; /* red-300 for better contrast */
    backdrop-filter: blur(5px);
  }

  .error-icon {
    font-size: 1.1rem;
    color: #ef4444; /* red-500 */
    flex-shrink: 0;
  }

  .error-message {
    flex: 1;
    line-height: 1.5;
    font-weight: 500;
  }

  /* --- Warning States --- */
  .validation-warnings {
    margin-top: 16px;
    padding: 14px;
    background: rgba(180, 83, 9, 0.2); /* Dark amber background */
    border-left: 4px solid #f59e0b; /* amber-500 */
    border-radius: 8px;
  }

  .warning-item {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    font-size: 0.875rem;
    color: #fcd34d; /* amber-300 */
  }

  .warning-item:not(:last-child) {
    margin-bottom: 12px;
  }

  .warning-icon {
    margin-top: 2px;
    font-size: 1rem;
    color: #f59e0b; /* amber-500 */
    flex-shrink: 0;
  }

  .warning-message {
    flex: 1;
    line-height: 1.6;
  }

  /* --- Summary --- */
  .validation-summary {
    margin-top: 16px;
    padding: 14px;
    background: rgba(127, 29, 29, 0.2);
    border-radius: 8px;
    text-align: center;
    color: #fca5a5; /* red-300 */
  }

  /* --- Disabled Button (Error/Blocked State) --- */
  .button.disabled,
  .button:disabled {
    /* Background derived from dark red and slate, clearly blocked */
    background: #451a1a; /* Muted dark red background */
    color: #fca5a5; /* red-300 for visible error text */
    border: 1px solid #ef4444; /* red-500 border for strong error hint */
    cursor: not-allowed;
    opacity: 0.9;
    /* Red glow effect to match the modern theme */
    box-shadow: 0 0 8px rgba(239, 68, 68, 0.3);
    transition: all 0.3s ease;
  }

  .button.disabled:hover,
  .button:disabled:hover {
    /* Keep it static and just enhance the visual feedback slightly */
    background: #451a1a;
    box-shadow: 0 0 12px rgba(239, 68, 68, 0.4);
    transform: none;
  }

  /* --- Modern Focus States --- */
  .form-input:focus {
    outline: none;
    border-color: #3b82f6; /* blue-500 */
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.25); /* Focus glow */
  }

  .form-group.has-error .form-input:focus {
    border-color: #ef4444; /* red-500 */
    box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.25); /* Error glow */
  }

/* ============================================================================= */
/* CATEGORY TABS - PERFORMANCE OPTIMIZED */
/* ============================================================================= */

.category-tabs {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 2px solid rgba(148, 163, 184, 0.15);
  overflow-x: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(148, 163, 184, 0.3) transparent;

  /* 🚀 PERFORMANCE OPTIMIZATIONS */
  will-change: scroll-position; /* Only hint scroll changes */
  contain: layout style; /* Isolate layout calculations */
  -webkit-overflow-scrolling: touch; /* Smooth mobile scrolling */
}

.category-tabs::-webkit-scrollbar {
  height: 6px;
}

.category-tabs::-webkit-scrollbar-track {
  background: rgba(15, 23, 42, 0.5);
  border-radius: 3px;
}

.category-tabs::-webkit-scrollbar-thumb {
  background: rgba(148, 163, 184, 0.3);
  border-radius: 3px;
}

.category-tab {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 20px;
  background: rgba(15, 23, 42, 0.5);
  border: 2px solid rgba(148, 163, 184, 0.2);
  border-radius: 12px;
  cursor: pointer;
  font-size: 0.95rem;
  font-weight: 600;
  color: #94a3b8;
  white-space: nowrap;
  position: relative;
  overflow: hidden;
  min-width: fit-content;
  flex-shrink: 0;

  /* 🚀 CRITICAL: Use only transform and opacity for transitions */
  transition: transform 0.2s ease, opacity 0.2s ease, border-color 0.2s ease;

  /* 🚀 Force GPU compositing layer (but don't hint will-change on all) */
  transform: translateZ(0);
  backface-visibility: hidden;

  /* 🚀 Contain layout/paint to prevent reflow */
  contain: layout paint style;
}

/* ❌ REMOVED: Expensive ::before pseudo-element animation */
/* This was causing continuous repaints during scroll */

.category-tab:hover:not(:disabled) {
  /* 🚀 Only animate transform and border - cheap operations */
  border-color: rgba(59, 130, 246, 0.4);
  color: #e2e8f0;
  transform: translateY(-2px) translateZ(0);

  /* 🚀 Simplified shadow - less blur radius */
  box-shadow: 0 4px 8px rgba(59, 130, 246, 0.15);
}

.category-tab.active {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(37, 99, 235, 0.15) 100%);
  border-color: #3b82f6;
  color: #93c5fd;

  /* 🚀 Reduced shadow complexity */
  box-shadow: 0 6px 12px rgba(59, 130, 246, 0.2);
}

.category-tab.active::after {
  content: '';
  position: absolute;
  bottom: -2px;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, #3b82f6 0%, #2563eb 100%);
  border-radius: 3px 3px 0 0;

  /* 🚀 Ensure ::after doesn't cause layout issues */
  will-change: auto; /* Don't hint - it's static */
}

.category-tab.empty {
  opacity: 0.4;
  cursor: not-allowed;
  pointer-events: none; /* 🚀 Prevent unnecessary event handling */
}

.category-tab:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  transform: translateZ(0); /* Reset transform */
  pointer-events: none; /* 🚀 Prevent event processing */
}

.tab-icon {
  font-size: 1.3rem;
  display: flex;
  align-items: center;
  flex-shrink: 0;

  /* 🚀 Prevent emoji rendering issues */
  font-variant-emoji: emoji;
  text-rendering: optimizeSpeed;
}

.tab-label {
  font-size: 0.95rem;
  font-weight: 600;
  flex-shrink: 0;
}

.tab-count {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  height: 24px;
  padding: 0 8px;
  background: rgba(59, 130, 246, 0.2);
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 700;
  color: #93c5fd;
  flex-shrink: 0;

  /* 🚀 Simple transition - no transform */
  transition: background-color 0.2s ease, border-color 0.2s ease;
}

.category-tab.active .tab-count {
  background: rgba(59, 130, 246, 0.3);
  border-color: rgba(59, 130, 246, 0.5);
  color: #bfdbfe;
  /* ❌ REMOVED: Infinite pulse animation - causes constant repaints */
}

/* 🚀 OPTIONAL: Only animate on user interaction, not continuously */
@media (prefers-reduced-motion: no-preference) {
  .category-tab:active .tab-count {
    animation: pulse-count-once 0.3s ease-out;
  }
}

@keyframes pulse-count-once {
  0% { transform: scale(1); }
  50% { transform: scale(1.15); }
  100% { transform: scale(1); }
}
/* Device Toolbar */
.device-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: rgba(15, 23, 42, 0.4);
  border: 1px solid rgba(148, 163, 184, 0.15);
  border-radius: 12px;
  margin-bottom: 24px;
  gap: 16px;
  flex-wrap: wrap;
}

.toolbar-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.device-count {
  font-size: 1rem;
  font-weight: 700;
  color: #e2e8f0;
  display: flex;
  align-items: center;
  gap: 6px;
}

.device-count::before {
  content: '📱';
  font-size: 1.2rem;
}

.category-filter-badge {
  padding: 6px 14px;
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(124, 58, 237, 0.15) 100%);
  border: 1px solid rgba(139, 92, 246, 0.3);
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 600;
  color: #c4b5fd;
  text-transform: capitalize;
}

.toolbar-actions {
  display: flex;
  align-items: center;
  gap: 14px;
}

.toolbar-button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  background: rgba(30, 41, 59, 0.6);
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 10px;
  color: #e2e8f0;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.toolbar-button:hover {
  background: rgba(59, 130, 246, 0.15);
  border-color: rgba(59, 130, 246, 0.3);
  color: #93c5fd;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.2);
}

.toolbar-hint {
  font-size: 0.85rem;
  color: #64748b;
  font-style: italic;
  display: flex;
  align-items: center;
  gap: 6px;
}

/* Drag & Drop Styles */
.device-card {
  position: relative;
  cursor: grab;
  user-select: none;
}

.device-card.dragging {
  opacity: 0.5;
  cursor: grabbing;
  transform: scale(0.98);
  box-shadow: 0 10px 40px rgba(59, 130, 246, 0.4);
  border-color: #3b82f6;
}

.device-card:active {
  cursor: grabbing;
}

.drag-handle {
  position: absolute;
  top: 50%; /* CHANGED: Center vertically */
  left: 12px; /* CHANGED: Move to left side */
  transform: translateY(-50%); /* ADDED: Perfect vertical centering */
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(148, 163, 184, 0.1);
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 8px;
  color: #64748b;
  font-size: 1.2rem;
  font-weight: bold;
  cursor: grab;
  transition: all 0.2s ease;
  z-index: 10;
}

.drag-handle:hover {
  background: rgba(59, 130, 246, 0.2);
  border-color: rgba(59, 130, 246, 0.4);
  color: #93c5fd;
  transform: translateY(-50%) scale(1.1); /* UPDATED: Maintain centering while scaling */
}

.drag-handle:active {
  cursor: grabbing;
  transform: translateY(-50%) scale(0.95); /* UPDATED: Maintain centering while scaling */
}

/* Drop target highlight */
.device-card[draggable="true"]:not(.dragging):hover {
  border-color: rgba(59, 130, 246, 0.5);
  box-shadow: 0 4px 16px rgba(59, 130, 246, 0.2);
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .category-tabs {
    gap: 8px;
    padding-bottom: 12px;
  }

  .category-tab {
    padding: 10px 14px;
    font-size: 0.85rem;
  }

  .tab-icon {
    font-size: 1.1rem;
  }

  .tab-count {
    min-width: 20px;
    height: 20px;
    font-size: 0.75rem;
  }

  .device-toolbar {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .toolbar-actions {
    width: 100%;
    justify-content: space-between;
  }

  .toolbar-hint {
    display: none; /* Hide hint on mobile to save space */
  }

  .drag-handle {
    top: 8px;
    right: 8px;
    width: 28px;
    height: 28px;
    font-size: 1rem;
  }
    .drag-handle {
    top: 50%; /* Keep centered */
    left: 8px; /* Adjust for smaller screens */
    width: 28px;
    height: 28px;
    font-size: 1rem;
    transform: translateY(-50%); /* Maintain centering */
  }

  .drag-handle:hover {
    transform: translateY(-50%) scale(1.1);
  }

  .drag-handle:active {
    transform: translateY(-50%) scale(0.95);
  }

  .device-card {
    padding: 18px 18px 18px 48px; /* UPDATED: Adjust left padding for mobile */
  }
}

@media (max-width: 480px) {
  .category-tabs {
    gap: 6px;
  }

  .category-tab {
    padding: 8px 12px;
  }

  .tab-label {
    display: none; /* Show only icons and counts on very small screens */
  }

  .device-toolbar {
    padding: 12px 16px;
  }

  .toolbar-button {
    font-size: 0.85rem;
    padding: 8px 14px;
  }
    .device-card {
    padding: 18px 18px 18px 44px; /* UPDATED: Further adjust for very small screens */
  }

  .drag-handle {
    left: 6px;
    width: 26px;
    height: 26px;
  }
}


// banner

 .usage-banner {
  background: linear-gradient(135deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.98) 100%);
  backdrop-filter: blur(8px) saturate(180%);
  border: 1px solid;
  border-radius: 20px;
  padding: 24px;
  margin: 20px 0;
  display: flex;
  gap: 20px;
  align-items: flex-start;
  box-shadow:
    0 20px 40px -12px rgba(0, 0, 0, 0.4),
    0 0 0 1px rgba(255, 255, 255, 0.05),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
  position: relative;
  overflow: hidden;
  animation: slideInUp 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

.usage-banner::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, transparent 0%, currentColor 50%, transparent 100%);
}

.usage-banner.info {
  border-color: rgba(59, 130, 246, 0.3);
  color: #93c5fd;
}

.usage-banner.info::before {
  background: linear-gradient(90deg, transparent 0%, #3b82f6 50%, transparent 100%);
}

.usage-banner.warning {
  border-color: rgba(245, 158, 11, 0.3);
  color: #fdba74;
}

.usage-banner.warning::before {
  background: linear-gradient(90deg, transparent 0%, #f59e0b 50%, transparent 100%);
}

.usage-banner.danger {
  border-color: rgba(239, 68, 68, 0.3);
  color: #fca5a5;
}

.usage-banner.danger::before {
  background: linear-gradient(90deg, transparent 0%, #ef4444 50%, transparent 100%);
}

.banner-icon {
  font-size: 2rem;
  flex-shrink: 0;
  margin-top: 4px;
}

.banner-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.banner-header {
  margin-bottom: 8px;
}

.banner-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: #f1f5f9;
  margin-bottom: 4px;
  background: linear-gradient(135deg, #ffffff 0%, #e0e7ff 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.banner-subtitle {
  font-size: 0.9rem;
  color: #94a3b8;
  line-height: 1.4;
}

.banner-stats {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.stat-item {
  background: rgba(15, 23, 42, 0.6);
  border-radius: 12px;
  padding: 16px;
  border: 1px solid rgba(148, 163, 184, 0.1);
}

.stat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.stat-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  color: #e2e8f0;
  font-size: 0.95rem;
}

.stat-icon {
  font-size: 1.1rem;
}

.stat-value {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 700;
  font-size: 0.95rem;
}

.stat-value.danger {
  color: #ef4444;
}

.stat-value.warning {
  color: #f59e0b;
}

.stat-percentage {
  background: rgba(148, 163, 184, 0.2);
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 600;
}

.progress-bar {
  height: 6px;
  background: rgba(15, 23, 42, 0.8);
  border-radius: 3px;
  overflow: hidden;
  position: relative;
}

.progress-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.progress-fill::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
  animation: progressShimmer 2s infinite;
}

.progress-fill:not(.danger):not(.warning) {
  background: linear-gradient(90deg, #3b82f6 0%, #60a5fa 100%);
}

.progress-fill.warning {
  background: linear-gradient(90deg, #f59e0b 0%, #fbbf24 100%);
}

.progress-fill.danger {
  background: linear-gradient(90deg, #ef4444 0%, #f87171 100%);
}

.reset-info .stat-header {
  margin-bottom: 4px;
}

.reset-description {
  font-size: 0.85rem;
  color: #94a3b8;
  margin-top: 4px;
}

.banner-warnings {
  background: rgba(245, 158, 11, 0.1);
  border: 1px solid rgba(245, 158, 11, 0.2);
  border-radius: 12px;
  padding: 16px;
}

.warnings-title {
  font-weight: 700;
  color: #fbbf24;
  margin-bottom: 8px;
  font-size: 0.95rem;
}

.warning-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 6px;
  font-size: 0.9rem;
  color: #fdba74;
  line-height: 1.4;
}

.warning-item:last-child {
  margin-bottom: 0;
}

.warning-icon {
  color: #f59e0b;
  font-weight: bold;
  flex-shrink: 0;
  margin-top: 1px;
}

.banner-alert {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.2);
  border-radius: 12px;
  padding: 16px;
}

.alert-icon {
  font-size: 1.2rem;
  flex-shrink: 0;
  margin-top: 1px;
}

.alert-content {
  flex: 1;
}

.alert-title {
  font-weight: 700;
  color: #fca5a5;
  margin-bottom: 4px;
  font-size: 0.95rem;
}

.alert-description {
  font-size: 0.9rem;
  color: #fecaca;
  line-height: 1.4;
}

.banner-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex-shrink: 0;
}

.banner-button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border: none;
  border-radius: 10px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
  white-space: nowrap;
}

.banner-button::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.2) 0%, transparent 50%, rgba(255, 255, 255, 0.2) 100%);
  transform: translateX(-100%) skewX(-15deg);
  transition: transform 0.6s;
}

.banner-button:hover::before {
  transform: translateX(100%) skewX(-15deg);
}

.banner-button.upgrade {
  background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
}

.banner-button.upgrade:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(99, 102, 241, 0.4);
}

.banner-button.details {
  background: rgba(30, 41, 59, 0.8);
  border: 1px solid rgba(148, 163, 184, 0.3);
  color: #cbd5e1;
}

.banner-button.details:hover {
  background: rgba(59, 130, 246, 0.1);
  border-color: #3b82f6;
  color: #3b82f6;
  transform: translateY(-2px);
}

.banner-button.dismiss {
  background: transparent;
  border: 1px solid rgba(148, 163, 184, 0.2);
  color: #94a3b8;
}

.banner-button.dismiss:hover {
  background: rgba(239, 68, 68, 0.1);
  border-color: #ef4444;
  color: #ef4444;
  transform: translateY(-2px);
}

.button-icon {
  font-size: 1rem;
}

@keyframes slideInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes progressShimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

/* Responsive Design */
@media (max-width: 768px) {
  .usage-banner {
    flex-direction: column;
    gap: 16px;
    padding: 20px;
  }

  .banner-actions {
    flex-direction: row;
    justify-content: flex-end;
    width: 100%;
  }

  .banner-button {
    flex: 1;
    justify-content: center;
  }

  .stat-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }

  .stat-value {
    align-self: flex-end;
  }
}

@media (max-width: 480px) {
  .usage-banner {
    padding: 16px;
    border-radius: 16px;
  }

  .banner-actions {
    flex-direction: column;
  }

  .banner-button {
    flex: none;
  }
//telegram modal


:host .modal-overlay {
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  right: 0 !important;
  bottom: 0 !important;
  width: 100vw !important;
  height: 100vh !important;
  margin: 0 !important;
  padding: 0 !important;
  background: rgba(0, 0, 0, 0.7) !important;
  backdrop-filter: blur(4px) !important;
  -webkit-backdrop-filter: blur(4px) !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  z-index: 999999 !important;
  animation: modalFadeIn 0.2s ease !important;
  pointer-events: auto !important;
  box-sizing: border-box !important;
}

@keyframes modalFadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

:host .modal-container {
  position: relative !important;
  background: white !important;
  border-radius: 16px !important;
  max-width: 900px !important;
  width: 90vw !important;
  max-height: 90vh !important;
  margin: 0 auto !important;
  overflow: hidden !important;
  display: flex !important;
  flex-direction: column !important;
  box-shadow: 0 25px 80px rgba(0, 0, 0, 0.6) !important;
  animation: modalSlideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) !important;
  z-index: 1000000 !important;
  pointer-events: auto !important;
  box-sizing: border-box !important;
}

@keyframes modalSlideUp {
  from {
    transform: translateY(50px) scale(0.95);
    opacity: 0;
  }
  to {
    transform: translateY(0) scale(1);
    opacity: 1;
  }
}

:host .modal-header {
  display: flex !important;
  justify-content: space-between !important;
  align-items: center !important;
  padding: 24px 30px !important;
  border-bottom: 2px solid #e0e0e0 !important;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
  color: white !important;
  flex-shrink: 0 !important;
  box-sizing: border-box !important;
}

:host .modal-header h2 {
  margin: 0 !important;
  font-size: 24px !important;
  font-weight: 600 !important;
  color: white !important;
  line-height: 1.2 !important;
}

:host .btn-close {
  background: rgba(255, 255, 255, 0.2) !important;
  border: none !important;
  color: white !important;
  font-size: 28px !important;
  width: 40px !important;
  height: 40px !important;
  min-width: 40px !important;
  min-height: 40px !important;
  border-radius: 50% !important;
  cursor: pointer !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  transition: all 0.3s ease !important;
  padding: 0 !important;
  margin: 0 !important;
  line-height: 1 !important;
  flex-shrink: 0 !important;
  box-sizing: border-box !important;
}

:host .btn-close:hover {
  background: rgba(255, 255, 255, 0.4) !important;
  transform: rotate(90deg) !important;
}

:host .modal-body {
  flex: 1 !important;
  overflow-y: auto !important;
  overflow-x: hidden !important;
  padding: 0 !important;
  margin: 0 !important;
  background: #f8f9fa !important;
  box-sizing: border-box !important;
  -webkit-overflow-scrolling: touch !important;
}

:host .modal-footer {
  padding: 20px 30px !important;
  border-top: 2px solid #e0e0e0 !important;
  display: flex !important;
  justify-content: flex-end !important;
  gap: 12px !important;
  background: white !important;
  flex-shrink: 0 !important;
  box-sizing: border-box !important;
}

:host .modal-footer .btn {
  padding: 10px 24px !important;
  border: none !important;
  border-radius: 8px !important;
  font-size: 14px !important;
  font-weight: 600 !important;
  cursor: pointer !important;
  transition: all 0.3s ease !important;
  box-sizing: border-box !important;
}

:host .modal-footer .btn-secondary {
  background: #6c757d !important;
  color: white !important;
}

:host .modal-footer .btn-secondary:hover {
  background: #5a6268 !important;
  transform: translateY(-2px) !important;
  box-shadow: 0 4px 12px rgba(108, 117, 125, 0.3) !important;
}

/* Telegram Button in Header */
:host .telegram-button {
  position: relative !important;
  padding: 10px 20px !important;
  border: 2px solid #0088cc !important;
  background: white !important;
  color: #0088cc !important;
  border-radius: 8px !important;
  cursor: pointer !important;
  font-weight: 600 !important;
  font-size: 14px !important;
  transition: all 0.3s ease !important;
  display: inline-flex !important;
  align-items: center !important;
  gap: 6px !important;
  white-space: nowrap !important;
  box-sizing: border-box !important;
}

:host .telegram-button:hover {
  background: #0088cc !important;
  color: white !important;
  transform: translateY(-2px) !important;
  box-shadow: 0 4px 12px rgba(0, 136, 204, 0.3) !important;
}

:host .telegram-button.enabled {
  background: #0088cc !important;
  color: white !important;
  border-color: #0088cc !important;
}

:host .telegram-button .badge {
  position: absolute !important;
  top: -8px !important;
  right: -8px !important;
  background: #dc3545 !important;
  color: white !important;
  border-radius: 50% !important;
  width: 22px !important;
  height: 22px !important;
  min-width: 22px !important;
  min-height: 22px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  font-size: 11px !important;
  font-weight: bold !important;
  border: 2px solid white !important;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2) !important;
  line-height: 1 !important;
  box-sizing: border-box !important;
}

/* Ensure telegram-config component fills modal body */
:host telegram-config {
  display: block !important;
  width: 100% !important;
  min-height: 100% !important;
  box-sizing: border-box !important;
}

/* Responsive Design */
@media (max-width: 768px) {
  :host .modal-container {
    width: 95vw !important;
    max-height: 95vh !important;
    border-radius: 12px !important;
  }

  :host .modal-header {
    padding: 20px !important;
  }

  :host .modal-header h2 {
    font-size: 20px !important;
  }

  :host .btn-close {
    width: 36px !important;
    height: 36px !important;
    min-width: 36px !important;
    min-height: 36px !important;
    font-size: 24px !important;
  }

  :host .modal-footer {
    padding: 16px 20px !important;
  }

  :host .telegram-button {
    padding: 8px 16px !important;
    font-size: 13px !important;
  }

  :host .telegram-button .badge {
    width: 20px !important;
    height: 20px !important;
    min-width: 20px !important;
    min-height: 20px !important;
    font-size: 10px !important;
  }
}

/* Prevent body scroll when modal is open */
:host([modal-open]) {
  overflow: hidden !important;
}

/* Override any conflicting parent styles */
:host .modal-overlay * {
  box-sizing: border-box !important;
}

/* Ensure config-container doesn't create stacking context issues */
:host .config-container {
  position: relative;
  z-index: 1;
}

/* Fix for potential transform issues on parents */
:host {
  contain: layout style;
}
`;