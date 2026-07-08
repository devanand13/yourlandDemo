/**
 * DataLoader - Handles fetching and caching of EstateMaster JSON data.
 * Loads all data once, in parallel, and caches the results in memory.
 */
const DataLoader = {
    _projects: null,
    _stages: null,
    _cashflow: null,
    _kpis: null,
    _cashflow_simulated: null,
    _kpis_simulated: null,
    _loadPromise: null,

    /**
     * Loads all datasets in parallel if they are not already cached.
     * @returns {Promise<{projects: Array, stages: Array, cashflow: Array, kpis: Array}>}
     */
    async loadAllData() {
        if (this._loadPromise) {
            return this._loadPromise;
        }

        this._loadPromise = (async () => {
            try {
                // Since this JS will be executed in pages/ subfolder, data files are up one level
                const baseDir = '../data';
                
                const [projectsRes, stagesRes, cashflowRes, kpisRes] = await Promise.all([
                    fetch(`${baseDir}/projects.json`),
                    fetch(`${baseDir}/stages.json`),
                    fetch(`${baseDir}/cashflow.json`),
                    fetch(`${baseDir}/kpis.json`)
                ]);

                if (!projectsRes.ok || !stagesRes.ok || !cashflowRes.ok || !kpisRes.ok) {
                    throw new Error('One or more data files failed to load. Check paths.');
                }

                this._projects = await projectsRes.json();
                this._stages = await stagesRes.json();
                this._cashflow = await cashflowRes.json();
                this._kpis = await kpisRes.json();

                console.log('DataLoader: All data loaded and cached successfully.', {
                    projects: this._projects.length,
                    stages: this._stages.length,
                    cashflow: this._cashflow.length,
                    kpis: this._kpis.length
                });

                return {
                    projects: this._projects,
                    stages: this._stages,
                    cashflow: this._cashflow,
                    kpis: this._kpis
                };
            } catch (err) {
                console.error('DataLoader: Failed to load data.', err);
                this._loadPromise = null; // Allow retry on failure
                throw err;
            }
        })();

        return this._loadPromise;
    },

    getProjects() {
        if (!this._projects) console.warn('DataLoader: projects accessed before load completion');
        return this._projects || [];
    },

    getStages() {
        if (!this._stages) console.warn('DataLoader: stages accessed before load completion');
        return this._stages || [];
    },

    getCashflow() {
        if (!this._cashflow) console.warn('DataLoader: cashflow accessed before load completion');
        if (localStorage.getItem('whatif_applied') === 'true') {
            if (!this._cashflow_simulated) {
                this.applySimulatedChanges();
            }
            return this._cashflow_simulated || this._cashflow || [];
        }
        return this._cashflow || [];
    },

    getKPIs() {
        if (!this._kpis) console.warn('DataLoader: KPIs accessed before load completion');
        if (localStorage.getItem('whatif_applied') === 'true') {
            if (!this._kpis_simulated) {
                this.applySimulatedChanges();
            }
            return this._kpis_simulated || this._kpis || [];
        }
        return this._kpis || [];
    },

    clearSimulatedChanges() {
        this._cashflow_simulated = null;
        this._kpis_simulated = null;
    },

    applySimulatedChanges() {
        const changesStr = localStorage.getItem('whatif_changes');
        if (!changesStr) {
            this.clearSimulatedChanges();
            return;
        }

        const changes = JSON.parse(changesStr);
        this._cashflow_simulated = JSON.parse(JSON.stringify(this._cashflow));
        this._kpis_simulated = JSON.parse(JSON.stringify(this._kpis));

        const projectScenariosToRecalc = new Set();

        // Apply changes
        changes.forEach(change => {
            const row = this._cashflow_simulated.find(c => 
                c.ProjectCode === change.projectCode && 
                c.Scenario === change.scenario && 
                c.Period === change.period
            );

            if (row) {
                row[change.field] = change.value;
                
                // Recalculate row.Revenue from subfields
                row.Revenue = (row.SalesRevenue || 0) + (row.RentalIncome || 0) + (row.OtherIncome || 0);
                
                // Recalculate row.TotalCost from subfields
                row.TotalCost = (row.LandCost || 0) + (row.ConstructionCost || 0) + (row.InfrastructureCost || 0) + 
                                (row.ProfessionalFees || 0) + (row.StatutoryFees || 0) + (row.LandscapingCost || 0) + 
                                (row.SellingCost || 0) + (row.MarketingCost || 0) + (row.FinanceCost || 0) + (row.OperatingCost || 0);
                                
                // Recompute net Cashflow: Cashflow = Revenue - TotalCost
                row.Cashflow = row.Revenue - row.TotalCost;
                
                projectScenariosToRecalc.add(`${change.projectCode}|${change.scenario}`);
            }
        });

        // Recalculate variables and KPIs
        projectScenariosToRecalc.forEach(key => {
            const [projCodeStr, scenario] = key.split('|');
            const projectCode = parseInt(projCodeStr);

            const projCfs = this._cashflow_simulated
                .filter(c => c.ProjectCode === projectCode && c.Scenario === scenario)
                .sort((a, b) => a.Period - b.Period);

            let cumulativeCashflow = 0;
            let cumulativeEquity = 0;

            projCfs.forEach(c => {
                cumulativeCashflow += c.Cashflow;
                c.CumulativeCashflow = cumulativeCashflow;

                cumulativeEquity += c.EquityContribution || 0;
                c.CumulativeEquity = cumulativeEquity;
            });

            // Recalculate KPIs
            const kpi = this._kpis_simulated.find(k => k.ProjectCode === projectCode && k.Scenario === scenario);
            if (kpi) {
                const totalRevenue = projCfs.reduce((sum, c) => sum + (c.Revenue || 0), 0);
                const totalCost = projCfs.reduce((sum, c) => sum + (c.TotalCost || 0), 0);
                const profit = totalRevenue - totalCost;
                const margin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;
                
                const cfsArray = projCfs.map(c => c.Cashflow);
                const irrSolver = window.calculateIRR || (() => null);
                const npvSolver = window.calculateNPV || (() => 0);

                const projectIRR = irrSolver(cfsArray);
                const equityIRR = projectIRR !== null ? projectIRR + 2.5 : null;

                const peakEquity = Math.max(...projCfs.map(c => Math.max(c.LoanBalance || 0, c.CumulativeEquity || 0)));
                const peakEquityRow = projCfs.find(c => Math.max(c.LoanBalance || 0, c.CumulativeEquity || 0) === peakEquity);
                const peakEquityPeriod = peakEquityRow ? peakEquityRow.Period : 0;

                const npv = npvSolver(cfsArray, 0.10);

                let breakevenPeriod = 0;
                for (let i = 0; i < projCfs.length; i++) {
                    if (projCfs[i].CumulativeCashflow >= 0 && i > 0 && projCfs[i-1].CumulativeCashflow < 0) {
                        breakevenPeriod = projCfs[i].Period;
                        break;
                    }
                }

                kpi.Revenue = totalRevenue;
                kpi.TotalCost = totalCost;
                kpi.DevelopmentProfit = profit;
                kpi.DevelopmentMargin = parseFloat(margin.toFixed(2));
                kpi.ProjectIRR = projectIRR !== null ? parseFloat(projectIRR.toFixed(2)) : null;
                kpi.EquityIRR = equityIRR !== null ? parseFloat(equityIRR.toFixed(2)) : null;
                kpi.PeakEquity = peakEquity;
                kpi.PeakEquityPeriod = peakEquityPeriod;
                kpi.NPV = npv;
                kpi.BreakevenPeriod = breakevenPeriod;
            }
        });
    }
};
window.DataLoader = DataLoader;
