/**
 * financials.js - Page controller for the Financial Breakdown page.
 * Processes cost/revenue aggregates and categorizes expenditures.
 */

document.addEventListener('DOMContentLoaded', () => {
    initializeDashboardPage('financials', renderFinancialsPage);
});

/**
 * Main render function triggered on load and state change.
 */
function renderFinancialsPage() {
    console.log('Rendering Financial Breakdown Page...');

    const project = AppState.getCurrentProject();
    const kpi = AppState.getCurrentKPIs();
    const filteredCashflow = AppState.getFilteredCashflow(false); // respecting global Year filter
    const lifetimeCashflow = AppState.getFilteredCashflow(true);  // whole timeline (needed for funding peak equity/equity sum)

    if (!project) {
        console.error('FinancialsPage: No project selected.');
        return;
    }

    // ----------------------------------------------------
    // DATA COMPUTATIONS
    // ----------------------------------------------------
    
    // Sums of each cost column
    const costs = {
        'Construction': filteredCashflow.reduce((s, r) => s + (r.ConstructionCost || 0), 0),
        'Land Acquisition': filteredCashflow.reduce((s, r) => s + (r.LandCost || 0), 0),
        'Infrastructure': filteredCashflow.reduce((s, r) => s + (r.InfrastructureCost || 0), 0),
        'Professional Fees': filteredCashflow.reduce((s, r) => s + (r.ProfessionalFees || 0), 0),
        'Statutory Fees': filteredCashflow.reduce((s, r) => s + (r.StatutoryFees || 0), 0),
        'Landscaping': filteredCashflow.reduce((s, r) => s + (r.LandscapingCost || 0), 0),
        'Selling Commission': filteredCashflow.reduce((s, r) => s + (r.SellingCost || 0), 0),
        'Marketing Campaign': filteredCashflow.reduce((s, r) => s + (r.MarketingCost || 0), 0),
        'Finance Costs': filteredCashflow.reduce((s, r) => s + (r.FinanceCost || 0), 0),
        'Operating Expenses': filteredCashflow.reduce((s, r) => s + (r.OperatingCost || 0), 0)
    };

    // Sums of each revenue column
    const revenues = {
        'Sales Revenue': filteredCashflow.reduce((s, r) => s + (r.SalesRevenue || 0), 0),
        'Rental Income': filteredCashflow.reduce((s, r) => s + (r.RentalIncome || 0), 0),
        'Other Income': filteredCashflow.reduce((s, r) => s + (r.OtherIncome || 0), 0)
    };

    // ----------------------------------------------------
    // CHART 1: Cost Breakdown (Horizontal Bars, Standard Order)
    // ----------------------------------------------------
    const costBreakdownLabels = Object.keys(costs);
    const costBreakdownValues = Object.values(costs);
    ChartUtils.createHorizontalBarChart('costBreakdownChart', costBreakdownLabels, costBreakdownValues, 'Cost Amount', 'orange');

    // ----------------------------------------------------
    // CHART 2: Revenue Breakdown (Horizontal Bars)
    // ----------------------------------------------------
    const revBreakdownLabels = Object.keys(revenues);
    const revBreakdownValues = Object.values(revenues);
    ChartUtils.createHorizontalBarChart('revenueBreakdownChart', revBreakdownLabels, revBreakdownValues, 'Revenue Amount', 'blue');

    // ----------------------------------------------------
    // CHART 3: Construction vs Land vs Finance (Donut Chart)
    // ----------------------------------------------------
    const coreLabels = ['Construction Cost', 'Land Cost', 'Finance Cost'];
    const coreValues = [costs['Construction'], costs['Land Acquisition'], costs['Finance Costs']];
    ChartUtils.createDonutChart('coreDriversChart', coreLabels, coreValues);

    // ----------------------------------------------------
    // CHART 4: Funding Sources (Peak Debt vs Total Equity Contribution)
    // ----------------------------------------------------
    // In real estate, funding is analyzed globally over the lifetime of the project
    const peakDebtVal = lifetimeCashflow.reduce((max, r) => Math.max(max, r.LoanBalance || 0), 0);
    const totalEquityInjected = lifetimeCashflow.reduce((sum, r) => sum + (r.EquityContribution || 0), 0);
    
    const fundingLabels = ['Peak Debt (Loan)', 'Total Equity Injection'];
    const fundingValues = [peakDebtVal, totalEquityInjected];
    // Uses horizontal bar chart
    ChartUtils.createHorizontalBarChart('fundingBreakdownChart', fundingLabels, fundingValues, 'Injected Funding', 'blue');

    // ----------------------------------------------------
    // CHART 5: Top Cost Categories (Sorted Horizontal Bars)
    // ----------------------------------------------------
    // Sort cost entries by value descending
    const sortedCosts = Object.entries(costs)
        .map(([name, val]) => ({ name, val }))
        .sort((a, b) => b.val - a.val);

    const sortedLabels = sortedCosts.map(item => item.name);
    const sortedValues = sortedCosts.map(item => item.val);
    ChartUtils.createHorizontalBarChart('topCostsChart', sortedLabels, sortedValues, 'Cost Amount', 'orange');

    // ----------------------------------------------------
    // CHART 6: Expense Classification (Operational vs Capital Costs)
    // ----------------------------------------------------
    // Hard/Capital Costs: Land, Construction, Infrastructure, Landscaping
    const hardCosts = costs['Land Acquisition'] + costs['Construction'] + costs['Infrastructure'] + costs['Landscaping'];
    
    // Soft/Admin Costs: Professional, Statutory, Marketing, Selling
    const softCosts = costs['Professional Fees'] + costs['Statutory Fees'] + costs['Marketing Campaign'] + costs['Selling Commission'];
    
    // Holding/Operational: Finance, Operating
    const operationalCosts = costs['Finance Costs'] + costs['Operating Expenses'];

    const classLabels = ['Hard Costs (Capital)', 'Soft Costs (Development)', 'Holding & Operations'];
    const classValues = [hardCosts, softCosts, operationalCosts];
    ChartUtils.createHorizontalBarChart('expenseCategoriesChart', classLabels, classValues, 'Classification Total', 'grey');
}
