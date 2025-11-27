import { notificationService } from './notification.service';
import { logger } from '../utils/logger.util';

export interface OllamaConfig {
  host: string;
  port: number;
  model: string;
  enabled: boolean;
  autoAnalyze: boolean;
  analysisInterval: number; // in seconds
}

export const DEFAULT_OLLAMA_CONFIG: OllamaConfig = {
  host: 'localhost',
  port: 11434,
  model: 'llama3.2',
  enabled: false,
  autoAnalyze: true,
  analysisInterval: 60 // Analyze every 60 seconds
};

export interface DeviceContext {
  deviceId: string;
  deviceName: string;
  deviceType: 'switch' | 'sensor'| 'dimmer' | 'shutter';
  topic: string;
  data: any;
  timestamp: Date;
  previousData?: any;
}

export interface AIAnalysis {
  decision: string;
  recommendation?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
}

export class OllamaAIService {
  private config: OllamaConfig = { ...DEFAULT_OLLAMA_CONFIG };
  private analysisQueue: DeviceContext[] = [];
  private isAnalyzing = false;
  private analysisTimer: any = null;
  private deviceDataBuffer: Map<string, DeviceContext[]> = new Map();
  private configListeners: Set<(config: OllamaConfig) => void> = new Set();

  /**
   * Initialize the AI service with configuration
   */
  async initialize(config: Partial<OllamaConfig>): Promise<void> {
    this.config = { ...this.config, ...config };

    if (this.config.enabled && this.config.autoAnalyze) {
      this.startAutoAnalysis();
    }

    logger.addLog('info', `Ollama AI service initialized: ${this.config.enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Update configuration
   */
  async updateConfig(config: Partial<OllamaConfig>): Promise<void> {
    const wasEnabled = this.config.enabled;
    this.config = { ...this.config, ...config };

    // Save to storage immediately
    this.saveConfig();

    // Notify listeners
    this.notifyConfigListeners();

    if (this.config.enabled && !wasEnabled && this.config.autoAnalyze) {
      this.startAutoAnalysis();
    } else if (!this.config.enabled && wasEnabled) {
      this.stopAutoAnalysis();
    }
  }

  /**
   * Subscribe to config changes
   */
  onConfigChange(listener: (config: OllamaConfig) => void): () => void {
    this.configListeners.add(listener);
    // Immediately notify with current config
    listener(this.config);
    return () => this.configListeners.delete(listener);
  }

  /**
   * Notify config listeners
   */
  private notifyConfigListeners(): void {
    this.configListeners.forEach(listener => listener({ ...this.config }));
  }

  /**
   * Save configuration to storage
   */
  private saveConfig(): void {
    try {
      localStorage.setItem('ollama_ai_config', JSON.stringify(this.config));
    } catch (error) {
      console.error('Failed to save AI config:', error);
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): OllamaConfig {
    return { ...this.config };
  }

  /**
   * Check if Ollama server is available
   */
  async checkAvailability(): Promise<boolean> {
    if (!this.config.enabled) return false;

    try {
      const response = await fetch(`http://${this.config.host}:${this.config.port}/api/tags`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      return response.ok;
    } catch (error) {
      logger.addLog('warning', 'Ollama server not available');
      return false;
    }
  }

  /**
   * Process incoming MQTT data
   */
  processMqttData(context: DeviceContext): void {
    if (!this.config.enabled) return;

    // Add to device buffer
    const deviceBuffer = this.deviceDataBuffer.get(context.deviceId) || [];
    deviceBuffer.push(context);

    // Keep only last 10 readings per device
    if (deviceBuffer.length > 10) {
      deviceBuffer.shift();
    }
    this.deviceDataBuffer.set(context.deviceId, deviceBuffer);

    // Add to analysis queue
    this.analysisQueue.push(context);

    logger.addLog('info', `AI: Queued data from ${context.deviceName}`);
  }

  /**
   * Analyze data immediately (manual trigger)
   */
  async analyzeNow(context?: DeviceContext): Promise<AIAnalysis | null> {
    if (!this.config.enabled) {
      notificationService.warning('🤖 AI analysis is disabled');
      return null;
    }

    if (this.isAnalyzing) {
      notificationService.info('🤖 Analysis already in progress...');
      return null;
    }

    const dataToAnalyze = context || this.analysisQueue[this.analysisQueue.length - 1];
    if (!dataToAnalyze) {
      notificationService.warning('🤖 No data available for analysis');
      return null;
    }

    return await this.performAnalysis(dataToAnalyze);
  }

