/**
 * common.js - Shared utilities, layout templates, number formatting,
 * and financial math solvers. Used on all dashboard pages.
 */

// Stage Code friendly names mapping
const STAGE_NAMES = {
    "000": "Land Acquisition",
    "010": "Planning Permits",
    "020": "Design & Engineering",
    "030": "Site Establishment",
    "040": "Bulk Excavation",
    "050": "Substructure Work",
    "051": "Superstructure Frame",
    "060": "Facade & Roofing",
    "070": "Services Rough-In",
    "080": "Internal Finishes",
    "090": "External Landscaping",
    "100": "Civil Works",
    "110": "Practical Completion",
    "120": "Marketing Launch",
    "130": "Pre-Leasing Phase",
    "140": "Pre-Commissioning",
    "150": "Tenant Handover",
    "160": "Title Registration",
    "170": "Sales Settlement",
    "180": "Defects Liability",
    "200": "Stage 1 Construction",
    "220": "Stage 2 Construction",
    "240": "Stage 3 Construction",
    "260": "Stage 4 Construction",
    "280": "Stage 5 Construction",
    "300": "Retail Fitout",
    "320": "Body Corporate Setup",
    "340": "Operations Launch",
    "360": "Lease Commencements",
    "380": "Refinancing Phase",
    "400": "Project Review",
    "500": "Project Closeout"
};

/**
 * Maps a stage code to a professional stage description.
 * @param {string} code 
 * @returns {string}
 */
function getStageName(code) {
    return STAGE_NAMES[code] || `Stage ${code}`;
}

// Formatting Helpers

/**
 * Formats a number to currency in millions/thousands. E.g. $145.6M or $1,250
 * @param {number} val 
 * @returns {string}
 */
function formatCurrency(val) {
    if (val === null || val === undefined || isNaN(val)) return 'N/A';
    const absVal = Math.abs(val);
    const sign = val < 0 ? '-' : '';
    
    if (absVal >= 1000000) {
        return `${sign}$${(absVal / 1000000).toFixed(1)}M`;
    } else if (absVal >= 1000) {
        return `${sign}$${(absVal / 1000).toFixed(0)}K`;
    } else {
        return `${sign}$${Math.round(absVal)}`;
    }
}

/**
 * Formats a percentage to one decimal place. E.g. 24.6%
 * @param {number} val 
 * @returns {string}
 */
function formatPercent(val) {
    if (val === null || val === undefined || isNaN(val)) return 'N/A';
    return `${val.toFixed(1)}%`;
}

/**
 * Formats an integer with thousands comma separators. E.g. 1,250
 * @param {number} val 
 * @returns {string}
 */
function formatInteger(val) {
    if (val === null || val === undefined || isNaN(val)) return 'N/A';
    return Math.round(val).toLocaleString();
}

// Financial Solvers (Grid Search + Bisection for IRR)

/**
 * Solves the Internal Rate of Return (IRR) for a series of cashflows.
 * First uses grid search to find the sign change interval, then bisects.
 * Annualizes the monthly rate: ((1 + monthlyRate)^12 - 1) * 100.
 * @param {number[]} cashflows 
 * @returns {number|null}
 */
function calculateIRR(cashflows) {
    let hasPositive = false;
    let hasNegative = false;
    let maxVal = 0;
    
    for (let i = 0; i < cashflows.length; i++) {
        if (cashflows[i] > 0) hasPositive = true;
        if (cashflows[i] < 0) hasNegative = true;
        if (Math.abs(cashflows[i]) > maxVal) maxVal = Math.abs(cashflows[i]);
    }
    
    if (!hasPositive || !hasNegative) return null;
    
    // Normalize cashflows to avoid floating-point overflow during power calculations
    const normalized = cashflows.map(v => v / maxVal);
    
    function npv(rate) {
        let sum = 0;
        for (let t = 0; t < normalized.length; t++) {
            sum += normalized[t] / Math.pow(1 + rate, t);
        }
        return sum;
    }
    
    // Step 1: Grid search to find brackets containing roots (-95% to +200% per month)
    let bracketLow = null;
    let bracketHigh = null;
    const step = 0.005;
    
    for (let rate = -0.95; rate <= 2.0; rate += step) {
        let n = npv(rate);
        if (Math.abs(n) < 1e-8) {
            return (Math.pow(1 + rate, 12) - 1) * 100;
        }
        
        if (bracketLow === null) {
            bracketLow = rate;
        } else {
            let prevN = npv(bracketLow);
            if (prevN * n < 0) {
                bracketHigh = rate;
                break;
            }
            bracketLow = rate; // move window
        }
    }
    
    // Step 2: Bisection within bracket
    if (bracketLow !== null && bracketHigh !== null) {
        let rLow = bracketLow;
        let rHigh = bracketHigh;
        
        for (let iter = 0; iter < 100; iter++) {
            let rMid = (rLow + rHigh) / 2;
            let nMid = npv(rMid);
            
            if (Math.abs(nMid) < 1e-8) {
                return (Math.pow(1 + rMid, 12) - 1) * 100;
            }
            
            if (npv(rLow) * nMid < 0) {
                rHigh = rMid;
            } else {
                rLow = rMid;
            }
        }
        
        const finalRate = (rLow + rHigh) / 2;
        return (Math.pow(1 + finalRate, 12) - 1) * 100;
    }
    
    return null;
}

