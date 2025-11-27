// src/styles/telegram-config.styles.ts
// Styles for Telegram configuration component

import { css } from 'lit';

export const telegramConfigStyles = css`
   :host {
      --primary-gradient: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      --secondary-gradient: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
      --success-gradient: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
      --danger-gradient: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
      --glass-bg: rgba(15, 23, 42, 0.85);
      --glass-border: rgba(255, 255, 255, 0.1);
      --glass-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.36);
      display: block;
      width: 100%;
      height: 100%;
      overflow-y: auto;
    }

    .telegram-config {
      background: var(--glass-bg);
      backdrop-filter: blur(40px);
      border: 1px solid var(--glass-border);
      border-radius: 20px;
      box-shadow: var(--glass-shadow);
      padding: 2rem;
      margin: 1rem 0;
      animation: slideUpScale 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94);
      position: relative;
      overflow: hidden;
    }

    @keyframes slideUpScale {
      0% {
        opacity: 0;
        transform: translateY(30px) scale(0.95);
      }
      100% {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    .header {
      text-align: center;
      margin-bottom: 2rem;
      position: relative;
      overflow: hidden;
      border-radius: 15px;
      padding: 1.5rem;
      background: linear-gradient(135deg, rgba(102, 126, 234, 0.2) 0%, rgba(118, 75, 162, 0.2) 100%);
    }

    .header::before {
      content: '';
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
      animation: shimmer 3s infinite;
    }

    @keyframes shimmer {
      0% { left: -100%; }
      100% { left: 100%; }
    }

    h2 {
      margin: 0 0 0.5rem 0;
      font-size: 1.8rem;
      font-weight: 700;
      background: linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .subtitle {
      color: #94a3b8;
      margin: 0;
      font-size: 0.9rem;
    }

    .tabs {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 2rem;
      background: rgba(30, 41, 59, 0.5);
      padding: 0.5rem;
      border-radius: 15px;
      backdrop-filter: blur(20px);
    }

    .tab {
      flex: 1;
      padding: 0.75rem 1rem;
      border: none;
      background: transparent;
      color: #94a3b8;
      border-radius: 12px;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      font-weight: 600;
      position: relative;
      overflow: hidden;
    }

    .tab:hover {
      color: #e2e8f0;
      transform: translateY(-2px);
    }

    .tab.active {
      background: var(--primary-gradient);
      color: white;
      box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
      transform: translateY(-2px);
    }

    .test-result {
      padding: 1rem;
      border-radius: 12px;
      margin-bottom: 1.5rem;
      font-weight: 600;
      text-align: center;
      backdrop-filter: blur(20px);
      border: 1px solid;
      animation: slideIn 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94);
    }

    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateX(-20px);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }

    .test-result.success {
      background: linear-gradient(135deg, rgba(79, 172, 254, 0.2) 0%, rgba(0, 242, 254, 0.2) 100%);
      border-color: rgba(79, 172, 254, 0.3);
      color: #4facfe;
    }

    .test-result.error {
      background: linear-gradient(135deg, rgba(250, 112, 154, 0.2) 0%, rgba(254, 225, 64, 0.2) 100%);
      border-color: rgba(250, 112, 154, 0.3);
      color: #fa709a;
    }

    .content {
      min-height: 400px;
    }

    /* Form Styles */
    .form-group {
      margin-bottom: 1.5rem;
    }

    label {
      display: block;
      margin-bottom: 0.5rem;
      color: #e2e8f0;
      font-weight: 600;
      font-size: 0.9rem;
    }

    input[type="text"],
    input[type="password"],
    input[type="number"],
    select {
      width: 100%;
      padding: 0.75rem 1rem;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      background: rgba(30, 41, 59, 0.6);
      color: #e2e8f0;
      font-size: 0.9rem;
      backdrop-filter: blur(20px);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    input:focus,
    select:focus {
      outline: none;
      border-color: rgba(102, 126, 234, 0.5);
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
      transform: translateY(-1px);
    }

    input:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    small {
      display: block;
      margin-top: 0.25rem;
      color: #94a3b8;
      font-size: 0.75rem;
    }

    /* Checkbox Styles */
    input[type="checkbox"] {
      margin-right: 0.5rem;
      transform: scale(1.2);
      accent-color: #667eea;
    }

    /* Button Styles */
    .button-group {
      display: flex;
      gap: 1rem;
      margin-top: 2rem;
    }

    .btn {
      padding: 0.75rem 1.5rem;
      border: none;
      border-radius: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
      overflow: hidden;
      backdrop-filter: blur(20px);
    }

    .btn:hover {
      transform: translateY(-2px) scale(1.02);
      box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
    }

    .btn:active {
      transform: translateY(0) scale(0.98);
    }

    .btn-primary {
      background: var(--primary-gradient);
      color: white;
      box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
    }

    .btn-secondary {
      background: rgba(30, 41, 59, 0.6);
      color: #e2e8f0;
      border: 1px solid rgba(255, 255, 255, 0.1);
    }

    .btn-danger {
      background: var(--danger-gradient);
      color: white;
      box-shadow: 0 4px 15px rgba(250, 112, 154, 0.3);
    }

    .btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none !important;
    }

    /* Info Box */
    .info-box {
      background: rgba(30, 41, 59, 0.6);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 15px;
      padding: 1.5rem;
      margin-bottom: 2rem;
      backdrop-filter: blur(20px);
    }

    .info-box h3 {
      margin: 0 0 1rem 0;
      color: #e2e8f0;
      font-size: 1.1rem;
    }

    .info-box ol {
      margin: 0;
      padding-left: 1.2rem;
      color: #94a3b8;
    }

    .info-box li {
      margin-bottom: 0.5rem;
    }

    .info-box code {
      background: rgba(0, 0, 0, 0.3);
      padding: 0.2rem 0.4rem;
      border-radius: 6px;
      font-size: 0.8rem;
      color: #f8fafc;
    }

    /* Device Selector */
    .device-selector {
      margin-bottom: 2rem;
    }

    /* Alert Config Form */
    .alert-config-form {
      background: rgba(30, 41, 59, 0.4);
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 15px;
      padding: 1.5rem;
      backdrop-filter: blur(20px);
    }

    .alert-config-form h3 {
      margin: 0 0 1.5rem 0;
      color: #e2e8f0;
      font-size: 1.2rem;
    }

    /* Stats Grid */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 1rem;
      margin-bottom: 2rem;
    }

    .stat-card {
      background: rgba(30, 41, 59, 0.6);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 15px;
      padding: 1.5rem;
      text-align: center;
      backdrop-filter: blur(20px);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .stat-card:hover {
      transform: translateY(-5px);
      border-color: rgba(102, 126, 234, 0.3);
    }

    .stat-value {
      font-size: 2rem;
      font-weight: 700;
      background: var(--primary-gradient);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      margin-bottom: 0.5rem;
    }

    .stat-label {
      color: #94a3b8;
      font-size: 0.8rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    /* History List */
    .history-list {
      margin-bottom: 2rem;
    }

    .history-list h3 {
      color: #e2e8f0;
      margin-bottom: 1rem;
    }

    .history-item {
      background: rgba(30, 41, 59, 0.6);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      padding: 1rem;
      margin-bottom: 1rem;
      backdrop-filter: blur(20px);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .history-item:hover {
      transform: translateX(5px);
      border-color: rgba(102, 126, 234, 0.3);
    }

    .history-header {
      display: flex;
      justify-content: between;
      align-items: center;
      margin-bottom: 0.5rem;
    }

    .device-name {
      font-weight: 600;
      color: #e2e8f0;
    }

    .timestamp {
      color: #94a3b8;
      font-size: 0.8rem;
    }

    .history-body {
      margin-bottom: 0.5rem;
    }

    .sensor-info {
      color: #94a3b8;
      margin-bottom: 0.25rem;
    }

    .message {
      color: #e2e8f0;
      font-weight: 500;
    }

    .status {
      font-size: 0.8rem;
      font-weight: 600;
    }

    .status.success {
      color: #4facfe;
    }

    .status.error {
      color: #fa709a;
    }

    .no-data {
      text-align: center;
      color: #94a3b8;
      padding: 3rem;
      font-style: italic;
    }

    /* Floating Animation for Interactive Elements */
    .btn, .tab, .stat-card, .history-item {
      animation: float 6s ease-in-out infinite;
    }

    @keyframes float {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-5px); }
    }

    /* Remove float animation on hover */
    .btn:hover, .tab:hover, .stat-card:hover, .history-item:hover {
      animation: none;
    }

`;