  /**
   * Start automatic analysis timer
   */
  private startAutoAnalysis(): void {
    if (this.analysisTimer) {
      clearInterval(this.analysisTimer);
    }

    this.analysisTimer = setInterval(async () => {
      if (this.analysisQueue.length > 0 && !this.isAnalyzing) {
        await this.analyzeQueuedData();
      }
    }, this.config.analysisInterval * 1000);

    logger.addLog('success', `🤖 AI auto-analysis started (every ${this.config.analysisInterval}s)`);
  }

  /**
   * Stop automatic analysis
   */
  private stopAutoAnalysis(): void {
    if (this.analysisTimer) {
      clearInterval(this.analysisTimer);
      this.analysisTimer = null;
    }
    logger.addLog('info', '🤖 AI auto-analysis stopped');
  }

  /**
   * Analyze all queued data
   */
  private async analyzeQueuedData(): Promise<void> {
    if (this.analysisQueue.length === 0 || this.isAnalyzing) return;

    // Group data by device
    const deviceGroups = new Map<string, DeviceContext[]>();
    this.analysisQueue.forEach(context => {
      const group = deviceGroups.get(context.deviceId) || [];
      group.push(context);
      deviceGroups.set(context.deviceId, group);
    });

    // Analyze each device's data
    for (const [, contexts] of deviceGroups) {
      const latestContext = contexts[contexts.length - 1];
      await this.performAnalysis(latestContext);
    }

    // Clear queue after analysis
    this.analysisQueue = [];
  }

  /**
   * Perform AI analysis on device context
   */
  private async performAnalysis(context: DeviceContext): Promise<AIAnalysis | null> {
    this.isAnalyzing = true;

    try {
      // Show immediate feedback
      notificationService.info(`🤖 Analyzing ${context.deviceName}...`, 2000);

      const startTime = Date.now();
      const prompt = this.buildPrompt(context);
      const response = await this.queryOllama(prompt);
      const duration = ((Date.now() - startTime) / 1000).toFixed(1);

      logger.addLog('info', `🤖 Analysis completed in ${duration}s`);

      if (response) {
        const analysis = this.parseAIResponse(response);
        this.handleAnalysisResult(analysis, context);
        return analysis;
      }
    } catch (error: any) {
      logger.addLog('error', `AI analysis failed: ${error.message}`);
      notificationService.error(`🤖 Analysis failed: ${error.message}`, 3000);
    } finally {
      this.isAnalyzing = false;
    }

    return null;
  }

