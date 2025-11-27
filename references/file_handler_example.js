// File Handler Implementation for Tasmota MQTT Manager
// Add this to your main application JavaScript

// ===========================
// File Handler Setup
// ===========================

/**
 * Initialize file handler support
 * Call this when your app loads
 */
function initFileHandlers() {
  // Check if File Handling API is supported
  if ('launchQueue' in window) {
    console.log('File Handling API supported');
    
    // Set up the launch queue consumer
    window.launchQueue.setConsumer(async (launchParams) => {
      console.log('Launch params received:', launchParams);
      
      // Handle files if present
      if (launchParams.files && launchParams.files.length > 0) {
        await handleLaunchedFiles(launchParams.files);
      }
      
      // Handle target URL (for protocol handlers)
      if (launchParams.targetURL) {
        handleProtocolLaunch(launchParams.targetURL);
      }
    });
  } else {
    console.log('File Handling API not supported');
    
    // Fallback: Check URL parameters for file actions
    const params = new URLSearchParams(window.location.search);
    const action = params.get('action');
    
    if (action === 'add-device' || action === 'open-config') {
      showFileUploadDialog(action);
    }
  }
}

// ===========================
// Handle Launched Files
// ===========================

/**
 * Process files opened through the File Handler API
 * @param {FileSystemFileHandle[]} fileHandles - Array of file handles
 */
async function handleLaunchedFiles(fileHandles) {
  try {
    for (const fileHandle of fileHandles) {
      const file = await fileHandle.getFile();
      console.log('Processing file:', file.name, 'Type:', file.type);
      
      // Route based on file type
      if (file.type === 'application/json' || file.name.endsWith('.json')) {
        await handleConfigFile(file);
      } else if (file.type === 'text/plain' || 
                 file.name.endsWith('.conf') || 
                 file.name.endsWith('.config')) {
        await handleConfigFile(file);
      } else if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
        await handleDeviceImport(file);
      } else if (file.name.endsWith('.yaml') || file.name.endsWith('.yml')) {
        await handleYamlConfig(file);
      } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        await handleExcelImport(file);
      }
    }
    
    // Show success notification
    showNotification('Files processed successfully', 'success');
  } catch (error) {
    console.error('Error handling files:', error);
    showNotification('Error processing files: ' + error.message, 'error');
  }
}

// ===========================
// Config File Handlers
// ===========================

/**
 * Handle JSON/text configuration files
 * @param {File} file - The configuration file
 */
async function handleConfigFile(file) {
  const text = await file.text();
  
  try {
    // Try to parse as JSON
    const config = JSON.parse(text);
    console.log('Parsed config:', config);
    
    // Validate config structure
    if (validateConfig(config)) {
      applyConfiguration(config);
      showNotification(`Configuration loaded from ${file.name}`, 'success');
    } else {
      throw new Error('Invalid configuration structure');
    }
  } catch (jsonError) {
    // If JSON parse fails, try as plain text config
    console.log('Not JSON, parsing as text config');
    const config = parseTextConfig(text);
    
    if (config) {
      applyConfiguration(config);
      showNotification(`Configuration loaded from ${file.name}`, 'success');
    } else {
      throw new Error('Unable to parse configuration file');
    }
  }
}

/**
 * Handle YAML configuration files
 * @param {File} file - The YAML configuration file
 */
async function handleYamlConfig(file) {
  const text = await file.text();
  
  // You would need a YAML parser library for production use
  // For demo purposes, this is a placeholder
  console.log('YAML config:', text);
  
  // Example: Convert simple YAML to JSON
  const config = simpleYamlToJson(text);
  
  if (validateConfig(config)) {
    applyConfiguration(config);
    showNotification(`YAML configuration loaded from ${file.name}`, 'success');
  } else {
    throw new Error('Invalid YAML configuration');
  }
}

// ===========================
// Device Import Handlers
// ===========================

/**
 * Handle CSV device import
 * @param {File} file - The CSV file
 */
async function handleDeviceImport(file) {
  const text = await file.text();
  const devices = parseCSV(text);
  
  console.log('Parsed devices:', devices);
  
  if (devices.length > 0) {
    // Show import preview dialog
    showImportPreview(devices, () => {
      // On confirm
      importDevices(devices);
      showNotification(`${devices.length} devices imported from ${file.name}`, 'success');
    });
  } else {
    throw new Error('No valid devices found in CSV');
  }
}

/**
 * Handle Excel device import
 * @param {File} file - The Excel file
 */
async function handleExcelImport(file) {
  // You would need a library like SheetJS for production use
  console.log('Excel import from:', file.name);
  
  const arrayBuffer = await file.arrayBuffer();
  
  // Example using SheetJS (if available)
  if (typeof XLSX !== 'undefined') {
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const devices = XLSX.utils.sheet_to_json(firstSheet);
    
    if (devices.length > 0) {
      showImportPreview(devices, () => {
        importDevices(devices);
        showNotification(`${devices.length} devices imported from ${file.name}`, 'success');
      });
    }
  } else {
    showNotification('Excel import requires SheetJS library', 'error');
  }
}

// ===========================
// Protocol Handler
// ===========================

/**
 * Handle protocol launches (mqtt://, web+tasmota://)
 * @param {string} url - The protocol URL
 */
function handleProtocolLaunch(url) {
  const parsedUrl = new URL(url);
  console.log('Protocol launch:', parsedUrl.protocol, parsedUrl.href);
  
  if (parsedUrl.protocol === 'mqtt:') {
    // Extract MQTT connection details
    const broker = parsedUrl.hostname;
    const port = parsedUrl.port || 1883;
    const topic = parsedUrl.pathname.substring(1);
    
    // Open MQTT connection dialog with pre-filled details
    openMqttConnectionDialog({ broker, port, topic });
  } else if (parsedUrl.protocol === 'web+tasmota:') {
    // Handle custom Tasmota protocol
    const deviceId = parsedUrl.searchParams.get('device');
    if (deviceId) {
      navigateToDevice(deviceId);
    }
  }
}

