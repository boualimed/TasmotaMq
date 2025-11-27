import { supabaseService } from './supabase.service';
import { ChartDataPoint, ChartSeries, TimeRange, ChartMetric } from '../models/chart.model';
import { logger } from '../utils/logger.util';
import { extractJsonValue } from '../utils/json-parser.util';
import { Device } from '../models/device.model';
import { indexedDBService, SensorDataRecord  } from './indexeddb.service';
export class ChartService {
  /**
   * Fetches time-series data from Supabase
   */
async fetchTimeSeriesData(
    userId: string,
    deviceId: string,
    metrics: ChartMetric[],
    timeRange: TimeRange
  ): Promise<ChartSeries[]> {
    if (!supabaseService.isEnabled()) {
      throw new Error('Supabase is not enabled');
    }

    try {
      // Query MQTT messages for the device within time range
      const result = await supabaseService.queryMessages(userId, {
        deviceId,
        startDate: timeRange.start,
        endDate: timeRange.end,
        limit: 10000 // Max data points
      });

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to fetch data');
      }

      // Process data into series for each metric
      const series: ChartSeries[] = metrics
        .filter(m => m.enabled)
        .map(metric => this.processMetricData(metric, result.data!));

      logger.addLog('info', `Fetched ${result.data.length} data points for ${metrics.length} metrics`);

      return series;
    } catch (error: any) {
      logger.addLog('error', `Failed to fetch chart data: ${error.message}`);
      throw error;
    }
  }



  /**
   * Processes raw MQTT messages into chart data for a specific metric
   */
  private processMetricData(metric: ChartMetric, messages: any[]): ChartSeries {
    const dataPoints: ChartDataPoint[] = [];

    messages.forEach(msg => {
      const value = this.extractMetricValue(msg.payload, metric.jsonPath);
      if (value === null) {
        console.log(`Skipping data point for ${metric.label} at ${msg.timestamp}: null value`);
      } else if (!isNaN(value)) {
        dataPoints.push({
          timestamp: new Date(msg.timestamp),
          value: parseFloat(value.toString()),
          label: metric.label
        });
      }
    });

    // Sort by timestamp
    dataPoints.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    return {
      name: metric.label,
      data: dataPoints,
      color: metric.color,
      unit: metric.unit,
      type: 'line'
    };
  }

  /**
   * Extracts metric value from payload
   */
  private extractMetricValue(payload: any, jsonPath: string): number | null {
    if (typeof payload === 'number') {
      return payload;
    }

    if (typeof payload === 'string') {
      const num = parseFloat(payload);
      return isNaN(num) ? null : num;
    }

    if (typeof payload === 'object' && payload !== null) {
      // Use existing JSON parser utility
      const extracted = extractJsonValue(payload, jsonPath);

      if (typeof extracted === 'number') {
        return extracted;
      }

      if (typeof extracted === 'string') {
        const num = parseFloat(extracted);
        return isNaN(num) ? null : num;
      }
    }

    return null;
  }

  /**
   * Aggregates data points by time interval
   */
  aggregateData(
    dataPoints: ChartDataPoint[],
    intervalMs: number,
    aggregationType: 'avg' | 'min' | 'max' | 'sum'
  ): ChartDataPoint[] {
    if (dataPoints.length === 0) return [];

    const buckets = new Map<number, number[]>();

    // Group data points into time buckets
    dataPoints.forEach(point => {
      const bucketKey = Math.floor(point.timestamp.getTime() / intervalMs) * intervalMs;
      const bucket = buckets.get(bucketKey) || [];
      bucket.push(point.value);
      buckets.set(bucketKey, bucket);
    });

    // Aggregate each bucket
    const aggregated: ChartDataPoint[] = [];

    buckets.forEach((values, timestamp) => {
      let aggregatedValue: number;

      switch (aggregationType) {
        case 'avg':
          aggregatedValue = values.reduce((sum, v) => sum + v, 0) / values.length;
          break;
        case 'min':
          aggregatedValue = Math.min(...values);
          break;
        case 'max':
          aggregatedValue = Math.max(...values);
          break;
        case 'sum':
          aggregatedValue = values.reduce((sum, v) => sum + v, 0);
          break;
      }

      aggregated.push({
        timestamp: new Date(timestamp),
        value: aggregatedValue
      });
    });

    return aggregated.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }



  /**
   * Flattens nested object
   */
  private flattenObject(obj: any, prefix = ''): Record<string, any> {
    const flattened: Record<string, any> = {};

    Object.entries(obj).forEach(([key, value]) => {
      const newKey = prefix ? `${prefix}.${key}` : key;

      if (value && typeof value === 'object' && !Array.isArray(value)) {
        Object.assign(flattened, this.flattenObject(value, newKey));
      } else {
        flattened[newKey] = value;
      }
    });

    return flattened;
  }




/**
 * Detects available metrics from device sensor data
 */
