import { css } from 'lit';

export const shieldDashStyles = css`

    :host {
      display: block;
    }

    .dashboard {
      padding: 20px;
      background: var(--surface, #ffffff);
      border-radius: 8px;
    }

    .dashboard-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 2px solid #e0e0e0;
    }

    .dashboard-header h2 {
      margin: 0;
      font-size: 24px;
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .auto-refresh-toggle {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 14px;
      cursor: pointer;
    }

    .header-actions button {
      padding: 8px 16px;
      background: var(--primary, #4a90e2);
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
    }

    .tabs {
      display: flex;
      gap: 8px;
      margin-bottom: 24px;
      border-bottom: 2px solid #e0e0e0;
    }

    .tab {
      padding: 12px 24px;
      background: none;
      border: none;
      border-bottom: 3px solid transparent;
      cursor: pointer;
      font-size: 15px;
      font-weight: 500;
      color: #666;
      transition: all 0.2s;
    }

    .tab:hover {
      color: var(--primary, #4a90e2);
      background: #f5f5f5;
    }

    .tab.active {
      color: var(--primary, #4a90e2);
      border-bottom-color: var(--primary, #4a90e2);
    }

    .tab-content {
      min-height: 400px;
    }

    /* Overview Tab */
    .overview {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .status-section h3,
    .activity-section h3,
    .stats-section h3 {
      margin: 0 0 16px 0;
      font-size: 18px;
    }

    .status-cards,
    .activity-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
    }

    .status-card,
    .activity-card {
      padding: 20px;
      background: white;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      text-align: center;
    }

    .status-card.success,
    .activity-card.success {
      border-color: #00aa00;
      background: #f0fff0;
    }

    .status-card.warning {
      border-color: #ff8800;
      background: #fff8f0;
    }

    .status-card.error {
      border-color: #ff0000;
      background: #fff0f0;
    }

    .status-card.critical {
      border-color: #ff0000;
      background: #ffe0e0;
      animation: pulse 1.5s infinite;
    }

    .card-icon,
    .activity-icon {
      font-size: 32px;
      margin-bottom: 8px;
    }

    .card-label,
    .activity-label {
      font-size: 13px;
      color: #666;
      margin-bottom: 4px;
    }

    .card-value,
    .activity-value {
      font-size: 20px;
      font-weight: bold;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 12px;
    }

    .stat-card {
      padding: 16px;
      background: white;
      border: 1px solid #e0e0e0;
      border-left: 4px solid #4a90e2;
      border-radius: 6px;
    }

    .stat-card.warning {
      border-left-color: #ff8800;
    }

    .stat-card.error {
      border-left-color: #ff0000;
    }

    .stat-label {
      font-size: 12px;
      color: #666;
      margin-bottom: 4px;
    }

    .stat-value {
      font-size: 24px;
      font-weight: bold;
    }

    .stat-value.small {
      font-size: 14px;
    }

    /* Metrics Tab */
    .metrics {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
    }

    .metric-card {
      padding: 20px;
      background: white;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
    }

    .metric-card.success {
      border-color: #00aa00;
    }

    .metric-card.warning {
      border-color: #ff8800;
    }

    .metric-card.error {
      border-color: #ff0000;
    }

    .metric-label {
      font-size: 13px;
      color: #666;
      margin-bottom: 8px;
    }

    .metric-value {
      font-size: 28px;
      font-weight: bold;
      margin-bottom: 4px;
    }

    .metric-value.large {
      font-size: 36px;
      color: var(--primary, #4a90e2);
    }

    .metric-subtitle {
      font-size: 12px;
      color: #999;
    }

    .rate-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 16px;
    }

    .rate-card {
      padding: 24px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border-radius: 8px;
      text-align: center;
    }

    .rate-icon {
      font-size: 36px;
      margin-bottom: 12px;
    }

    .rate-label {
      font-size: 14px;
      opacity: 0.9;
      margin-bottom: 8px;
    }

    .rate-value {
      font-size: 32px;
      font-weight: bold;
      margin-bottom: 4px;
    }

    .rate-subtitle {
      font-size: 12px;
      opacity: 0.8;
    }

    /* Devices Tab */
    .devices {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .devices-stats {
      display: flex;
      gap: 24px;
    }

    .device-stat {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 12px 24px;
      background: white;
      border: 2px solid #e0e0e0;
      border-radius: 6px;
    }

    .device-stat.success {
      border-color: #00aa00;
    }

    .device-stat .label {
      font-size: 12px;
      color: #666;
      margin-bottom: 4px;
    }

    .device-stat .value {
      font-size: 24px;
      font-weight: bold;
    }

    .devices-table {
      background: white;
      border: 1px solid #e0e0e0;
      border-radius: 6px;
      overflow: hidden;
    }

    .table-header,
    .table-row {
      display: grid;
      grid-template-columns: 2fr 1fr 1fr 1fr 100px;
      gap: 16px;
      padding: 16px;
      align-items: center;
    }

    .table-header {
      background: #f5f5f5;
      font-weight: 600;
      font-size: 13px;
      color: #666;
      border-bottom: 2px solid #e0e0e0;
    }

    .table-row {
      border-bottom: 1px solid #f0f0f0;
      transition: background 0.2s;
    }

    .table-row:hover {
      background: #f8f8f8;
    }

    .table-row:last-child {
      border-bottom: none;
    }

    .device-icon {
      margin-right: 8px;
      font-size: 18px;
    }

    .status-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 500;
    }

    .status-badge.online {
      background: #e8f5e9;
      color: #2e7d32;
    }

    .status-badge.offline {
      background: #f5f5f5;
      color: #666;
    }

    .action-btn {
      padding: 6px 12px;
      background: var(--primary, #4a90e2);
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 16px;
    }

    .action-btn:hover {
      opacity: 0.8;
    }

    .empty-state {
      padding: 60px;
      text-align: center;
      color: #999;
      font-size: 16px;
    }

    /* Settings Tab */
    .settings {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .settings h3 {
      margin: 0 0 16px 0;
      font-size: 20px;
    }

    .settings h4 {
      margin: 0 0 12px 0;
      font-size: 16px;
      color: #666;
    }

    .settings-info {
      padding: 16px;
      background: #e3f2fd;
      border-left: 4px solid #2196f3;
      border-radius: 4px;
      color: #1565c0;
    }

    .settings-info p {
      margin: 0;
    }

    .settings-section {
      padding: 20px;
      background: white;
      border: 1px solid #e0e0e0;
      border-radius: 6px;
    }

    .setting-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 0;
      border-bottom: 1px solid #f0f0f0;
    }

    .setting-item:last-child {
      border-bottom: none;
    }

    .setting-label {
      font-weight: 500;
      color: #333;
    }

    .setting-value {
      font-weight: 600;
    }

    .setting-value.success {
      color: #00aa00;
    }

    .setting-value.error {
      color: #ff0000;
    }

    .info-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 16px;
    }

    .info-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding: 12px;
      background: #f8f8f8;
      border-radius: 4px;
    }

    .info-label {
      font-size: 12px;
      color: #666;
    }

    .info-value {
      font-size: 15px;
      font-weight: 500;
      color: #333;
    }

    .settings-actions {
      display: flex;
      gap: 12px;
      padding: 16px;
      background: #f5f5f5;
      border-radius: 6px;
    }

    .settings-actions button {
      padding: 10px 20px;
      background: var(--primary, #4a90e2);
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
    }

    .settings-actions button:hover {
      opacity: 0.9;
    }

    /* Loading State */
    .loading {
      padding: 60px;
      text-align: center;
      color: #999;
      font-size: 16px;
    }

    /* Animations */
    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.8; transform: scale(0.98); }
    }

    /* Responsive */
    @media (max-width: 768px) {
      .dashboard {
        padding: 12px;
      }

      .dashboard-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 12px;
      }

      .tabs {
        overflow-x: auto;
      }

      .tab {
        white-space: nowrap;
        padding: 10px 16px;
      }

      .status-cards,
      .activity-cards,
      .metrics-grid,
      .rate-grid,
      .stats-grid {
        grid-template-columns: 1fr;
      }

      .table-header,
      .table-row {
        grid-template-columns: 1fr;
        gap: 8px;
      }

      .col-type,
      .col-status {
        display: none;
      }

      .settings-actions {
        flex-direction: column;
      }

      .settings-actions button {
        width: 100%;
      }
    }
  `;