// ===========================
// Helper Functions
// ===========================

/**
 * Validate configuration object
 * @param {Object} config - Configuration to validate
 * @returns {boolean} True if valid
 */
function validateConfig(config) {
  // Add your validation logic
  return config && (config.devices || config.settings || config.rules);
}

/**
 * Apply configuration to app
 * @param {Object} config - Configuration object
 */
function applyConfiguration(config) {
  if (config.devices) {
    console.log('Applying device configuration...');
    // Update devices
  }
  
  if (config.settings) {
    console.log('Applying settings...');
    // Update settings
  }
  
  if (config.rules) {
    console.log('Applying automation rules...');
    // Update rules
  }
  
  // Trigger UI update
  updateUI();
}

/**
 * Parse text-based config file
 * @param {string} text - Config file content
 * @returns {Object} Parsed configuration
 */
function parseTextConfig(text) {
  const config = {};
  const lines = text.split('\n');
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, value] = trimmed.split('=').map(s => s.trim());
      if (key && value) {
        config[key] = value;
      }
    }
  }
  
  return Object.keys(config).length > 0 ? config : null;
}

/**
 * Simple YAML to JSON converter (basic implementation)
 * For production, use a proper YAML parser
 * @param {string} yaml - YAML content
 * @returns {Object} JSON object
 */
function simpleYamlToJson(yaml) {
  const config = {};
  const lines = yaml.split('\n');
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, value] = trimmed.split(':').map(s => s.trim());
      if (key && value) {
        config[key] = value.replace(/['"]/g, '');
      }
    }
  }
  
  return config;
}

/**
 * Parse CSV content
 * @param {string} csv - CSV content
 * @returns {Array} Array of device objects
 */
function parseCSV(csv) {
  const lines = csv.split('\n').filter(line => line.trim());
  if (lines.length < 2) return [];
  
  const headers = lines[0].split(',').map(h => h.trim());
  const devices = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    const device = {};
    
    headers.forEach((header, index) => {
      device[header] = values[index] || '';
    });
    
    devices.push(device);
  }
  
  return devices;
}

/**
 * Show import preview dialog
 * @param {Array} devices - Devices to import
 * @param {Function} onConfirm - Callback on confirmation
 */
function showImportPreview(devices, onConfirm) {
  // Create and show preview dialog
  const dialog = document.createElement('dialog');
  dialog.innerHTML = `
    <h2>Import Preview</h2>
    <p>Found ${devices.length} device(s) to import:</p>
    <ul>
      ${devices.slice(0, 5).map(d => `<li>${d.name || d.id || 'Unnamed'}</li>`).join('')}
      ${devices.length > 5 ? `<li>... and ${devices.length - 5} more</li>` : ''}
    </ul>
    <button id="confirm-import">Import</button>
    <button id="cancel-import">Cancel</button>
  `;
  
  document.body.appendChild(dialog);
  dialog.showModal();
  
  dialog.querySelector('#confirm-import').addEventListener('click', () => {
    onConfirm();
    dialog.close();
    dialog.remove();
  });
  
  dialog.querySelector('#cancel-import').addEventListener('click', () => {
    dialog.close();
    dialog.remove();
  });
}

/**
 * Import devices into the system
 * @param {Array} devices - Devices to import
 */
function importDevices(devices) {
  console.log('Importing devices:', devices);
  // Add your device import logic here
  // This would typically involve:
  // 1. Validating each device
  // 2. Adding to your device list
  // 3. Updating the UI
  // 4. Saving to storage
}

/**
 * Show notification to user
 * @param {string} message - Message to display
 * @param {string} type - Notification type (success, error, info)
 */
function showNotification(message, type = 'info') {
  // Create notification element
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 15px 20px;
    background: ${type === 'success' ? '#4ade80' : type === 'error' ? '#f87171' : '#60a5fa'};
    color: white;
    border-radius: 8px;
    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    z-index: 10000;
    animation: slideIn 0.3s ease-out;
  `;
  
  document.body.appendChild(notification);
  
  // Remove after 5 seconds
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease-out';
    setTimeout(() => notification.remove(), 300);
  }, 5000);
}

/**
 * Show file upload dialog as fallback
 * @param {string} action - Action type
 */
function showFileUploadDialog(action) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = action === 'add-device' ? '.csv,.xls,.xlsx' : '.json,.conf,.config,.yaml,.yml';
  
  input.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) {
      await handleLaunchedFiles([{ getFile: async () => file }]);
    }
  });
  
  input.click();
}

/**
 * Navigate to device page
 * @param {string} deviceId - Device ID
 */
function navigateToDevice(deviceId) {
  console.log('Navigating to device:', deviceId);
  window.location.href = `/?device=${deviceId}`;
}

/**
 * Open MQTT connection dialog
 * @param {Object} details - Connection details
 */
function openMqttConnectionDialog(details) {
  console.log('Opening MQTT dialog with:', details);
  // Show your MQTT connection dialog with pre-filled values
}

/**
 * Update UI after configuration changes
 */
function updateUI() {
  console.log('Updating UI...');
  // Refresh your UI components
}

// ===========================
// Initialize on Page Load
// ===========================

// Call this when your app loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initFileHandlers);
} else {
  initFileHandlers();
}

// Also handle dynamic imports
window.addEventListener('load', () => {
  console.log('File handler support initialized');
});