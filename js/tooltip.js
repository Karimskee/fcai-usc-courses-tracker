class TooltipManager {
    constructor() {
        this.popover = document.getElementById('popover');
        this.activeCard = null;
        this.hoverTimeout = null;
        
        // Follow mouse movement, but with a slight offset
        document.addEventListener('mousemove', (e) => {
            if (this.popover.classList.contains('visible')) {
                this.updatePosition(e.clientX, e.clientY);
            }
        });
        
        // Hide when clicking outside
        document.addEventListener('click', (e) => {
            if (this.activeCard && !this.activeCard.contains(e.target) && !this.popover.contains(e.target)) {
                this.hide();
            }
        });
        
        // Hide on scroll to prevent detached tooltips
        document.getElementById('chart-scroll-area').addEventListener('scroll', () => this.hide());
    }
    
    attach(cardElement, course) {
        cardElement.addEventListener('mouseenter', (e) => {
            this.hoverTimeout = setTimeout(() => {
                this.show(cardElement, course, e.clientX, e.clientY);
            }, 200); // 200ms delay to prevent flicker when moving mouse quickly across grid
        });
        
        cardElement.addEventListener('mouseleave', () => {
            clearTimeout(this.hoverTimeout);
            this.hide();
        });
        
        // For mobile tap
        cardElement.addEventListener('touchstart', (e) => {
            if (this.activeCard !== cardElement) {
                // Prevent default so it doesn't immediately trigger click logic before we see tooltip
                e.preventDefault(); 
                this.show(cardElement, course, e.touches[0].clientX, e.touches[0].clientY);
                
                // Then let chart.js handle the click via a synthesized click event if tapped again
                cardElement.addEventListener('touchend', function onSecondTap() {
                    cardElement.click();
                    cardElement.removeEventListener('touchend', onSecondTap);
                }, { once: true });
            }
        }, { passive: false });
    }
    
    show(cardElement, course, x, y) {
        this.activeCard = cardElement;
        
        // Build content
        const completedSet = window.state.completedCourses;
        const isCompleted = completedSet.has(course.code);
        const isAvailable = window.dataManager.isAvailable(course.code, completedSet);
        
        let statusClass = 'locked';
        let statusText = window.i18n.t('status_locked');
        let hintText = '';
        
        if (isCompleted) {
            statusClass = 'completed';
            statusText = window.i18n.t('status_completed');
            hintText = window.i18n.t('click_to_unmark');
        } else if (isAvailable) {
            statusClass = 'available';
            statusText = window.i18n.t('status_available');
            hintText = window.i18n.t('click_to_complete');
        }
        
        let prereqsHtml = '';
        if (course.prereq && course.prereq.length > 0) {
            const list = course.prereq.map(p => {
                const c = window.dataManager.getCourse(p);
                const name = window.i18n.getLang() === 'ar' ? (c?.name_ar || p) : (c?.name_en || p);
                return `<li>${p} - ${name}</li>`;
            }).join('');
            
            prereqsHtml = `
                <div class="popover-section">
                    <div class="popover-label">${window.i18n.t('prerequisites')}</div>
                    <ul class="popover-list">${list}</ul>
                </div>
            `;
        }
        
        let doctorsHtml = '';
        if (course.expected_doctors && course.expected_doctors.length > 0) {
            const list = course.expected_doctors.map(d => `<li>${d}</li>`).join('');
            doctorsHtml = `
                <div class="popover-section">
                    <div class="popover-label">${window.i18n.t('expected_professors')}</div>
                    <ul class="popover-list">${list}</ul>
                </div>
            `;
        } else {
            doctorsHtml = `
                <div class="popover-section">
                    <div class="popover-label">${window.i18n.t('expected_professors')}</div>
                    <div style="font-size: 0.875rem; opacity: 0.7;">${window.i18n.t('none_assigned')}</div>
                </div>
            `;
        }
        
        this.popover.innerHTML = `
            <div class="popover-header">
                <div>
                    <div class="popover-name-en">${course.name_en}</div>
                    <div class="popover-name-ar">${course.name_ar}</div>
                </div>
                <div style="text-align: right;">
                    <div class="popover-code">${course.code}</div>
                    <div style="font-size: 0.75rem; color: var(--text-muted);">${course.hours} ${window.i18n.t('hours')}</div>
                </div>
            </div>
            
            ${prereqsHtml}
            ${doctorsHtml}
            
            <div class="popover-status ${statusClass}">
                ${statusText}
                <span class="status-hint">${hintText}</span>
            </div>
        `;
        
        this.updatePosition(x, y);
        this.popover.classList.add('visible');
    }
    
    updatePosition(x, y) {
        // Offset from cursor
        const offsetX = 15;
        const offsetY = 15;
        
        // Bounds checking
        const rect = this.popover.getBoundingClientRect();
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        
        let posX = x + offsetX;
        let posY = y + offsetY;
        
        // Flip to left if it overflows right
        if (posX + rect.width > vw - 10) {
            posX = x - rect.width - offsetX;
        }
        
        // Flip to top if it overflows bottom
        if (posY + rect.height > vh - 10) {
            posY = y - rect.height - offsetY;
        }
        
        // Ensure it doesn't go off screen left/top
        posX = Math.max(10, posX);
        posY = Math.max(10, posY);
        
        this.popover.style.left = `${posX}px`;
        this.popover.style.top = `${posY}px`;
    }
    
    hide() {
        this.activeCard = null;
        this.popover.classList.remove('visible');
    }
}

// Global instance
window.tooltipManager = new TooltipManager();
