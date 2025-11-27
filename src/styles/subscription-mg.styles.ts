import { css } from 'lit';

export const subscriptionStyles = css`
  :host {
    display: block;
    min-height: 100vh;
    background:
      radial-gradient(ellipse at top right, rgba(99, 102, 241, 0.08) 0%, transparent 50%),
      radial-gradient(ellipse at bottom left, rgba(139, 92, 246, 0.08) 0%, transparent 50%),
      linear-gradient(180deg, #0a0f1e 0%, #0f172a 50%, #1e293b 100%);
    padding: 32px;
    position: relative;
    overflow-x: hidden;
  }

  :host::before {
    content: '';
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background:
      repeating-linear-gradient(
        0deg,
        rgba(255, 255, 255, 0.01) 0px,
        transparent 1px,
        transparent 40px,
        rgba(255, 255, 255, 0.01) 41px
      ),
      repeating-linear-gradient(
        90deg,
        rgba(255, 255, 255, 0.01) 0px,
        transparent 1px,
        transparent 40px,
        rgba(255, 255, 255, 0.01) 41px
      );
    pointer-events: none;
    z-index: 0;
  }

  .subscription-container {
    max-width: 1400px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 28px;
    position: relative;
    z-index: 1;
  }

  h2 {
    font-size: 2.5rem;
    font-weight: 900;
    background: linear-gradient(135deg, #ffffff 0%, #a5b4fc 50%, #c4b5fd 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    margin: 0 0 8px 0;
    letter-spacing: -0.03em;
    text-shadow: 0 0 40px rgba(165, 180, 252, 0.3);
    animation: titleGlow 3s ease-in-out infinite alternate;
  }

  @keyframes titleGlow {
    from { filter: drop-shadow(0 0 20px rgba(165, 180, 252, 0.2)); }
    to { filter: drop-shadow(0 0 30px rgba(196, 181, 253, 0.4)); }
  }

  /* Enhanced Cards */
  .current-plan-card,
  .usage-metrics-card,
  .pricing-table {
    background:
      linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.8) 100%);
    backdrop-filter: blur(24px) saturate(180%);
    border-radius: 24px;
    padding: 36px;
    border: 1px solid rgba(148, 163, 184, 0.15);
    box-shadow:
      0 25px 50px -12px rgba(0, 0, 0, 0.4),
      0 0 0 1px rgba(255, 255, 255, 0.05),
      inset 0 1px 0 0 rgba(255, 255, 255, 0.05);
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    overflow: hidden;
  }

  .current-plan-card::before,
  .usage-metrics-card::before,
  .pricing-table::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(90deg,
      transparent 0%,
      #6366f1 25%,
      #8b5cf6 50%,
      #a855f7 75%,
      transparent 100%
    );
    transform: scaleX(0);
    transform-origin: left;
    transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .current-plan-card:hover::before,
  .usage-metrics-card:hover::before,
  .pricing-table:hover::before {
    transform: scaleX(1);
  }

  .current-plan-card::after,
  .usage-metrics-card::after,
  .pricing-table::after {
    content: '';
    position: absolute;
    inset: -1px;
    border-radius: 24px;
    padding: 1px;
    background: linear-gradient(135deg,
      rgba(99, 102, 241, 0.3) 0%,
      rgba(139, 92, 246, 0.3) 50%,
      transparent 100%
    );
    -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
    opacity: 0;
    transition: opacity 0.4s ease;
    pointer-events: none;
  }

  .current-plan-card:hover::after,
  .usage-metrics-card:hover::after,
  .pricing-table:hover::after {
    opacity: 1;
  }

  .current-plan-card:hover,
  .usage-metrics-card:hover,
  .pricing-table:hover {
    border-color: rgba(99, 102, 241, 0.3);
    transform: translateY(-6px);
    box-shadow:
      0 30px 60px -15px rgba(99, 102, 241, 0.25),
      0 0 0 1px rgba(99, 102, 241, 0.1),
      inset 0 1px 0 0 rgba(255, 255, 255, 0.1);
  }

  h3 {
    font-size: 1.75rem;
    font-weight: 800;
    background: linear-gradient(135deg, #f1f5f9 0%, #e0e7ff 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    margin: 0 0 24px 0;
    display: flex;
    align-items: center;
    gap: 12px;
    letter-spacing: -0.02em;
  }

  /* Enhanced Current Plan Styles */
  .plan-status {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 28px;
    padding: 20px 24px;
    background:
      linear-gradient(135deg, rgba(15, 23, 42, 0.8) 0%, rgba(30, 41, 59, 0.6) 100%);
    border-radius: 16px;
    border: 1px solid rgba(148, 163, 184, 0.15);
    box-shadow: inset 0 2px 8px rgba(0, 0, 0, 0.2);
    position: relative;
    overflow: hidden;
  }

  .plan-status::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.05), transparent);
    animation: statusShimmer 3s infinite;
  }

  @keyframes statusShimmer {
    0%, 100% { left: -100%; }
    50% { left: 100%; }
  }

  .status-badge {
    padding: 8px 20px;
    border-radius: 24px;
    font-size: 0.8rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    position: relative;
    z-index: 1;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }

  .status-badge.active {
    background: linear-gradient(135deg, rgba(16, 185, 129, 0.25) 0%, rgba(5, 150, 105, 0.3) 100%);
    color: #6ee7b7;
    border: 1px solid rgba(16, 185, 129, 0.4);
    box-shadow:
      0 4px 12px rgba(16, 185, 129, 0.3),
      inset 0 1px 0 rgba(255, 255, 255, 0.1);
  }

  .status-badge.trialing {
    background: linear-gradient(135deg, rgba(59, 130, 246, 0.25) 0%, rgba(37, 99, 235, 0.3) 100%);
    color: #93c5fd;
    border: 1px solid rgba(59, 130, 246, 0.4);
    box-shadow:
      0 4px 12px rgba(59, 130, 246, 0.3),
      inset 0 1px 0 rgba(255, 255, 255, 0.1);
  }

  .status-badge.past_due {
    background: linear-gradient(135deg, rgba(251, 191, 36, 0.25) 0%, rgba(245, 158, 11, 0.3) 100%);
    color: #fcd34d;
    border: 1px solid rgba(251, 191, 36, 0.4);
    box-shadow:
      0 4px 12px rgba(251, 191, 36, 0.3),
      inset 0 1px 0 rgba(255, 255, 255, 0.1);
  }

  .status-badge.canceled {
    background: linear-gradient(135deg, rgba(239, 68, 68, 0.25) 0%, rgba(220, 38, 38, 0.3) 100%);
    color: #fca5a5;
    border: 1px solid rgba(239, 68, 68, 0.4);
    box-shadow:
      0 4px 12px rgba(239, 68, 68, 0.3),
      inset 0 1px 0 rgba(255, 255, 255, 0.1);
  }

  .plan-features h4 {
    font-size: 1.2rem;
    color: #e2e8f0;
    margin-bottom: 20px;
    font-weight: 700;
    letter-spacing: -0.01em;
  }

  .plan-features ul {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 14px;
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .plan-features li {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 14px 18px;
    background:
      linear-gradient(135deg, rgba(15, 23, 42, 0.7) 0%, rgba(30, 41, 59, 0.5) 100%);
    border-radius: 12px;
    border: 1px solid rgba(148, 163, 184, 0.1);
    color: #cbd5e1;
    font-weight: 600;
    font-size: 0.95rem;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    overflow: hidden;
  }

  .plan-features li::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(99, 102, 241, 0.1), transparent);
    transition: left 0.5s;
  }

  .plan-features li:hover::before {
    left: 100%;
  }

  .plan-features li:hover {
    background: linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(30, 41, 59, 0.7) 100%);
    border-color: rgba(99, 102, 241, 0.3);
    transform: translateX(6px);
    box-shadow: 0 4px 16px rgba(99, 102, 241, 0.15);
  }

  /* Enhanced Usage Metrics */
  .metric {
    margin-bottom: 24px;
    padding: 4px;
  }

  .metric-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
    font-weight: 700;
    color: #f1f5f9;
    font-size: 1rem;
  }

  .progress-bar {
    height: 10px;
    background: rgba(15, 23, 42, 0.8);
    border-radius: 6px;
    overflow: hidden;
    position: relative;
    border: 1px solid rgba(148, 163, 184, 0.15);
    box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.3);
  }

  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%);
    border-radius: 6px;
    transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    overflow: hidden;
    box-shadow: 0 0 12px rgba(99, 102, 241, 0.5);
  }

  .progress-fill::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
    animation: progressShimmer 2s infinite;
  }

  .progress-fill::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 50%;
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.2), transparent);
    border-radius: 6px 6px 0 0;
  }

  @keyframes progressShimmer {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }

  .reset-info {
    text-align: center;
    padding: 16px;
    background: linear-gradient(135deg, rgba(15, 23, 42, 0.7) 0%, rgba(30, 41, 59, 0.5) 100%);
    border-radius: 12px;
    border: 1px solid rgba(148, 163, 184, 0.12);
    color: #94a3b8;
    font-size: 0.9rem;
    font-weight: 600;
    margin-top: 8px;
  }

  /* Enhanced Pricing Table */
  .pricing-cards {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 28px;
    margin-top: 28px;
  }

  .pricing-card {
    background:
      linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(30, 41, 59, 0.8) 100%);
    backdrop-filter: blur(20px);
    border-radius: 20px;
    padding: 32px;
    border: 2px solid rgba(148, 163, 184, 0.15);
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .pricing-card::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 20px;
    padding: 2px;
    background: linear-gradient(135deg, transparent 0%, rgba(99, 102, 241, 0.2) 50%, transparent 100%);
    -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
    opacity: 0;
    transition: opacity 0.4s ease;
  }

  .pricing-card:hover::before {
    opacity: 1;
  }

  .pricing-card:hover {
    border-color: rgba(99, 102, 241, 0.5);
    transform: translateY(-10px) scale(1.02);
    box-shadow:
      0 25px 50px -12px rgba(99, 102, 241, 0.3),
      0 0 0 1px rgba(99, 102, 241, 0.1),
      inset 0 1px 0 rgba(255, 255, 255, 0.1);
  }

  .pricing-card.current {
    border-color: #6366f1;
    background:
      linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(15, 23, 42, 0.95) 100%);
    box-shadow:
      0 20px 40px -12px rgba(99, 102, 241, 0.4),
      0 0 0 1px rgba(99, 102, 241, 0.2),
      inset 0 1px 0 rgba(255, 255, 255, 0.1);
  }

  .pricing-card.recommended {
    border-color: #8b5cf6;
    transform: scale(1.05);
    box-shadow:
      0 25px 50px -12px rgba(139, 92, 246, 0.4),
      0 0 0 1px rgba(139, 92, 246, 0.2),
      inset 0 1px 0 rgba(255, 255, 255, 0.1);
  }

  .pricing-card.recommended:hover {
    transform: translateY(-10px) scale(1.07);
  }

  .badge {
    position: absolute;
    top: -14px;
    right: 28px;
    background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 50%, #6d28d9 100%);
    color: white;
    padding: 8px 20px;
    border-radius: 24px;
    font-size: 0.75rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    box-shadow:
      0 8px 20px rgba(139, 92, 246, 0.5),
      inset 0 1px 0 rgba(255, 255, 255, 0.2);
    animation: badgePulse 2s ease-in-out infinite;
  }

  @keyframes badgePulse {
    0%, 100% {
      box-shadow:
        0 8px 20px rgba(139, 92, 246, 0.5),
        inset 0 1px 0 rgba(255, 255, 255, 0.2);
    }
    50% {
      box-shadow:
        0 8px 30px rgba(139, 92, 246, 0.7),
        0 0 20px rgba(139, 92, 246, 0.4),
        inset 0 1px 0 rgba(255, 255, 255, 0.3);
    }
  }

  .pricing-card h4 {
    font-size: 1.6rem;
    font-weight: 800;
    background: linear-gradient(135deg, #ffffff 0%, #e0e7ff 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    margin: 0 0 20px 0;
    text-align: center;
    letter-spacing: -0.02em;
  }

  .price {
    text-align: center;
    margin-bottom: 28px;
  }

  .price .amount {
    font-size: 3.5rem;
    font-weight: 900;
    background: linear-gradient(135deg, #ffffff 0%, #a5b4fc 50%, #c4b5fd 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    line-height: 1;
    letter-spacing: -0.03em;
    filter: drop-shadow(0 2px 8px rgba(165, 180, 252, 0.3));
  }

  .price .period {
    font-size: 1.1rem;
    color: #94a3b8;
    margin-left: 6px;
    font-weight: 600;
  }

  .features-list {
    list-style: none;
    padding: 0;
    margin: 0 0 28px 0;
    flex: 1;
  }

  .features-list li {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 12px 4px;
    color: #e2e8f0;
    font-weight: 600;
    font-size: 0.95rem;
    border-bottom: 1px solid rgba(148, 163, 184, 0.1);
    transition: all 0.2s ease;
  }

  .features-list li:hover {
    color: #f1f5f9;
    padding-left: 8px;
  }

  .features-list li:last-child {
    border-bottom: none;
  }

  /* Enhanced Buttons */
  .btn-current,
  .btn-upgrade {
    width: 100%;
    padding: 16px 28px;
    border: none;
    border-radius: 14px;
    font-size: 1.05rem;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    overflow: hidden;
    letter-spacing: 0.3px;
  }

  .btn-current {
    background: rgba(148, 163, 184, 0.15);
    color: #94a3b8;
    cursor: not-allowed;
    border: 1px solid rgba(148, 163, 184, 0.2);
  }

  .btn-upgrade {
    background: linear-gradient(135deg, #6366f1 0%, #4f46e5 50%, #4338ca 100%);
    color: white;
    box-shadow:
      0 10px 30px rgba(99, 102, 241, 0.4),
      inset 0 1px 0 rgba(255, 255, 255, 0.2);
    border: 1px solid rgba(99, 102, 241, 0.5);
  }

  .btn-upgrade::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.2) 0%, transparent 50%, rgba(255, 255, 255, 0.2) 100%);
    transform: translateX(-100%) skewX(-15deg);
    transition: transform 0.6s;
  }

  .btn-upgrade:hover::before {
    transform: translateX(100%) skewX(-15deg);
  }

  .btn-upgrade:hover {
    transform: translateY(-3px);
    box-shadow:
      0 15px 40px rgba(99, 102, 241, 0.5),
      0 0 20px rgba(99, 102, 241, 0.3),
      inset 0 1px 0 rgba(255, 255, 255, 0.3);
  }

  .btn-upgrade:active {
    transform: translateY(-1px);
  }

  /* Enhanced Modal Styles */
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(10, 15, 30, 0.95);
    backdrop-filter: blur(24px) saturate(180%);
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    animation: modalFadeIn 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  }

  @keyframes modalFadeIn {
    from {
      opacity: 0;
      backdrop-filter: blur(0px);
    }
    to {
      opacity: 1;
      backdrop-filter: blur(24px) saturate(180%);
    }
  }

  .modal-content {
    background:
      linear-gradient(135deg, rgba(30, 41, 59, 0.98) 0%, rgba(15, 23, 42, 0.99) 100%);
    backdrop-filter: blur(40px) saturate(200%);
    border-radius: 28px;
    max-width: 520px;
    width: 100%;
    padding: 40px;
    box-shadow:
      0 30px 60px -12px rgba(0, 0, 0, 0.6),
      0 0 0 1px rgba(99, 102, 241, 0.2),
      inset 0 1px 0 rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(148, 163, 184, 0.2);
    animation: modalSlideUp 0.5s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    overflow: hidden;
  }

  .modal-content::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(90deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%);
  }

  @keyframes modalSlideUp {
    from {
      opacity: 0;
      transform: translateY(40px) scale(0.95);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  .modal-content h3 {
    text-align: center;
    margin-bottom: 28px;
    font-size: 2rem;
  }

  .upgrade-summary {
    text-align: center;
    margin-bottom: 36px;
    padding: 28px;
    background:
      linear-gradient(135deg, rgba(15, 23, 42, 0.8) 0%, rgba(30, 41, 59, 0.6) 100%);
    border-radius: 20px;
    border: 1px solid rgba(148, 163, 184, 0.2);
    box-shadow: inset 0 2px 8px rgba(0, 0, 0, 0.2);
  }

  .upgrade-summary p {
    color: #cbd5e1;
    font-size: 1.05rem;
    font-weight: 600;
    margin: 0 0 20px 0;
  }

  .price-summary {
    margin: 20px 0;
  }

  .price-summary .amount {
    font-size: 3.5rem;
    font-weight: 900;
    background: linear-gradient(135deg, #ffffff 0%, #a5b4fc 50%, #c4b5fd 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    letter-spacing: -0.03em;
    filter: drop-shadow(0 2px 8px rgba(165, 180, 252, 0.3));
  }

  .price-summary .period {
    font-size: 1.3rem;
    color: #94a3b8;
    margin-left: 6px;
    font-weight: 600;
  }

  .billing-info {
    color: #cbd5e1;
    font-size: 0.95rem;
    margin: 20px 0 0 0;
    font-weight: 600;
    line-height: 1.6;
  }

  .modal-actions {
    display: flex;
    gap: 14px;
    margin-bottom: 24px;
  }

  .btn-confirm,
  .btn-cancel {
    flex: 1;
    padding: 16px 28px;
    border: none;
    border-radius: 14px;
    font-size: 1.05rem;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    overflow: hidden;
    letter-spacing: 0.3px;
  }

  .btn-confirm {
    background: linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%);
    color: white;
    box-shadow:
      0 10px 30px rgba(16, 185, 129, 0.4),
      inset 0 1px 0 rgba(255, 255, 255, 0.2);
    border: 1px solid rgba(16, 185, 129, 0.5);
  }

  .btn-confirm::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.2) 0%, transparent 50%, rgba(255, 255, 255, 0.2) 100%);
    transform: translateX(-100%) skewX(-15deg);
    transition: transform 0.6s;
  }

  .btn-confirm:hover::before {
    transform: translateX(100%) skewX(-15deg);
  }

  .btn-confirm:hover {
    transform: translateY(-3px);
    box-shadow:
      0 15px 40px rgba(16, 185, 129, 0.5),
      0 0 20px rgba(16, 185, 129, 0.3),
      inset 0 1px 0 rgba(255, 255, 255, 0.3);
  }

  .btn-cancel {
    background: rgba(148, 163, 184, 0.1);
    border: 1px solid rgba(148, 163, 184, 0.25);
    color: #cbd5e1;
    backdrop-filter: blur(10px);
  }

  .btn-cancel:hover {
    background: rgba(148, 163, 184, 0.2);
    border-color: rgba(148, 163, 184, 0.35);
    transform: translateY(-3px);
    box-shadow: 0 8px 20px rgba(148, 163, 184, 0.15);
  }

  .btn-confirm:active,
  .btn-cancel:active {
    transform: translateY(-1px);
  }

  .terms {
    text-align: center;
    color: #64748b;
    font-size: 0.85rem;
    margin: 0;
    line-height: 1.5;
  }

  /* Responsive Design */
  @media (max-width: 1200px) {
    .pricing-cards {
      grid-template-columns: repeat(2, 1fr);
    }

    .pricing-card.recommended {
      transform: scale(1.02);
    }
  }

  @media (max-width: 1024px) {
    :host {
      padding: 24px;
    }

    h2 {
      font-size: 2.25rem;
    }

    .current-plan-card,
    .usage-metrics-card,
    .pricing-table {
      padding: 28px;
    }
  }

  @media (max-width: 768px) {
    :host {
      padding: 20px;
    }

    .subscription-container {
      gap: 24px;
    }

    h2 {
      font-size: 2rem;
    }

    h3 {
      font-size: 1.5rem;
    }

    .current-plan-card,
    .usage-metrics-card,
    .pricing-table {
      padding: 24px;
      border-radius: 20px;
    }

    .pricing-cards {
      grid-template-columns: 1fr;
      gap: 20px;
    }

    .pricing-card {
      padding: 28px;
    }

    .pricing-card.recommended {
      transform: scale(1);
    }

    .pricing-card:hover {
      transform: translateY(-6px);
    }

    .plan-features ul {
      grid-template-columns: 1fr;
    }

    .modal-actions {
      flex-direction: column;
    }

    .modal-content {
      padding: 32px;
    }

    .price .amount {
      font-size: 3rem;
    }

    .upgrade-summary .amount {
      font-size: 3rem;
    }
  }

  @media (max-width: 480px) {
    :host {
      padding: 16px;
    }

    .subscription-container {
      gap: 20px;
    }

    h2 {
      font-size: 1.75rem;
    }

    h3 {
      font-size: 1.35rem;
    }

    .current-plan-card,
    .usage-metrics-card,
    .pricing-table {
      padding: 20px;
      border-radius: 16px;
    }

    .plan-status {
      flex-direction: column;
      align-items: flex-start;
      gap: 12px;
      padding: 16px;
    }

    .pricing-card {
      padding: 24px;
    }

    .modal-content {
      padding: 24px;
      border-radius: 24px;
    }

    .price .amount,
    .upgrade-summary .amount {
      font-size: 2.5rem;
    }

    .btn-upgrade,
    .btn-confirm,
    .btn-cancel {
      padding: 14px 24px;
      font-size: 1rem;
    }
  }

  /* Loading States */
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }

  /* Accessibility Improvements */
  @media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
    }
  }

  /* Focus States for Accessibility */
  .btn-upgrade:focus,
  .btn-confirm:focus,
  .btn-cancel:focus {
    outline: 2px solid #6366f1;
    outline-offset: 2px;
  }

  .btn-upgrade:focus-visible,
  .btn-confirm:focus-visible,
  .btn-cancel:focus-visible {
    box-shadow:
      0 0 0 3px rgba(99, 102, 241, 0.3),
      0 10px 30px rgba(99, 102, 241, 0.4);
  }

  /* High Contrast Mode Support */
  @media (prefers-contrast: high) {
    .current-plan-card,
    .usage-metrics-card,
    .pricing-table,
    .pricing-card {
      border-width: 2px;
    }

    .btn-upgrade,
    .btn-confirm {
      border: 2px solid currentColor;
    }
  }
`;
