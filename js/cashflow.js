/**
 * cashflow.js - Page controller for the Cashflow & Timeline page.
 * Processes time-series cashflows and generates the Gantt timeline widget.
 */

document.addEventListener('DOMContentLoaded', () => {
    initializeDashboardPage('cashflow', renderCashflowPage);
});

/**
 * Main render function triggered on load and state change.
 */
function renderCashflowPage() {
    console.log('Rendering Cashflow & Timeline Page...');

    const project = AppState.getCurrentProject();
    const kpi = AppState.getCurrentKPIs();
    const stages = AppState.getCurrentStages();
    
    // Time series cashflows
    const lifetimeCashflow = AppState.getFilteredCashflow(true); // whole timeline
    const filteredCashflow = AppState.getFilteredCashflow(false); // respecting Year filter

    if (!project) {
        console.error('CashflowPage: No project selected.');
        return;
    }

    // ----------------------------------------------------
    // 1. UPDATE MILESTONE KPI CARDS
    // ----------------------------------------------------
    
    // Peak Equity Milestone (stored as PeakEquity and PeakEquityPeriod)
    let peakVal = kpi ? kpi.PeakEquity : 0;
    let peakPeriod = kpi ? kpi.PeakEquityPeriod : 0;
    
    // Find matching date for peak period in cashflow
    let peakDateStr = `Period ${peakPeriod}`;
    const peakRow = lifetimeCashflow.find(c => c.Period === peakPeriod);
    if (peakRow) {
        peakDateStr = `Period ${peakPeriod} (${peakRow.MonthName} ${peakRow.Year})`;
    }
    
    updateKPIValue('kpi-peak-val', formatCurrency(peakVal));
    const peakDateEl = document.getElementById('kpi-peak-date');
    if (peakDateEl) peakDateEl.textContent = peakDateStr;

    // Breakeven Milestone
    let breakevenPeriod = kpi ? kpi.BreakevenPeriod : null;
    const breakevenValEl = document.getElementById('kpi-breakeven-val');
    const breakevenDateEl = document.getElementById('kpi-breakeven-date');
    const breakevenBadge = document.getElementById('badge-breakeven-status');
    
    if (breakevenPeriod && breakevenPeriod > 0) {
        const beRow = lifetimeCashflow.find(c => c.Period === breakevenPeriod);
        let beDateStr = `Period ${breakevenPeriod}`;
        if (beRow) {
            beDateStr = `Period ${breakevenPeriod} (${beRow.MonthName} ${beRow.Year})`;
        }
        
        if (breakevenValEl) breakevenValEl.textContent = `P${breakevenPeriod}`;
        if (breakevenDateEl) breakevenDateEl.textContent = beDateStr;
        if (breakevenBadge) {
            breakevenBadge.className = 'badge text-bg-success rounded-pill';
            breakevenBadge.textContent = 'Breakeven Achieved';
        }
    } else {
        // Project doesn't break even
        if (breakevenValEl) breakevenValEl.textContent = 'N/A';
        if (breakevenDateEl) breakevenDateEl.textContent = 'No Breakeven Achieved';
        if (breakevenBadge) {
            breakevenBadge.className = 'badge text-bg-secondary rounded-pill';
            
            // Check if project has negative margin
            const margin = kpi ? kpi.DevelopmentMargin : 0;
            if (margin < 0) {
                breakevenBadge.textContent = 'Deficit Scenario';
                breakevenBadge.className = 'badge text-bg-danger rounded-pill';
            } else {
                breakevenBadge.textContent = 'Ongoing Development';
            }
        }
    }

    // ----------------------------------------------------
    // 2. RENDER CUSTOM GANTT TIMELINE WIDGET
    // ----------------------------------------------------
    renderGanttTimeline(project, stages, kpi, lifetimeCashflow);

    // ----------------------------------------------------
    // 3. RENDER TIME-SERIES CHARTS (respecting Year filter)
    // ----------------------------------------------------
    
    // Labels (dates formatted)
    const labels = filteredCashflow.map(c => `${c.MonthName} ${c.Year.toString().slice(-2)}`);
    
    // Dataset values
    const revenues = filteredCashflow.map(c => c.Revenue || 0);
    const costs = filteredCashflow.map(c => c.TotalCost || 0);
    const netCashflows = filteredCashflow.map(c => c.Cashflow || 0);
    
    const cumulative = filteredCashflow.map(c => c.CumulativeCashflow || 0);
    const loans = filteredCashflow.map(c => c.LoanBalance || 0);
    const equities = filteredCashflow.map(c => c.EquityContribution || 0);

    // Chart 1: Combination Monthly Cashflow Performance
    const monthlyDatasets = [
        {
            type: 'bar',
            label: 'Monthly Revenue',
            data: revenues,
            backgroundColor: '#1F4E79',
            borderColor: '#1F4E79',
            borderWidth: 1,
            order: 2
        },
        {
            type: 'bar',
            label: 'Monthly Cost',
            data: costs,
            backgroundColor: '#F58220',
            borderColor: '#F58220',
            borderWidth: 1,
            order: 3
        },
        {
            type: 'line',
            label: 'Net Cashflow',
            data: netCashflows,
            borderColor: '#2E7D32',
            backgroundColor: 'transparent',
            borderWidth: 2,
            pointRadius: 1,
            order: 1
        }
    ];
    
    ChartUtils.createLineChart('monthlyCashflowChart', labels, monthlyDatasets);

    // Chart 2: Cumulative Cashflow & Funding
    const fundingDatasets = [
        {
            label: 'Cumulative Cashflow',
            data: cumulative,
            borderColor: '#2E7D32',
            backgroundColor: 'transparent'
        },
        {
            label: 'Loan Balance (Debt)',
            data: loans,
            borderColor: '#7F7F7F',
            backgroundColor: 'rgba(127, 127, 127, 0.05)',
            fill: true
        },
        {
            label: 'Equity Injection',
            data: equities,
            borderColor: '#1F4E79',
            backgroundColor: 'transparent'
        }
    ];

    ChartUtils.createLineChart('fundingChart', labels, fundingDatasets, true);
}

