# FCAI Course Progress Tracker

A beautiful, interactive web application for students at the Faculty of Computers and Artificial Intelligence (FCAI) at both USC (Sadat City University) and NUSC (New Sadat City University) to track their course progress, understand prerequisites, and plan their semesters.

## Features

- 🎓 **Multi-Faculty & Multi-Department Support**: Supports USC (CS, IS, AI, BI) and NUSC (AI, Networks).
- 🔗 **Interactive Flowchart**: Visualizes the entire curriculum semester-by-semester.
- 🔓 **Smart Prerequisites**: Automatically unlocks available courses based on what you've completed. Dependencies are mapped visually with animated flowing lines.
- 👨‍🏫 **Professor Insights**: Hover over any course to see the expected professors teaching it.
- 💾 **Auto-Save**: Your progress is automatically saved to your browser (`localStorage`) so you never lose it.
- 🌍 **Bilingual**: Full support for English and Arabic (with complete RTL layout).
- 🌙 **Dark Mode**: Beautiful dark mode by default, with a light mode toggle.
- 📤 **Export**: Download your flowchart as a high-resolution PNG or PDF to share with advisors.
- 🛠️ **Admin Panel**: A built-in admin dashboard allows staff to update courses and assign professors without touching code.

## How to Deploy (GitHub Pages)

This application is a 100% static Single-Page Application (SPA) built with vanilla HTML, CSS, and JavaScript. It requires zero backend infrastructure.

1. Create a new repository on GitHub (e.g., `Karimskee/fcai-usc-courses-tracker`).
2. Push all files from this directory to the `main` branch.
3. On GitHub, go to your repository **Settings** > **Pages**.
4. Under "Build and deployment", set the **Source** to `Deploy from a branch`.
5. Under "Branch", select `main` and `/ (root)`, then click **Save**.
6. Wait 1-2 minutes. Your app will be live at `https://[your-username].github.io/fcai-usc-courses-tracker/`.

## How to Use the Admin Panel

The admin panel allows authorized users to manage the course data (names, hours, prerequisites, and expected professors) directly from the browser. It uses the GitHub API to commit changes straight to the repository data files.

### 1. Generate a GitHub Token
You need a Personal Access Token (PAT) to authorize the admin panel to commit changes on your behalf.
1. Go to your GitHub Settings: [Developer Settings > Personal Access Tokens (Classic)](https://github.com/settings/tokens).
2. Click **Generate new token (classic)**.
3. Give it a note (e.g., "FCAI Tracker Admin").
4. Under **Select scopes**, check the box for **`repo`** (Full control of private repositories).
5. Click **Generate token** and copy the string (it starts with `ghp_...`). *Keep this secret!*

### 2. Access the Panel
1. Go to your deployed app, click the **Admin** icon in the top right, or navigate to `/admin.html`.
2. Enter your GitHub username, repository name, and the Token you just generated.
3. Click **Authenticate**.

### 3. Make Changes
- Use the sidebar to navigate between Departments, Courses, and Professor assignments.
- When you assign professors or edit courses, the changes are stored in memory.
- When you are ready, click the **Publish Changes** button in the top right.
- The app will commit the updated JSON file to your GitHub repository. GitHub Pages will automatically rebuild and your changes will be live for all students within 1-2 minutes.

## Technical Stack

- **HTML5** (Semantic structure)
- **CSS3** (CSS Variables, Flexbox, Grid, Animations, Glassmorphism)
- **Vanilla JavaScript (ES6)** (Modules, Fetch API, DOM manipulation)
- **SVG** (Dynamic bezier curve generation for prerequisite paths)
- **Libraries (via CDN)**:
  - `html-to-image`: For PNG export
  - `jspdf`: For PDF export
