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

    // 3a. Update Portfolio KPI Cards
    renderPortfolioKPIs();

    // 3b. Render Portfolio-level Aggregated Charts
    renderPortfolioAggregatedCharts();

    // 3c. Render Portfolio Cashflow Timeline Chart
    renderPortfolioCashflowTimelineChart();

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

/**
 * Renders the aggregated KPIs for the portfolio.
 */
function renderPortfolioKPIs() {
    const totalProfit = portfolioDataCached.reduce((sum, r) => sum + (r.profit || 0), 0);
    const totalRevenue = portfolioDataCached.reduce((sum, r) => sum + (r.revenue || 0), 0);
    const avgMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    const profitEl = document.getElementById('portfolio-kpi-profit');
    const marginEl = document.getElementById('portfolio-kpi-margin');

    if (profitEl) profitEl.textContent = formatCurrency(totalProfit);
    if (marginEl) marginEl.textContent = formatPercent(avgMargin);
}

/**
 * Renders the portfolio level aggregated charts.
 */
function renderPortfolioAggregatedCharts() {
    const projectCodes = portfolioDataCached.map(p => p.projectCode);
    const cashflows = DataLoader.getCashflow();
    const budget = AppState.getFilter('budget');
    const filteredCashflow = cashflows.filter(c => projectCodes.includes(c.ProjectCode) && c.Scenario === budget);

    // 1. Stacked Yearly Revenue vs Cost Chart
    let labels = [];
    let revenueDataSets = { sales: [], rental: [], other: [] };
    let costDataSets = {
        land: [], construction: [], infrastructure: [], professional: [],
        statutory: [], landscaping: [], selling: [], marketing: [], finance: [], operating: []
    };

    const years = [...new Set(filteredCashflow.map(c => c.Year))].sort((a, b) => a - b);
    labels = years;

    years.forEach(yr => {
        const yrRows = filteredCashflow.filter(c => c.Year === yr);

        revenueDataSets.sales.push(yrRows.reduce((sum, r) => sum + (r.SalesRevenue || 0), 0));
        revenueDataSets.rental.push(yrRows.reduce((sum, r) => sum + (r.RentalIncome || 0), 0));
        revenueDataSets.other.push(yrRows.reduce((sum, r) => sum + (r.OtherIncome || 0), 0));

        costDataSets.land.push(yrRows.reduce((sum, r) => sum + (r.LandCost || 0), 0));
        costDataSets.construction.push(yrRows.reduce((sum, r) => sum + (r.ConstructionCost || 0), 0));
        costDataSets.infrastructure.push(yrRows.reduce((sum, r) => sum + (r.InfrastructureCost || 0), 0));
        costDataSets.professional.push(yrRows.reduce((sum, r) => sum + (r.ProfessionalFees || 0), 0));
        costDataSets.statutory.push(yrRows.reduce((sum, r) => sum + (r.StatutoryFees || 0), 0));
        costDataSets.landscaping.push(yrRows.reduce((sum, r) => sum + (r.LandscapingCost || 0), 0));
        costDataSets.selling.push(yrRows.reduce((sum, r) => sum + (r.SellingCost || 0), 0));
        costDataSets.marketing.push(yrRows.reduce((sum, r) => sum + (r.MarketingCost || 0), 0));
        costDataSets.finance.push(yrRows.reduce((sum, r) => sum + (r.FinanceCost || 0), 0));
        costDataSets.operating.push(yrRows.reduce((sum, r) => sum + (r.OperatingCost || 0), 0));
    });

    const chartDatasets = [
        { label: 'Sales Revenue', data: revenueDataSets.sales, backgroundColor: '#1F4E79', stack: 'revenue' },
        { label: 'Rental Income', data: revenueDataSets.rental, backgroundColor: '#2F75B5', stack: 'revenue' },
        { label: 'Other Income', data: revenueDataSets.other, backgroundColor: '#9BC2E6', stack: 'revenue' },
        { label: 'Land Cost', data: costDataSets.land, backgroundColor: '#C65911', stack: 'cost' },
        { label: 'Construction', data: costDataSets.construction, backgroundColor: '#F58220', stack: 'cost' },
        { label: 'Infrastructure', data: costDataSets.infrastructure, backgroundColor: '#ED7D31', stack: 'cost' },
        { label: 'Professional Fees', data: costDataSets.professional, backgroundColor: '#F8CBAD', stack: 'cost' },
        { label: 'Statutory Fees', data: costDataSets.statutory, backgroundColor: '#7F7F7F', stack: 'cost' },
        { label: 'Landscaping', data: costDataSets.landscaping, backgroundColor: '#A6A6A6', stack: 'cost' },
        { label: 'Selling', data: costDataSets.selling, backgroundColor: '#2E7D32', stack: 'cost' },
        { label: 'Marketing', data: costDataSets.marketing, backgroundColor: '#70AD47', stack: 'cost' },
        { label: 'Finance Costs', data: costDataSets.finance, backgroundColor: '#FFC000', stack: 'cost' },
        { label: 'Operating Costs', data: costDataSets.operating, backgroundColor: '#D9D9D9', stack: 'cost' }
    ];

    ChartUtils.createDoubleStackedChart('revenueCostStackedChart', labels, chartDatasets);

    // 2. Revenue Composition Donut Chart
    const totalSales = filteredCashflow.reduce((s, r) => s + (r.SalesRevenue || 0), 0);
    const totalRental = filteredCashflow.reduce((s, r) => s + (r.RentalIncome || 0), 0);
    const totalOther = filteredCashflow.reduce((s, r) => s + (r.OtherIncome || 0), 0);
    ChartUtils.createDonutChart('revenueCompositionChart', ['Sales Revenue', 'Rental Income', 'Other Income'], [totalSales, totalRental, totalOther]);

    // 3. Cost Composition Donut Chart
    const totalLand = filteredCashflow.reduce((s, r) => s + (r.LandCost || 0), 0);
    const totalConst = filteredCashflow.reduce((s, r) => s + (r.ConstructionCost || 0), 0);
    const totalInfra = filteredCashflow.reduce((s, r) => s + (r.InfrastructureCost || 0), 0);
    const totalProf = filteredCashflow.reduce((s, r) => s + (r.ProfessionalFees || 0), 0);
    const totalStat = filteredCashflow.reduce((s, r) => s + (r.StatutoryFees || 0), 0);
    const totalScape = filteredCashflow.reduce((s, r) => s + (r.LandscapingCost || 0), 0);
    const totalSell = filteredCashflow.reduce((s, r) => s + (r.SellingCost || 0), 0);
    const totalMktg = filteredCashflow.reduce((s, r) => s + (r.MarketingCost || 0), 0);
    const totalFin = filteredCashflow.reduce((s, r) => s + (r.FinanceCost || 0), 0);
    const totalOper = filteredCashflow.reduce((s, r) => s + (r.OperatingCost || 0), 0);

    const costLabels = ['Land', 'Construction', 'Infrastructure', 'Professional', 'Statutory', 'Landscaping', 'Selling', 'Marketing', 'Finance', 'Operating'];
    const costValues = [totalLand, totalConst, totalInfra, totalProf, totalStat, totalScape, totalSell, totalMktg, totalFin, totalOper];
    ChartUtils.createDonutChart('costCompositionChart', costLabels, costValues);
}