/**
 * Calculates the Net Present Value (NPV) of cashflows at a given annual rate.
 * @param {number[]} cashflows 
 * @param {number} annualRate 
 * @returns {number}
 */
function calculateNPV(cashflows, annualRate = 0.10) {
    const monthlyRate = annualRate / 12;
    let npv = 0;
    for (let i = 0; i < cashflows.length; i++) {
        npv += cashflows[i] / Math.pow(1 + monthlyRate, i);
    }
    return npv;
}

// Shell Layout Rendering

/**
 * Dynamically injects the Top Navbar and Tab Controls, synchronizing selectors with AppState.
 * @param {string} activePage - e.g., 'executive', 'cashflow', 'financials', 'portfolio'
 */
function injectShellLayout(activePage) {
    // Define page sets
    const XERO_PAGES = {
        'xero_cash': { title: 'Cash Position by Account', file: 'xero_1_ntt_cash_position.html', icon: 'fa-solid fa-money-check-dollar' },
        'xero_payments': { title: 'Payments by Month', file: 'xero_2_ntt_payments_by_month.html', icon: 'fa-solid fa-calendar-days' },
        'xero_lot': { title: 'Lot-level Revenue', file: 'xero_3_ntt_lot_revenue.html', icon: 'fa-solid fa-house-chimney' },
        'xero_aging': { title: 'AP / AR Aging', file: 'xero_4_ntt_ap_ar_aging.html', icon: 'fa-solid fa-clock-rotate-left' },
        'xero_balance_sheet': { title: 'Balance Sheet', file: 'xero_5_ntt_balance_sheet.html', icon: 'fa-solid fa-scale-balanced' }
    };
    
    const ESTATE_PAGES = {
        'executive': { title: 'Executive Summary', file: 'executive.html', icon: 'fa-solid fa-chart-line' },
        'cashflow': { title: 'Cashflow & Timeline', file: 'cashflow.html', icon: 'fa-solid fa-timeline' },
        'financials': { title: 'Financial Breakdown', file: 'financials.html', icon: 'fa-solid fa-file-invoice-dollar' },
        'portfolio': { title: 'Portfolio Comparison', file: 'portfolio.html', icon: 'fa-solid fa-building-user' },
        'whatif': { title: 'What-if Analysis', file: 'whatif.html', icon: 'fa-solid fa-wand-magic-sparkles' }
    };

    const isXero = activePage in XERO_PAGES;

    // 1. Inject Navbar
    const topNavbar = document.querySelector('.top-navbar');
    if (topNavbar) {
        if (isXero) {
            topNavbar.innerHTML = `
                <div class="top-navbar-left">
                    <h1 class="page-title-heading">${XERO_PAGES[activePage].title}</h1>
                </div>
            `;
        } else {
            const pageTitle = ESTATE_PAGES[activePage] ? ESTATE_PAGES[activePage].title : 'Dashboard';
            topNavbar.innerHTML = `
                <div class="top-navbar-left">
                    <h1 class="page-title-heading">${pageTitle}</h1>
                </div>
                
                <div class="nav-filters">
                    <div class="filter-group">
                        <label for="projectSelect">Project</label>
                        <select id="projectSelect" class="filter-select"></select>
                    </div>
                    <div class="filter-group">
                        <label for="budgetSelect">Budget</label>
                        <select id="budgetSelect" class="filter-select"></select>
                    </div>
                </div>
            `;
        }
    }

    // 2. Inject Page Navigation Tabs
    const pageNavBar = document.querySelector('.page-nav-bar');
    if (pageNavBar) {
        // Sync sidebar state from local storage on load
        const isCollapsed = localStorage.getItem('yl-sidebar-collapsed') === 'true';
        const appContainer = document.querySelector('.app-container');
        if (appContainer) {
            if (isCollapsed) {
                appContainer.classList.add('sidebar-collapsed');
            } else {
                appContainer.classList.remove('sidebar-collapsed');
            }
        }

        // Determine menu items based on page group
        let menuHTML = '';
        if (isXero) {
            Object.keys(XERO_PAGES).forEach(key => {
                const item = XERO_PAGES[key];
                menuHTML += `
                    <li class="menu-item ${activePage === key ? 'active' : ''}">
                        <a href="${item.file}" class="menu-link" title="${item.title}">
                            <span class="menu-icon"><i class="${item.icon}"></i></span>
                            <span class="menu-text">${item.title}</span>
                        </a>
                    </li>
                `;
            });
        } else {
            Object.keys(ESTATE_PAGES).forEach(key => {
                const item = ESTATE_PAGES[key];
                menuHTML += `
                    <li class="menu-item ${activePage === key ? 'active' : ''}">
                        <a href="${item.file}" class="menu-link" title="${item.title}">
                            <span class="menu-icon"><i class="${item.icon}"></i></span>
                            <span class="menu-text">${item.title}</span>
                        </a>
                    </li>
                `;
            });
        }

        pageNavBar.innerHTML = `
            <div class="sidebar-header">
                <div class="brand-section">
                    <a href="../index.html" class="brand-logo-link" style="display: flex; align-items: center;">
                        <img src="../data/YourLand Sign.png" alt="YourLand Developments Logo" class="brand-logo-img logo-full">
                        <img src="../data/Yourland mini sign.png" alt="YourLand Logo" class="brand-logo-img logo-mini">
                    </a>
                </div>
                <button id="sidebarToggle" class="sidebar-toggle-btn" title="Toggle Navigation">
                    <i class="fa-solid fa-chevron-left toggle-icon"></i>
                </button>
            </div>
            
            <div class="sidebar-body">
                <ul class="sidebar-menu">
                    ${menuHTML}
                </ul>
            </div>
            
            <div class="sidebar-footer">
                <a href="https://estatemaster.com" target="_blank" class="sidebar-help-link" title="System Help">
                    <span class="menu-icon"><i class="fa-solid fa-circle-question"></i></span>
                    <span class="menu-text">System Help</span>
                </a>
            </div>
        `;

        // Bind sidebar collapse toggle click listener
        const toggleBtn = pageNavBar.querySelector('#sidebarToggle');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                const currentContainer = document.querySelector('.app-container');
                if (currentContainer) {
                    const currentlyCollapsed = currentContainer.classList.toggle('sidebar-collapsed');
                    localStorage.setItem('yl-sidebar-collapsed', currentlyCollapsed ? 'true' : 'false');
                }
            });
        }
    }

    // 3. Inject Footer (if footer element exists, else append)
    let footer = document.querySelector('footer');
    if (!footer) {
        footer = document.createElement('footer');
        footer.className = 'py-3 mt-auto text-center border-top bg-white text-muted';
        footer.style.fontSize = '0.75rem';
        footer.style.borderColor = 'var(--yl-border)';
        document.querySelector('.app-container').appendChild(footer);
    }
    footer.innerHTML = `
        <div class="container-fluid">
            <span>&copy; ${new Date().getFullYear()} YourLand Development Pty Ltd. All rights reserved. &bull; Powered by CodeFusion.</span>
        </div>
    `;
    
    // Inject chatbot widget
    injectChatbotWidget();
    
    // Check and inject what-if banner
    checkAndInjectWhatIfBanner();
}