detectAvailableMetrics(device: Device): ChartMetric[] { // Change parameter to Device to access sensorConfig
  const metrics: ChartMetric[] = [];

  // Case 1: Single-value sensor (sensorData is a number)
  if (typeof device.sensorData === 'number') {
    const sensorConfig = device.sensorConfig || {
      displayName: device.name || 'Sensor',
      unit: '',
      sensorType: 'custom',
      icon: '📊',
      colorScheme: 'default'
    };

    // Derive metric properties from sensorConfig
    const metric: ChartMetric = {
      id: device.jsonPath || 'value', // Use jsonPath or fallback to 'value'
      label: sensorConfig.displayName || device.name || 'Value',
      jsonPath: device.jsonPath || '', // Use jsonPath for data extraction
      unit: sensorConfig.unit || '',
      color: this.getColorForSensorType(sensorConfig.sensorType),
      enabled: true
    };

    metrics.push(metric);
    return metrics;
  }

  // Case 2: Object-based sensor (existing logic)
  if (device.sensorData && typeof device.sensorData === 'object') {
    const flatData = this.flattenObject(device.sensorData);

    // Define colors for common metrics
    const metricColors: Record<string, string> = {
      'temperature': '#ef4444',
      'humidity': '#3b82f6',
      'pressure': '#8b5cf6',
      'power': '#f59e0b',
      'voltage': '#10b981',
      'current': '#06b6d4',
      'energy': '#ec4899',
      'light': '#eab308',
      'gas': '#6366f1',
      'distance': '#14b8a6'
    };

    // Define units for common metrics
    const metricUnits: Record<string, string> = {
      'temperature': '°C',
      'humidity': '%',
      'pressure': 'hPa',
      'power': 'W',
      'voltage': 'V',
      'current': 'A',
      'energy': 'kWh',
      'light': 'lux',
      'gas': 'ppm',
      'distance': 'cm'
    };

    Object.entries(flatData).forEach(([key, value] ) => {
      if (typeof value === 'number') {
        const keyLower = key.toLowerCase();
        let color = '#6b7280'; // Default gray
        let unit = '';

        // Match color and unit based on key
        for (const [metricType, metricColor] of Object.entries(metricColors)) {
          if (keyLower.includes(metricType)) {
            color = metricColor;
            unit = metricUnits[metricType] || '';
            break;
          }
        }

        metrics.push({
          id: key,
          label: this.formatLabel(key),
          jsonPath: key,
          unit,
          color,
          enabled: true
        });
      }
    });
  }

  return metrics;
}

/**
 * Helper to get color based on sensor type
 */
private getColorForSensorType(sensorType: string): string {
  const metricColors: Record<string, string> = {
    'temperature': '#ef4444',
    'humidity': '#3b82f6',
    'pressure': '#8b5cf6',
    'energy': '#f59e0b',
    'light': '#eab308',
    'gas': '#6366f1',
    'motion': '#14b8a6',
    'distance': '#10b981',
    'multi': '#6b7280',
    'custom': '#6b7280'
  };
  return metricColors[sensorType] || '#6b7280'; // Default gray
}

  /**
   * Formats label for display
   */
  private formatLabel(key: string): string {
    return key
      .split('.')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  /**
   * Exports chart data to CSV
   */
  exportToCSV(series: ChartSeries[], filename: string = 'chart-data.csv'): void {
    if (series.length === 0) return;

    // Build CSV header
    const headers = ['Timestamp', ...series.map(s => `${s.name} (${s.unit || ''})`)];
    const rows: string[][] = [headers];

    // Get all unique timestamps
    const timestamps = new Set<number>();
    series.forEach(s => s.data.forEach(d => timestamps.add(d.timestamp.getTime())));
    const sortedTimestamps = Array.from(timestamps).sort();

    // Build rows
    sortedTimestamps.forEach(ts => {
      const row: string[] = [new Date(ts).toISOString()];

      series.forEach(s => {
        const dataPoint = s.data.find(d => d.timestamp.getTime() === ts);
        row.push(dataPoint ? dataPoint.value.toString() : '');
      });

      rows.push(row);
    });

    // Convert to CSV string
    const csvContent = rows.map(row => row.join(',')).join('\n');

    // Download
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);

    logger.addLog('success', `Chart data exported to ${filename}`);
  }

  /**
   * Calculates statistics for a series
   */
  calculateStats(dataPoints: ChartDataPoint[]): {
    min: number;
    max: number;
    avg: number;
    count: number;
    latest: number;
  } {
    if (dataPoints.length === 0) {
      return { min: 0, max: 0, avg: 0, count: 0, latest: 0 };
    }

    const values = dataPoints.map(d => d.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
    const latest = dataPoints[dataPoints.length - 1].value;

    return { min, max, avg, count: dataPoints.length, latest };
  }

  async fetchCombinedTimeSeriesData(
    userId: string,
    deviceId: string,
    metrics: ChartMetric[],
    timeRange: TimeRange
  ): Promise<ChartSeries[]> {
    const allMessages: any[] = [];

    // 1. Try Supabase if enabled
    if (supabaseService.isEnabled()) {
      try {
        const result = await supabaseService.queryMessages(userId, {
          deviceId,
          startDate: timeRange.start,
          endDate: timeRange.end,
          limit: 10000
        });
        if (result.success && result.data) {
          allMessages.push(...result.data);
        }
      } catch (err) {
        logger.addLog('warning', `Supabase fetch failed: ${(err as Error).message}`);
      }
    }

    // 2. Always try IndexedDB
    try {
      await indexedDBService.initialize();
      const localRecords: SensorDataRecord[] = await indexedDBService.getSensorData({
        deviceId,
        timeRange,
        limit: 10000
      });

      // Normalize IndexedDB records into same shape as Supabase messages
      const normalized = localRecords.map(r => ({
        timestamp: r.timestamp,
        payload: r.data
      }));
      allMessages.push(...normalized);
    } catch (err) {
      logger.addLog('warning', `IndexedDB fetch failed: ${(err as Error).message}`);
    }

    if (allMessages.length === 0) {
      throw new Error('No data available from Supabase or IndexedDB');
    }

    // Deduplicate by timestamp+metric
    allMessages.sort((a, b) => a.timestamp - b.timestamp);

    const series: ChartSeries[] = metrics
      .filter(m => m.enabled)
      .map(metric => this.processMetricData(metric, allMessages));

    logger.addLog('info', `Fetched ${allMessages.length} merged data points for ${metrics.length} metrics`);

    return series;
  }



}

// Singleton
export const chartService = new ChartService();