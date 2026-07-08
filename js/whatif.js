/**
 * whatif.js - Page controller for the What-if Analysis Simulation page.
 * Queues parameter changes in memory and recalculates project KPIs in real-time.
 */

let stagedChanges = [];

// Map stage code to its corresponding sub-field in cashflow.json
const STAGE_FIELD_MAP = {
    "000": "LandCost",               // Land Acquisition
    "010": "StatutoryFees",          // Planning Permits
    "020": "ProfessionalFees",       // Design & Engineering
    "030": "InfrastructureCost",     // Site Establishment
    "040": "ConstructionCost",       // Bulk Excavation
    "050": "ConstructionCost",       // Substructure Work
    "051": "ConstructionCost",       // Superstructure Frame
    "060": "ConstructionCost",       // Facade & Roofing
    "070": "ConstructionCost",       // Services Rough-In
    "080": "ConstructionCost",       // Internal Finishes
    "090": "LandscapingCost",        // External Landscaping
    "100": "InfrastructureCost",     // Civil Works
    "110": "OperatingCost",          // Practical Completion
    "120": "MarketingCost",          // Marketing Launch
    "130": "RentalIncome",           // Pre-Leasing Phase
    "140": "OperatingCost",          // Pre-Commissioning
    "150": "RentalIncome",           // Tenant Handover
    "160": "StatutoryFees",          // Title Registration
    "170": "SalesRevenue",           // Sales Settlement
    "180": "OperatingCost",          // Defects Liability
    "200": "ConstructionCost",       // Stage 1 Construction
    "220": "ConstructionCost",       // Stage 2 Construction
    "240": "ConstructionCost",       // Stage 3 Construction
    "260": "ConstructionCost",       // Stage 4 Construction
    "280": "ConstructionCost",       // Stage 5 Construction
    "300": "ConstructionCost",       // Retail Fitout
    "320": "OperatingCost",          // Body Corporate Setup
    "340": "OperatingCost",          // Operations Launch
    "360": "RentalIncome",           // Lease Commencements
    "380": "FinanceCost",            // Refinancing Phase
    "400": "OperatingCost",          // Project Review
    "500": "OperatingCost"           // Project Closeout
};

// Nice human readable labels for stage sub-fields
const STAGE_FIELD_LABELS = {
    "LandCost": "Land Cost",
    "StatutoryFees": "Statutory / Planning Fees",
    "ProfessionalFees": "Professional Design Fees",
    "InfrastructureCost": "Civil & Infrastructure Cost",
    "ConstructionCost": "Construction Cost",
    "LandscapingCost": "Landscaping Cost",
    "OperatingCost": "Operational Cost",
    "MarketingCost": "Marketing / Sales Costs",
    "RentalIncome": "Rental / Pre-lease Income",
    "SalesRevenue": "Sales Settlement Revenue",
    "FinanceCost": "Finance & Loan Cost"
};

document.addEventListener('DOMContentLoaded', () => {
    // Bootstrap the page
    initializeDashboardPage('whatif', renderWhatIfPage);
    setupWhatIfListeners();
});

/**
 * Main render function triggered on load and state change.
 */
function renderWhatIfPage() {
    console.log('Rendering What-if Analysis Page...');

    const project = AppState.getCurrentProject();
    if (!project) return;

    // Reset Stage selector
    populateStageSelect(project.ProjectCode);
    
    // Populate global period selector (always P0 to P149)
    populatePeriodSelectGlobal();

    // Disable editor card by default
    disableEditorCard();

    // Load any existing active changes from localStorage
    loadExistingChanges();

    // Render queued changes list
    renderQueueTable();

    // Render simulated KPI values
    computeSimulatedKPIs();
}

/**
 * Loads staged changes from localStorage if simulation is active.
 */
function loadExistingChanges() {
    const changesStr = localStorage.getItem('whatif_changes');
    if (changesStr && stagedChanges.length === 0) {
        stagedChanges = JSON.parse(changesStr);
    }
}

/**
 * Populates the stage selector dropdown (only showing the stage number/code).
 */
function populateStageSelect(projectCode) {
    const stageSelect = document.getElementById('stageSelect');
    if (!stageSelect) return;

    const stages = DataLoader.getStages().filter(s => s.ProjectCode === projectCode);
    
    let html = '<option value="" selected disabled>Choose a stage...</option>';
    stages.forEach(s => {
        html += `<option value="${s.StageCode}">${s.StageCode}</option>`;
    });

    stageSelect.innerHTML = html;
}

/**
 * Generates human readable period dates from index t (P0 is July 2020, P149 is Dec 2032).
 */