// Card pulse highlight micro-interaction helper
function updateKPIValue(elementId, newValue) {
    const el = document.getElementById(elementId);
    if (!el) return;
    const oldValue = el.textContent.trim();
    if (oldValue !== newValue) {
        el.textContent = newValue;
        
        // Don't pulse initial value sets (empty or loading states)
        if (oldValue && oldValue !== '--' && oldValue !== 'Loading...') {
            // Find parent kpi-card to apply animation
            const card = el.closest('.kpi-card');
            if (card) {
                card.classList.remove('pulse-animate');
                void card.offsetWidth; // Trigger DOM reflow to restart animation
                card.classList.add('pulse-animate');
            }
        }
    }
}

// Global page initialization wrapper
async function initializeDashboardPage(pageKey, renderPageDataCallback) {
    // Show Loading
    const loader = document.createElement('div');
    loader.className = 'loading-overlay';
    loader.innerHTML = `
        <div class="loading-spinner"></div>
        <h5 class="fw-bold">YourLand Executive Dashboard</h5>
        <p class="text-muted">Loading EstateMaster models...</p>
    `;
    document.body.appendChild(loader);

    try {
        // 1. Fetch & cache data
        await DataLoader.loadAllData();
        
        // 2. Initialize AppState
        AppState.initialize();
        
        // 3. Draw common layouts
        injectShellLayout(pageKey);
        
        // 4. Hook up filters UI
        FiltersController.initializeFilters();
        
        // 5. Hide Loader
        loader.style.opacity = '0';
        setTimeout(() => loader.remove(), 300);

        // 6. Draw page content
        renderPageDataCallback();

        // 7. Subscribe to global filter changes
        AppState.onChange(() => {
            // Cascade filter elements update first
            FiltersController.syncDropdownStates();
            // Re-render dashboard page
            renderPageDataCallback();
        });

    } catch (err) {
        console.error('Failed to initialize page.', err);
        loader.innerHTML = `
            <i class="fa-solid fa-triangle-exclamation text-danger fs-1 mb-3"></i>
            <h5 class="fw-bold">Initialization Error</h5>
            <p class="text-muted">Failed to parse projects metadata from Lakehouse cache.</p>
            <button onclick="window.location.reload()" class="btn btn-sm btn-outline-secondary mt-2">Retry Load</button>
        `;
    }
}

