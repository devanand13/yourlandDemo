/**
 * executive.js - Page controller for the Executive Summary page.
 * Transforms data and binds it to cards and Chart.js instances.
 */

document.addEventListener('DOMContentLoaded', () => {
    // Bootstrap the page
    initializeDashboardPage('executive', renderExecutivePage);
});

/**
 * Main render function triggered on load and state change.
 */
function renderExecutivePage() {
    console.log('Rendering Executive Summary Page...');
    
    const project = AppState.getCurrentProject();
    const kpi = AppState.getCurrentKPIs();
    const stages = AppState.getCurrentStages();
    
    // Get cashflow records
    // For KPIs, we want lifetime values (ignore year filter), but for charts we respect the Year filter
    const lifetimeCashflow = AppState.getFilteredCashflow(true);
    const filteredCashflow = AppState.getFilteredCashflow(false);

    if (!project) {
        console.error('ExecutivePage: No project selected.');
        return;
    }

    // ----------------------------------------------------
    // 1. UPDATE KPI CARDS
    // ----------------------------------------------------
    
    // Dev Margin (Percent)
    let margin = kpi ? kpi.DevelopmentMargin : 0;
    updateKPIValue('kpi-margin', formatPercent(margin));
    const badgeMargin = document.getElementById('badge-margin');
    if (badgeMargin) {
        badgeMargin.className = `kpi-status-badge ${margin >= 20 ? 'positive' : 'negative'}`;
        badgeMargin.textContent = margin >= 20 ? 'Target Achieved' : 'Below Target';
    }

    // Dev Profit (Currency)
    let profit = kpi ? kpi.DevelopmentProfit : 0;
    updateKPIValue('kpi-profit', formatCurrency(profit));
    const badgeProfit = document.getElementById('badge-profit');
    if (badgeProfit) {
        badgeProfit.className = `kpi-status-badge ${profit >= 0 ? 'positive' : 'negative'}`;
        badgeProfit.textContent = profit >= 0 ? 'Surplus' : 'Deficit';
    }

    // Project IRR
    const rawCfs = lifetimeCashflow.map(c => c.Cashflow);
    let projectIRR = (kpi && kpi.ProjectIRR !== null) ? kpi.ProjectIRR : calculateIRR(rawCfs);
    updateKPIValue('kpi-project-irr', projectIRR !== null ? formatPercent(projectIRR) : 'N/A');
    const badgeProjIrr = document.getElementById('badge-project-irr');
    if (badgeProjIrr) {
        if (projectIRR !== null) {
            badgeProjIrr.className = `kpi-status-badge ${projectIRR >= 15 ? 'positive' : 'negative'}`;
            badgeProjIrr.textContent = projectIRR >= 15 ? 'Excellent' : 'Moderate';
        } else {
            badgeProjIrr.className = 'kpi-status-badge bg-light text-secondary';
            badgeProjIrr.textContent = 'Lifetime';
        }
    }

    // Equity IRR
    let equityIRR = (kpi && kpi.EquityIRR !== null) ? kpi.EquityIRR : (projectIRR !== null ? projectIRR + 2.5 : null);
    updateKPIValue('kpi-equity-irr', equityIRR !== null ? formatPercent(equityIRR) : 'N/A');
    const badgeEquityIrr = document.getElementById('badge-equity-irr');
    if (badgeEquityIrr) {
        if (equityIRR !== null) {
            badgeEquityIrr.className = `kpi-status-badge ${equityIRR >= 18 ? 'positive' : 'negative'}`;
            badgeEquityIrr.textContent = equityIRR >= 18 ? 'Strong' : 'Moderate';
        } else {
            badgeEquityIrr.className = 'kpi-status-badge bg-light text-secondary';
            badgeEquityIrr.textContent = 'Leveraged';
        }
    }

    // Peak Equity (stored as PeakEquity, typically Max Loan Balance)
    let peakEquity = kpi ? kpi.PeakEquity : 0;
    updateKPIValue('kpi-peak-equity', formatCurrency(peakEquity));
    
    // NPV (Discounted)
    let npv = kpi ? kpi.NPV : calculateNPV(rawCfs, 0.10);
    updateKPIValue('kpi-npv', formatCurrency(npv));
    const badgeNpv = document.getElementById('badge-npv');
    if (badgeNpv) {
        badgeNpv.className = `kpi-status-badge ${npv >= 0 ? 'positive' : 'negative'}`;
        badgeNpv.textContent = npv >= 0 ? 'Feasible' : 'Unfeasible';
    }

    // ----------------------------------------------------
    // 1.5. BUDGET COMPARISON & VARIANCE MATRIX (ROW 2)
    // ----------------------------------------------------
    const kpis = DataLoader.getKPIs();
    const kpiCurrent = kpis.find(k => k.ProjectCode === project.ProjectCode && k.Scenario === 'CurrentBudget');
    const kpiOriginal = kpis.find(k => k.ProjectCode === project.ProjectCode && k.Scenario === 'OriginalBudget');
    const kpiProject = kpis.find(k => k.ProjectCode === project.ProjectCode && k.Scenario === 'ProjectBudget');
    const kpiPrevious = kpis.find(k => k.ProjectCode === project.ProjectCode && k.Scenario === 'PreviousBudget');

    // Left Chart: Revenue vs Cost across all 4 budgets
    const budgetLabels = ['Original Budget', 'Project Budget', 'Previous Budget', 'Current Budget'];
    const revenueData = [
        kpiOriginal ? kpiOriginal.Revenue : 0,
        kpiProject ? kpiProject.Revenue : 0,
        kpiPrevious ? kpiPrevious.Revenue : 0,
        kpiCurrent ? kpiCurrent.Revenue : 0
    ];
    const costData = [
        kpiOriginal ? kpiOriginal.TotalCost : 0,
        kpiProject ? kpiProject.TotalCost : 0,
        kpiPrevious ? kpiPrevious.TotalCost : 0,
        kpiCurrent ? kpiCurrent.TotalCost : 0
    ];
    ChartUtils.createGroupedBudgetChart('budgetComparisonChart', budgetLabels, revenueData, costData);

    // Right Table: Matrix comparing Current to Original, Project, Previous
    const cf = DataLoader.getCashflow();
    const cfsCurrent = cf.filter(c => c.ProjectCode === project.ProjectCode && c.Scenario === 'CurrentBudget').sort((a,b)=>a.Period-b.Period).map(c=>c.Cashflow);
    const cfsOriginal = cf.filter(c => c.ProjectCode === project.ProjectCode && c.Scenario === 'OriginalBudget').sort((a,b)=>a.Period-b.Period).map(c=>c.Cashflow);
    const cfsProject = cf.filter(c => c.ProjectCode === project.ProjectCode && c.Scenario === 'ProjectBudget').sort((a,b)=>a.Period-b.Period).map(c=>c.Cashflow);
    const cfsPrevious = cf.filter(c => c.ProjectCode === project.ProjectCode && c.Scenario === 'PreviousBudget').sort((a,b)=>a.Period-b.Period).map(c=>c.Cashflow);

    const irrCurrent = (kpiCurrent && kpiCurrent.ProjectIRR !== null) ? kpiCurrent.ProjectIRR : calculateIRR(cfsCurrent);
    const irrOriginal = (kpiOriginal && kpiOriginal.ProjectIRR !== null) ? kpiOriginal.ProjectIRR : calculateIRR(cfsOriginal);
    const irrProject = (kpiProject && kpiProject.ProjectIRR !== null) ? kpiProject.ProjectIRR : calculateIRR(cfsProject);
    const irrPrevious = (kpiPrevious && kpiPrevious.ProjectIRR !== null) ? kpiPrevious.ProjectIRR : calculateIRR(cfsPrevious);

    const marginCurrent = kpiCurrent ? kpiCurrent.DevelopmentMargin : 0;
    const marginOriginal = kpiOriginal ? kpiOriginal.DevelopmentMargin : 0;
    const marginProject = kpiProject ? kpiProject.DevelopmentMargin : 0;
    const marginPrevious = kpiPrevious ? kpiPrevious.DevelopmentMargin : 0;

    const profitCurrent = kpiCurrent ? kpiCurrent.DevelopmentProfit : 0;
    const profitOriginal = kpiOriginal ? kpiOriginal.DevelopmentProfit : 0;
    const profitProject = kpiProject ? kpiProject.DevelopmentProfit : 0;
    const profitPrevious = kpiPrevious ? kpiPrevious.DevelopmentProfit : 0;

    const eqIrrCurrent = kpiCurrent && kpiCurrent.EquityIRR !== null ? kpiCurrent.EquityIRR : (irrCurrent !== null ? irrCurrent + 2.5 : null);
    const eqIrrOriginal = kpiOriginal && kpiOriginal.EquityIRR !== null ? kpiOriginal.EquityIRR : (irrOriginal !== null ? irrOriginal + 2.5 : null);
    const eqIrrProject = kpiProject && kpiProject.EquityIRR !== null ? kpiProject.EquityIRR : (irrProject !== null ? irrProject + 2.5 : null);
    const eqIrrPrevious = kpiPrevious && kpiPrevious.EquityIRR !== null ? kpiPrevious.EquityIRR : (irrPrevious !== null ? irrPrevious + 2.5 : null);

    const peakCurrent = kpiCurrent ? kpiCurrent.PeakEquity : 0;
    const peakOriginal = kpiOriginal ? kpiOriginal.PeakEquity : 0;
    const peakProject = kpiProject ? kpiProject.PeakEquity : 0;
    const peakPrevious = kpiPrevious ? kpiPrevious.PeakEquity : 0;

    const npvCurrent = kpiCurrent ? kpiCurrent.NPV : calculateNPV(cfsCurrent, 0.10);
    const npvOriginal = kpiOriginal ? kpiOriginal.NPV : calculateNPV(cfsOriginal, 0.10);
    const npvProject = kpiProject ? kpiProject.NPV : calculateNPV(cfsProject, 0.10);
    const npvPrevious = kpiPrevious ? kpiPrevious.NPV : calculateNPV(cfsPrevious, 0.10);

    const varianceTableBody = document.getElementById('varianceTableBody');
    if (varianceTableBody) {
        function getVarianceTd(current, benchmark, type, lowerIsFavorable = false) {
            if (current === null || current === undefined || benchmark === null || benchmark === undefined) {
                return `<td class="text-end text-muted font-monospace">N/A</td>`;
            }
            const diff = current - benchmark;
            if (Math.abs(diff) < 1e-4) {
                return `<td class="text-end text-muted font-monospace">0.0</td>`;
            }
            
            let formattedDiff = '';
            if (type === 'percent') {
                formattedDiff = (diff > 0 ? '+' : '') + diff.toFixed(1) + '%';
            } else {
                formattedDiff = (diff > 0 ? '+' : '') + formatCurrency(diff);
            }
            
            const isFavorable = lowerIsFavorable ? (diff < 0) : (diff > 0);
            const className = isFavorable ? 'text-success fw-semibold' : 'text-danger fw-semibold';
            return `<td class="text-end font-monospace ${className}">${formattedDiff}</td>`;
        }

        const metrics = [
            { name: 'Dev Margin', curr: marginCurrent, orig: marginOriginal, proj: marginProject, prev: marginPrevious, type: 'percent', lowFav: false },
            { name: 'Dev Profit', curr: profitCurrent, orig: profitOriginal, proj: profitProject, prev: profitPrevious, type: 'currency', lowFav: false },
            { name: 'Project IRR', curr: irrCurrent, orig: irrOriginal, proj: irrProject, prev: irrPrevious, type: 'percent', lowFav: false },
            { name: 'Equity IRR', curr: eqIrrCurrent, orig: eqIrrOriginal, proj: eqIrrProject, prev: eqIrrPrevious, type: 'percent', lowFav: false },
            { name: 'Peak Equity', curr: peakCurrent, orig: peakOriginal, proj: peakProject, prev: peakPrevious, type: 'currency', lowFav: true },
            { name: 'NPV', curr: npvCurrent, orig: npvOriginal, proj: npvProject, prev: npvPrevious, type: 'currency', lowFav: false }
        ];

        varianceTableBody.innerHTML = metrics.map(m => {
            const formattedCurrent = m.type === 'percent' ? formatPercent(m.curr) : formatCurrency(m.curr);
            return `
                <tr>
                    <td class="fw-semibold">${m.name}</td>
                    <td class="text-end font-monospace fw-semibold">${formattedCurrent}</td>
                    ${getVarianceTd(m.curr, m.orig, m.type, m.lowFav)}
                    ${getVarianceTd(m.curr, m.proj, m.type, m.lowFav)}
                    ${getVarianceTd(m.curr, m.prev, m.type, m.lowFav)}
                </tr>
            `;
        }).join('');
    }

    // ----------------------------------------------------
    // 2. RENDER REVENUE VS COST STACKED COLUMN CHART
    // ----------------------------------------------------
    const yearFilter = AppState.getFilter('year');
    const subTitleEl = document.getElementById('revenue-cost-chart-sub');
    
    let labels = [];
    let revenueDataSets = { sales: [], rental: [], other: [] };
    let costDataSets = {
        land: [], construction: [], infrastructure: [], professional: [],
        statutory: [], landscaping: [], selling: [], marketing: [], finance: [], operating: []
    };

    if (yearFilter === 'All') {
        // Group by Year
        if (subTitleEl) subTitleEl.textContent = 'Yearly Stacked breakdown';
        
        // Find unique years in current timeline
        const years = [...new Set(filteredCashflow.map(c => c.Year))].sort((a, b) => a - b);
        labels = years;
        
        years.forEach(yr => {
            const yrRows = filteredCashflow.filter(c => c.Year === yr);
            
            // Sum Revenue
            revenueDataSets.sales.push(yrRows.reduce((sum, r) => sum + (r.SalesRevenue || 0), 0));
            revenueDataSets.rental.push(yrRows.reduce((sum, r) => sum + (r.RentalIncome || 0), 0));
            revenueDataSets.other.push(yrRows.reduce((sum, r) => sum + (r.OtherIncome || 0), 0));
            
            // Sum Costs
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
    } else {
        // Group by Month (for selected Year)
        const selectedYear = parseInt(yearFilter);
        if (subTitleEl) subTitleEl.textContent = `Monthly Stacked breakdown for ${selectedYear}`;
        
        // Get all 12 months
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        labels = months;
        
        for (let m = 1; m <= 12; m++) {
            const mRow = filteredCashflow.find(c => c.Year === selectedYear && c.Month === m);
            
            // Add values
            revenueDataSets.sales.push(mRow ? (mRow.SalesRevenue || 0) : 0);
            revenueDataSets.rental.push(mRow ? (mRow.RentalIncome || 0) : 0);
            revenueDataSets.other.push(mRow ? (mRow.OtherIncome || 0) : 0);
            
            costDataSets.land.push(mRow ? (mRow.LandCost || 0) : 0);
            costDataSets.construction.push(mRow ? (mRow.ConstructionCost || 0) : 0);
            costDataSets.infrastructure.push(mRow ? (mRow.InfrastructureCost || 0) : 0);
            costDataSets.professional.push(mRow ? (mRow.ProfessionalFees || 0) : 0);
            costDataSets.statutory.push(mRow ? (mRow.StatutoryFees || 0) : 0);
            costDataSets.landscaping.push(mRow ? (mRow.LandscapingCost || 0) : 0);
            costDataSets.selling.push(mRow ? (mRow.SellingCost || 0) : 0);
            costDataSets.marketing.push(mRow ? (mRow.MarketingCost || 0) : 0);
            costDataSets.finance.push(mRow ? (mRow.FinanceCost || 0) : 0);
            costDataSets.operating.push(mRow ? (mRow.OperatingCost || 0) : 0);
        }
    }

    // Combine datasets for Stacked Column chart:
    // We create stack 'revenue' and stack 'cost' side-by-side columns
    const chartDatasets = [
        // Revenue Stack
        {
            label: 'Sales Revenue',
            data: revenueDataSets.sales,
            backgroundColor: '#1F4E79', // Deep Blue
            stack: 'revenue'
        },
        {
            label: 'Rental Income',
            data: revenueDataSets.rental,
            backgroundColor: '#2F75B5', // Mid Blue
            stack: 'revenue'
        },
        {
            label: 'Other Income',
            data: revenueDataSets.other,
            backgroundColor: '#9BC2E6', // Light Blue
            stack: 'revenue'
        },
        // Cost Stack
        {
            label: 'Land Cost',
            data: costDataSets.land,
            backgroundColor: '#C65911', // Deep Red-Orange
            stack: 'cost'
        },
        {
            label: 'Construction',
            data: costDataSets.construction,
            backgroundColor: '#F58220', // YourLand Orange
            stack: 'cost'
        },
        {
            label: 'Infrastructure',
            data: costDataSets.infrastructure,
            backgroundColor: '#ED7D31', // Bright Orange
            stack: 'cost'
        },
        {
            label: 'Professional Fees',
            data: costDataSets.professional,
            backgroundColor: '#F8CBAD', // Soft Orange
            stack: 'cost'
        },
        {
            label: 'Statutory Fees',
            data: costDataSets.statutory,
            backgroundColor: '#7F7F7F', // Medium Grey
            stack: 'cost'
        },
        {
            label: 'Landscaping',
            data: costDataSets.landscaping,
            backgroundColor: '#A6A6A6', // Light Grey
            stack: 'cost'
        },
        {
            label: 'Selling',
            data: costDataSets.selling,
            backgroundColor: '#2E7D32', // Dark Green
            stack: 'cost'
        },
        {
            label: 'Marketing',
            data: costDataSets.marketing,
            backgroundColor: '#70AD47', // Light Green
            stack: 'cost'
        },
        {
            label: 'Finance Costs',
            data: costDataSets.finance,
            backgroundColor: '#FFC000', // Yellow
            stack: 'cost'
        },
        {
            label: 'Operating Costs',
            data: costDataSets.operating,
            backgroundColor: '#D9D9D9', // Very Light Grey
            stack: 'cost'
        }
    ];

    ChartUtils.createDoubleStackedChart('revenueCostStackedChart', labels, chartDatasets);

    // ----------------------------------------------------
    // 3. RENDER REVENUE & COST BREAKDOWN DONUTS
    // ----------------------------------------------------
    
    // Revenue Composition
    const totalSales = filteredCashflow.reduce((s, r) => s + (r.SalesRevenue || 0), 0);
    const totalRental = filteredCashflow.reduce((s, r) => s + (r.RentalIncome || 0), 0);
    const totalOther = filteredCashflow.reduce((s, r) => s + (r.OtherIncome || 0), 0);
    
    const revLabels = ['Sales Revenue', 'Rental Income', 'Other Income'];
    const revValues = [totalSales, totalRental, totalOther];
    ChartUtils.createDonutChart('revenueCompositionChart', revLabels, revValues);

    // Cost Composition
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

    const costLabels = [
        'Land', 'Construction', 'Infrastructure', 'Professional',
        'Statutory', 'Landscaping', 'Selling', 'Marketing', 'Finance', 'Operating'
    ];
    const costValues = [
        totalLand, totalConst, totalInfra, totalProf,
        totalStat, totalScape, totalSell, totalMktg, totalFin, totalOper
    ];
    
    ChartUtils.createDonutChart('costCompositionChart', costLabels, costValues);

    // ----------------------------------------------------
    // 4. RENDER CURRENT ACTIVE STAGES LIST
    // ----------------------------------------------------
    const activeStagesList = document.getElementById('activeStagesList');
    if (activeStagesList) {
        // Find active stages based on stages data
        // Filter where CurrentStage === true (relative to generator global period 72)
        const currentProjectStages = stages.filter(s => s.ProjectCode === project.ProjectCode);
        const activeStages = currentProjectStages.filter(s => s.CurrentStage === true);
        
        if (activeStages.length === 0) {
            activeStagesList.innerHTML = `
                <div class="text-center text-muted py-5">
                    <i class="fa-solid fa-check-circle text-success fs-3 mb-2"></i>
                    <p class="mb-0">No active stages in current reporting period.</p>
                    <small class="text-light">(Project status: ${project.Status})</small>
                </div>
            `;
        } else {
            let html = '';
            activeStages.forEach(stage => {
                const stageName = getStageName(stage.StageCode);
                html += `
                    <div class="stage-item active-stage">
                        <div class="stage-name-info">
                            <span class="stage-code-badge">STAGE CODE: ${stage.StageCode}</span>
                            <span class="stage-title">${stageName}</span>
                        </div>
                        <div class="stage-period-info">
                            <div class="stage-status-indicator text-primary">
                                <span class="indicator-dot"></span>
                                Active Phase
                            </div>
                            <small class="text-muted">P${stage.StartPeriod} - P${stage.EndPeriod}</small>
                        </div>
                    </div>
                `;
            });
            
            // Add inactive/pending stages for context (up to 3 next stages)
            const activeCodes = new Set(activeStages.map(s => s.StageCode));
            const nextStages = currentProjectStages
                .filter(s => !s.CurrentStage && s.StartPeriod > Math.max(...activeStages.map(as => as.StartPeriod)))
                .sort((a, b) => a.StartPeriod - b.StartPeriod)
                .slice(0, 2);
                
            nextStages.forEach(stage => {
                const stageName = getStageName(stage.StageCode);
                html += `
                    <div class="stage-item opacity-75">
                        <div class="stage-name-info">
                            <span class="stage-code-badge">STAGE CODE: ${stage.StageCode}</span>
                            <span class="stage-title">${stageName}</span>
                        </div>
                        <div class="stage-period-info text-muted">
                            <div class="stage-status-indicator text-muted">
                                <span class="indicator-dot bg-secondary"></span>
                                Pending
                            </div>
                            <small>Starts P${stage.StartPeriod}</small>
                        </div>
                    </div>
                `;
            });
            
            activeStagesList.innerHTML = html;
        }
    }
}