function getPeriodDateLabel(t) {
    const startYear = 2020;
    const startMonth = 6; // July (0-indexed: June = 5, July = 6)
    const date = new Date(startYear, startMonth + t, 1);
    
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthName = months[date.getMonth()];
    const year = date.getFullYear();
    
    return `Period ${t} (${monthName} ${year})`;
}

/**
 * Populates global period selector with P0 to P149 list.
 */
function populatePeriodSelectGlobal() {
    const periodSelect = document.getElementById('periodSelect');
    if (!periodSelect) return;

    let html = '<option value="" selected disabled>Choose a period...</option>';
    for (let t = 0; t <= 149; t++) {
        html += `<option value="${t}">${getPeriodDateLabel(t)}</option>`;
    }

    periodSelect.innerHTML = html;
    periodSelect.disabled = false;
}

/**
 * Sets up What-if page event listeners.
 */
function setupWhatIfListeners() {
    const stageSelect = document.getElementById('stageSelect');
    const periodSelect = document.getElementById('periodSelect');

    const checkInputs = () => {
        const stageCode = stageSelect.value;
        const period = periodSelect.value;

        if (stageCode && period !== "") {
            enableEditorCard(stageCode, parseInt(period));
        } else {
            disableEditorCard();
        }
    };

    stageSelect.addEventListener('change', checkInputs);
    periodSelect.addEventListener('change', checkInputs);

    // Save checkmark buttons
    document.getElementById('btn-save-stage').addEventListener('click', saveFieldChange);

    // Reset cross buttons
    document.getElementById('btn-reset-stage').addEventListener('click', discardFieldChange);

    // Action buttons
    document.getElementById('btnApplySimulation').addEventListener('click', () => {
        if (stagedChanges.length > 0) {
            applyWhatIf(stagedChanges);
            // Redirect to Executive Summary to view simulation
            window.location.href = 'executive.html';
        }
    });

    document.getElementById('btnResetSimulation').addEventListener('click', () => {
        resetWhatIf();
        stagedChanges = [];
        renderQueueTable();
        computeSimulatedKPIs();
        
        // Reset selections
        stageSelect.value = '';
        periodSelect.value = '';
        disableEditorCard();
    });
}

/**
 * Enables and loads actual value into editing inputs for the target stage field.
 */
function enableEditorCard(stageCode, period) {
    const card = document.getElementById('editorCard');
    card.style.opacity = '1';
    card.style.pointerEvents = 'auto';

    const projectCode = AppState.getFilter('projectCode');
    const budget = AppState.getFilter('budget');

    // Get mapped field name
    const field = STAGE_FIELD_MAP[stageCode] || 'TotalCost';
    const fieldLabel = STAGE_FIELD_LABELS[field] || field;

    // Set Heading
    const periodLabel = getPeriodDateLabel(period);
    document.getElementById('editorHeading').innerHTML = `2. Value for Stage ${stageCode} and Period P${period}`;
    document.getElementById('editorFieldLabel').textContent = fieldLabel;

    // Fetch value
    const cashflows = DataLoader.getCashflow();
    const row = cashflows.find(c => 
        c.ProjectCode === projectCode && 
        c.Scenario === budget && 
        c.Period === period
    );

    const val = row ? (row[field] || 0) : 0;
    
    // Display value (show 0/NA if zero)
    const displayVal = val !== 0 ? formatCurrency(val) : '0/NA';
    document.getElementById('editorCurrentValueLabel').textContent = `Current: ${displayVal}`;

    // Check if change already exists in stagedChanges
    const staged = stagedChanges.find(c => 
        c.projectCode === projectCode && 
        c.scenario === budget && 
        c.period === period && 
        c.field === field
    );

    const input = document.getElementById('input-val-stage');
    if (staged) {
        input.value = staged.value;
    } else {
        input.value = '';
    }
}

function disableEditorCard() {
    const card = document.getElementById('editorCard');
    card.style.opacity = '0.6';
    card.style.pointerEvents = 'none';

    // Clear values
    document.getElementById('editorHeading').innerHTML = '2. Value for Stage -- and Period --';
    document.getElementById('editorFieldLabel').textContent = 'Stage Parameter Value';
    document.getElementById('editorCurrentValueLabel').textContent = 'Current: $0.0';
    document.getElementById('input-val-stage').value = '';
}

/**
 * Saves stage change to stagedChanges memory queue.
 */