/**
 * Injects a floating executive assistant chatbot at the bottom-right of the page.
 */
function injectChatbotWidget() {
    // Prevent double injection
    if (document.getElementById('yl-chatbot-container')) return;

    // Create the chatbot HTML element
    const chatbotContainer = document.createElement('div');
    chatbotContainer.id = 'yl-chatbot-container';
    chatbotContainer.className = 'chatbot-container';
    
    chatbotContainer.innerHTML = `
        <button id="chatbotFab" class="chatbot-fab" title="Open Executive Assistant">
            <i class="fa-solid fa-user-tie"></i>
        </button>
        <div id="chatbotWindow" class="chatbot-window">
            <div class="chatbot-header">
                <h5 class="chatbot-header-title">
                    <i class="fa-solid fa-user-tie"></i> Chat bot
                </h5>
                <button id="chatbotClose" class="chatbot-header-close" title="Close">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            </div>
            <div id="chatbotBody" class="chatbot-body">
                <div class="chat-msg bot">
                    <p>Hello, I am your Assistant.</p>
                    <p>How can I assist you?</p>
                </div>
            </div>
            <div id="chatbotFooter" class="chatbot-footer"></div>
        </div>
    `;

    document.body.appendChild(chatbotContainer);

    // Chatbot questions database
    const CHATBOT_FAQS = [
        {
            id: 1,
            question: "1. What is our portfolio composition and total locked capital?",
            answer: "Our active portfolio consists of 14 major projects. Under the Current Budget: 3 Completed (Stone Ridge, Oak Meadows, Acclaim), 3 in Construction (Evergreen, Highlands, Green Fields), 3 in Planning (Parkview Estate, Marran Run, The Junction), 3 in Feasibility (River Valley, Wedge Rd, Seventh), and 2 Selling (Lakeside, Kings Quarter). Additionally, we have 5 projects currently <strong>On Hold</strong>: Brookside, Hillcrest, Officer North, Northgate, and Westbrook. The total revenue locked in 'On Hold' projects stands at a substantial <strong>$1.134B</strong>.",
            followup: {
                question: "↳ Q1 Follow-up: Which projects drive this locked capital, and what is the reactivation plan?",
                answer: "The largest contributors to our on-hold capital are <strong>Brookside</strong> ($338M, Victoria, Mixed Use) and <strong>Hillcrest</strong> ($266M, Victoria, Commercial). The executive committee is actively evaluating Joint Venture (JV) equity partners to mitigate risk and peak exposure, and is restructuring project timelines to align with more favorable interest rate cycles."
            }
        },
        {
            id: 2,
            question: "2. How is the 'River Valley' (Project 100) project performing vs. feasibility?",
            answer: "Under the Current Budget scenario, River Valley's projected revenue has increased to <strong>$97.67M</strong> (vs. $91.67M in feasibility). However, total costs have also risen to <strong>$74.45M</strong> (vs. $65.89M), squeezing our projected Development Profit to <strong>$23.22M</strong> (down from $25.78M) and bringing the margin down to <strong>23.77%</strong> (down from 28.12%). Project IRR stands at <strong>13.06%</strong> compared to the original feasibility target of <strong>15.99%</strong>.",
            followup: {
                question: "↳ Q2 Follow-up: What is the peak equity exposure and breakeven timeline for River Valley?",
                answer: "The project's peak equity requirement is <strong>$25.42M</strong>, which is scheduled to occur in <strong>Period 84</strong>. The projected breakeven point is estimated at <strong>Period 109</strong> (out of 117 total periods). This represents a slight delay of 1 period compared to the original target of Period 108, but shows improved cash exposure from the Previous Budget."
            }
        },
        {
            id: 3,
            question: "3. Which active construction project has the highest IRR?",
            answer: "We currently have three projects in active construction. Under the Current Budget:<br>• <strong>Evergreen</strong> (Victoria, Residential) leads with a Project IRR of <strong>9.02%</strong> (Margin: 17.74%, Profit: $55.73M).<br>• <strong>Highlands</strong> (NSW, Commercial) has an IRR of <strong>7.33%</strong> (Margin: 13.88%, Profit: $40.26M).<br>• <strong>Green Fields</strong> (NSW, Mixed Use) has an IRR of <strong>5.62%</strong> (Margin: 13.55%, Profit: $31.15M).<br>Consequently, <strong>Evergreen</strong> is our top-performing active construction asset by IRR, Profit, and Margin.",
            followup: {
                question: "↳ Q3 Follow-up: What are the peak cash requirements and remaining durations for these assets?",
                answer: "Peak equity exposures are <strong>$89.83M</strong> for Evergreen (occurring at Period 95), <strong>$88.26M</strong> for Highlands (Period 50), and <strong>$70.13M</strong> for Green Fields (Period 76). Evergreen is a longer-term asset (running from Period 48 to 128) with a breakeven target at Period 122, leaving a safe 6-period tail buffer."
            }
        },
        {
            id: 4,
            question: "4. How did our completed projects perform against original feasibility?",
            answer: "All three completed projects experienced cost pressures that compressed margins compared to original feasibility:<br>• <strong>Stone Ridge</strong> (Project 200, Commercial): Profit of <strong>$68.58M</strong> / Margin of <strong>20.55%</strong> (original target: $81.45M / 25.77%).<br>• <strong>Oak Meadows</strong> (Project 450, Mixed Use): Profit of <strong>$59.57M</strong> / Margin of <strong>17.87%</strong> (original target: $73.93M / 23.38%).<br>• <strong>Acclaim</strong> (Project 800, Commercial): Profit of <strong>$67.08M</strong> / Margin of <strong>21.40%</strong> (original target: $79.99M / 26.84%).",
            followup: {
                question: "↳ Q4 Follow-up: What were the peak equity exposures for these completed projects?",
                answer: "Peak equity exposures reached <strong>$91.22M</strong> for Stone Ridge (Period 69), <strong>$95.20M</strong> for Oak Meadows (Period 62), and <strong>$84.51M</strong> for Acclaim (Period 107). These were higher than original feasibility estimates, representing increased cash requirements during active construction phases."
            }
        },
        {
            id: 5,
            question: "5. How is our portfolio geographically distributed by revenue?",
            answer: "Our portfolio's total revenue under Current Budget is geographically concentrated as follows:<br>• <strong>Victoria</strong>: Major driver of revenue with Brookside ($338M), Stone Ridge ($333M), Evergreen ($314M), and Lakeside ($228M).<br>• <strong>New South Wales</strong>: Driven by Oak Meadows ($333M), Highlands ($289M), Kings Quarter ($284M), and Westbrook ($208M).<br>• <strong>Queensland</strong>: Driven by Wedge Rd ($352M), Acclaim ($313M), Marran Run ($310M), and Northgate ($206M).",
            followup: {
                question: "↳ Q5 Follow-up: What is the strategic priority for Queensland?",
                answer: "The strategic focus in Queensland is the successful execution of <strong>Wedge Rd</strong> ($352M, Feasibility) and maintaining the strong performance of <strong>Acclaim</strong> ($313M, Completed), while seeking to reactivate <strong>Northgate</strong> ($206M, On Hold) to balance geographical returns."
            }
        }
    ];

    const fab = document.getElementById('chatbotFab');
    const win = document.getElementById('chatbotWindow');
    const closeBtn = document.getElementById('chatbotClose');
    const chatBody = document.getElementById('chatbotBody');
    const chatFooter = document.getElementById('chatbotFooter');

    // Toggle window display
    fab.addEventListener('click', () => {
        const isShown = win.classList.toggle('show');
        if (isShown) {
            chatBody.scrollTop = chatBody.scrollHeight;
        }
    });

    closeBtn.addEventListener('click', () => {
        win.classList.remove('show');
    });

    document.addEventListener('click', (e) => {
        if (!chatbotContainer.contains(e.target) && e.target !== fab && !fab.contains(e.target)) {
            win.classList.remove('show');
        }
    });

    function appendMessage(sender, htmlContent) {
        const msgDiv = document.createElement('div');
        msgDiv.className = `chat-msg ${sender}`;
        msgDiv.innerHTML = htmlContent;
        chatBody.appendChild(msgDiv);
        chatBody.scrollTop = chatBody.scrollHeight;
    }

    function showTypingIndicator() {
        const indicator = document.createElement('div');
        indicator.id = 'chatTypingIndicator';
        indicator.className = 'chat-msg bot';
        indicator.innerHTML = `
            <div class="typing-dots">
                <span></span>
                <span></span>
                <span></span>
            </div>
        `;
        chatBody.appendChild(indicator);
        chatBody.scrollTop = chatBody.scrollHeight;
    }

    function removeTypingIndicator() {
        const indicator = document.getElementById('chatTypingIndicator');
        if (indicator) {
            indicator.remove();
        }
    }

    function renderMainOptions() {
        chatFooter.innerHTML = '';
        
        CHATBOT_FAQS.forEach(faq => {
            const btn = document.createElement('button');
            btn.className = 'chat-option-btn';
            btn.textContent = faq.question;
            btn.addEventListener('click', () => handleQuestionClick(faq));
            chatFooter.appendChild(btn);
        });
    }

    function handleQuestionClick(faq) {
        appendMessage('user', `<p>${faq.question}</p>`);
        chatFooter.innerHTML = '';
        showTypingIndicator();
        
        setTimeout(() => {
            removeTypingIndicator();
            appendMessage('bot', `<p>${faq.answer}</p>`);
            renderFollowupOptions(faq);
        }, 800);
    }

    function renderFollowupOptions(faq) {
        chatFooter.innerHTML = '';
        
        const followBtn = document.createElement('button');
        followBtn.className = 'chat-option-btn';
        followBtn.textContent = faq.followup.question;
        followBtn.addEventListener('click', () => {
            appendMessage('user', `<p>${faq.followup.question}</p>`);
            chatFooter.innerHTML = '';
            showTypingIndicator();
            
            setTimeout(() => {
                removeTypingIndicator();
                appendMessage('bot', `<p>${faq.followup.answer}</p>`);
                renderBackMenu();
            }, 800);
        });
        chatFooter.appendChild(followBtn);

        const backBtn = document.createElement('button');
        backBtn.className = 'chat-reset-btn';
        backBtn.textContent = 'Back to Main Menu';
        backBtn.addEventListener('click', () => {
            appendMessage('bot', '<p>Select another topic from the menu below:</p>');
            renderMainOptions();
        });
        chatFooter.appendChild(backBtn);
    }

    function renderBackMenu() {
        chatFooter.innerHTML = '';
        const backBtn = document.createElement('button');
        backBtn.className = 'chat-reset-btn';
        backBtn.textContent = 'Back to Main Menu';
        backBtn.addEventListener('click', () => {
            appendMessage('bot', '<p>Select another topic from the menu below:</p>');
            renderMainOptions();
        });
        chatFooter.appendChild(backBtn);
    }

    renderMainOptions();
}

