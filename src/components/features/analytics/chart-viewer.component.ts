import { LitElement, html } from 'lit';
import { customElement, state, property } from 'lit/decorators.js';
import { chartService } from '../../../services/chart.service';
//import { supabaseService } from '../../../services/supabase.service';
import { authService } from '../../../services/auth.service';
import { notificationService } from '../../../services/notification.service';
import { Device } from '../../../models/device.model';
import { chartStyles } from '../../../styles/chart.styles';
import {
  ChartSeries,
  ChartMetric,
  TimeRange,
  TIME_RANGE_PRESETS,
} from '../../../models/chart.model';
import { Chart, registerables } from 'chart.js';
import 'chartjs-adapter-date-fns';

// Register Chart.js components
Chart.register(...registerables);

@customElement('chart-viewer')
export class ChartViewer extends LitElement {
  static styles = chartStyles;

  @property({ type: Object }) device!: Device;
  @property({ type: Boolean }) open = false;

  @state() private series: ChartSeries[] = [];
  @state() private availableMetrics: ChartMetric[] = [];
  @state() private selectedMetrics: Set<string> = new Set();
  @state() private timeRange: TimeRange = TIME_RANGE_PRESETS[2]; // Last 24 Hours
  @state() private loading = false;
  @state() private error = '';

  private chart: Chart | null = null;
  private canvasRef: HTMLCanvasElement | null = null;