/**
 * Renders the Portfolio Cashflow Timeline chart (combined Stacked Bar + Line chart).
 */
function renderPortfolioCashflowTimelineChart() {
    const canvasId = 'portfolioCashflowTimelineChart';
    const canvas = document.getElementById(canvasId);
    const emptyState = document.getElementById('portfolioTimelineEmptyState');
    
    if (!canvas) return;
    
    const projectCodes = portfolioDataCached.map(p => p.projectCode);
    const cashflows = DataLoader.getCashflow();
    const budget = AppState.getFilter('budget');
    const filteredCashflow = cashflows.filter(c => projectCodes.includes(c.ProjectCode) && c.Scenario === budget);
    
    // Check if we have active projects and cashflow data
    if (projectCodes.length === 0 || filteredCashflow.length === 0) {
        if (emptyState) emptyState.classList.remove('d-none');
        canvas.classList.add('d-none');
        ChartUtils.destroyInstance(canvasId);
        return;
    }
    
    // Get unique sorted periods
    const periods = [...new Set(filteredCashflow.map(c => c.Period))].sort((a, b) => a - b);
    
    if (periods.length === 0) {
        if (emptyState) emptyState.classList.remove('d-none');
        canvas.classList.add('d-none');
        ChartUtils.destroyInstance(canvasId);
        return;
    }
    
    // Hide empty state if data exists
    if (emptyState) emptyState.classList.add('d-none');
    canvas.classList.remove('d-none');
    
    // Build X-axis labels
    const labels = [];
    periods.forEach(p => {
        const row = filteredCashflow.find(c => c.Period === p);
        if (row) {
            labels.push(`${row.MonthName} ${row.Year}`);
        } else {
            labels.push(`P${p}`);
        }
    });
    
    const datasets = [];
    const monthlyTotals = new Array(periods.length).fill(0);
    
    // Build project-level monthly cashflow datasets
    portfolioDataCached.forEach((proj, idx) => {
        const projData = [];
        periods.forEach((p, pIdx) => {
            const row = filteredCashflow.find(c => c.ProjectCode === proj.projectCode && c.Period === p);
            const val = row ? (row.Cashflow || 0) : 0;
            projData.push(val);
            monthlyTotals[pIdx] += val;
        });
        
        const color = ChartColors.palette[idx % ChartColors.palette.length];
        
        datasets.push({
            type: 'bar',
            label: proj.projectName,
            data: projData,
            backgroundColor: color,
            borderColor: color,
            borderWidth: 1,
            stack: 'cashflow',
            yAxisID: 'y'
        });
    });
    
    // Calculate running cumulative cashflow total (running total of monthly portfolio sums)
    let runningTotal = 0;
    const cumulativeData = [];
    monthlyTotals.forEach(val => {
        runningTotal += val;
        cumulativeData.push(runningTotal);
    });
    
    // Append cumulative cashflow line dataset
    datasets.push({
        type: 'line',
        label: 'Portfolio Cumulative Cashflow',
        data: cumulativeData,
        borderColor: ChartColors.blue, // Deep corporate blue
        borderWidth: 3,
        tension: 0.3,
        pointBackgroundColor: '#FFFFFF',
        pointBorderColor: ChartColors.blue,
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        fill: false,
        yAxisID: 'ySecondary'
    });
    
    ChartUtils.createPortfolioCashflowTimelineChart(canvasId, labels, datasets);
}
