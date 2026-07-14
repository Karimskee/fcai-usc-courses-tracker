'use server';

import fs from 'fs';
import path from 'path';

export async function getFacultiesData() {
  try {
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      return {};
    }
    
    const files = fs.readdirSync(dataDir).filter(f => f.endsWith('_courses.json'));
    
    const faculties = {};
    for (const file of files) {
      const filePath = path.join(dataDir, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(content);
      // Key can be the faculty name from meta, or the filename
      const key = parsed.meta?.faculty || file.replace('_courses.json', '').toUpperCase();
      faculties[key] = parsed;
    }
    
    return faculties;
  } catch (error) {
    console.error("Error reading faculties data:", error);
    return {};
  }
}

export async function saveFacultyLocal(filename, contentStr) {
  try {
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    const filePath = path.join(dataDir, filename);
    fs.writeFileSync(filePath, contentStr, 'utf-8');
    return { success: true };
  } catch (err) {
    console.error("Error saving locally:", err);
    return { success: false, error: err.message };
  }
}

export async function deleteFacultyLocal(filename) {
  try {
    const filePath = path.join(process.cwd(), 'data', filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    return { success: true };
  } catch (err) {
    console.error("Error deleting locally:", err);
    return { success: false, error: err.message };
  }
}