  /**
   * Build prompt for Ollama based on device context
   */
  /**
 * Build prompt for Ollama based on device context
 */
private buildPrompt(context: DeviceContext): string {
  const deviceBuffer = this.deviceDataBuffer.get(context.deviceId) || [];

  switch (context.deviceType) {
    case 'sensor': {
      const history = deviceBuffer.slice(-5).map(c =>
        `Time: ${c.timestamp.toLocaleTimeString()}, Data: ${JSON.stringify(c.data)}`
      ).join('\n');

      return `You are an IoT data analyst. Analyze this sensor data and provide insights.

Device: ${context.deviceName}
Type: Sensor
Current Reading: ${JSON.stringify(context.data, null, 2)}
Topic: ${context.topic}
Timestamp: ${context.timestamp.toLocaleString()}

Recent History:
${history || 'No previous data'}

Task: Analyze this sensor data and provide:
1. Current status assessment (normal/warning/critical)
2. Any anomalies or patterns detected
3. Recommended actions if needed
4. Priority level (low/medium/high/critical)

Format your response as:
STATUS: [normal/warning/critical]
ANALYSIS: [your analysis]
RECOMMENDATION: [your recommendation or "none"]
PRIORITY: [low/medium/high/critical]`;
    }

    case 'dimmer': {
      const history = deviceBuffer.slice(-5).map(c => {
        const brightness = c.data.dimmerValue !== undefined ? c.data.dimmerValue : 0;
        const power = c.data.isOn ? 'ON' : 'OFF';
        return `Time: ${c.timestamp.toLocaleTimeString()}, Brightness: ${brightness}%, Power: ${power}`;
      }).join('\n');

      const currentBrightness = context.data.dimmerValue !== undefined ? context.data.dimmerValue : 0;
      const currentPower = context.data.isOn ? 'ON' : 'OFF';

      return `You are an IoT device monitor. Analyze this dimmer device activity.

Device: ${context.deviceName}
Type: Dimmer
Current Brightness: ${currentBrightness}%
Current State: ${currentPower}
Topic: ${context.topic}
Timestamp: ${context.timestamp.toLocaleString()}

Recent Activity:
${history || 'No previous data'}

Task: Analyze this dimmer activity and provide:
1. Usage pattern assessment (e.g., frequently adjusted, stable brightness, energy efficiency)
2. Any unusual behavior detected (e.g., rapid brightness changes, stuck at 0% or 100%)
3. Recommended actions if needed (e.g., "Consider automating based on time of day")
4. Priority level (low/medium/high/critical)

Format your response as:
STATUS: [normal/warning/critical]
ANALYSIS: [your analysis]
RECOMMENDATION: [your recommendation or "none"]
PRIORITY: [low/medium/high/critical]`;
    }

    case 'shutter': {
      const history = deviceBuffer.slice(-5).map(c => {
        const position = c.data.shutterPosition !== undefined ? c.data.shutterPosition : 0;
        const state = position === 0 ? '(Closed)' : position === 100 ? '(Open)' : '(Partially open)';
        return `Time: ${c.timestamp.toLocaleTimeString()}, Position: ${position}% ${state}`;
      }).join('\n');

      const currentPosition = context.data.shutterPosition !== undefined ? context.data.shutterPosition : 0;
      const currentState = currentPosition === 0 ? '(Closed)'
        : currentPosition === 100 ? '(Open)'
        : '(Partially open)';

      return `You are an IoT device monitor. Analyze this shutter/blind device activity.

Device: ${context.deviceName}
Type: Shutter/Blind
Current Position: ${currentPosition}% ${currentState}
Topic: ${context.topic}
Timestamp: ${context.timestamp.toLocaleString()}

Recent Activity:
${history || 'No previous data'}

Task: Analyze this shutter activity and provide:
1. Usage pattern assessment (e.g., regular schedule, manual adjustments, weather-responsive)
2. Any unusual behavior detected (e.g., stuck position, erratic movements, incomplete operations)
3. Recommended actions if needed (e.g., "Schedule based on sunrise/sunset", "Check for mechanical issues")
4. Priority level (low/medium/high/critical)

Format your response as:
STATUS: [normal/warning/critical]
ANALYSIS: [your analysis]
RECOMMENDATION: [your recommendation or "none"]
PRIORITY: [low/medium/high/critical]`;
    }

    case 'switch':
    default: {
      const history = deviceBuffer.slice(-5).map(c => {
        const state = c.data.isOn ? 'ON' : 'OFF';
        const channel = c.data.channel ? ` (POWER${c.data.channel})` : '';
        return `Time: ${c.timestamp.toLocaleTimeString()}, State: ${state}${channel}`;
      }).join('\n');

      const currentState = context.data.isOn ? 'ON' : 'OFF';
      const channel = context.data.channel ? ` (POWER${context.data.channel})` : '';

      return `You are an IoT device monitor. Analyze this switch device activity.

Device: ${context.deviceName}
Type: Switch${channel}
Current State: ${currentState}
Topic: ${context.topic}
Timestamp: ${context.timestamp.toLocaleString()}

Recent Activity:
${history || 'No previous data'}

Task: Analyze this switch activity and provide:
1. Usage pattern assessment (e.g., frequent toggling, left on for extended periods, typical on/off cycles)
2. Any unusual behavior detected (e.g., rapid switching, unexpected state changes, power anomalies)
3. Recommended actions if needed (e.g., "Consider timer automation", "Check for electrical issues")
4. Priority level (low/medium/high/critical)

Format your response as:
STATUS: [normal/warning/critical]
ANALYSIS: [your analysis]
RECOMMENDATION: [your recommendation or "none"]
PRIORITY: [low/medium/high/critical]`;
    }
  }
}

