class ExportManager {
    constructor() {
        this.btnPng = document.getElementById('btn-export-png');
        this.btnPdf = document.getElementById('btn-export-pdf');
        this.chartWrapper = document.getElementById('chart-wrapper');
        
        if (this.btnPng) {
            this.btnPng.addEventListener('click', () => this.exportToPng());
        }
        
        if (this.btnPdf) {
            this.btnPdf.addEventListener('click', () => this.exportToPdf());
        }
    }
    
    async prepareExport() {
        // Hide tooltips if open
        if (window.tooltipManager) {
            window.tooltipManager.hide();
        }
        
        // Ensure chart is fully drawn
        if (window.app && window.app.chartEngine) {
            window.app.chartEngine.drawArrows();
        }
        
        // Add a temporary title/header for the export
        const titleDiv = document.createElement('div');
        titleDiv.id = 'export-title';
        titleDiv.style.textAlign = 'center';
        titleDiv.style.marginBottom = '20px';
        titleDiv.style.padding = '10px';
        titleDiv.style.background = 'var(--bg-tertiary)';
        titleDiv.style.borderRadius = '8px';
        
        const faculty = window.i18n.t(window.state.faculty.toLowerCase());
        const deptKey = `dept_${window.state.department}`;
        const department = window.i18n.t(deptKey);
        const progressStr = document.querySelector('.progress-text').textContent;
        
        titleDiv.innerHTML = `
            <h2>${window.i18n.t('app_title')}</h2>
            <p>${faculty} - ${department} | ${window.i18n.t('progress')}: ${progressStr}</p>
            <p style="font-size: 12px; opacity: 0.7;">Exported on: ${new Date().toLocaleDateString()}</p>
        `;
        
        this.chartWrapper.insertBefore(titleDiv, this.chartWrapper.firstChild);
        
        // Return a cleanup function
        return () => {
            if (titleDiv.parentNode) {
                titleDiv.parentNode.removeChild(titleDiv);
            }
        };
    }
    
    getFilename(ext) {
        const fac = window.state.faculty;
        const dep = window.state.department;
        const date = new Date().toISOString().split('T')[0];
        return `FCAI_Tracker_${fac}_${dep}_${date}.${ext}`;
    }

    async exportToPng() {
        const originalText = this.btnPng.innerHTML;
        this.btnPng.innerHTML = window.i18n.t('loading');
        this.btnPng.disabled = true;
        
        try {
            const cleanup = await this.prepareExport();
            
            const dataUrl = await htmlToImage.toPng(this.chartWrapper, {
                backgroundColor: getComputedStyle(document.body).backgroundColor,
                pixelRatio: 2 // High res
            });
            
            const link = document.createElement('a');
            link.download = this.getFilename('png');
            link.href = dataUrl;
            link.click();
            
            cleanup();
        } catch (error) {
            console.error('Error exporting PNG:', error);
            alert('Failed to export image. Please try again.');
        } finally {
            this.btnPng.innerHTML = originalText;
            this.btnPng.disabled = false;
        }
    }

    async exportToPdf() {
        const originalText = this.btnPdf.innerHTML;
        this.btnPdf.innerHTML = window.i18n.t('loading');
        this.btnPdf.disabled = true;
        
        try {
            const cleanup = await this.prepareExport();
            
            // Generate canvas
            const canvas = await htmlToImage.toCanvas(this.chartWrapper, {
                backgroundColor: getComputedStyle(document.body).backgroundColor,
                pixelRatio: 2
            });
            
            // Calculate PDF dimensions (A3 landscape usually fits flowchart well)
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jspdf.jsPDF({
                orientation: 'landscape',
                unit: 'pt',
                format: [canvas.width, canvas.height]
            });
            
            pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
            pdf.save(this.getFilename('pdf'));
            
            cleanup();
        } catch (error) {
            console.error('Error exporting PDF:', error);
            alert('Failed to export PDF. Please try again.');
        } finally {
            this.btnPdf.innerHTML = originalText;
            this.btnPdf.disabled = false;
        }
    }
}

// Global instance (initialized in app.js)
