export interface ChartDataPoint {
    timestamp: Date;
    value: number;
    label?: string;
  }

  export interface ChartSeries {
    name: string;
    data: ChartDataPoint[];
    color?: string;
    unit?: string;
    type?: 'line' | 'bar' | 'area';
  }

  export interface ChartConfig {
    title: string;
    series: ChartSeries[];
    timeRange: TimeRange;
    chartType: 'line' | 'bar' | 'area' | 'mixed';
    aggregation?: 'raw' | 'minute' | 'hour' | 'day';
    showLegend: boolean;
    showGrid: boolean;
    enableZoom: boolean;
    enableTooltip: boolean;
  }

  export interface TimeRange {
    label: string;
    start: Date;
    end: Date;
    preset?: 'hour' | '6hours' | 'day' | 'week' | 'month' | 'custom';
  }

  export const TIME_RANGE_PRESETS: TimeRange[] = [
    {
      label: 'Last Hour',
      start: new Date(Date.now() - 60 * 60 * 1000),
      end: new Date(),
      preset: 'hour'
    },
    {
      label: 'Last 6 Hours',
      start: new Date(Date.now() - 6 * 60 * 60 * 1000),
      end: new Date(),
      preset: '6hours'
    },
    {
      label: 'Last 24 Hours',
      start: new Date(Date.now() - 24 * 60 * 60 * 1000),
      end: new Date(),
      preset: 'day'
    },
    {
      label: 'Last 7 Days',
      start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      end: new Date(),
      preset: 'week'
    },
    {
      label: 'Last 30 Days',
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      end: new Date(),
      preset: 'month'
    }
  ];

  export interface ChartMetric {
    id: string;
    label: string;
    jsonPath: string; // e.g., "AM2301.Temperature"
    unit: string;
    color: string;
    enabled: boolean;
    aggregation?: 'avg' | 'min' | 'max' | 'sum';
}

