export const calendarIconSVG = `<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" class=\"lucide lucide-calendar-days\"><rect width=\"18\" height=\"18\" x=\"3\" y=\"4\" rx=\"2\" ry=\"2\"/><line x1=\"16\" x2=\"16\" y1=\"2\" y2=\"6\"/><line x1=\"8\" x2=\"8\" y1=\"2\" y2=\"6\"/><line x1=\"3\" x2=\"21\" y1=\"10\" y2=\"10\"/><path d=\"M8 14h.01\"/><path d=\"M12 14h.01\"/><path d=\"M16 14h.01\"/><path d=\"M8 18h.01\"/><path d=\"M12 18h.01\"/><path d=\"M16 18h.01\"/></svg>`;
export const branchIconSVG = `<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" class=\"lucide lucide-git-fork\"><circle cx=\"12\" cy=\"18\" r=\"3\"/><circle cx=\"6\" cy=\"6\" r=\"3\"/><circle cx=\"18\" cy=\"6\" r=\"3\"/><path d=\"M18 9v2c0 .6-.4 1-1 1H7c-.6 0-1-.4-1-1V9\"/><path d=\"M12 12v3\"/></svg>`;

export const semesterOrderMap = {
    'Fall': 1,
    'Winter': 2,
    'Summer': 3,
    'Unassigned': 4 // Ensure Unassigned is last
};

export const categoryColors = {
    program: '#3b82f6', // Blue
    breadth: '#14b8a6', // Example: Teal (Adjust to match your legend)
    free: '#8B5CF6',    // Purple (User specified)
    default: '#4a5568'  // Dark Gray
};

export const gradePointMap = {
    'A+': 12,
    'A': 11,
    'A-': 10,
    'B+': 9,
    'B': 8,
    'B-': 7,
    'C+': 6,
    'C': 5,
    'C-': 4,
    'D+': 3,
    'D': 2,
    'D-': 1,
    'F': 0,
    'N/A': null
};

export const semesterToLevelOffset = {
    // Using text keys from course.semester data
    // These offsets determine the sub-level within a year
    'Fall': 0.0,    // First semester of an academic year typically
    'Winter': 0.3,  // Second semester
    'Summer': 0.6,  // Third semester
    // Add any other semester names if they exist in your data
    // e.g. 'Spring': 0.15 if it comes between Fall and Winter in your sequence
    'Unassigned': 0.9 // Should appear last within a year if used for layout
};

export const defaultCredits = 0.5;
export const defaultCategory = 'free'; 