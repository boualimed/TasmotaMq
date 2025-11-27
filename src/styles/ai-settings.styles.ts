import { css } from 'lit';

export const aiSettings = css`
       :host {
         display: block;
       }

       .ai-section {
         background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
         border-radius: 12px;
         padding: 20px;
         margin-bottom: 20px;
         color: white;
       }

       .ai-header {
         display: flex;
         align-items: center;
         justify-content: space-between;
         margin-bottom: 15px;
       }

       .ai-title {
         font-size: 1.2rem;
         font-weight: 600;
         display: flex;
         align-items: center;
         gap: 10px;
       }

       .ai-status {
         display: flex;
         align-items: center;
         gap: 8px;
         padding: 6px 12px;
         background: rgba(255, 255, 255, 0.2);
         border-radius: 20px;
         font-size: 0.85rem;
       }

       .status-dot {
         width: 8px;
         height: 8px;
         border-radius: 50%;
         background: #ef4444;
         animation: pulse 2s infinite;
       }

       .status-dot.active {
         background: #10b981;
       }

       @keyframes pulse {
         0%, 100% { opacity: 1; }
         50% { opacity: 0.5; }
       }

       .form-group {
         margin-bottom: 15px;
       }

       .form-label {
         display: block;
         margin-bottom: 6px;
         font-size: 0.9rem;
         font-weight: 500;
         opacity: 0.95;
       }

       .form-input {
         width: 100%;
         padding: 10px 12px;
         border: 2px solid rgba(255, 255, 255, 0.3);
         border-radius: 8px;
         font-size: 0.95rem;
         background: rgba(255, 255, 255, 0.9);
         color: #1f2937;
         transition: all 0.2s;
       }

       .form-input:focus {
         outline: none;
         border-color: rgba(255, 255, 255, 0.8);
         background: white;
       }

       .form-input:disabled {
         opacity: 0.6;
         cursor: not-allowed;
       }

       .checkbox-group {
         display: flex;
         align-items: center;
         gap: 10px;
         margin-bottom: 15px;
       }

       .checkbox {
         width: 20px;
         height: 20px;
         cursor: pointer;
       }

       .button-group {
         display: flex;
         gap: 10px;
         margin-top: 15px;
       }

       .button {
         flex: 1;
         padding: 10px 16px;
         border: none;
         border-radius: 8px;
         font-size: 0.95rem;
         font-weight: 500;
         cursor: pointer;
         transition: all 0.2s;
         display: flex;
         align-items: center;
         justify-content: center;
         gap: 8px;
       }

       .button.primary {
         background: white;
         color: #667eea;
       }

       .button.primary:hover {
         background: #f3f4f6;
         transform: translateY(-1px);
       }

       .button.secondary {
         background: rgba(255, 255, 255, 0.2);
         color: white;
         border: 2px solid rgba(255, 255, 255, 0.3);
       }

       .button.secondary:hover {
         background: rgba(255, 255, 255, 0.3);
       }

       .button:disabled {
         opacity: 0.5;
         cursor: not-allowed;
         transform: none !important;
       }

       .help-text {
         font-size: 0.8rem;
         opacity: 0.9;
         margin-top: 5px;
         line-height: 1.4;
       }

       .model-selector {
         display: grid;
         grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
         gap: 10px;
         margin-top: 10px;
       }

       .model-option {
         padding: 10px;
         background: rgba(255, 255, 255, 0.2);
         border: 2px solid rgba(255, 255, 255, 0.3);
         border-radius: 8px;
         cursor: pointer;
         text-align: center;
         transition: all 0.2s;
         font-size: 0.9rem;
       }

       .model-option:hover {
         background: rgba(255, 255, 255, 0.3);
       }

       .model-option.selected {
         background: white;
         color: #667eea;
         border-color: white;
         font-weight: 600;
       }

       .info-banner {
         background: rgba(255, 255, 255, 0.15);
         border-radius: 8px;
         padding: 12px;
         margin-bottom: 15px;
         font-size: 0.85rem;
         line-height: 1.5;
       }

       .info-banner code {
         background: rgba(0, 0, 0, 0.2);
         padding: 2px 6px;
         border-radius: 4px;
         font-family: monospace;
       }
     `;