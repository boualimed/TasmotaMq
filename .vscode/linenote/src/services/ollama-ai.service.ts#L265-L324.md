 private buildPrompt(context: DeviceContext): string {
    const deviceBuffer = this.deviceDataBuffer.get(context.deviceId) || [];

    if (context.deviceType === 'sensor') {
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
    } else {
      // Switch device
      const history = deviceBuffer.slice(-5).map(c =>
        `Time: ${c.timestamp.toLocaleTimeString()}, State: ${c.data.isOn ? 'ON' : 'OFF'}`
      ).join('\n');

      return `You are an IoT device monitor. Analyze this switch device activity.

Device: ${context.deviceName}
Type: Switch
Current State: ${context.data.isOn ? 'ON' : 'OFF'}
Topic: ${context.topic}
Timestamp: ${context.timestamp.toLocaleString()}

Recent Activity:
${history || 'No previous data'}

Task: Analyze this switch activity and provide:
1. Usage pattern assessment
2. Any unusual behavior detected
3. Recommended actions if needed
4. Priority level (low/medium/high/critical)

Format your response as:
STATUS: [normal/warning/critical]
ANALYSIS: [your analysis]
RECOMMENDATION: [your recommendation or "none"]
PRIORITY: [low/medium/high/critical]`;
    }
  }