// Export functions to global scope
window.getStageName = getStageName;
window.formatCurrency = formatCurrency;
window.formatPercent = formatPercent;
window.formatInteger = formatInteger;
window.calculateIRR = calculateIRR;
window.calculateNPV = calculateNPV;
window.updateKPIValue = updateKPIValue;
window.initializeDashboardPage = initializeDashboardPage;
window.applyWhatIf = applyWhatIf;
window.resetWhatIf = resetWhatIf;
window.checkAndInjectWhatIfBanner = checkAndInjectWhatIfBanner;

/**
 * Checks if what-if mode is active and injects the countdown warning banner.
 */
function checkAndInjectWhatIfBanner() {
    if (localStorage.getItem('whatif_applied') !== 'true') {
        const existingBanner = document.getElementById('whatif-banner');
        if (existingBanner) existingBanner.remove();
        return;
    }

    // Calculate remaining seconds
    const appliedTime = parseInt(localStorage.getItem('whatif_applied_time')) || Date.now();
    const elapsed = Math.round((Date.now() - appliedTime) / 1000);
    const duration = 30; // 30 seconds auto-revert
    let remaining = duration - elapsed;

    if (remaining <= 0) {
        resetWhatIf();
        return;
    }

    // Inject banner
    if (!document.getElementById('whatif-banner')) {
        const banner = document.createElement('div');
        banner.id = 'whatif-banner';
        banner.className = 'whatif-banner';
        banner.innerHTML = `
            <span>⚠️ <strong>What-if Analysis Active</strong>: Displaying simulated project data. Reverting to original in <span id="whatif-timer">${remaining}</span>s.</span>
            <button id="whatif-banner-reset" class="whatif-banner-reset-btn">Reset to Original</button>
        `;
        document.body.appendChild(banner);

        // Bind reset action
        document.getElementById('whatif-banner-reset').addEventListener('click', () => {
            resetWhatIf();
        });
    }

    // Start timer interval
    if (window.whatIfInterval) clearInterval(window.whatIfInterval);
    
    window.whatIfInterval = setInterval(() => {
        const timerSpan = document.getElementById('whatif-timer');
        if (!timerSpan) {
            clearInterval(window.whatIfInterval);
            return;
        }
        const currentRemaining = parseInt(timerSpan.textContent || "0") - 1;
        if (currentRemaining <= 0) {
            clearInterval(window.whatIfInterval);
            resetWhatIf();
        } else {
            timerSpan.textContent = currentRemaining;
        }
    }, 1000);
}

