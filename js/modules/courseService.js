// Course-related logic: add, update, delete, save, load courses 
import * as State from './state.js';
import * as Constants from './constants.js';
import * as DOMUtils from './domUtils.js';
import { updateAllViewsAndSummaries, network } from '../app.js'; // Assuming app.js exports network for setOptions

export function addCourseHandler() {
    const courseCode = DOMUtils.getElementValue('courseCode').toUpperCase().trim().replace(/\s/g, '');
    const courseName = DOMUtils.getElementValue('courseName').trim();
    const prerequisites = DOMUtils.getElementValue('prerequisites').split(',').map(p => p.trim().toUpperCase().replace(/\s/g, '')).filter(p => p);
    const credits = parseFloat(DOMUtils.getElementValue('credits'));
    const category = DOMUtils.getElementValue('category');
    const grade = DOMUtils.getElementValue('grade');
    const year = DOMUtils.getElementValue('year');
    const semester = DOMUtils.getElementValue('semester');
    const majorCGPA = DOMUtils.isElementChecked('majorCGPA');
    const completed = DOMUtils.isElementChecked('completed');
    const errorElement = DOMUtils.getElementById('error');
    
    DOMUtils.toggleElementClass(errorElement.id, 'hidden', true);

    if (!courseCode || !courseName || isNaN(credits) || credits <= 0 || !year || !semester) {
        errorElement.textContent = 'Please fill in all required fields (Course Code, Name, Credits, Year, Semester).';
        DOMUtils.toggleElementClass(errorElement.id, 'hidden', false);
        return;
    }

    if (State.getCourses().some(c => c.code === courseCode)) {
        errorElement.textContent = `Course with code ${courseCode} already exists.`;
        DOMUtils.toggleElementClass(errorElement.id, 'hidden', false);
        return;
    }

    const newCourseData = {
        code: courseCode, name: courseName, prereqs: prerequisites, credits: credits,
        category: category, grade: grade, year: year, semester: semester,
        majorCGPA: majorCGPA, completed: completed
    };
    const currentCourses = State.getCourses();
    currentCourses.push(newCourseData);
    State.setCourses(currentCourses);
    State.setNewlyAddedCourse(courseCode);
    
    // Reset input fields
    DOMUtils.setElementValue('courseCode', ''); 
    DOMUtils.setElementValue('courseName', ''); 
    DOMUtils.setElementValue('prerequisites', '');
    DOMUtils.setElementValue('credits', '0.5'); 
    DOMUtils.setElementValue('category', 'program');
    DOMUtils.setElementValue('grade', ''); 
    DOMUtils.setElementValue('year', ''); 
    DOMUtils.setElementValue('semester', '');
    DOMUtils.setElementChecked('majorCGPA', true); 
    DOMUtils.setElementChecked('completed', false);
    
    if (network) network.setOptions({ physics: true }); 
    State.setPhysicsEnabledAfterInitialLayout(false); 
    updateAllViewsAndSummaries();
}

export function updateCourseHandler() {
    const courseCode = DOMUtils.getElementValue('modalCourseCode');
    const courseName = DOMUtils.getElementValue('modalCourseName').trim();
    const prerequisites = DOMUtils.getElementValue('modalPrerequisites').split(',').map(p => p.trim().toUpperCase().replace(/\s/g, '')).filter(p => p);
    const credits = parseFloat(DOMUtils.getElementValue('modalCredits'));
    const category = DOMUtils.getElementValue('modalCategory');
    const grade = DOMUtils.getElementValue('modalGrade');
    const year = DOMUtils.getElementValue('modalYear');
    const semester = DOMUtils.getElementValue('modalSemester');
    const majorCGPA = DOMUtils.isElementChecked('modalMajorCGPA');
    const completed = DOMUtils.isElementChecked('modalCompleted');
    const errorElement = DOMUtils.getElementById('modalError');

    DOMUtils.toggleElementClass(errorElement.id, 'hidden', true);

    if (!courseName || isNaN(credits) || credits <= 0 || !year || !semester) {
        errorElement.textContent = 'Please fill in all required fields (Name, Credits, Year, Semester).';
        DOMUtils.toggleElementClass(errorElement.id, 'hidden', false);
        return;
    }

    const courseIndex = State.getCourses().findIndex(c => c.code === courseCode);
    if (courseIndex !== -1) {
        let updatedCourses = [...State.getCourses()];
        updatedCourses[courseIndex] = { 
            ...updatedCourses[courseIndex], 
            name: courseName, prereqs: prerequisites, credits: credits, category: category, 
            grade: grade, year: year, semester: semester, majorCGPA: majorCGPA, completed: completed 
        };
        State.setCourses(updatedCourses);
        if (network) network.setOptions({ physics: true });
        State.setPhysicsEnabledAfterInitialLayout(false); 
        updateAllViewsAndSummaries();
        DOMUtils.closeModal('courseModal');
    } else {
        errorElement.textContent = 'Error: Could not find course to update.';
        DOMUtils.toggleElementClass(errorElement.id, 'hidden', false);
    }
}

export function deleteCourseHandler() {
    const courseCode = DOMUtils.getElementValue('modalCourseCode');
    let currentCourses = State.getCourses().filter(c => c.code !== courseCode);
    // Also remove this course code from any other course's prerequisites
    currentCourses.forEach(course => {
        course.prereqs = course.prereqs.filter(prereq => prereq !== courseCode);
    });
    State.setCourses(currentCourses);
    if (network) network.setOptions({ physics: true });
    State.setPhysicsEnabledAfterInitialLayout(false);
    updateAllViewsAndSummaries();
    DOMUtils.closeModal('courseModal');
}

