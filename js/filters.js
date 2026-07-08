/**
 * FiltersController - Binds navbar dropdown elements to AppState,
 * handles selection changes, and manages cascading list filters.
 */
const FiltersController = {
    _statusSelect: null,
    _projectSelect: null,
    _budgetSelect: null,
    _yearSelect: null,

    /**
     * Finds dropdown elements and sets up initial option lists.
     */
    initializeFilters() {
        this._statusSelect = document.getElementById('statusSelect');
        this._projectSelect = document.getElementById('projectSelect');
        this._budgetSelect = document.getElementById('budgetSelect');
        this._yearSelect = document.getElementById('yearSelect');

        // If status or year selectors are missing from DOM, force their AppState values to 'All'
        if (!this._statusSelect) {
            AppState._filters.status = 'All';
        }
        if (!this._yearSelect) {
            AppState._filters.year = 'All';
        }
        AppState.save();

        if (!this._projectSelect || !this._budgetSelect) {
            console.error('FiltersController: Missing projectSelect or budgetSelect element in DOM.');
            return;
        }

        // 1. Populate static dropdowns (Budget and Year)
        this.populateBudgets();
        this.populateYears();

        // 2. Populate Status list from projects data
        this.populateStatuses();

        // 3. Populate Projects list (which respects current Status filter)
        this.populateProjects();

        // 4. Sync values from AppState to select elements
        this.syncDropdownStates();

        // 5. Register change listeners
        this.bindEvents();
    },

    populateBudgets() {
        const budgets = [
            { value: 'OriginalBudget', label: 'Original Budget' },
            { value: 'ProjectBudget', label: 'Project Budget' },
            { value: 'PreviousBudget', label: 'Previous Budget' },
            { value: 'CurrentBudget', label: 'Current Budget' }
        ];
        this._budgetSelect.innerHTML = budgets
            .map(b => `<option value="${b.value}">${b.label}</option>`)
            .join('');
    },

    populateYears() {
        if (!this._yearSelect) return;
        let html = '<option value="All">All Years</option>';
        for (let yr = 2020; yr <= 2032; yr++) {
            html += `<option value="${yr}">${yr}</option>`;
        }
        this._yearSelect.innerHTML = html;
    },

    populateStatuses() {
        if (!this._statusSelect) return;
        const projects = DataLoader.getProjects();
        // Unique statuses sorted
        const statuses = [...new Set(projects.map(p => p.Status))].sort();
        
        let html = '<option value="All">All Statuses</option>';
        statuses.forEach(st => {
            html += `<option value="${st}">${st}</option>`;
        });
        this._statusSelect.innerHTML = html;
    },

    /**
     * Re-populates the Project list based on current active status filter.
     */
    populateProjects() {
        const projects = DataLoader.getProjects();
        const currentStatus = this._statusSelect ? AppState.getFilter('status') : 'All';
        
        let filtered = projects;
        if (currentStatus !== 'All') {
            filtered = projects.filter(p => p.Status === currentStatus);
        }

        // Sort projects by ProjectCode or Name
        filtered.sort((a, b) => a.ProjectCode - b.ProjectCode);

        this._projectSelect.innerHTML = filtered
            .map(p => `<option value="${p.ProjectCode}">${p.ProjectCode} - ${p.ProjectName}</option>`)
            .join('');
    },

    /**
     * Synchronizes selection state of dropdowns with current AppState filters.
     */
    syncDropdownStates() {
        // Sync Status, Budget, and Year values
        if (this._statusSelect) {
            this._statusSelect.value = AppState.getFilter('status');
        }
        if (this._budgetSelect) {
            this._budgetSelect.value = AppState.getFilter('budget');
        }
        if (this._yearSelect) {
            this._yearSelect.value = AppState.getFilter('year');
        }

        // Re-populate Projects dropdown in case Status changed (cascade rule)
        this.populateProjects();

        // Set Project selector value
        if (this._projectSelect) {
            const activeProjCode = AppState.getFilter('projectCode');
            this._projectSelect.value = activeProjCode;
            
            // Safety check: if project dropdown didn't have that code (e.g. filtered out),
            // selected project code must be updated to whatever is actually selected in DOM
            if (this._projectSelect.value !== activeProjCode.toString() && this._projectSelect.options.length > 0) {
                AppState.setFilter('projectCode', parseInt(this._projectSelect.value));
            }
        }
    },

    /**
     * Attaches change event listeners to UI controls.
     */
    bindEvents() {
        if (this._statusSelect) {
            this._statusSelect.addEventListener('change', (e) => {
                AppState.setFilter('status', e.target.value);
            });
        }

        if (this._projectSelect) {
            this._projectSelect.addEventListener('change', (e) => {
                AppState.setFilter('projectCode', e.target.value);
            });
        }

        if (this._budgetSelect) {
            this._budgetSelect.addEventListener('change', (e) => {
                AppState.setFilter('budget', e.target.value);
            });
        }

        if (this._yearSelect) {
            this._yearSelect.addEventListener('change', (e) => {
                AppState.setFilter('year', e.target.value);
            });
        }
    }
};

window.FiltersController = FiltersController;
