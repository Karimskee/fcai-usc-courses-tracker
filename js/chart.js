class ChartEngine {
    constructor() {
        this.container = document.getElementById('chart-wrapper');
        this.grid = document.getElementById('course-grid');
        this.svg = document.getElementById('arrows-svg');
        
        // Resize observer to redraw arrows when layout changes
        this.resizeObserver = new ResizeObserver(() => {
            requestAnimationFrame(() => this.drawArrows());
        });
        
        if (this.grid) {
            this.resizeObserver.observe(this.grid);
        }
    }

    render() {
        if (!window.dataManager || !window.state) return;
        
        this.grid.innerHTML = '';
        this.svg.innerHTML = '';
        
        const dept = window.state.department;
        const studyPlan = window.dataManager.getStudyPlan(dept);
        
        if (!studyPlan) {
            this.grid.innerHTML = `<div class="error-msg">Study plan not found for ${dept}</div>`;
            return;
        }

        const lang = window.i18n.getLang();
        const completedSet = window.state.completedCourses;

        // Create 8 columns
        const semesters = [
            'level_1_sem_1', 'level_1_sem_2',
            'level_2_sem_1', 'level_2_sem_2',
            'level_3_sem_1', 'level_3_sem_2',
            'level_4_sem_1', 'level_4_sem_2'
        ];

        semesters.forEach((semKey, index) => {
            const level = Math.floor(index / 2) + 1;
            const sem = (index % 2) + 1;
            
            const col = document.createElement('div');
            col.className = 'semester-col';
            col.id = `col-${semKey}`;
            
            const header = document.createElement('div');
            header.className = 'semester-header';
            header.innerHTML = `${window.i18n.t('level')} ${level} - ${window.i18n.t('semester')} ${sem}`;
            col.appendChild(header);
            
            const courseCodes = studyPlan[semKey] || [];
            
            // Group courses by category for visual separation if needed
            // For now, just render them in order
            courseCodes.forEach(code => {
                const course = window.dataManager.getCourse(code);
                if (course) {
                    col.appendChild(this.createCourseCard(course, lang, completedSet));
                }
            });
            
            this.grid.appendChild(col);
        });

        // Delay drawing arrows slightly to ensure DOM is fully laid out
        setTimeout(() => this.drawArrows(), 50);
    }

    createCourseCard(course, lang, completedSet) {
        const isCompleted = completedSet.has(course.code);
        const isAvailable = window.dataManager.isAvailable(course.code, completedSet);
        
        const card = document.createElement('div');
        card.className = `course-card cat-${course.category}`;
        card.id = `card-${course.code}`;
        card.dataset.code = course.code;
        
        if (isCompleted) card.classList.add('completed');
        else if (isAvailable) card.classList.add('available');
        
        const name = lang === 'ar' && course.name_ar ? course.name_ar : course.name_en;
        
        card.innerHTML = `
            <div class="course-code">
                <span>${course.code}</span>
                <span class="course-hours">${course.hours} ${window.i18n.t('hours')}</span>
            </div>
            <div class="course-name">${name}</div>
            <div class="status-icon">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            </div>
        `;
        
        // Interactions
        card.addEventListener('click', () => {
            if (isCompleted) {
                // If it has dependents that are completed, warn user
                const cascadeLocks = window.dataManager.getCascadeLocks(course.code, completedSet);
                if (cascadeLocks.length > 0) {
                    this.showCascadeConfirm(course.code, cascadeLocks);
                } else {
                    this.toggleCourse(course.code);
                }
            } else if (isAvailable) {
                this.toggleCourse(course.code);
            }
        });
        
        // Tooltip logic will attach here from tooltip.js
        if (window.tooltipManager) {
            window.tooltipManager.attach(card, course);
        }
        
        return card;
    }

    showCascadeConfirm(courseCode, cascadeLocks) {
        const modal = document.getElementById('confirm-modal');
        const title = document.getElementById('modal-title');
        const desc = document.getElementById('modal-desc');
        const btnConfirm = document.getElementById('modal-confirm');
        const btnCancel = document.getElementById('modal-cancel');
        
        title.textContent = window.i18n.t('cascade_unmark_title');
        desc.textContent = window.i18n.t('cascade_unmark_desc') + '\n\n' + cascadeLocks.join(', ');
        
        const cleanup = () => {
            modal.classList.add('hidden');
            btnConfirm.replaceWith(btnConfirm.cloneNode(true));
            btnCancel.replaceWith(btnCancel.cloneNode(true));
        };
        
        btnCancel.addEventListener('click', cleanup);
        btnConfirm.addEventListener('click', () => {
            // Unmark this course AND all dependents
            window.state.setCourseState(courseCode, false);
            cascadeLocks.forEach(c => window.state.setCourseState(c, false));
            
            cleanup();
            window.app.updateUI(); // Full re-render to reflect cascade
        });
        
        modal.classList.remove('hidden');
    }

    toggleCourse(courseCode) {
        window.state.toggleCourse(courseCode);
        window.app.updateUI();
    }

    drawArrows() {
        if (!this.svg || !this.grid) return;
        this.svg.innerHTML = '';
        
        const isRtl = window.i18n.getLang() === 'ar';
        const completedSet = window.state.completedCourses;
        const allCourses = window.dataManager.getAllCourses();
        
        // Container rect for relative positioning
        const containerRect = this.grid.getBoundingClientRect();
        
        allCourses.forEach(course => {
            if (!course.prereq || course.prereq.length === 0) return;
            
            const targetEl = document.getElementById(`card-${course.code}`);
            if (!targetEl) return; // Might not be rendered in this dept
            
            const targetRect = targetEl.getBoundingClientRect();
            
            course.prereq.forEach(prereqCode => {
                const sourceEl = document.getElementById(`card-${prereqCode}`);
                if (!sourceEl) return;
                
                const sourceRect = sourceEl.getBoundingClientRect();
                
                // Calculate anchor points relative to container
                let startX, startY, endX, endY;
                
                if (isRtl) {
                    startX = (sourceRect.left - containerRect.left); // left side of source
                    endX = (targetRect.right - containerRect.left); // right side of target
                } else {
                    startX = (sourceRect.right - containerRect.left); // right side of source
                    endX = (targetRect.left - containerRect.left); // left side of target
                }
                
                startY = (sourceRect.top - containerRect.top) + (sourceRect.height / 2);
                endY = (targetRect.top - containerRect.top) + (targetRect.height / 2);
                
                // Draw bezier curve
                const controlPointOffset = 40;
                let pathStr;
                if (isRtl) {
                    pathStr = `M ${startX} ${startY} C ${startX - controlPointOffset} ${startY}, ${endX + controlPointOffset} ${endY}, ${endX} ${endY}`;
                } else {
                    pathStr = `M ${startX} ${startY} C ${startX + controlPointOffset} ${startY}, ${endX - controlPointOffset} ${endY}, ${endX} ${endY}`;
                }
                
                const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
                path.setAttribute("d", pathStr);
                
                // Determine class based on state
                path.classList.add("arrow-path");
                
                const sourceCompleted = completedSet.has(prereqCode);
                const targetCompleted = completedSet.has(course.code);
                
                if (targetCompleted) {
                    path.classList.add("completed");
                } else if (sourceCompleted) {
                    // Pre-req met, target not met -> active animated flow
                    path.classList.add("active");
                    path.classList.add("animated");
                }
                
                this.svg.appendChild(path);
            });
        });
    }
}

// Export for app.js
window.ChartEngine = ChartEngine;
