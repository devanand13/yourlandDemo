/**
 * portfolio.js - Page controller for the Portfolio Comparison page.
 * Aggregates and compares project KPIs, renders bar charts, and manages
 * the interactive sortable summary table.
 */

// Sorting State
let currentSortField = 'projectName';
let currentSortDirection = 'asc';
let portfolioDataCached = [];

// Chart Sorting States
let chartSortStates = {
    revenueByProjectChart: 'default',
    marginByProjectChart: 'default',
    irrByProjectChart: 'default',
    profitByProjectChart: 'default',
    peakEquityByProjectChart: 'default'
};

document.addEventListener('DOMContentLoaded', () => {
    initializeDashboardPage('portfolio', renderPortfolioPage);
    setupSortableHeaders();
    setupChartSortControls();
});

/**
 * Main render function triggered on load and state change.
 */
function renderPortfolioPage() {
    console.log('Rendering Portfolio Comparison Page...');

    // 1. Get portfolio dataset from AppState
    const rawData = AppState.getPortfolioData();
    const budget = AppState.getFilter('budget');

    // 2. Perform dynamic IRR calculation for all projects since they are null in KPIs JSON
    const cashflows = DataLoader.getCashflow();
    
    portfolioDataCached = rawData.map(row => {
        let finalIrr = row.irr;
        
        if (finalIrr === null) {
            // Solve dynamically from cashflows
            const projCfs = cashflows
                .filter(c => c.ProjectCode === row.projectCode && c.Scenario === budget)
                .sort((a, b) => a.Period - b.Period)
                .map(c => c.Cashflow);
            
            finalIrr = calculateIRR(projCfs);
        }

        return {
            ...row,
            irr: finalIrr,
            equityIrr: finalIrr !== null ? finalIrr + 2.5 : null
        };
    });

    // 3. Render the cross-project comparison charts
    renderComparisonCharts();

    // 4. Render the sortable table body
    renderPortfolioTableBody();
}

/**
 * Renders the 5 project-by-project comparison bar charts.
 */
function renderComparisonCharts() {
    // 1. Revenue by Project (Now on the top row)
    const revenueData = getSortedChartData('revenue', chartSortStates.revenueByProjectChart);
    ChartUtils.createVerticalBarChart('revenueByProjectChart', revenueData.labels, revenueData.values, 'Total Revenue ($)', 'blue');

    // 2. Development Margin by Project
    const marginData = getSortedChartData('margin', chartSortStates.marginByProjectChart);
    ChartUtils.createVerticalBarChart('marginByProjectChart', marginData.labels, marginData.values, 'Development Margin (%)', 'orange');

    // 3. Project IRR by Project
    const irrData = getSortedChartData('irr', chartSortStates.irrByProjectChart);
    ChartUtils.createVerticalBarChart('irrByProjectChart', irrData.labels, irrData.values, 'Project IRR (%)', 'blue');

    // 4. Development Profit by Project
    const profitData = getSortedChartData('profit', chartSortStates.profitByProjectChart);
    ChartUtils.createVerticalBarChart('profitByProjectChart', profitData.labels, profitData.values, 'Development Profit ($)', 'orange');

    // 5. Peak Equity by Project
    const peakEquityData = getSortedChartData('peakEquity', chartSortStates.peakEquityByProjectChart);
    ChartUtils.createVerticalBarChart('peakEquityByProjectChart', peakEquityData.labels, peakEquityData.values, 'Peak Equity ($)', 'grey');

    // 6. Peak Equity Milestones by Date (Scatter Chart)
    const cashflows = DataLoader.getCashflow();
    const budget = AppState.getFilter('budget');

    const dataPoints = portfolioDataCached.map(row => {
        const projCfs = cashflows.filter(c => c.ProjectCode === row.projectCode && c.Scenario === budget);
        
        let maxEquity = -1;
        let peakDate = null;
        
        projCfs.forEach(c => {
            if (c.CumulativeEquity > maxEquity) {
                maxEquity = c.CumulativeEquity;
                peakDate = c.Date;
            }
        });
        
        if (!peakDate && projCfs.length > 0) {
            peakDate = projCfs[0].Date;
            maxEquity = 0;
        }

        return {
            x: peakDate ? new Date(peakDate).getTime() : 0,
            y: maxEquity,
            projectName: row.projectName,
            dateStr: peakDate
        };
    }).filter(pt => pt.x > 0 && pt.y > 0);

    ChartUtils.createScatterChart('peakEquityByDateChart', 'Peak Equity Milestones', dataPoints);
}

/**
 * Sorts and renders the portfolio summary table rows.
 */