/**
 * Resets the dashboard data to its original state and notifies page listeners.
 */
function resetWhatIf() {
    if (window.whatIfInterval) clearInterval(window.whatIfInterval);
    
    localStorage.removeItem('whatif_applied');
    localStorage.removeItem('whatif_applied_time');
    localStorage.removeItem('whatif_changes');

    if (window.DataLoader) {
        DataLoader.clearSimulatedChanges();
    }

    const banner = document.getElementById('whatif-banner');
    if (banner) banner.remove();

    // Notify state listeners to redraw the page with original data
    if (window.AppState) {
        AppState.notify();
    }
}

/**
 * Applies saved changes and sets active what-if simulation mode.
 */
function applyWhatIf(changes) {
    localStorage.setItem('whatif_changes', JSON.stringify(changes));
    localStorage.setItem('whatif_applied', 'true');
    localStorage.setItem('whatif_applied_time', Date.now().toString());

    if (window.DataLoader) {
        DataLoader.clearSimulatedChanges();
        DataLoader.applySimulatedChanges();
    }

    // Inject warning banner
    checkAndInjectWhatIfBanner();

    // Notify state listeners to redraw the page with simulated data
    if (window.AppState) {
        AppState.notify();
    }
}

// ── Sales Dashboard pages (Salesforce) ────────────────────────────────────────
window.SALES_PAGES = {
    'sf_overview':      { title: 'Sales Overview',         file: 'sf_1_sales_overview.html',      icon: 'fa-solid fa-chart-pie' },
    'sf_leads':         { title: 'Leads Overview',         file: 'sf_2_leads_overview.html',       icon: 'fa-solid fa-users' },
    'sf_deposits':      { title: 'Deposits & Contracts',   file: 'sf_3_deposits_contracts.html',   icon: 'fa-solid fa-file-signature' },
    'sf_leads_detail':  { title: 'Leads Detail',           file: 'sf_4_leads_detail.html',         icon: 'fa-solid fa-table-list' },
    'sf_opp_detail':    { title: 'Opportunities Detail',   file: 'sf_5_opp_detail.html',           icon: 'fa-solid fa-handshake' },
    'sf_lots_detail':   { title: 'Lots Detail',            file: 'sf_6_lots_detail.html',          icon: 'fa-solid fa-map-location-dot' },
    'sf_contactability':{ title: 'Contactability',         file: 'sf_7_contactability.html',       icon: 'fa-solid fa-phone-volume' },
};

