/**
 * charts.js - Helper functions for creating clean, corporate-styled
 * Chart.js visualizations that mimic Microsoft Power BI dashboards.
 */

// Corporate Cohesive Color Theme
const ChartColors = {
    // Primary colors
    blue: '#1F4E79',
    orange: '#F58220',
    green: '#2E7D32',
    grey: '#7F7F7F',
    
    // Core theme palette for series and categorical breakdowns
    palette: [
        '#1F4E79', // Deep Corporate Blue
        '#F58220', // YourLand Orange
        '#2E7D32', // Forest Green
        '#5B9BD5', // Soft Steel Blue
        '#ED7D31', // Bright Orange
        '#70AD47', // Light Sage Green
        '#7F7F7F', // Medium Slate Grey
        '#4472C4', // Slate Blue
        '#FFC000', // Amber Yellow
        '#A5A5A5', // Light Grey
        '#2B579A', // Indigo Blue
        '#F28F43', // Pastel Orange
        '#107C41', // Dark Olive Green
        '#D9D9D9'  // Very Light Grey
    ],

    // Light versions of primary colors (used for areas / hover)
    blueLight: 'rgba(31, 78, 121, 0.1)',
    orangeLight: 'rgba(245, 130, 32, 0.1)',
    greenLight: 'rgba(46, 125, 50, 0.1)',
    greyLight: 'rgba(127, 127, 127, 0.1)'
};

// Map Chart.js global styles (runs once when script is loaded)
if (window.Chart) {
    const Chart = window.Chart;
    Chart.defaults.font.family = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    Chart.defaults.font.size = 11;
    Chart.defaults.color = '#595959';
    Chart.defaults.plugins.tooltip.padding = 8;
    Chart.defaults.plugins.tooltip.backgroundColor = 'rgba(34, 34, 34, 0.95)';
    Chart.defaults.plugins.tooltip.titleFont = { size: 12, weight: 'bold' };
    Chart.defaults.plugins.tooltip.bodyFont = { size: 11 };
    Chart.defaults.plugins.tooltip.cornerRadius = 4;
}

