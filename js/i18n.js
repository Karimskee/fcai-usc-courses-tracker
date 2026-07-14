const TRANSLATIONS = {
    en: {
        app_title: "FCAI Course Tracker",
        faculty: "Faculty",
        department: "Department",
        usc: "FCAI USC",
        nusc: "FCAI NUSC",
        progress: "Progress",
        hours: "hrs",
        export_png: "Image",
        export_pdf: "PDF",
        cancel: "Cancel",
        confirm: "Confirm",
        reset_confirm_title: "Reset Progress",
        reset_confirm_desc: "Are you sure you want to reset all your progress for this department? This action cannot be undone.",
        cascade_unmark_title: "Unmark Dependent Courses",
        cascade_unmark_desc: "Unmarking this course will also lock the following dependent courses. Are you sure?",
        prerequisites: "Prerequisites:",
        expected_professors: "Expected Professors:",
        status_available: "Status: Available",
        status_locked: "Status: Locked",
        status_completed: "Status: Completed",
        click_to_complete: "Click to mark as completed",
        click_to_unmark: "Click to unmark",
        none_assigned: "Not assigned yet",
        none: "None",
        loading: "Loading...",
        level: "Level",
        semester: "Semester",
        general_reqs: "General Requirements",
        faculty_reqs: "Faculty Requirements",
        dept_mandatory: "Department Mandatory",
        dept_elective: "Department Elective",
        dept_CS: "Computer Science",
        dept_IS: "Information Systems",
        dept_AI: "Artificial Intelligence",
        dept_BI: "Bioinformatics",
        dept_Networks: "Networks"
    },
    ar: {
        app_title: "متتبع مقررات حاسبات ومعلومات",
        faculty: "الكلية",
        department: "القسم",
        usc: "حاسبات جامعة مدينة السادات",
        nusc: "حاسبات جامعة نيو سادات",
        progress: "التقدم",
        hours: "ساعة",
        export_png: "صورة",
        export_pdf: "ملف PDF",
        cancel: "إلغاء",
        confirm: "تأكيد",
        reset_confirm_title: "إعادة ضبط التقدم",
        reset_confirm_desc: "هل أنت متأكد من رغبتك في مسح كل تقدمك في هذا القسم؟ لا يمكن التراجع عن هذا الإجراء.",
        cascade_unmark_title: "إلغاء المقررات المعتمدة",
        cascade_unmark_desc: "إلغاء هذا المقرر سيؤدي إلى قفل المقررات التالية المعتمدة عليه. هل أنت متأكد؟",
        prerequisites: "المتطلبات السابقة:",
        expected_professors: "أساتذة المقرر:",
        status_available: "الحالة: متاح",
        status_locked: "الحالة: مغلق",
        status_completed: "الحالة: مكتمل",
        click_to_complete: "انقر للتعليم كمكتمل",
        click_to_unmark: "انقر للإلغاء",
        none_assigned: "لم يتم التحديد بعد",
        none: "لا يوجد",
        loading: "جاري التحميل...",
        level: "المستوى",
        semester: "الفصل الدراسي",
        general_reqs: "المتطلبات العامة",
        faculty_reqs: "متطلبات الكلية",
        dept_mandatory: "متطلبات القسم الإجبارية",
        dept_elective: "متطلبات القسم الاختيارية",
        dept_CS: "علوم الحاسب",
        dept_IS: "نظم المعلومات",
        dept_AI: "الذكاء الاصطناعي",
        dept_BI: "المعلوماتية الحيوية",
        dept_Networks: "الشبكات"
    }
};

class I18nManager {
    constructor() {
        // Defaults to English, can be overridden by StateManager
        this.currentLang = 'en'; 
    }

    setLanguage(lang) {
        if (lang !== 'en' && lang !== 'ar') return;
        this.currentLang = lang;
        
        // Update document attributes
        document.documentElement.lang = lang;
        document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
        
        // Update all UI elements with data-i18n attribute
        this.applyTranslations();
        
        // Fire event so other components (like chart) can re-render text
        window.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang } }));
    }

    t(key) {
        return TRANSLATIONS[this.currentLang][key] || key;
    }

    applyTranslations(root = document) {
        const elements = root.querySelectorAll('[data-i18n]');
        elements.forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (TRANSLATIONS[this.currentLang][key]) {
                if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                    el.placeholder = TRANSLATIONS[this.currentLang][key];
                } else {
                    el.textContent = TRANSLATIONS[this.currentLang][key];
                }
            }
        });
    }
    
    getLang() {
        return this.currentLang;
    }
}

// Global instance
window.i18n = new I18nManager();
