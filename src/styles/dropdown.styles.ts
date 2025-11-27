import { css } from 'lit';

export const dropdown = css`
  :host {
    display: block;
    position: relative;
  }

  /* Settings Button */
  .settings-button {
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

  .settings-button:hover {
    background: rgba(59, 130, 246, 0.2);
    border-color: rgba(59, 130, 246, 0.3);
    transform: rotate(90deg);
  }

  .settings-button {
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

  .settings-button::before {
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

  .settings-button:hover::before {
    left: 100%;
  }

  .settings-button:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(59, 130, 246, 0.4);
  }

  .settings-button:active {
    transform: translateY(0);
  }

  .settings-icon {
    font-size: 1.3rem;
    animation: rotate 2s linear infinite;
    animation-play-state: paused;
    transition: transform 0.3s ease;
  }

  .settings-button:hover .settings-icon {
    animation-play-state: running;
  }

  @keyframes rotate {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  /* Dropdown Menu */
  .dropdown-menu {
    position: absolute;
    top: calc(100% + 12px);
    right: 0;
    background: rgba(30, 41, 59, 0.98);
    backdrop-filter: blur(20px);
    border-radius: 16px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
    border: 1px solid rgba(148, 163, 184, 0.2);
    min-width: 280px;
    opacity: 0;
    visibility: hidden;
    transform: translateY(-10px) scale(0.95);
    transition: all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
    z-index: 100;
    overflow: hidden;
  }

  .dropdown-menu.open {
    opacity: 1;
    visibility: visible;
    transform: translateY(0) scale(1);
  }

  /* Dropdown Header */
  .dropdown-header {
    padding: 18px 20px;
    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
    color: white;
    font-weight: 700;
    font-size: 1rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.2);
    letter-spacing: 0.5px;
  }

  /* Dropdown Items */
  .dropdown-item {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 16px 20px;
    cursor: pointer;
    transition: all 0.3s ease;
    color: #e2e8f0;
    text-decoration: none;
    border-bottom: 1px solid rgba(148, 163, 184, 0.1);
    position: relative;
    overflow: hidden;
  }

  .dropdown-item:last-child {
    border-bottom: none;
  }

  .dropdown-item::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    width: 0;
    height: 100%;
    background: linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(37, 99, 235, 0.15) 100%);
    transition: width 0.3s ease;
  }

  .dropdown-item:hover::before {
    width: 100%;
  }

  .dropdown-item:hover {
    padding-left: 26px;
    background: rgba(59, 130, 246, 0.05);
  }

  .dropdown-item:active {
    transform: scale(0.98);
  }

  /* Dropdown Item Icon */
  .dropdown-item-icon {
    font-size: 1.4rem;
    width: 28px;
    text-align: center;
    position: relative;
    z-index: 1;
    transition: transform 0.3s ease;
  }

  .dropdown-item:hover .dropdown-item-icon {
    transform: scale(1.15) rotate(5deg);
  }

  /* Dropdown Item Content */
  .dropdown-item-content {
    flex: 1;
    position: relative;
    z-index: 1;
  }

  .dropdown-item-title {
    font-weight: 600;
    font-size: 0.95rem;
    color: #f1f5f9;
    margin-bottom: 3px;
    transition: color 0.2s ease;
  }

  .dropdown-item:hover .dropdown-item-title {
    color: #93c5fd;
  }

  .dropdown-item-description {
    font-size: 0.75rem;
    color: #94a3b8;
    line-height: 1.4;
  }

  /* Dropdown Overlay */
  .dropdown-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 99;
    display: none;
    background: rgba(0, 0, 0, 0.2);
    backdrop-filter: blur(2px);
    animation: fadeIn 0.2s ease;
  }

  .dropdown-overlay.open {
    display: block;
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  /* Hover Effects for Icons */
  .dropdown-item:nth-child(1) .dropdown-item-icon {
    color: #3b82f6;
  }

  .dropdown-item:nth-child(2) .dropdown-item-icon {
    color: #10b981;
  }

  .dropdown-item:nth-child(3) .dropdown-item-icon {
    color: #f59e0b;
  }

  .dropdown-item:nth-child(4) .dropdown-item-icon {
    color: #8b5cf6;
  }

  /* Responsive Design */
  @media (max-width: 768px) {
    .dropdown-menu {
      min-width: 260px;
      right: -10px;
    }

    .dropdown-item {
      padding: 14px 18px;
    }

    .dropdown-item:hover {
      padding-left: 24px;
    }

    .dropdown-header {
      padding: 16px 18px;
      font-size: 0.95rem;
    }
  }

  @media (max-width: 480px) {
    .settings-button {
      padding: 10px 18px;
      font-size: 0.9rem;
    }

    .dropdown-menu {
      min-width: 240px;
      max-width: calc(100vw - 40px);
    }

    .dropdown-item-title {
      font-size: 0.9rem;
    }

    .dropdown-item-description {
      font-size: 0.7rem;
    }
  }

  /* Accessibility */
  .settings-button:focus-visible {
    outline: 2px solid #3b82f6;
    outline-offset: 2px;
  }

  .dropdown-item:focus-visible {
    background: rgba(59, 130, 246, 0.1);
    outline: 2px solid #3b82f6;
    outline-offset: -2px;
  }

  /* Animation Timing */
  .dropdown-item {
    animation: slideIn 0.2s ease-out backwards;
  }

  .dropdown-item:nth-child(1) { animation-delay: 0.05s; }
  .dropdown-item:nth-child(2) { animation-delay: 0.1s; }
  .dropdown-item:nth-child(3) { animation-delay: 0.15s; }
  .dropdown-item:nth-child(4) { animation-delay: 0.2s; }
  .dropdown-item:nth-child(5) { animation-delay: 0.25s; }

  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateX(20px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  /* Hover state improvements */
  .dropdown-item:hover .dropdown-item-description {
    color: #cbd5e1;
  }

  /* Active/Selected State */
  .dropdown-item.active {
    background: rgba(59, 130, 246, 0.15);
    border-left: 3px solid #3b82f6;
  }

  .dropdown-item.active .dropdown-item-title {
    color: #93c5fd;
  }
`;