function renderPortfolioTableBody() {
    const tbody = document.getElementById('portfolioTableBody');
    if (!tbody) return;

    if (portfolioDataCached.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center text-muted py-5">
                    <i class="fa-solid fa-triangle-exclamation fs-3 mb-2 text-warning"></i>
                    <p class="mb-0">No projects match the selected filters.</p>
                </td>
            </tr>
        `;
        return;
    }

    // Sort data
    const sortedData = [...portfolioDataCached].sort((a, b) => {
        let valA = a[currentSortField];
        let valB = b[currentSortField];

        // Handle nulls
        if (valA === null || valA === undefined) valA = -9999999;
        if (valB === null || valB === undefined) valB = -9999999;

        // Perform comparison
        if (typeof valA === 'string') {
            return currentSortDirection === 'asc' 
                ? valA.localeCompare(valB) 
                : valB.localeCompare(valA);
        } else {
            return currentSortDirection === 'asc' 
                ? valA - valB 
                : valB - valA;
        }
    });

    // Render HTML rows
    tbody.innerHTML = sortedData.map(row => {
        const stageCodesStr = row.currentStages.length > 0 ? row.currentStages.join(', ') : 'None';
        const statusClass = row.status.toLowerCase().replace(' ', '-');
        
        return `
            <tr>
                <td>
                    <span class="project-name-link" onclick="inspectProject(${row.projectCode})">
                        ${row.projectName} <small class="text-muted">(${row.projectCode})</small>
                    </span>
                </td>
                <td>
                    <span class="status-badge ${statusClass}">${row.status}</span>
                </td>
                <td title="${row.currentStages.map(c => getStageName(c)).join(', ')}">
                    <span class="badge text-bg-light border">${stageCodesStr}</span>
                </td>
                <td class="text-end font-monospace">${formatCurrency(row.revenue)}</td>
                <td class="text-end font-monospace ${row.profit < 0 ? 'text-danger' : ''}">${formatCurrency(row.profit)}</td>
                <td class="text-end font-monospace ${row.margin < 0 ? 'text-danger' : ''}">${formatPercent(row.margin)}</td>
                <td class="text-end font-monospace">${row.irr !== null ? formatPercent(row.irr) : 'N/A'}</td>
                <td class="text-end font-monospace text-muted">${formatCurrency(row.peakEquity)}</td>
            </tr>
        `;
    }).join('');
}

/**
 * Handles clicking on a project link, updates global state and redirects to executive dashboard.
 * @param {number} projectCode 
 */
function inspectProject(projectCode) {
    AppState.setFilter('projectCode', projectCode);
    window.location.href = 'executive.html';
}

/**
 * Registers click events on table headers to perform sorting.
 */
function setupSortableHeaders() {
    const headers = document.querySelectorAll('#portfolioTable th[data-sort]');
    
    headers.forEach(th => {
        th.addEventListener('click', () => {
            const field = th.getAttribute('data-sort');
            
            // Toggle direction if same field, else default to asc
            if (currentSortField === field) {
                currentSortDirection = currentSortDirection === 'asc' ? 'desc' : 'asc';
            } else {
                currentSortField = field;
                currentSortDirection = 'asc';
            }
            
            // Update header arrow classes
            headers.forEach(h => {
                h.classList.remove('sorted-asc', 'sorted-desc');
            });
            th.classList.add(currentSortDirection === 'asc' ? 'sorted-asc' : 'sorted-desc');
            
            // Re-render table body
            renderPortfolioTableBody();
        });
    });
}

// Export inspect function globally
window.inspectProject = inspectProject;

/**
 * Sorts data for a specific chart based on the selected sort state.
 */
function getSortedChartData(kpiField, sortState) {
    const mapped = portfolioDataCached.map(r => ({
        label: r.projectName,
        value: r[kpiField] === null || r[kpiField] === undefined ? 0 : r[kpiField]
    }));

    if (sortState === 'asc') {
        mapped.sort((a, b) => a.value - b.value);
    } else if (sortState === 'desc') {
        mapped.sort((a, b) => b.value - a.value);
    }

    return {
        labels: mapped.map(item => item.label),
        values: mapped.map(item => item.value)
    };
}

/**
 * Sets up the event listeners for chart sorting buttons.
 */
function setupChartSortControls() {
    const sortButtons = document.querySelectorAll('.chart-sort-btn');
    sortButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const container = btn.closest('.chart-sort-controls');
            if (!container) return;
            
            const chartId = container.getAttribute('data-chart');
            const sortVal = btn.getAttribute('data-sort');
            
            // Update state
            chartSortStates[chartId] = sortVal;
            
            // Update active class in UI
            container.querySelectorAll('.chart-sort-btn').forEach(b => {
                b.classList.remove('active');
            });
            btn.classList.add('active');
            
            // Re-render comparison charts
            renderComparisonCharts();
        });
    });
}