/**
 * Builds the HTML Gantt Stage Timeline dynamically.
 */
function renderGanttTimeline(project, stages, kpi, cashflow) {
    const container = document.getElementById('ganttTimelineWidget');
    if (!container) return;

    // Check if stages are available
    if (!stages || stages.length === 0) {
        container.innerHTML = `
            <div class="text-center text-muted py-5">
                <i class="fa-solid fa-triangle-exclamation fs-3 mb-2 text-warning"></i>
                <p class="mb-0">No stages data found in stages.json for project ${project.ProjectCode}.</p>
            </div>
        `;
        return;
    }

    // Sort stages by StartPeriod
    const sortedStages = [...stages].sort((a, b) => a.StartPeriod - b.StartPeriod);

    // Calculate project overall timeline boundaries
    const projStart = project.StartPeriod;
    const projEnd = project.EndPeriod;
    const projDuration = projEnd - projStart;

    if (projDuration <= 0) {
        container.innerHTML = `<div class="text-center text-muted py-5"><p>Invalid project timeline boundaries.</p></div>`;
        return;
    }

    // 1. Create Headers (Timeline ticks - e.g., 8 divisions)
    const tickCount = 8;
    const tickInterval = projDuration / tickCount;
    let headerTicksHtml = '';
    
    for (let i = 0; i <= tickCount; i++) {
        const period = Math.round(projStart + (i * tickInterval));
        
        // Find date for this tick period
        let dateLabel = `P${period}`;
        const cfRow = cashflow.find(c => c.Period === period);
        if (cfRow) {
            dateLabel = `${cfRow.MonthName} '${cfRow.Year.toString().slice(-2)}`;
        }
        
        headerTicksHtml += `<div class="gantt-header-tick" style="flex: 1;">${dateLabel}</div>`;
    }

    let ganttHtml = `
        <!-- Gantt Header -->
        <div class="gantt-header-row">
            <div class="gantt-header-label">Development Stage</div>
            <div class="gantt-header-ticks">
                ${headerTicksHtml}
            </div>
        </div>
        
        <!-- Grid overlay -->
        <div class="timeline-gantt-grid">
            ${Array(tickCount).fill('<div class="gantt-grid-col"></div>').join('')}
        </div>
    `;

    // 2. Add Row for each Stage
    sortedStages.forEach(stage => {
        const stageName = getStageName(stage.StageCode);
        
        // Calculate percentages
        const leftPct = ((stage.StartPeriod - projStart) / projDuration) * 100;
        const widthPct = ((stage.EndPeriod - stage.StartPeriod) / projDuration) * 100;
        
        // Safety boundings
        const safeLeft = Math.max(0, Math.min(100, leftPct));
        const safeWidth = Math.max(1, Math.min(100 - safeLeft, widthPct));

        const barClass = stage.CurrentStage ? 'gantt-bar active-bar' : 'gantt-bar';

        ganttHtml += `
            <div class="gantt-row">
                <div class="gantt-row-label" title="${stage.StageCode} - ${stageName}">
                    <span class="fw-bold">${stage.StageCode}</span> &bull; ${stageName}
                </div>
                <div class="gantt-bar-container">
                    <div class="${barClass}" 
                         style="left: ${safeLeft}%; width: ${safeWidth}%;"
                         title="${stageName} (Period ${stage.StartPeriod} to ${stage.EndPeriod})">
                         P${stage.StartPeriod} - P${stage.EndPeriod}
                    </div>
                </div>
            </div>
        `;
    });

    // 3. Milestone Markers overlay (Peak Equity & Breakeven)
    let milestoneHtml = '';
    
    // Peak Equity Marker
    let peakPeriod = kpi ? kpi.PeakEquityPeriod : 0;
    if (peakPeriod >= projStart && peakPeriod <= projEnd) {
        const peakLeft = ((peakPeriod - projStart) / projDuration) * 100;
        milestoneHtml += `
            <div class="milestone-marker peak-equity-marker" style="left: ${peakLeft}%;">
                <div class="milestone-label" style="transform: translateX(-50%);">
                    <i class="fa-solid fa-landmark me-1"></i>Peak Equity (P${peakPeriod})
                </div>
            </div>
        `;
    }

    // Breakeven Marker
    let breakevenPeriod = kpi ? kpi.BreakevenPeriod : null;
    if (breakevenPeriod && breakevenPeriod >= projStart && breakevenPeriod <= projEnd) {
        const beLeft = ((breakevenPeriod - projStart) / projDuration) * 100;
        milestoneHtml += `
            <div class="milestone-marker breakeven-marker" style="left: ${beLeft}%;">
                <div class="milestone-label" style="transform: translateX(-50%);">
                    <i class="fa-solid fa-flag me-1"></i>Breakeven (P${breakevenPeriod})
                </div>
            </div>
        `;
    }

    ganttHtml += `
        <!-- Milestones Layer -->
        <div class="timeline-markers-row">
            ${milestoneHtml}
        </div>
    `;

    container.innerHTML = ganttHtml;
}