  /**
   * Query Ollama API
   */
  private async queryOllama(prompt: string): Promise<string> {
    const url = `http://${this.config.host}:${this.config.port}/api/generate`;

    logger.addLog('info', `🤖 Querying Ollama AI with model: ${this.config.model}...`);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.config.model,
          prompt: prompt,
          stream: false
        })
      });

      if (!response.ok) {
        const errorText = await response.text();

        // Handle 404 - model not found
        if (response.status === 404) {
          throw new Error(`Model "${this.config.model}" not found. Pull it with: ollama pull ${this.config.model}`);
        }

        throw new Error(`Ollama API error (${response.status}): ${errorText || response.statusText}`);
      }

      const data = await response.json();

      // Validate response
      if (!data.response) {
        throw new Error('Invalid response from Ollama: missing "response" field');
      }

      return data.response;
    } catch (error: any) {
      if (error.message.includes('Failed to fetch')) {
        throw new Error('Cannot connect to Ollama. Make sure Ollama is running on localhost:11434');
      }
      throw error;
    }
  }

  /**
   * Parse AI response into structured analysis
   */
  private parseAIResponse(response: string): AIAnalysis {
    const lines = response.split('\n');
    //let status = 'normal';
    let analysis = '';
    let recommendation = '';
    let priority: 'low' | 'medium' | 'high' | 'critical' = 'low';

    lines.forEach(line => {
      const lower = line.toLowerCase();
      if (lower.startsWith('status:')) {
        status = line.substring(7).trim();
      } else if (lower.startsWith('analysis:')) {
        analysis = line.substring(9).trim();
      } else if (lower.startsWith('recommendation:')) {
        recommendation = line.substring(15).trim();
      } else if (lower.startsWith('priority:')) {
        const p = line.substring(9).trim().toLowerCase();
        if (['low', 'medium', 'high', 'critical'].includes(p)) {
          priority = p as any;
        }
      } else if (line.trim() && !line.includes(':')) {
        // Append additional text to analysis
        analysis += ' ' + line.trim();
      }
    });

    // If parsing failed, use entire response as analysis
    if (!analysis) {
      analysis = response;
    }

    return {
      decision: analysis || 'Analysis completed',
      recommendation: recommendation && recommendation !== 'none' ? recommendation : undefined,
      priority,
      timestamp: new Date()
    };
  }

  /**
   * Handle analysis result and send notification
   */
  private handleAnalysisResult(analysis: AIAnalysis, context: DeviceContext): void {
    const icon = this.getPriorityIcon(analysis.priority);
    const deviceIcon = context.deviceType === 'sensor' ? '🌡️' : '💡';

    let message = `${icon} ${deviceIcon} ${context.deviceName}\n${analysis.decision}`;

    if (analysis.recommendation) {
      message += `\n💡 ${analysis.recommendation}`;
    }

    // Send notification based on priority
    const duration = this.getDurationByPriority(analysis.priority);

    switch (analysis.priority) {
      case 'critical':
        notificationService.error(`🤖 CRITICAL: ${message}`, duration);
        logger.addLog('error', `AI CRITICAL: ${context.deviceName} - ${analysis.decision}`);
        break;
      case 'high':
        notificationService.warning(`🤖 ${message}`, duration);
        logger.addLog('warning', `AI WARNING: ${context.deviceName} - ${analysis.decision}`);
        break;
      case 'medium':
        notificationService.info(`🤖 ${message}`, duration);
        logger.addLog('info', `AI INFO: ${context.deviceName} - ${analysis.decision}`);
        break;
      default:
        notificationService.success(`🤖 ${message}`, duration);
        logger.addLog('success', `AI: ${context.deviceName} - ${analysis.decision}`);
    }
  }

  /**
   * Get icon based on priority
   */
  private getPriorityIcon(priority: string): string {
    const icons: Record<string, string> = {
      critical: '🚨',
      high: '⚠️',
      medium: 'ℹ️',
      low: '✅'
    };
    return icons[priority] || 'ℹ️';
  }

  /**
   * Get notification duration based on priority
   */
  private getDurationByPriority(priority: string): number {
    const durations: Record<string, number> = {
      critical: 0, // No auto-dismiss
      high: 10000,
      medium: 6000,
      low: 4000
    };
    return durations[priority] || 4000;
  }

  /**
   * Clear device data buffer
   */
  clearBuffer(deviceId?: string): void {
    if (deviceId) {
      this.deviceDataBuffer.delete(deviceId);
    } else {
      this.deviceDataBuffer.clear();
    }
  }

  /**
   * Cleanup on service destruction
   */
  destroy(): void {
    this.stopAutoAnalysis();
    this.analysisQueue = [];
    this.deviceDataBuffer.clear();
    logger.addLog('info', '🤖 AI service destroyed');
  }
}

// Singleton instance
export const ollamaAIService = new OllamaAIService();