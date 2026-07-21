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
    },

    /**
     * Builds a combined Stacked Bar + Line chart for Portfolio Cashflow Timeline.
     */
    createPortfolioCashflowTimelineChart(canvasId, labels, datasets) {
        this.destroyInstance(canvasId);
        const ctx = document.getElementById(canvasId);
        if (!ctx) return null;

        // Helper to align zero lines of left and right Y-axes
        function getAlignedScales(leftMin, leftMax, rightMin, rightMax) {
            leftMin = Math.min(0, leftMin);
            leftMax = Math.max(0, leftMax);
            rightMin = Math.min(0, rightMin);
            rightMax = Math.max(0, rightMax);

            if (leftMax === 0) leftMax = 1;
            if (rightMax === 0) rightMax = 1;
            if (leftMin === 0) leftMin = -1;
            if (rightMin === 0) rightMin = -1;

            const leftRatio = leftMin / leftMax;
            const rightRatio = rightMin / rightMax;

            let finalLeftMin = leftMin;
            let finalRightMin = rightMin;

            if (leftRatio < rightRatio) {
                finalRightMin = rightMax * leftRatio;
            } else if (rightRatio < leftRatio) {
                finalLeftMin = leftMax * rightRatio;
            }

            const leftRange = leftMax - finalLeftMin;
            const rightRange = rightMax - finalRightMin;

            return {
                minY: finalLeftMin - leftRange * 0.05,
                maxY: leftMax + leftRange * 0.05,
                minY2: finalRightMin - rightRange * 0.05,
                maxY2: rightMax + rightRange * 0.05
            };
        }

        // Helper to calculate scales based on current dataset visibility
        function calculateScales(chartLabels, chartDatasets, getMetaCallback) {
            const numDataPoints = chartLabels.length;
            const posSums = new Array(numDataPoints).fill(0);
            const negSums = new Array(numDataPoints).fill(0);

            chartDatasets.forEach((ds, dsIndex) => {
                if (ds.type === 'bar') {
                    const meta = getMetaCallback ? getMetaCallback(dsIndex) : null;
                    const isHidden = meta ? meta.hidden : ds.hidden;
                    if (!isHidden) {
                        for (let i = 0; i < numDataPoints; i++) {
                            const val = ds.data[i] || 0;
                            if (val > 0) posSums[i] += val;
                            else negSums[i] += val;
                        }
                    }
                }
            });

            const leftMax = Math.max(...posSums, 0);
            const leftMin = Math.min(...negSums, 0);

            const lineDataset = chartDatasets.find(ds => ds.type === 'line');
            const rightMax = lineDataset ? Math.max(...lineDataset.data, 0) : 0;
            const rightMin = lineDataset ? Math.min(...lineDataset.data, 0) : 0;

            return getAlignedScales(leftMin, leftMax, rightMin, rightMax);
        }

        // Calculate initial scales
        const initialScales = calculateScales(labels, datasets, null);

        const chart = new Chart(ctx, {
            type: 'bar', // default type, can be overridden per dataset
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
                        labels: {
                            boxWidth: 10,
                            font: { size: 10, weight: '500' }
                        },
                        onClick: (e, legendItem, legend) => {
                            const index = legendItem.datasetIndex;
                            const chart = legend.chart;
                            const clickedDataset = chart.data.datasets[index];
                            
                            const meta = chart.getDatasetMeta(index);
                            meta.hidden = meta.hidden === null ? !clickedDataset.hidden : null;
                            
                            if (clickedDataset.type === 'bar') {
                                // Recalculate cumulative cashflows for the visible project datasets
                                const lineDataset = chart.data.datasets.find(ds => ds.type === 'line');
                                if (lineDataset) {
                                    const numDataPoints = chart.data.labels.length;
                                    const newCumulativeData = new Array(numDataPoints).fill(0);
                                    
                                    let runningTotal = 0;
                                    for (let i = 0; i < numDataPoints; i++) {
                                        let monthlySum = 0;
                                        chart.data.datasets.forEach((ds, dsIndex) => {
                                            if (ds.type === 'bar') {
                                                const meta = chart.getDatasetMeta(dsIndex);
                                                if (!meta.hidden) {
                                                    monthlySum += ds.data[i] || 0;
                                                }
                                            }
                                        });
                                        runningTotal += monthlySum;
                                        newCumulativeData[i] = runningTotal;
                                    }
                                    lineDataset.data = newCumulativeData;
                                }
                            }

                            // Re-align zero lines based on current visibility state
                            const newScales = calculateScales(chart.data.labels, chart.data.datasets, (idx) => chart.getDatasetMeta(idx));
                            chart.options.scales.y.min = newScales.minY;
                            chart.options.scales.y.max = newScales.maxY;
                            chart.options.scales.ySecondary.min = newScales.minY2;
                            chart.options.scales.ySecondary.max = newScales.maxY2;
                            
                            chart.update();
                        }
                    },
                    tooltip: {
                        filter: (tooltipItem) => tooltipItem.dataset.type === 'bar',
                        callbacks: {
                            label: (context) => {
                                const val = context.raw;
                                const formattedVal = val >= 0 ? `+${formatCurrency(val)}` : formatCurrency(val);
                                return ` ${context.dataset.label}: ${formattedVal}`;
                            },
                            afterBody: (context) => {
                                const dataIndex = context[0].dataIndex;
                                const chart = context[0].chart;
                                
                                let monthlyTotal = 0;
                                chart.data.datasets.forEach(ds => {
                                    if (ds.type === 'bar') {
                                        const meta = chart.getDatasetMeta(chart.data.datasets.indexOf(ds));
                                        if (!meta.hidden) {
                                            monthlyTotal += ds.data[dataIndex] || 0;
                                        }
                                    }
                                });
                                
                                const lineDataset = chart.data.datasets.find(ds => ds.type === 'line');
                                const cumulativeTotal = lineDataset ? lineDataset.data[dataIndex] : 0;
                                
                                const formattedMonthly = monthlyTotal >= 0 ? `+${formatCurrency(monthlyTotal)}` : formatCurrency(monthlyTotal);
                                const formattedCumulative = cumulativeTotal >= 0 ? `+${formatCurrency(cumulativeTotal)}` : formatCurrency(cumulativeTotal);
                                
                                return [
                                    '----------------------------',
                                    `Portfolio Monthly Cashflow: ${formattedMonthly}`,
                                    `Portfolio Cumulative Cashflow: ${formattedCumulative}`
                                ];
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: true,
                            color: '#E5E5E5'
                        }
                    },
                    y: {
                        stacked: true,
                        type: 'linear',
                        position: 'left',
                        min: initialScales.minY,
                        max: initialScales.maxY,
                        grid: {
                            color: (context) => context.tick && context.tick.value === 0 ? '#595959' : '#E5E5E5',
                            lineWidth: (context) => context.tick && context.tick.value === 0 ? 2 : 1
                        },
                        ticks: {
                            callback: (val) => formatCurrency(val)
                        },
                        title: {
                            display: true,
                            text: 'Cashflow Amount ($)',
                            font: { weight: 'bold' }
                        }
                    },
                    ySecondary: {
                        stacked: false,
                        type: 'linear',
                        position: 'right',
                        min: initialScales.minY2,
                        max: initialScales.maxY2,
                        grid: {
                            drawOnChartArea: false
                        },
                        ticks: {
                            callback: (val) => formatCurrency(val)
                        },
                        title: {
                            display: true,
                            text: 'Portfolio Cumulative Cashflow ($)',
                            font: { weight: 'bold' }
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