export function saveCoursesHandler() {
    const dataToSave = {
        courses: State.getCourses(),
        requirements: {
            totalCreditsRequired: State.getTotalCreditsRequired(),
            programCreditsRequired: State.getProgramCreditsRequired(),
            breadthCreditsRequired: State.getBreadthCreditsRequired(),
            freeCreditsRequired: State.getFreeCreditsRequired()
        }
    };
    const dataStr = JSON.stringify(dataToSave, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'course_planner_data.json';
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
    DOMUtils.showMessageBox("Courses and requirements saved successfully!");
}

export function loadCoursesHandler(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const loadedData = JSON.parse(e.target.result);
                let loadedCourses = loadedData.courses || [];
                // Basic validation/sanitization for loaded courses
                loadedCourses = loadedCourses.map(course => ({
                    code: course.code || 'UNKNOWN' + Date.now(), // Ensure unique code if missing
                    name: course.name || 'Unnamed Course',
                    prereqs: Array.isArray(course.prereqs) ? course.prereqs : [],
                    credits: typeof course.credits === 'number' && course.credits > 0 ? course.credits : 0.5,
                    category: course.category || 'free',
                    grade: course.grade || 'N/A',
                    year: course.year || '1',
                    semester: course.semester || 'Fall',
                    majorCGPA: typeof course.majorCGPA === 'boolean' ? course.majorCGPA : true,
                    completed: typeof course.completed === 'boolean' ? course.completed : false,
                }));
                State.setCourses(loadedCourses);

                if (loadedData.requirements) {
                    State.setTotalCreditsRequired(parseFloat(loadedData.requirements.totalCreditsRequired) || 20.0);
                    State.setProgramCreditsRequired(parseFloat(loadedData.requirements.programCreditsRequired) || 13.0);
                    State.setBreadthCreditsRequired(parseFloat(loadedData.requirements.breadthCreditsRequired) || 3.0);
                    State.setFreeCreditsRequired(parseFloat(loadedData.requirements.freeCreditsRequired) || 4.0);
                    
                    // These UI updates for requirements should ideally be in UIService
                    DOMUtils.updateElementText('totalCreditsDisplay', State.getTotalCreditsRequired().toFixed(1));
                    DOMUtils.updateElementText('programCreditsRequired', State.getProgramCreditsRequired().toFixed(1));
                    DOMUtils.updateElementText('breadthCreditsRequired', State.getBreadthCreditsRequired().toFixed(1));
                    DOMUtils.updateElementText('freeCreditsRequired', State.getFreeCreditsRequired().toFixed(1));
                }
                if (network) network.setOptions({ physics: true });
                State.setPhysicsEnabledAfterInitialLayout(false);
                updateAllViewsAndSummaries();
                DOMUtils.showMessageBox("Courses and requirements loaded successfully!");
            } catch (error) {
                console.error('Error parsing JSON:', error);
                DOMUtils.showMessageBox(`Error loading file: ${error.message}. Please ensure it is a valid JSON.`);
            }
        };
        reader.readAsText(file);
        event.target.value = null; // Clear the input for subsequent loads
    }
}

export function updateRequirementsHandler() {
    const reqTotal = parseFloat(DOMUtils.getElementValue('reqTotalCredits'));
    const reqProgram = parseFloat(DOMUtils.getElementValue('reqProgramCredits'));
    const reqBreadth = parseFloat(DOMUtils.getElementValue('reqBreadthCredits'));
    const reqFree = parseFloat(DOMUtils.getElementValue('reqFreeCredits'));
    const reqErrorElement = DOMUtils.getElementById('reqError');

    DOMUtils.toggleElementClass(reqErrorElement.id, 'hidden', true);

    if (isNaN(reqTotal) || isNaN(reqProgram) || isNaN(reqBreadth) || isNaN(reqFree) ||
        reqTotal < 0 || reqProgram < 0 || reqBreadth < 0 || reqFree < 0) {
        reqErrorElement.textContent = 'Please enter valid positive numbers for all requirements.';
        DOMUtils.toggleElementClass(reqErrorElement.id, 'hidden', false);
        return;
    }
    if (reqProgram + reqBreadth + reqFree > reqTotal) {
        reqErrorElement.textContent = 'Sum of category credits cannot exceed total credits required.';
        DOMUtils.toggleElementClass(reqErrorElement.id, 'hidden', false);
        return;
    }

    State.setTotalCreditsRequired(reqTotal);
    State.setProgramCreditsRequired(reqProgram);
    State.setBreadthCreditsRequired(reqBreadth);
    State.setFreeCreditsRequired(reqFree);

    // These UI updates for requirements should ideally be in UIService
    DOMUtils.updateElementText('totalCreditsDisplay', State.getTotalCreditsRequired().toFixed(1));
    DOMUtils.updateElementText('programCreditsRequired', State.getProgramCreditsRequired().toFixed(1));
    DOMUtils.updateElementText('breadthCreditsRequired', State.getBreadthCreditsRequired().toFixed(1));
    DOMUtils.updateElementText('freeCreditsRequired', State.getFreeCreditsRequired().toFixed(1));
    
    updateAllViewsAndSummaries(); // This will eventually call UIService.updateCreditSummary()
    DOMUtils.closeModal('requirementsModal');
} 