const ChartUtils = {
    /**
     * Internal helper to cache chart instances to avoid canvas re-creation issues on redraws.
     */
    _instances: {},

    registerInstance(id, chart) {
        if (this._instances[id]) {
            this._instances[id].destroy();
        }
        this._instances[id] = chart;
    },

    destroyInstance(id) {
        if (this._instances[id]) {
            this._instances[id].destroy();
            delete this._instances[id];
        }
    },

    /**
     * Builds a Stacked Column Chart comparing Revenue vs Total Cost over years/months.
     */
    createStackedRevenueCostChart(canvasId, labels, revenueData, costData) {
        this.destroyInstance(canvasId);
        const ctx = document.getElementById(canvasId);
        if (!ctx) return null;

        const chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Sales Revenue',
                        data: revenueData,
                        backgroundColor: ChartColors.blue,
                        borderColor: ChartColors.blue,
                        borderWidth: 1,
                        stack: 'combined'
                    },
                    {
                        label: 'Total Cost',
                        data: costData,
                        backgroundColor: ChartColors.orange,
                        borderColor: ChartColors.orange,
                        borderWidth: 1,
                        stack: 'combined'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: { boxWidth: 12, font: { weight: '500' } }
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                return ` ${context.dataset.label}: ${formatCurrency(context.raw)}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false }
                    },
                    y: {
                        grid: { color: '#E5E5E5' },
                        ticks: {
                            callback: (val) => formatCurrency(val)
                        }
                    }
                }
            }
        });

        this.registerInstance(canvasId, chart);
        return chart;
    },

    /**
     * Builds a Stacked Bar/Column chart supporting grouped stacks.
     * E.g. side-by-side Revenue Stack and Cost Stack.
     */
    createDoubleStackedChart(canvasId, labels, datasets) {
        this.destroyInstance(canvasId);
        const ctx = document.getElementById(canvasId);
        if (!ctx) return null;

        const chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: { boxWidth: 10, font: { size: 10, weight: '500' } }
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                return ` ${context.dataset.label}: ${formatCurrency(context.raw)}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false }
                    },
                    y: {
                        grid: { color: '#E5E5E5' },
                        ticks: {
                            callback: (val) => formatCurrency(val)
                        }
                    }
                }
            }
        });

        this.registerInstance(canvasId, chart);
        return chart;
    },

    /**
     * Builds a Donut Chart. Used for Composition breakups.
     */
    createDonutChart(canvasId, labels, data) {
        this.destroyInstance(canvasId);
        const ctx = document.getElementById(canvasId);
        if (!ctx) return null;

        // Take colors from our corporate palette, wrapping if we run out
        const backgroundColors = data.map((_, i) => ChartColors.palette[i % ChartColors.palette.length]);

        const chart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: backgroundColors,
                    borderWidth: 1,
                    borderColor: '#FFFFFF'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '65%',
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            boxWidth: 10,
                            padding: 10,
                            font: { size: 10, weight: '500' }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const val = context.raw;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const pct = total > 0 ? ((val / total) * 100).toFixed(1) + '%' : '0%';
                                return ` ${context.label}: ${formatCurrency(val)} (${pct})`;
                            }
                        }
                    }
                }
            }
        });

        this.registerInstance(canvasId, chart);
        return chart;
    },

    /**
     * Builds a Line / Combo Chart representing time-series cashflows.
     */
    createLineChart(canvasId, labels, datasets, isCumulative = false) {
        this.destroyInstance(canvasId);
        const ctx = document.getElementById(canvasId);
        if (!ctx) return null;

        const chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: datasets.map(ds => ({
                    ...ds,
                    tension: 0.15,
                    borderWidth: 2,
                    pointRadius: 1,
                    pointHoverRadius: 5
                }))
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: { boxWidth: 12, font: { weight: '500' } }
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            label: (context) => {
                                return ` ${context.dataset.label}: ${formatCurrency(context.raw)}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: {
                            maxTicksLimit: 12
                        }
                    },
                    y: {
                        grid: { color: '#E5E5E5' },
                        ticks: {
                            callback: (val) => formatCurrency(val)
                        }
                    }
                }
            }
        });

        this.registerInstance(canvasId, chart);
        return chart;
    },

    /**
     * Builds a Horizontal Bar Chart. Used for sorted categorical variables.
     */
    createHorizontalBarChart(canvasId, labels, data, datasetLabel, mainColorName = 'blue') {
        this.destroyInstance(canvasId);
        const ctx = document.getElementById(canvasId);
        if (!ctx) return null;

        const color = ChartColors[mainColorName] || ChartColors.blue;

        const chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: datasetLabel,
                    data: data,
                    backgroundColor: color,
                    borderColor: color,
                    borderWidth: 1
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                return ` ${context.dataset.label}: ${formatCurrency(context.raw)}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { color: '#E5E5E5' },
                        ticks: {
                            callback: (val) => formatCurrency(val)
                        }
                    },
                    y: {
                        grid: { display: false }
                    }
                }
            }
        });

        this.registerInstance(canvasId, chart);
        return chart;
    },

    /**
     * Builds a generic vertical bar chart (used in portfolio comparisons).
     */
    createVerticalBarChart(canvasId, labels, data, datasetLabel, mainColorName = 'blue') {
        this.destroyInstance(canvasId);
        const ctx = document.getElementById(canvasId);
        if (!ctx) return null;

        const color = ChartColors[mainColorName] || ChartColors.blue;

        const chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: datasetLabel,
                    data: data,
                    backgroundColor: color,
                    borderColor: color,
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const val = context.raw;
                                if (datasetLabel.toLowerCase().includes('margin') || datasetLabel.toLowerCase().includes('irr')) {
                                    return ` ${context.dataset.label}: ${formatPercent(val)}`;
                                }
                                return ` ${context.dataset.label}: ${formatCurrency(val)}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false }
                    },
                    y: {
                        grid: { color: '#E5E5E5' },
                        ticks: {
                            callback: (val) => {
                                if (datasetLabel.toLowerCase().includes('margin') || datasetLabel.toLowerCase().includes('irr')) {
                                    return formatPercent(val);
                                }
                                return formatCurrency(val);
                            }
                        }
                    }
                }
            }
        });

        this.registerInstance(canvasId, chart);
        return chart;
    },

    createGroupedBudgetChart(canvasId, labels, revenueData, costData) {
        this.destroyInstance(canvasId);
        const ctx = document.getElementById(canvasId);
        if (!ctx) return null;

        const chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Gross Revenue',
                        data: revenueData,
                        backgroundColor: ChartColors.blue,
                        borderColor: ChartColors.blue,
                        borderWidth: 1
                    },
                    {
                        label: 'Total Cost',
                        data: costData,
                        backgroundColor: ChartColors.orange,
                        borderColor: ChartColors.orange,
                        borderWidth: 1
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: { boxWidth: 12, font: { weight: '500' } }
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                return ` ${context.dataset.label}: ${formatCurrency(context.raw)}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false }
                    },
                    y: {
                        grid: { color: '#E5E5E5' },
                        ticks: {
                            callback: (val) => formatCurrency(val)
                        }
                    }
                }
            }
        });

        this.registerInstance(canvasId, chart);
        return chart;
    },

    createScatterChart(canvasId, datasetLabel, dataPoints) {
        this.destroyInstance(canvasId);
        const ctx = document.getElementById(canvasId);
        if (!ctx) return null;

        const chart = new Chart(ctx, {
            type: 'scatter',
            data: {
                datasets: [{
                    label: datasetLabel,
                    data: dataPoints,
                    backgroundColor: '#F58220', // YourLand Orange
                    borderColor: '#F58220',
                    borderWidth: 1,
                    pointRadius: 8,
                    pointHoverRadius: 10
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const pt = context.raw;
                                const dateStr = new Date(pt.x).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
                                return ` ${pt.projectName}: ${formatCurrency(pt.y)} (${dateStr})`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        type: 'linear',
                        grid: { color: '#E5E5E5' },
                        ticks: {
                            callback: (val) => {
                                return new Date(val).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
                            }
                        }
                    },
                    y: {
                        grid: { color: '#E5E5E5' },
                        ticks: {
                            callback: (val) => formatCurrency(val)
                        }
                    }
                }
            }
        });

        this.registerInstance(canvasId, chart);
        return chart;
    }
};

window.ChartColors = ChartColors;
window.ChartUtils = ChartUtils;
