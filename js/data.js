class DataManager {
    constructor() {
        this.rawData = null;
        this.coursesMap = new Map(); // code -> course object
        this.dependentsMap = new Map(); // code -> array of dependent course codes
        this.totalHoursRequired = 0;
        
        // Cache mapping from faculty to file path
        this.facultyFiles = {
            'USC': 'data/usc_courses.json',
            'NUSC': 'data/nusc_courses.json'
        };
    }
    
    async loadData(faculty, department) {
        if (!this.facultyFiles[faculty]) {
            throw new Error(`Unknown faculty: ${faculty}`);
        }
        
        try {
            // Load JSON file
            const response = await fetch(this.facultyFiles[faculty]);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            
            this.rawData = await response.json();
            
            if (!this.rawData.departments[department]) {
                throw new Error(`Department ${department} not found in ${faculty}`);
            }
            
            this.totalHoursRequired = this.rawData.meta.total_hours_required;
            this._buildGraph(department);
            
            return true;
        } catch (error) {
            console.error("Failed to load course data:", error);
            return false;
        }
    }
    
    _buildGraph(department) {
        this.coursesMap.clear();
        this.dependentsMap.clear();
        
        // Helper to add a course
        const addCourse = (course, category) => {
            // Store course with its category for styling purposes
            this.coursesMap.set(course.code, { ...course, category });
            
            // Initialize dependents array if not exists
            if (!this.dependentsMap.has(course.code)) {
                this.dependentsMap.set(course.code, []);
            }
            
            // Register as dependent for each of its prerequisites
            if (course.prereq && course.prereq.length > 0) {
                course.prereq.forEach(prereqCode => {
                    if (!this.dependentsMap.has(prereqCode)) {
                        this.dependentsMap.set(prereqCode, []);
                    }
                    this.dependentsMap.get(prereqCode).push(course.code);
                });
            }
        };
        
        // Add General Requirements
        this.rawData.general_requirements.mandatory.forEach(c => addCourse(c, 'general_mandatory'));
        this.rawData.general_requirements.elective.forEach(c => addCourse(c, 'general_elective'));
        if (this.rawData.general_requirements.university_requirement) {
            addCourse(this.rawData.general_requirements.university_requirement, 'university_req');
        }
        
        // Add Faculty Requirements
        this.rawData.faculty_requirements.mandatory.forEach(c => addCourse(c, 'faculty_mandatory'));
        this.rawData.faculty_requirements.elective.forEach(c => addCourse(c, 'faculty_elective'));
        
        // Add Department Requirements
        const dept = this.rawData.departments[department];
        dept.mandatory.forEach(c => addCourse(c, 'dept_mandatory'));
        dept.elective.forEach(c => addCourse(c, 'dept_elective'));
    }
    
    getCourse(code) {
        return this.coursesMap.get(code);
    }
    
    getAllCourses() {
        return Array.from(this.coursesMap.values());
    }
    
    getStudyPlan(department) {
        if (!this.rawData || !this.rawData.departments[department]) return null;
        return this.rawData.departments[department].study_plan;
    }
    
    // --- Logic ---
    
    isAvailable(courseCode, completedSet) {
        const course = this.coursesMap.get(courseCode);
        if (!course) return false;
        
        // If no prerequisites, it's always available
        if (!course.prereq || course.prereq.length === 0) return true;
        
        // Check if ALL prerequisites are in the completed set
        return course.prereq.every(prereqCode => completedSet.has(prereqCode));
    }
    
    getDependents(courseCode) {
        return this.dependentsMap.get(courseCode) || [];
    }
    
    // Recursive check for what needs to be locked if this course is unmarked
    getCascadeLocks(courseCode, completedSet) {
        const locks = new Set();
        const deps = this.getDependents(courseCode);
        
        deps.forEach(depCode => {
            if (completedSet.has(depCode)) {
                locks.add(depCode);
                // Recursively check dependents of dependents
                const childLocks = this.getCascadeLocks(depCode, completedSet);
                childLocks.forEach(c => locks.add(c));
            }
        });
        
        return Array.from(locks);
    }
    
    calculateProgress(completedSet) {
        let completedHours = 0;
        completedSet.forEach(code => {
            const course = this.getCourse(code);
            if (course && course.hours > 0) {
                completedHours += course.hours;
            }
        });
        
        const percentage = this.totalHoursRequired > 0 
            ? Math.min(100, Math.round((completedHours / this.totalHoursRequired) * 100)) 
            : 0;
            
        return {
            completedHours,
            totalHoursRequired: this.totalHoursRequired,
            percentage
        };
    }
}

// Global instance
window.dataManager = new DataManager();