/**
 * Injects the shell layout for Sales (Salesforce) pages.
 * Call this instead of injectShellLayout() from Sales pages.
 */
function injectSalesShellLayout(activePage) {
    const isCollapsed = localStorage.getItem('yl-sidebar-collapsed') === 'true';
    const appContainer = document.querySelector('.app-container');
    if (appContainer && isCollapsed) appContainer.classList.add('sidebar-collapsed');

    // Top navbar
    const topNavbar = document.querySelector('.top-navbar');
    if (topNavbar) {
        const pageTitle = SALES_PAGES[activePage] ? SALES_PAGES[activePage].title : 'Sales Dashboard';
        topNavbar.innerHTML = `
            <div class="top-navbar-left">
                <h1 class="page-title-heading">${pageTitle}</h1>
            </div>
            <!-- Filters are inline in each page (Xero-style) -->
        `;
    }

    // Sidebar
    const pageNavBar = document.querySelector('.page-nav-bar');
    if (pageNavBar) {
        const sections = [
            { label: 'Sales Intelligence', keys: ['sf_overview','sf_leads','sf_deposits'] },
            { label: 'Detail Tables',      keys: ['sf_leads_detail','sf_opp_detail','sf_lots_detail'] },
            { label: 'Engagement',         keys: ['sf_contactability'] },
        ];
        let menuHTML = '';
        sections.forEach(sec => {
            menuHTML += `<li class="menu-section-label">${sec.label}</li>`;
            sec.keys.forEach(key => {
                const item = SALES_PAGES[key];
                menuHTML += `
                    <li class="menu-item ${activePage === key ? 'active' : ''}">
                        <a href="${item.file}" class="menu-link" title="${item.title}">
                            <span class="menu-icon"><i class="${item.icon}"></i></span>
                            <span class="menu-text">${item.title}</span>
                        </a>
                    </li>`;
            });
        });

        pageNavBar.innerHTML = `
            <div class="sidebar-header">
                <div class="brand-section">
                    <a href="../index.html" class="brand-logo-link" style="display:flex;align-items:center">
                        <img src="../data/YourLand Sign.png" alt="YourLand" class="brand-logo-img logo-full">
                        <img src="../data/Yourland mini sign.png" alt="YL" class="brand-logo-img logo-mini">
                    </a>
                </div>
                <button id="sidebarToggle" class="sidebar-toggle-btn" title="Toggle Navigation">
                    <i class="fa-solid fa-chevron-left toggle-icon"></i>
                </button>
            </div>
            <div class="sidebar-body">
                <ul class="sidebar-menu">${menuHTML}</ul>
            </div>
            <div class="sidebar-footer">
                <a href="../index.html" class="sidebar-help-link">
                    <span class="menu-icon"><i class="fa-solid fa-arrow-left"></i></span>
                    <span class="menu-text">Back to Hub</span>
                </a>
            </div>`;

        const toggleBtn = pageNavBar.querySelector('#sidebarToggle');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                const c = document.querySelector('.app-container');
                if (c) {
                    const collapsed = c.classList.toggle('sidebar-collapsed');
                    localStorage.setItem('yl-sidebar-collapsed', collapsed ? 'true' : 'false');
                }
            });
        }
    }

    // Footer
    let footer = document.querySelector('footer');
    if (!footer) {
        footer = document.createElement('footer');
        footer.className = 'py-3 mt-auto text-center border-top bg-white text-muted';
        footer.style.fontSize = '0.75rem';
        document.querySelector('.app-container').appendChild(footer);
    }
    footer.innerHTML = `<div class="container-fluid"><span>&copy; ${new Date().getFullYear()} YourLand Development Pty Ltd. All rights reserved. &bull; Powered by CodeFusion.</span></div>`;
}

window.injectSalesShellLayout = injectSalesShellLayout;
