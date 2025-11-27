import { css } from 'lit';

export const indexdbStyles = css`
  :host {
    display: block;
  }

  /* Modern Modal Overlay with backdrop blur */
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(15, 23, 42, 0.95);
    backdrop-filter: blur(20px);
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    animation: fadeIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
      backdrop-filter: blur(0px);
    }
    to {
      opacity: 1;
      backdrop-filter: blur(20px);
    }
  }

  /* Enhanced Modal Content */
  .modal-content {
    background: linear-gradient(135deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.98) 100%);
    backdrop-filter: blur(40px);
    border-radius: 24px;
    max-width: 1400px;
    width: 100%;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    box-shadow:
      0 25px 50px -12px rgba(0, 0, 0, 0.5),
      0 0 0 1px rgba(148, 163, 184, 0.1),
      inset 0 1px 0 rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(148, 163, 184, 0.2);
    overflow: hidden;
    animation: slideUp 0.4s cubic-bezier(0.4, 0, 0.2, 1);
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

  /* Modern Header */
  .modal-header {
    padding: 28px 32px;
    border-bottom: 1px solid rgba(148, 163, 184, 0.2);
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: rgba(30, 41, 59, 0.8);
    backdrop-filter: blur(20px);
  }

  .modal-title {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .modal-title h2 {
    margin: 0;
    font-size: 1.75rem;
    font-weight: 800;
    background: linear-gradient(135deg, #ffffff 0%, #e0e7ff 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    letter-spacing: -0.02em;
  }

  .device-icon {
    font-size: 2.5rem;
    background: linear-gradient(135deg, #3b82f6 0%, #6366f1 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .close-btn {
    background: rgba(148, 163, 184, 0.1);
    border: 1px solid rgba(148, 163, 184, 0.2);
    color: #94a3b8;
    width: 44px;
    height: 44px;
    border-radius: 12px;
    cursor: pointer;
    font-size: 1.25rem;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    overflow: hidden;
  }

  .close-btn::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
    transition: left 0.5s;
  }

  .close-btn:hover {
    background: rgba(239, 68, 68, 0.1);
    border-color: rgba(239, 68, 68, 0.3);
    color: #fca5a5;
    transform: scale(1.1) rotate(90deg);
  }

  .close-btn:hover::before {
    left: 100%;
  }

  /* Enhanced Modal Body */
  .modal-body {
    padding: 32px;
    overflow-y: auto;
    flex: 1;
    background:
      radial-gradient(circle at 20% 80%, rgba(59, 130, 246, 0.03) 0%, transparent 50%),
      radial-gradient(circle at 80% 20%, rgba(139, 92, 246, 0.03) 0%, transparent 50%);
  }

  /* Modern Controls */
  .controls {
    display: flex;
    gap: 16px;
    margin-bottom: 32px;
    flex-wrap: wrap;
    align-items: center;
  }

  .time-range-selector {
    display: flex;
    gap: 4px;
    background: rgba(15, 23, 42, 0.6);
    padding: 6px;
    border-radius: 14px;
    border: 1px solid rgba(148, 163, 184, 0.2);
    backdrop-filter: blur(10px);
  }

  .time-btn {
    background: transparent;
    border: none;
    color: #64748b;
    padding: 10px 20px;
    border-radius: 10px;
    cursor: pointer;
    font-size: 0.9rem;
    font-weight: 600;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    overflow: hidden;
  }

  .time-btn::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(59, 130, 246, 0.1), transparent);
    transition: left 0.5s;
  }

  .time-btn:hover {
    color: #e2e8f0;
    background: rgba(59, 130, 246, 0.1);
    transform: translateY(-1px);
  }

  .time-btn:hover::before {
    left: 100%;
  }

  .time-btn.active {
    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
    color: white;
    box-shadow: 0 4px 16px rgba(59, 130, 246, 0.3);
  }

  .field-selector {
    display: flex;
    gap: 12px;
    align-items: center;
  }

  .field-selector select {
    background: rgba(15, 23, 42, 0.6);
    border: 1px solid rgba(148, 163, 184, 0.2);
    color: #e2e8f0;
    padding: 10px 16px;
    border-radius: 10px;
    font-size: 0.9rem;
    cursor: pointer;
    transition: all 0.3s ease;
    backdrop-filter: blur(10px);
  }

  .field-selector select:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  .field-selector select option {
    background: #1e293b;
    color: #e2e8f0;
  }

  /* Enhanced Statistics Cards */
  .statistics {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 20px;
    margin-bottom: 32px;
  }

  .stat-card {
    background: linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.9) 100%);
    backdrop-filter: blur(20px);
    padding: 24px;
    border-radius: 16px;
    border: 1px solid rgba(148, 163, 184, 0.2);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    overflow: hidden;
  }

  .stat-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: linear-gradient(90deg, #3b82f6, #8b5cf6);
    transform: scaleX(0);
    transition: transform 0.3s ease;
  }

  .stat-card:hover {
    transform: translateY(-4px);
    border-color: rgba(59, 130, 246, 0.4);
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.3);
  }

  .stat-card:hover::before {
    transform: scaleX(1);
  }

  .stat-label {
    font-size: 0.8rem;
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 8px;
    font-weight: 600;
  }

  .stat-value {
    font-size: 2rem;
    font-weight: 800;
    color: #f1f5f9;
    line-height: 1;
  }

  /* Modern Data Table */
  .data-table {
    background: rgba(15, 23, 42, 0.6);
    backdrop-filter: blur(20px);
    border-radius: 16px;
    overflow: hidden;
    border: 1px solid rgba(148, 163, 184, 0.2);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  }

  .table-header {
    display: grid;
    grid-template-columns: 200px 1fr 140px;
    gap: 20px;
    padding: 20px 24px;
    background: rgba(30, 41, 59, 0.8);
    font-weight: 700;
    font-size: 0.85rem;
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    border-bottom: 1px solid rgba(148, 163, 184, 0.2);
  }

  .table-body {
    max-height: 400px;
    overflow-y: auto;
  }

  .table-row {
    display: grid;
    grid-template-columns: 200px 1fr 140px;
    gap: 20px;
    padding: 18px 24px;
    border-bottom: 1px solid rgba(148, 163, 184, 0.1);
    transition: all 0.2s ease;
    position: relative;
  }

  .table-row:last-child {
    border-bottom: none;
  }

  .table-row:hover {
    background: rgba(59, 130, 246, 0.05);
    transform: translateX(4px);
  }

  .table-row::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 3px;
    background: linear-gradient(to bottom, #3b82f6, #8b5cf6);
    opacity: 0;
    transition: opacity 0.3s ease;
  }

  .table-row:hover::before {
    opacity: 1;
  }

  .timestamp {
    color: #cbd5e1;
    font-family: 'Courier New', monospace;
    font-size: 0.9rem;
    font-weight: 500;
  }

  .data-value {
    color: #f1f5f9;
    font-family: 'Courier New', monospace;
    font-size: 0.9rem;
    word-break: break-all;
    font-weight: 500;
  }

  /* Enhanced Badges */
  .data-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 6px 14px;
    border-radius: 10px;
    font-size: 0.8rem;
    font-weight: 700;
    letter-spacing: 0.5px;
    text-transform: uppercase;
    backdrop-filter: blur(10px);
    border: 1px solid;
    transition: all 0.3s ease;
  }

  .badge-success {
    background: rgba(16, 185, 129, 0.15);
    color: #6ee7b7;
    border-color: rgba(16, 185, 129, 0.3);
  }

  .badge-warning {
    background: rgba(251, 191, 36, 0.15);
    color: #fcd34d;
    border-color: rgba(251, 191, 36, 0.3);
  }

  .badge-info {
    background: rgba(59, 130, 246, 0.15);
    color: #93c5fd;
    border-color: rgba(59, 130, 246, 0.3);
  }

  /* Enhanced Loading States */
  .loading {
    text-align: center;
    padding: 60px 32px;
    color: #64748b;
  }

  .spinner {
    width: 56px;
    height: 56px;
    border: 3px solid rgba(59, 130, 246, 0.1);
    border-top-color: #3b82f6;
    border-right-color: #8b5cf6;
    border-radius: 50%;
    animation: spin 1s cubic-bezier(0.68, -0.55, 0.265, 1.55) infinite;
    margin: 0 auto 20px;
    box-shadow: 0 0 20px rgba(59, 130, 246, 0.3);
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  /* Enhanced Empty State */
  .empty-state {
    text-align: center;
    padding: 60px 32px;
    color: #64748b;
  }

  .empty-icon {
    font-size: 4rem;
    margin-bottom: 20px;
    opacity: 0.4;
    background: linear-gradient(135deg, #64748b 0%, #475569 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .empty-state h3 {
    color: #94a3b8;
    margin: 0 0 12px 0;
    font-size: 1.25rem;
    font-weight: 600;
  }

  .empty-state p {
    color: #64748b;
    margin: 0;
    font-size: 0.95rem;
  }

  /* Modern Action Buttons */
  .action-buttons {
    display: flex;
    gap: 12px;
    margin-top: 24px;
    flex-wrap: wrap;
  }

  .btn {
    background: rgba(30, 41, 59, 0.8);
    border: 1px solid rgba(148, 163, 184, 0.2);
    color: #e2e8f0;
    padding: 12px 20px;
    border-radius: 12px;
    cursor: pointer;
    font-size: 0.9rem;
    font-weight: 600;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    display: flex;
    align-items: center;
    gap: 8px;
    backdrop-filter: blur(10px);
    position: relative;
    overflow: hidden;
  }

  .btn::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
    transition: left 0.5s;
  }

  .btn:hover::before {
    left: 100%;
  }

  .btn:hover {
    background: rgba(30, 41, 59, 0.9);
    border-color: rgba(148, 163, 184, 0.3);
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
  }

  .btn-danger {
    background: rgba(239, 68, 68, 0.1);
    border-color: rgba(239, 68, 68, 0.3);
    color: #fca5a5;
  }

  .btn-danger:hover {
    background: rgba(239, 68, 68, 0.2);
    border-color: rgba(239, 68, 68, 0.4);
    box-shadow: 0 8px 24px rgba(239, 68, 68, 0.2);
  }

  .btn-primary {
    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
    border: none;
    color: white;
    box-shadow: 0 4px 16px rgba(59, 130, 246, 0.3);
  }

  .btn-primary:hover {
    background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
    box-shadow: 0 8px 24px rgba(59, 130, 246, 0.4);
    transform: translateY(-2px);
  }

  /* Enhanced Scrollbar Styling */
  .modal-body::-webkit-scrollbar,
  .table-body::-webkit-scrollbar {
    width: 8px;
  }

  .modal-body::-webkit-scrollbar-track,
  .table-body::-webkit-scrollbar-track {
    background: rgba(15, 23, 42, 0.4);
    border-radius: 4px;
  }

  .modal-body::-webkit-scrollbar-thumb,
  .table-body::-webkit-scrollbar-thumb {
    background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
    border-radius: 4px;
    border: 2px solid rgba(15, 23, 42, 0.4);
  }

  .modal-body::-webkit-scrollbar-thumb:hover,
  .table-body::-webkit-scrollbar-thumb:hover {
    background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%);
  }

  /* Responsive Design */
  @media (max-width: 1024px) {
    .modal-content {
      max-width: 95vw;
    }
  }

  @media (max-width: 768px) {
    .modal-overlay {
      padding: 16px;
    }

    .modal-content {
      max-height: 95vh;
      border-radius: 20px;
    }

    .modal-header {
      padding: 24px;
    }

    .modal-body {
      padding: 24px;
    }

    .table-header,
    .table-row {
      grid-template-columns: 1fr;
      gap: 12px;
      padding: 16px;
    }

    .statistics {
      grid-template-columns: 1fr;
      gap: 16px;
    }

    .controls {
      flex-direction: column;
      align-items: stretch;
    }

    .time-range-selector {
      width: 100%;
      justify-content: space-between;
    }

    .field-selector {
      width: 100%;
    }

    .field-selector select {
      width: 100%;
    }

    .action-buttons {
      flex-direction: column;
    }

    .btn {
      width: 100%;
      justify-content: center;
    }
  }

  @media (max-width: 480px) {
    .modal-header {
      padding: 20px;
    }

    .modal-body {
      padding: 20px;
    }

    .stat-card {
      padding: 20px;
    }

    .stat-value {
      font-size: 1.75rem;
    }
  }

  /* Performance optimizations */
  .modal-overlay {
    will-change: backdrop-filter, opacity;
  }

  .modal-content {
    will-change: transform, opacity;
  }

  .stat-card,
  .table-row {
    will-change: transform;
  }
`;