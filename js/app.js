class App {
    constructor() {
        this.facSelect = document.getElementById('faculty-select');
        this.deptSelect = document.getElementById('dept-select');
        this.langToggle = document.getElementById('lang-toggle');
        this.themeToggle = document.getElementById('theme-toggle');
        this.resetBtn = document.getElementById('btn-reset');
        
        this.progressHours = document.getElementById('completed-hours');
        this.progressTotal = document.getElementById('total-hours');
        this.progressBar = document.getElementById('progress-bar');
        
        this.chartEngine = new window.ChartEngine();
        window.exportManager = new ExportManager();
        
        this.init();
    }
    
    async init() {
        // Initialize Theme
        this.applyTheme(window.state.theme);
        
        // Initialize Language
        window.i18n.setLanguage(window.state.language);
        
        // Setup Event Listeners
        this.setupListeners();
        
        // Initial Data Load
        await this.loadDataForCurrentSelection();
    }
    
    setupListeners() {
        // Theme Toggle
        this.themeToggle.addEventListener('click', () => {
            const newTheme = window.state.theme === 'dark' ? 'light' : 'dark';
            window.state.updateSetting('theme', newTheme);
            this.applyTheme(newTheme);
        });
        
        // Language Toggle
        this.langToggle.addEventListener('click', () => {
            const newLang = window.state.language === 'en' ? 'ar' : 'en';
            window.state.updateSetting('language', newLang);
            window.i18n.setLanguage(newLang);
            this.updateLanguageUI();
            this.updateUI(); // Re-render chart for translated names
        });
        
        // Faculty Change
        this.facSelect.addEventListener('change', async (e) => {
            window.state.updateSetting('faculty', e.target.value);
            // reset dept selection since faculty changed
            window.state.updateSetting('department', '');
            await this.loadDataForCurrentSelection();
        });
        
        // Department Change
        this.deptSelect.addEventListener('change', async (e) => {
            window.state.updateSetting('department', e.target.value);
            window.state.loadProgress();
            this.updateUI();
        });
        
        // Reset Button
        this.resetBtn.addEventListener('click', () => {
            this.showResetConfirm();
        });
        
        // Re-draw arrows on window resize
        window.addEventListener('resize', () => {
            if (this.chartEngine) this.chartEngine.drawArrows();
        });
    }
    
    applyTheme(theme) {
        document.body.setAttribute('data-theme', theme);
        const sun = this.themeToggle.querySelector('.sun-icon');
        const moon = this.themeToggle.querySelector('.moon-icon');
        
        if (theme === 'dark') {
            sun.classList.remove('hidden');
            moon.classList.add('hidden');
        } else {
            sun.classList.add('hidden');
            moon.classList.remove('hidden');
        }
    }
    
    updateLanguageUI() {
        const isAr = window.state.language === 'ar';
        this.langToggle.querySelector('.lang-text').textContent = isAr ? 'EN' : 'عربي';
        
        // Update selects
        this.populateDepartments(window.dataManager.rawData.departments);
    }
    
    async loadDataForCurrentSelection() {
        this.facSelect.value = window.state.faculty;
        
        const success = await window.dataManager.loadData(window.state.faculty, 'CS'); // Dummy dept to load file
        
        if (success) {
            this.populateDepartments(window.dataManager.rawData.departments);
            
            // If saved dept is valid for this faculty, use it. Otherwise use first one.
            let validDept = window.state.department;
            const depts = Object.keys(window.dataManager.rawData.departments);
            
            if (!validDept || !depts.includes(validDept)) {
                validDept = depts[0];
                window.state.updateSetting('department', validDept);
            }
            
            this.deptSelect.value = validDept;
            
            // Re-build graph for the specific department
            window.dataManager._buildGraph(validDept);
            
            window.state.loadProgress();
            this.updateUI();
        }
    }
    
    populateDepartments(deptObj) {
        this.deptSelect.innerHTML = '';
        const lang = window.i18n.getLang();
        
        for (const [key, dept] of Object.entries(deptObj)) {
            const opt = document.createElement('option');
            opt.value = key;
            opt.textContent = lang === 'ar' ? dept.name_ar : dept.name_en;
            this.deptSelect.appendChild(opt);
        }
        
        this.deptSelect.value = window.state.department;
    }
    
    updateUI() {
        // Render Chart
        this.chartEngine.render();
        
        // Update Progress
        const stats = window.dataManager.calculateProgress(window.state.completedCourses);
        this.progressHours.textContent = stats.completedHours;
        this.progressTotal.textContent = stats.totalHoursRequired;
        this.progressBar.style.width = `${stats.percentage}%`;
    }
    
    showResetConfirm() {
        const modal = document.getElementById('confirm-modal');
        const title = document.getElementById('modal-title');
        const desc = document.getElementById('modal-desc');
        const btnConfirm = document.getElementById('modal-confirm');
        const btnCancel = document.getElementById('modal-cancel');
        
        title.textContent = window.i18n.t('reset_confirm_title');
        desc.textContent = window.i18n.t('reset_confirm_desc');
        
        const cleanup = () => {
            modal.classList.add('hidden');
            btnConfirm.replaceWith(btnConfirm.cloneNode(true));
            btnCancel.replaceWith(btnCancel.cloneNode(true));
        };
        
        btnCancel.addEventListener('click', cleanup);
        btnConfirm.addEventListener('click', () => {
            window.state.resetProgress();
            this.updateUI();
            cleanup();
        });
        
        modal.classList.remove('hidden');
    }
}

// Bootstrap
document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
});