  connectedCallback() {
    super.connectedCallback();
    if (this.open) {
      this.initialize();
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.destroyChart();
  }

 updated(changedProperties: Map<string, any>) {
    if (changedProperties.has('open') && this.open) {
      this.initialize();
    }
  }

  private async initialize() {
    // Detect available metrics from device
    if (this.device.sensorData) {
      this.availableMetrics = chartService.detectAvailableMetrics(this.device);
      // Enable first 3 metrics by default
      this.availableMetrics.slice(0, 3).forEach(m => {
        this.selectedMetrics.add(m.id);
        m.enabled = true;
      });
    }

    await this.loadChartData();
  }




      private async loadChartData() {
        const user = authService.getCurrentUser();
        if (!user) {
          this.error = 'User not authenticated';
          return;
        }

        this.loading = true;
        this.error = '';

        try {
          const selectedMetricsArray = this.availableMetrics.filter(m =>
            this.selectedMetrics.has(m.id)
          );

          // ⬇️ Use combined fetch instead of Supabase-only
          this.series = await chartService.fetchCombinedTimeSeriesData(
            user.id,
            this.device.id,
            selectedMetricsArray,
            this.timeRange
          );

          this.loading = false;
          await this.updateComplete;
          this.renderChart();

          notificationService.success('Chart data loaded successfully', 2000);
        } catch (error: any) {
          this.error = error.message;
          this.loading = false;
          notificationService.error(`Failed to load chart: ${error.message}`, 4000);
        }
      }


   private renderChart() {
      // find canvas in the rendered DOM
      const canvasEl = (this.renderRoot && this.renderRoot.querySelector)
        ? (this.renderRoot.querySelector('#chartCanvas') as HTMLCanvasElement | null)
        : null;

      if (!canvasEl) {
        console.warn('Chart canvas not found yet, skipping render');
        return;
      }

      this.canvasRef = canvasEl;

      this.destroyChart();

      const ctx = this.canvasRef.getContext('2d');
      if (!ctx) {
        console.warn('Unable to get 2d context from canvas');
        return;
      }

      const datasets = this.series.map(s => ({
        label: s.name,
        data: s.data.map(d => ({ x: d.timestamp, y: d.value })),
        borderColor: s.color || '#3b82f6',
        backgroundColor: (s.color || '#3b82f6') + '20',
        borderWidth: 2,
        tension: 0.4,
        pointRadius: 2,
        pointHoverRadius: 5
      }));

      this.chart = new Chart(ctx, {
        type: 'line',
        data: { datasets } as any,
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: 'index', intersect: false },
          plugins: {
            legend: {
              display: true,
              position: 'top',
              labels: { color: '#f3f4f6', font: { size: 12 } }
            },
            tooltip: {
              backgroundColor: '#1f2937',
              borderColor: '#374151',
              borderWidth: 1,
              titleColor: '#f3f4f6',
              bodyColor: '#d1d5db',
              callbacks: {
                label: (context) => {
                  const series = this.series[context.datasetIndex];
                  const value = context.parsed.y?.toFixed(2) ?? 'N/A';
                  return `${context.dataset.label}: ${value} ${series.unit || ''}`;
                }
              }
            }
          },
          scales: {
            x: {
              type: 'time',
              time: {
                displayFormats: {
                  hour: 'HH:mm',
                  day: 'MMM d',
                  week: 'MMM d',
                  month: 'MMM yyyy'
                }
              },
              ticks: { color: '#9ca3af' },
              grid: { color: '#374151' }
            },
            y: {
              ticks: { color: '#9ca3af' },
              grid: { color: '#374151' }
            }
          }
        }
      });
    }



    private destroyChart() {
    if (this.chart) {
      this.chart.destroy();
      this.chart = null;
    }
  }

  render() {
    if (!this.open) return html``;

    return html`
      <div class="chart-modal-overlay" @click="${() => this.handleOverlayClick()}">
        <div class="chart-container" @click="${(e: Event) => e.stopPropagation()}">
          ${this.renderHeader()}
          ${this.renderControls()}
          ${this.renderContent()}
        </div>
      </div>
    `;
  }

  private renderHeader() {
    return html`
      <div class="chart-header">
        <div class="chart-title">
          📊 Time-Series Chart
          <span class="device-badge">${this.device.name}</span>
        </div>
        <button class="chart-close" @click="${() => this.close()}">×</button>
      </div>
    `;
  }

  private renderControls() {
    return html`
      <div class="chart-controls">
        <div class="control-group">
          <span class="control-label">Time Range:</span>
          <select class="select" @change="${(e: Event) => this.handleTimeRangeChange(e)}">
            ${TIME_RANGE_PRESETS.map((range, idx) => html`
              <option value="${idx}" ?selected="${this.timeRange.preset === range.preset}">
                ${range.label}
              </option>
            `)}
          </select>
        </div>

        <button
          class="button primary"
          @click="${() => this.loadChartData()}"
          ?disabled="${this.loading}"
        >
          🔄 Refresh
        </button>

        <button
          class="button secondary"
          @click="${() => this.handleExport()}"
          ?disabled="${this.loading || this.series.length === 0}"
        >
          📥 Export CSV
        </button>

        <div style="margin-left: auto; font-size: 0.875rem; color: #9ca3af;">
          ${this.timeRange.start.toLocaleString()} - ${this.timeRange.end.toLocaleString()}
        </div>
      </div>
    `;
  }




  private renderContent() {
    if (this.error) {
      return html`
        <div class="chart-content">
          <div class="error-message">
            ⚠️ ${this.error}
          </div>
        </div>
      `;
    }

    if (this.loading) {
      return html`
        <div class="chart-content">
          <div class="loading">
            <div class="spinner"></div>
            <div>Loading chart data...</div>
          </div>
        </div>
      `;
    }

    if (this.availableMetrics.length === 0) {
      return html`
        <div class="chart-content">
          <div class="empty-state">
            <div class="empty-icon">📊</div>
            <div>No metrics available for this device</div>
            <div style="font-size: 0.875rem; margin-top: 8px;">
              Device must have sensor data to display charts
            </div>
          </div>
        </div>
      `;
    }

    return html`
      <div class="chart-content">
        ${this.renderMetricsSelector()}
        ${this.series.length > 0 ? this.renderStats() : ''}
        ${this.renderChartCanvas()}
      </div>
    `;
  }

  private renderMetricsSelector() {
    return html`
      <div style="margin-bottom: 20px;">
        <div style="font-size: 0.875rem; font-weight: 600; color: #f3f4f6; margin-bottom: 12px;">
          Select Metrics to Display:
        </div>
        <div class="metrics-selector">
          ${this.availableMetrics.map(metric => this.renderMetricItem(metric))}
        </div>
      </div>
    `;
  }

  private renderMetricItem(metric: ChartMetric) {
    const isSelected = this.selectedMetrics.has(metric.id);

    return html`
      <div
        class="metric-item ${isSelected ? 'selected' : ''}"
        @click="${() => this.toggleMetric(metric.id)}"
      >
        <input
          type="checkbox"
          class="metric-checkbox"
          .checked="${isSelected}"
          @click="${(e: Event) => e.stopPropagation()}"
        />
        <div class="metric-color" style="background-color: ${metric.color}"></div>
        <span class="metric-label">${metric.label}</span>
        <span class="metric-unit">${metric.unit}</span>
      </div>
    `;
  }

  private renderStats() {
    return html`
      <div class="stats-grid">
        ${this.series.map(s => {
          const stats = chartService.calculateStats(s.data);
          return html`
            <div class="stat-card">
              <div class="stat-label">${s.name} - Latest</div>
              <div class="stat-value">
                ${stats.latest.toFixed(2)}
                <span class="stat-unit">${s.unit}</span>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-label">${s.name} - Average</div>
              <div class="stat-value">
                ${stats.avg.toFixed(2)}
                <span class="stat-unit">${s.unit}</span>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-label">${s.name} - Min</div>
              <div class="stat-value">
                ${stats.min.toFixed(2)}
                <span class="stat-unit">${s.unit}</span>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-label">${s.name} - Max</div>
              <div class="stat-value">
                ${stats.max.toFixed(2)}
                <span class="stat-unit">${s.unit}</span>
              </div>
            </div>
          `;
        })}
      </div>
    `;
  }


      private renderChartCanvas() {
      return html`
        <div class="chart-canvas-container">
          <canvas id="chartCanvas"></canvas>
        </div>
      `;
    }

  // Event Handlers

  private handleTimeRangeChange(e: Event) {
    const select = e.target as HTMLSelectElement;
    const index = parseInt(select.value);
    this.timeRange = TIME_RANGE_PRESETS[index];
    this.loadChartData();
  }




  private toggleMetric(metricId: string) {
    if (this.selectedMetrics.has(metricId)) {
      this.selectedMetrics.delete(metricId);
    } else {
      this.selectedMetrics.add(metricId);
    }

    // Update metric enabled state
    const metric = this.availableMetrics.find(m => m.id === metricId);
    if (metric) {
      metric.enabled = this.selectedMetrics.has(metricId);
    }

    this.requestUpdate();
    this.loadChartData();
  }





  private handleExport() {
    const filename = `${this.device.name}-${this.timeRange.preset || 'custom'}-${Date.now()}.csv`;
    chartService.exportToCSV(this.series, filename);
  }

  private handleOverlayClick() {
    this.close();
  }

  private close() {
    this.destroyChart();
    this.dispatchEvent(new CustomEvent('close', {
      bubbles: true,
      composed: true
    }));
  }



}