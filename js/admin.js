class AdminApp {
    constructor() {
        this.token = sessionStorage.getItem('fcai_gh_token');
        this.owner = sessionStorage.getItem('fcai_gh_owner');
        this.repo = sessionStorage.getItem('fcai_gh_repo');
        
        this.dataCache = {
            'USC': null,
            'NUSC': null
        };
        this.fileSha = {
            'USC': null,
            'NUSC': null
        };
        
        this.currentFaculty = 'USC';
        this.currentView = 'departments';
        this.hasUnsavedChanges = false;
        
        this.init();
    }
    
    init() {
        this.bindAuthEvents();
        
        if (this.token && this.owner && this.repo) {
            this.showDashboard();
            this.loadData(this.currentFaculty);
        }
    }
    
    bindAuthEvents() {
        document.getElementById('btn-login').addEventListener('click', () => this.authenticate());
        
        document.getElementById('btn-logout').addEventListener('click', () => {
            sessionStorage.removeItem('fcai_gh_token');
            location.reload();
        });
        
        document.getElementById('btn-publish').addEventListener('click', () => this.publishChanges());
        
        // Navigation
        document.querySelectorAll('.nav-list li').forEach(li => {
            li.addEventListener('click', (e) => {
                document.querySelectorAll('.nav-list li').forEach(el => el.classList.remove('active'));
                e.target.classList.add('active');
                this.currentView = e.target.dataset.view;
                this.renderView();
            });
        });
        
        // Faculty select
        document.getElementById('admin-faculty-select').addEventListener('change', (e) => {
            this.currentFaculty = e.target.value;
            this.loadData(this.currentFaculty);
        });
        
        // Modal events
        document.getElementById('modal-course-cancel').addEventListener('click', () => {
            document.getElementById('course-modal').classList.add('hidden');
        });
    }
    
    async authenticate() {
        const owner = document.getElementById('github-owner').value.trim();
        const repo = document.getElementById('github-repo').value.trim();
        const token = document.getElementById('github-token').value.trim();
        const errDiv = document.getElementById('auth-error');
        
        if (!owner || !repo || !token) {
            errDiv.textContent = "All fields are required.";
            errDiv.classList.remove('hidden');
            return;
        }
        
        errDiv.classList.add('hidden');
        document.getElementById('btn-login').textContent = "Checking...";
        
        try {
            // Verify access
            const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (res.ok) {
                sessionStorage.setItem('fcai_gh_token', token);
                sessionStorage.setItem('fcai_gh_owner', owner);
                sessionStorage.setItem('fcai_gh_repo', repo);
                
                this.token = token;
                this.owner = owner;
                this.repo = repo;
                
                this.showDashboard();
                this.loadData(this.currentFaculty);
            } else {
                throw new Error("Invalid credentials or missing permissions.");
            }
        } catch (error) {
            errDiv.textContent = error.message;
            errDiv.classList.remove('hidden');
            document.getElementById('btn-login').textContent = "Authenticate";
        }
    }
    
    showDashboard() {
        document.getElementById('auth-section').classList.add('hidden');
        document.getElementById('dashboard-section').classList.remove('hidden');
        document.getElementById('btn-logout').classList.remove('hidden');
    }
    
    async loadData(faculty) {
        const view = document.getElementById('admin-main-view');
        view.innerHTML = '<div class="loading-spinner">Loading data from GitHub...</div>';
        
        const path = `data/${faculty.toLowerCase()}_courses.json`;
        
        try {
            const res = await fetch(`https://api.github.com/repos/${this.owner}/${this.repo}/contents/${path}`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });
            
            if (res.ok) {
                const data = await res.json();
                this.fileSha[faculty] = data.sha;
                
                // Decode base64
                const content = decodeURIComponent(escape(atob(data.content)));
                this.dataCache[faculty] = JSON.parse(content);
                
                this.renderView();
            } else {
                throw new Error(`Failed to load ${path}`);
            }
        } catch (error) {
            view.innerHTML = `<div class="error-msg">Error: ${error.message}</div>`;
        }
    }
    
    markDirty() {
        this.hasUnsavedChanges = true;
        document.getElementById('btn-publish').classList.remove('hidden');
    }
    
    renderView() {
        const data = this.dataCache[this.currentFaculty];
        if (!data) return;
        
        const view = document.getElementById('admin-main-view');
        
        if (this.currentView === 'departments') {
            let html = `
                <div class="data-header">
                    <h2>Departments</h2>
                </div>
                <div>
            `;
            
            for (const [key, dept] of Object.entries(data.departments)) {
                html += `
                    <div class="course-list-item">
                        <div class="course-info">
                            <span class="code">${key}</span>
                            <span class="name">${dept.name_en} / ${dept.name_ar}</span>
                            <span class="meta">${dept.mandatory.length + dept.elective.length} Courses</span>
                        </div>
                    </div>
                `;
            }
            html += `</div>`;
            view.innerHTML = html;
        } 
        else if (this.currentView === 'courses') {
            // Flatten all courses to show them
            const allCourses = [];
            for (const [deptKey, dept] of Object.entries(data.departments)) {
                dept.mandatory.forEach(c => allCourses.push({...c, _dept: deptKey, _type: 'mandatory'}));
                dept.elective.forEach(c => allCourses.push({...c, _dept: deptKey, _type: 'elective'}));
            }
            
            let html = `
                <div class="data-header">
                    <h2>All Courses</h2>
                </div>
                <div>
            `;
            
            allCourses.forEach(c => {
                html += `
                    <div class="course-list-item">
                        <div class="course-info">
                            <span class="code">${c.code}</span>
                            <span class="name">${c.name_en}</span>
                            <span class="meta">${c._dept} | ${c.hours} hrs | Prereqs: ${c.prereq.length > 0 ? c.prereq.join(', ') : 'None'}</span>
                        </div>
                        <div class="item-actions">
                            <button class="btn-icon btn-edit-course" data-code="${c.code}" data-dept="${c._dept}" data-type="${c._type}">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                            </button>
                        </div>
                    </div>
                `;
            });
            html += `</div>`;
            view.innerHTML = html;
            
            // Bind edit buttons
            view.querySelectorAll('.btn-edit-course').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const t = e.currentTarget;
                    this.openCourseModal(t.dataset.code, t.dataset.dept, t.dataset.type);
                });
            });
        }
        else if (this.currentView === 'doctors') {
             // Flatten all courses to show them
            const allCourses = [];
            for (const [deptKey, dept] of Object.entries(data.departments)) {
                dept.mandatory.forEach(c => allCourses.push({...c, _dept: deptKey, _type: 'mandatory'}));
            }
            
            let html = `
                <div class="data-header">
                    <h2>Assign Professors</h2>
                    <p style="font-size: 0.875rem; color: var(--text-muted); margin-top: 4px;">Select courses to assign professors to.</p>
                </div>
                <div style="margin-bottom: 20px; display: flex; gap: 10px;">
                    <input type="text" id="bulk-doctor-name" placeholder="Dr. Name" style="flex: 1; padding: 8px; border-radius: 4px; border: 1px solid var(--card-border-locked); background: var(--bg-tertiary); color: var(--text-primary);">
                    <button id="btn-assign-bulk" class="btn primary">Assign Selected</button>
                </div>
                <div>
            `;
            
            allCourses.forEach(c => {
                const docs = c.expected_doctors && c.expected_doctors.length > 0 ? c.expected_doctors.join(', ') : 'None';
                html += `
                    <div class="course-list-item" style="cursor: pointer;" onclick="this.querySelector('input').checked = !this.querySelector('input').checked">
                        <div style="display: flex; gap: 15px; align-items: center;">
                            <input type="checkbox" class="course-checkbox" data-code="${c.code}" data-dept="${c._dept}" data-type="${c._type}" onclick="event.stopPropagation()">
                            <div class="course-info">
                                <span class="code">${c.code}</span>
                                <span class="name">${c.name_en}</span>
                                <span class="meta" style="color: var(--accent-primary)">Professors: ${docs}</span>
                            </div>
                        </div>
                    </div>
                `;
            });
            html += `</div>`;
            view.innerHTML = html;
            
            document.getElementById('btn-assign-bulk').addEventListener('click', () => {
                const docName = document.getElementById('bulk-doctor-name').value.trim();
                if (!docName) return;
                
                const checked = view.querySelectorAll('.course-checkbox:checked');
                if (checked.length === 0) return;
                
                checked.forEach(cb => {
                    const code = cb.dataset.code;
                    const dept = cb.dataset.dept;
                    const type = cb.dataset.type;
                    
                    const courseList = data.departments[dept][type];
                    const course = courseList.find(c => c.code === code);
                    
                    if (course) {
                        if (!course.expected_doctors) course.expected_doctors = [];
                        if (!course.expected_doctors.includes(docName)) {
                            course.expected_doctors.push(docName);
                        }
                    }
                });
                
                this.markDirty();
                this.renderView(); // re-render to show updates
            });
        }
    }
    
    openCourseModal(code, deptKey, type) {
        const data = this.dataCache[this.currentFaculty];
        const courseList = data.departments[deptKey][type];
        const course = courseList.find(c => c.code === code);
        
        if (!course) return;
        
        document.getElementById('modal-code').value = course.code;
        document.getElementById('modal-code').disabled = true; // prevent changing code for now
        
        document.getElementById('modal-hours').value = course.hours;
        document.getElementById('modal-name-en').value = course.name_en || '';
        document.getElementById('modal-name-ar').value = course.name_ar || '';
        
        document.getElementById('modal-prereqs').value = (course.prereq || []).join(', ');
        document.getElementById('modal-doctors').value = (course.expected_doctors || []).join(', ');
        
        const saveBtn = document.getElementById('modal-course-save');
        // clone to remove old event listeners
        const newSaveBtn = saveBtn.cloneNode(true);
        saveBtn.replaceWith(newSaveBtn);
        
        newSaveBtn.addEventListener('click', () => {
            course.hours = parseInt(document.getElementById('modal-hours').value) || 3;
            course.name_en = document.getElementById('modal-name-en').value.trim();
            course.name_ar = document.getElementById('modal-name-ar').value.trim();
            
            const prereqsStr = document.getElementById('modal-prereqs').value.trim();
            course.prereq = prereqsStr ? prereqsStr.split(',').map(s => s.trim()).filter(s => s) : [];
            
            const docStr = document.getElementById('modal-doctors').value.trim();
            course.expected_doctors = docStr ? docStr.split(',').map(s => s.trim()).filter(s => s) : [];
            
            this.markDirty();
            document.getElementById('course-modal').classList.add('hidden');
            this.renderView();
        });
        
        document.getElementById('course-modal').classList.remove('hidden');
    }
    
    async publishChanges() {
        const btn = document.getElementById('btn-publish');
        const originalText = btn.textContent;
        btn.textContent = "Publishing...";
        btn.disabled = true;
        
        const faculty = this.currentFaculty;
        const path = `data/${faculty.toLowerCase()}_courses.json`;
        const data = this.dataCache[faculty];
        
        try {
            // Convert json to utf-8 string then to base64
            // Note: btoa doesn't handle unicode well natively, need escape/encodeURIComponent
            const jsonStr = JSON.stringify(data, null, 2);
            const base64Content = btoa(unescape(encodeURIComponent(jsonStr)));
            
            const payload = {
                message: `Update ${faculty} course data via admin panel`,
                content: base64Content,
                sha: this.fileSha[faculty] // required for update
            };
            
            const res = await fetch(`https://api.github.com/repos/${this.owner}/${this.repo}/contents/${path}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });
            
            if (res.ok) {
                const resData = await res.json();
                this.fileSha[faculty] = resData.content.sha; // update sha for subsequent edits
                this.hasUnsavedChanges = false;
                btn.classList.add('hidden');
                alert("Successfully published! GitHub Pages will update in a few minutes.");
            } else {
                const err = await res.json();
                throw new Error(err.message || "Failed to commit changes.");
            }
        } catch (error) {
            alert(`Error publishing: ${error.message}`);
        } finally {
            btn.textContent = originalText;
            btn.disabled = false;
        }
    }
}

// Init
document.addEventListener('DOMContentLoaded', () => {
    window.adminApp = new AdminApp();
});