function saveFieldChange() {
    const input = document.getElementById('input-val-stage');
    const valueStr = input.value.trim();
    if (valueStr === '') {
        highlightError(input);
        return;
    }

    const value = parseFloat(valueStr.replace(/[^0-9.-]/g, ''));
    if (isNaN(value)) {
        highlightError(input);
        return;
    }

    const projectCode = AppState.getFilter('projectCode');
    const budget = AppState.getFilter('budget');
    const stageSelect = document.getElementById('stageSelect');
    const stageCode = stageSelect.value;
    const periodSelect = document.getElementById('periodSelect');
    const period = parseInt(periodSelect.value);

    // Look up target field
    const field = STAGE_FIELD_MAP[stageCode] || 'TotalCost';

    // Retrieve baseline value directly from unmodified DataLoader arrays
    const originalRow = DataLoader._cashflow.find(c => 
        c.ProjectCode === projectCode && 
        c.Scenario === budget && 
        c.Period === period
    );
    const originalValue = originalRow ? (originalRow[field] || 0) : 0;

    // Build stage change entry
    const newChange = {
        projectCode,
        scenario: budget,
        stageCode,
        stageName: stageCode, // user requested only code
        period,
        periodName: period.toString(),
        field,
        originalValue,
        value
    };

    // Filter out existing edits for same target
    stagedChanges = stagedChanges.filter(c => 
        !(c.projectCode === projectCode && c.scenario === budget && c.period === period && c.field === field)
    );

    stagedChanges.push(newChange);

    // Provide visual success feedback
    input.classList.remove('is-invalid');
    input.classList.add('is-valid');
    setTimeout(() => input.classList.remove('is-valid'), 1500);

    renderQueueTable();
    computeSimulatedKPIs();
}

/**
 * Discards input edit.
 */
function discardFieldChange() {
    const input = document.getElementById('input-val-stage');
    input.value = '';
    input.classList.remove('is-invalid', 'is-valid');

    const projectCode = AppState.getFilter('projectCode');
    const budget = AppState.getFilter('budget');
    const stageSelect = document.getElementById('stageSelect');
    const stageCode = stageSelect.value;
    const periodSelect = document.getElementById('periodSelect');
    if (!stageCode || !periodSelect.value) return;
    const period = parseInt(periodSelect.value);
    const field = STAGE_FIELD_MAP[stageCode] || 'TotalCost';

    // Remove from queue
    stagedChanges = stagedChanges.filter(c => 
        !(c.projectCode === projectCode && c.scenario === budget && c.period === period && c.field === field)
    );

    renderQueueTable();
    computeSimulatedKPIs();
}

function highlightError(input) {
    input.classList.add('is-invalid');
    input.focus();
}

/**
 * Renders the queued changes in the summary table.
 */
