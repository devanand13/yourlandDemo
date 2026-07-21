/**
 * AppState - Manages global dashboard filters, local storage persistence,
 * and cascading relationship logic. Decouples business logic from UI.
 */
const AppState = {
    _filters: {
        projectCode: 100,
        budget: 'CurrentBudget',
        status: 'All',
        year: 'All',
        portfolio: 'NTT'
    },
    _listeners: [],

    /**
     * Initializes state from localStorage or defaults.
     */
    initialize() {
        const stored = localStorage.getItem('yourland_dashboard_filters');
        if (stored) {
            try {
                this._filters = JSON.parse(stored);
            } catch (e) {
                console.error('AppState: Failed to parse stored filters', e);
            }
        }
        
        // Ensure default fallbacks are valid types
        this._filters.projectCode = parseInt(this._filters.projectCode) || 100;
        this._filters.budget = this._filters.budget || 'CurrentBudget';
        this._filters.status = this._filters.status || 'All';
        this._filters.year = this._filters.year || 'All';
        this._filters.portfolio = this._filters.portfolio || 'NTT';

        console.log('AppState: State initialized', this._filters);
    },

    save() {
        localStorage.setItem('yourland_dashboard_filters', JSON.stringify(this._filters));
    },

    // Listeners for state changes
    onChange(callback) {
        this._listeners.push(callback);
    },

    notify() {
        this._listeners.forEach(cb => cb(this._filters));
    },

    // Filter Getters and Setters
    getFilter(key) {
        return this._filters[key];
    },

    /**
     * Updates a filter value, applying cascade validation rules.
     * @param {string} key 
     * @param {any} value 
     */
    setFilter(key, value) {
        if (key === 'projectCode') {
            value = parseInt(value);
        }
        
        if (this._filters[key] === value) return;

        this._filters[key] = value;

        // Cascade rule 1: If Status changes, ensure selected project is in that status
        if (key === 'status') {
            const projects = DataLoader.getProjects();
            const currentProj = projects.find(p => p.ProjectCode === this._filters.projectCode);
            
            if (value !== 'All' && (!currentProj || currentProj.Status !== value)) {
                // Find first project with selected status
                const matched = projects.find(p => p.Status === value);
                if (matched) {
                    this._filters.projectCode = matched.ProjectCode;
                }
            }
        }

        // Cascade rule 2: If Project changes directly, sync the Status filter to match
        if (key === 'projectCode') {
            const projects = DataLoader.getProjects();
            const selectedProj = projects.find(p => p.ProjectCode === value);
            if (selectedProj) {
                // If current status filter is not "All" and does not match the project's status, update it
                if (this._filters.status !== 'All' && this._filters.status !== selectedProj.Status) {
                    this._filters.status = selectedProj.Status;
                }
            }
        }

        this.save();
        this.notify();
    },

    // Data Selectors (Business Logic)
    
    /**
     * Gets the metadata of the currently selected project.
     */
    getCurrentProject() {
        const projects = DataLoader.getProjects();
        return projects.find(p => p.ProjectCode === this._filters.projectCode) || projects[0] || null;
    },

    /**
     * Gets the KPI record matching the current project and scenario.
     */
    getCurrentKPIs() {
        const kpis = DataLoader.getKPIs();
        return kpis.find(k => 
            k.ProjectCode === this._filters.projectCode && 
            k.Scenario === this._filters.budget
        ) || null;
    },

    /**
     * Gets the cashflow timeline records, filtered by Project, Scenario, and Year.
     * @param {boolean} ignoreYearFilter - if true, returns the whole project timeline (e.g. for lifetime IRR/NPV)
     */
    getFilteredCashflow(ignoreYearFilter = false) {
        const cashflow = DataLoader.getCashflow();
        let filtered = cashflow.filter(c => 
            c.ProjectCode === this._filters.projectCode && 
            c.Scenario === this._filters.budget
        );

        if (!ignoreYearFilter && this._filters.year !== 'All') {
            const selectedYear = parseInt(this._filters.year);
            filtered = filtered.filter(c => c.Year === selectedYear);
        }

        // Sort by Period chronologically just in case
        return filtered.sort((a, b) => a.Period - b.Period);
    },

    /**
     * Gets the active stages for the current project.
     * @param {boolean} currentOnly - if true, returns only stages where CurrentStage is true
     */
    getCurrentStages(currentOnly = false) {
        const stages = DataLoader.getStages();
        let filtered = stages.filter(s => s.ProjectCode === this._filters.projectCode);
        
        if (currentOnly) {
            filtered = filtered.filter(s => s.CurrentStage === true);
        }
        
        return filtered;
    },

    /**
     * Gets summary metrics comparing all projects under the active scenario and status filter.
     */
    getPortfolioData() {
        const projects = DataLoader.getProjects();
        const kpis = DataLoader.getKPIs();
        const stages = DataLoader.getStages();
        
        // Filter projects by status and portfolio
        let filteredProjects = projects;
        if (this._filters.status !== 'All') {
            filteredProjects = filteredProjects.filter(p => p.Status === this._filters.status);
        }
        if (this._filters.portfolio && this._filters.portfolio !== 'All') {
            filteredProjects = filteredProjects.filter(p => p.Portfolio === this._filters.portfolio);
        }

        return filteredProjects.map(proj => {
            // Find KPI record
            const kpi = kpis.find(k => 
                k.ProjectCode === proj.ProjectCode && 
                k.Scenario === this._filters.budget
            );

            // Find current active stages
            const activeStages = stages
                .filter(s => s.ProjectCode === proj.ProjectCode && s.CurrentStage)
                .map(s => s.StageCode);

            return {
                projectCode: proj.ProjectCode,
                projectName: proj.ProjectName,
                status: proj.Status,
                portfolio: proj.Portfolio,
                region: proj.Region,
                currentStages: activeStages,
                revenue: kpi ? kpi.Revenue : proj.TotalRevenue,
                profit: kpi ? kpi.DevelopmentProfit : (proj.TotalRevenue - proj.TotalCost),
                margin: kpi ? kpi.DevelopmentMargin : 0,
                irr: kpi ? kpi.ProjectIRR : null, // Handled dynamically in common.js if null
                equityIrr: kpi ? kpi.EquityIRR : null,
                peakEquity: kpi ? kpi.PeakEquity : 0
            };
        });
    }
};

window.AppState = AppState;
