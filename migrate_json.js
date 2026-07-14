const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, 'data');
const files = fs.readdirSync(dataDir).filter(f => f.endsWith('_courses.json'));

files.forEach(file => {
  const filePath = path.join(dataDir, file);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

  // Collect all courses from the old schema into a Map
  const allCourses = new Map();
  
  const addAll = (arr, category, type) => {
    if (!arr) return;
    arr.forEach(c => {
      // Create a clean copy with type and category
      const courseCopy = { ...c, category, type };
      allCourses.set(c.code, courseCopy);
    });
  };

  addAll(data.general_requirements?.mandatory, 'general', 'mandatory');
  addAll(data.general_requirements?.elective, 'general', 'elective');
  if (data.general_requirements?.university_requirement) {
    addAll([data.general_requirements.university_requirement], 'general', 'mandatory');
  }
  
  addAll(data.faculty_requirements?.mandatory, 'faculty', 'mandatory');
  addAll(data.faculty_requirements?.elective, 'faculty', 'elective');

  // New Data Structure
  const newData = {
    meta: data.meta,
    departments: {}
  };

  Object.keys(data.departments || {}).forEach(deptKey => {
    const dept = data.departments[deptKey];
    
    // Add department specific courses to the map temporarily for this department
    const deptCourses = new Map(allCourses);
    addAll(dept.mandatory, 'department', 'mandatory');
    addAll(dept.elective, 'department', 'elective');
    // For local addAll to work properly we can just iterate over them
    dept.mandatory?.forEach(c => deptCourses.set(c.code, { ...c, category: 'department', type: 'mandatory' }));
    dept.elective?.forEach(c => deptCourses.set(c.code, { ...c, category: 'department', type: 'elective' }));

    const newDept = {
      name_en: dept.name_en,
      name_ar: dept.name_ar,
      semesters: {}
    };

    // Populate semesters
    Object.keys(dept.study_plan || {}).forEach(semKey => {
      const courseCodes = dept.study_plan[semKey];
      newDept.semesters[semKey] = courseCodes.map(code => {
        const courseObj = deptCourses.get(code);
        if (!courseObj) {
          console.warn(`WARNING: Course ${code} found in study_plan but missing in course definitions!`);
          return { code, name_en: code, name_ar: code, hours: 3, prereq: [], expected_doctors: [], category: 'unknown', type: 'unknown' };
        }
        return courseObj;
      });
    });

    newData.departments[deptKey] = newDept;
  });

  fs.writeFileSync(filePath, JSON.stringify(newData, null, 2), 'utf-8');
  console.log(`Migrated ${file}`);
});