function renderQueueTable() {
    const tbody = document.getElementById('queueTableBody');
    if (!tbody) return;

    const applyBtn = document.getElementById('btnApplySimulation');

    if (stagedChanges.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center text-muted py-3">No edits queued in this simulation yet.</td>
            </tr>
        `;
        applyBtn.disabled = true;
        return;
    }

    applyBtn.disabled = false;

    tbody.innerHTML = stagedChanges.map((change, index) => {
        const fieldLabel = STAGE_FIELD_LABELS[change.field] || change.field;
        return `
            <tr>
                <td><strong>Stage ${change.stageCode}</strong></td>
                <td>P${change.period}</td>
                <td><span class="badge bg-secondary">${fieldLabel}</span></td>
                <td class="text-end text-muted font-monospace">${change.originalValue !== 0 ? formatCurrency(change.originalValue) : '0/NA'}</td>
                <td class="text-end font-monospace fw-bold text-primary">${formatCurrency(change.value)}</td>
                <td class="text-center">
                    <span class="whatif-queue-delete" onclick="removeQueueIndex(${index})" title="Remove Change">
                        <i class="fa-solid fa-trash-can"></i>
                    </span>
                </td>
            </tr>
        `;
    }).join('');
}

/**
 * Removes queued change by index.
 */
function removeQueueIndex(index) {
    stagedChanges.splice(index, 1);
    renderQueueTable();
    computeSimulatedKPIs();

    // Reset input fields if matches active edit targets
    const stageSelect = document.getElementById('stageSelect');
    const periodSelect = document.getElementById('periodSelect');
    if (stageSelect.value && periodSelect.value) {
        enableEditorCard(stageSelect.value, parseInt(periodSelect.value));
    }
}
window.removeQueueIndex = removeQueueIndex;

/**
 * Computes simulated KPIs in real-time based on queued edits.
 */
function computeSimulatedKPIs() {
    const projectCode = AppState.getFilter('projectCode');
    const budget = AppState.getFilter('budget');

    // Retrieve original KPIs and cashflows
    const originalCashflows = DataLoader._cashflow.filter(c => c.ProjectCode === projectCode && c.Scenario === budget);
    const originalKPI = DataLoader._kpis.find(k => k.ProjectCode === projectCode && k.Scenario === budget);

    if (originalCashflows.length === 0) return;

    // Clone original cashflows
    const simCfs = JSON.parse(JSON.stringify(originalCashflows)).sort((a, b) => a.Period - b.Period);

    // Apply currently queued edits
    stagedChanges.forEach(change => {
        if (change.projectCode === projectCode && change.scenario === budget) {
            const row = simCfs.find(c => c.Period === change.period);
            if (row) {
                // Apply edit to mapped subfield
                row[change.field] = change.value;
                
                // Recalculate row totals from sub-fields
                row.Revenue = (row.SalesRevenue || 0) + (row.RentalIncome || 0) + (row.OtherIncome || 0);
                row.TotalCost = (row.LandCost || 0) + (row.ConstructionCost || 0) + (row.InfrastructureCost || 0) + 
                                (row.ProfessionalFees || 0) + (row.StatutoryFees || 0) + (row.LandscapingCost || 0) + 
                                (row.SellingCost || 0) + (row.MarketingCost || 0) + (row.FinanceCost || 0) + (row.OperatingCost || 0);
                
                // Cashflow
                row.Cashflow = row.Revenue - row.TotalCost;
            }
        }
    });

    // Recompute cumulative cashflows and equity balances
    let cumCashflow = 0;
    let cumEquity = 0;
    simCfs.forEach(c => {
        cumCashflow += c.Cashflow;
        c.CumulativeCashflow = cumCashflow;
        cumEquity += c.EquityContribution || 0;
        c.CumulativeEquity = cumEquity;
    });

    // Recalculate simulation summary metrics
    const totalRevenue = simCfs.reduce((sum, c) => sum + (c.Revenue || 0), 0);
    const totalCost = simCfs.reduce((sum, c) => sum + (c.TotalCost || 0), 0);
    const profit = totalRevenue - totalCost;
    const margin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;
    
    const irrSolver = window.calculateIRR || (() => null);
    const cfsArray = simCfs.map(c => c.Cashflow);
    const projectIRR = irrSolver(cfsArray);
    const equityIRR = projectIRR !== null ? projectIRR + 2.5 : null;

    // Baseline KPIs
    const oldProfit = originalKPI ? originalKPI.DevelopmentProfit : 0;
    const oldMargin = originalKPI ? originalKPI.DevelopmentMargin : 0;
    const oldIrr = originalKPI ? originalKPI.ProjectIRR : null;
    const oldEquityIrr = originalKPI ? originalKPI.EquityIRR : null;

    // Render baseline values
    document.getElementById('kpi-old-profit').textContent = formatCurrency(oldProfit);
    document.getElementById('kpi-old-margin').textContent = formatPercent(oldMargin);
    document.getElementById('kpi-old-irr').textContent = oldIrr !== null ? formatPercent(oldIrr) : 'N/A';
    document.getElementById('kpi-old-equity-irr').textContent = oldEquityIrr !== null ? formatPercent(oldEquityIrr) : 'N/A';

    // Render simulated projections
    const profitEl = document.getElementById('kpi-new-profit');
    const marginEl = document.getElementById('kpi-new-margin');
    const irrEl = document.getElementById('kpi-new-irr');
    const eqIrrEl = document.getElementById('kpi-new-equity-irr');

    profitEl.textContent = formatCurrency(profit);
    marginEl.textContent = formatPercent(margin);
    irrEl.textContent = projectIRR !== null ? formatPercent(projectIRR) : 'N/A';
    eqIrrEl.textContent = equityIRR !== null ? formatPercent(equityIRR) : 'N/A';

    // Apply color indicators
    highlightDifference(profitEl, profit, oldProfit);
    highlightDifference(marginEl, margin, oldMargin);
    highlightDifference(irrEl, projectIRR, oldIrr);
    highlightDifference(eqIrrEl, equityIRR, oldEquityIrr);
}

function highlightDifference(el, newVal, oldVal) {
    if (newVal === null || oldVal === null) {
        el.className = 'kpi-compare-new';
        return;
    }
    const diff = newVal - oldVal;
    if (Math.abs(diff) < 0.01) {
        el.className = 'kpi-compare-new';
    } else if (diff > 0) {
        el.className = 'kpi-compare-new positive';
    } else {
        el.className = 'kpi-compare-new negative';
    }
}
