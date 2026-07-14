class StateManager {
    constructor() {
        this.STORAGE_PREFIX = 'fcai-tracker';
        this.SETTINGS_KEY = `${this.STORAGE_PREFIX}-settings`;
        
        // Default settings
        this.settings = {
            faculty: 'USC',
            department: 'CS',
            theme: 'dark',
            language: 'en'
        };
        
        // Active data state
        this.completedCourses = new Set();
        
        this.loadSettings();
    }
    
    // --- Settings Management ---
    
    loadSettings() {
        try {
            const saved = localStorage.getItem(this.SETTINGS_KEY);
            if (saved) {
                this.settings = { ...this.settings, ...JSON.parse(saved) };
            }
        } catch (e) {
            console.error("Could not load settings", e);
        }
    }
    
    saveSettings() {
        try {
            localStorage.setItem(this.SETTINGS_KEY, JSON.stringify(this.settings));
        } catch (e) {
            console.error("Could not save settings", e);
        }
    }
    
    updateSetting(key, value) {
        if (this.settings[key] !== value) {
            this.settings[key] = value;
            this.saveSettings();
        }
    }
    
    // --- Progress Management ---
    
    getProgressKey() {
        return `${this.STORAGE_PREFIX}-${this.settings.faculty}-${this.settings.department}`;
    }
    
    loadProgress() {
        this.completedCourses.clear();
        try {
            const saved = localStorage.getItem(this.getProgressKey());
            if (saved) {
                const arr = JSON.parse(saved);
                arr.forEach(code => this.completedCourses.add(code));
            }
        } catch (e) {
            console.error("Could not load progress", e);
        }
        return Array.from(this.completedCourses);
    }
    
    saveProgress() {
        try {
            localStorage.setItem(this.getProgressKey(), JSON.stringify(Array.from(this.completedCourses)));
        } catch (e) {
            console.error("Could not save progress", e);
        }
    }
    
    isCourseCompleted(courseCode) {
        return this.completedCourses.has(courseCode);
    }
    
    toggleCourse(courseCode) {
        if (this.completedCourses.has(courseCode)) {
            this.completedCourses.delete(courseCode);
        } else {
            this.completedCourses.add(courseCode);
        }
        this.saveProgress();
    }
    
    setCourseState(courseCode, isCompleted) {
        if (isCompleted) {
            this.completedCourses.add(courseCode);
        } else {
            this.completedCourses.delete(courseCode);
        }
        this.saveProgress();
    }
    
    resetProgress() {
        this.completedCourses.clear();
        this.saveProgress();
    }
    
    // Getters for current context
    get faculty() { return this.settings.faculty; }
    get department() { return this.settings.department; }
    get theme() { return this.settings.theme; }
    get language() { return this.settings.language; }
}

// Global instance
window.state = new StateManager();
