// Semester view logic: rendering, drag and drop handlers 
import * as State from './state.js';
import * as DOMUtils from './domUtils.js';
import * as Constants from './constants.js';
import { network, updateAllViewsAndSummaries } from '../app.js'; // For physics updates and view updates
// import * as UIService from './uiService.js'; // For updateLegend

// Helper function (can be internal or exported if needed elsewhere)
function getSemesterIndex(year, semester) { 
    if (year === "Unassigned" || semester === "Unassigned") {
        return 9999; // Ensure "Unassigned" is always last
    }
    return parseInt(year) * 10 + (Constants.semesterOrderMap[semester] || 0); 
}

// Helper function to check if a course can be placed in a target semester based on its prerequisites
function canPlaceCourse(courseToCheck, targetYear, targetSemester) {
    const targetSemesterIndex = getSemesterIndex(targetYear, targetSemester);
    for (const prereqCode of courseToCheck.prereqs) {
        const prereqCourse = State.getCourses().find(c => c.code === prereqCode);
        if (!prereqCourse) continue; // Prereq not found, ignore for placement validation here
        const prereqSemesterIndex = getSemesterIndex(prereqCourse.year, prereqCourse.semester);
        if (prereqSemesterIndex >= targetSemesterIndex) return false; // Prereq is not in an earlier semester
    }
    return true;
}

// Helper function to check if moving a course would break downstream dependencies
function willBreakDownstreamDependencies(courseCodeToMove, newTargetYear, newTargetSemester) {
    const newTargetSemesterIndex = getSemesterIndex(newTargetYear, newTargetSemester);
    for (const course of State.getCourses()) {
        if (course.prereqs.includes(courseCodeToMove)) {
            const dependentCourseSemesterIndex = getSemesterIndex(course.year, course.semester);
            // If a course that depends on the moved course is now earlier than or in the same semester as the moved course
            if (dependentCourseSemesterIndex <= newTargetSemesterIndex) return true; 
        }
    }
    return false;
}

export function renderSemesterViewHandler() {
    console.log("Starting renderSemesterViewHandler");
    const semesterViewContainer = document.querySelector('#semesterView .semester-container');
    if (!semesterViewContainer) {
        console.error("Semester view container not found.");
        return;
    }
    
    const courses = State.getCourses();
    console.log("Current courses:", courses);
    if (!Array.isArray(courses) || courses.length === 0) {
        console.log("No courses to display in semester view");
        semesterViewContainer.innerHTML = '<div class="p-4 text-center text-gray-500">No courses to display. Add some courses to get started!</div>';
        return;
    }

    semesterViewContainer.innerHTML = ''; // Clear previous content

    const coursesByYearSemester = courses.reduce((acc, course) => {
        const year = course.year || "Unassigned"; 
        const semester = course.semester || "Unassigned";
        if (!acc[year]) acc[year] = {};
        if (!acc[year][semester]) acc[year][semester] = [];
        acc[year][semester].push(course); 
        return acc;
    }, {});

    console.log("Organized courses:", coursesByYearSemester);

    const sortedYears = Object.keys(coursesByYearSemester).sort((a, b) => {
        if (a === "Unassigned") return 1;
        if (b === "Unassigned") return -1;
        return parseInt(a) - parseInt(b);
    });

    console.log("Sorted years:", sortedYears);

    if (sortedYears.length === 0) {
        console.log("No years found after sorting");
        semesterViewContainer.innerHTML = '<div class="p-4 text-center text-gray-500">No courses to display. Add some courses to get started!</div>';
        return;
    }

    sortedYears.forEach(year => {
        const yearGroupDiv = document.createElement('div'); 
        yearGroupDiv.className = 'year-group';
        const yearTitle = document.createElement('h3'); 
        yearTitle.className = 'year-title'; 
        yearTitle.textContent = year === "Unassigned" ? "Unassigned Courses" : `Year ${year}`;
        yearGroupDiv.appendChild(yearTitle);
        
        const semesterRowDiv = document.createElement('div'); 
        semesterRowDiv.className = 'semester-row';
        
        const semestersInOrder = year === "Unassigned" ? ["Unassigned"] : ['Fall', 'Winter', 'Summer']; 
        
        semestersInOrder.forEach(semesterName => {
            if (year !== "Unassigned" || semesterName === "Unassigned") { 
                const semesterDiv = document.createElement('div'); 
                semesterDiv.className = 'semester';
                // semesterDiv.id = `semester-${year}-${semesterName}`; // Optional: for more specific targeting
                
                // Attach event listeners for drag and drop
                // These will call the global functions in app.js, which in turn call service methods
                semesterDiv.ondragover = (event) => window.allowDrop(event, year, semesterName);
                semesterDiv.ondrop = (event) => window.drop(event, year, semesterName);
                semesterDiv.ondragleave = (event) => window.dragLeave(event);
                
                const semesterTitle = document.createElement('h4'); 
                semesterTitle.className = 'semester-title'; 
                semesterTitle.textContent = semesterName;
                semesterDiv.appendChild(semesterTitle);
                
                const coursesInSemester = (coursesByYearSemester[year] && coursesByYearSemester[year][semesterName]) ? coursesByYearSemester[year][semesterName] : [];
                coursesInSemester.sort((a, b) => a.code.localeCompare(b.code)); // Sort courses alphabetically by code
                
                coursesInSemester.forEach(course => {
                    const courseCard = document.createElement('div'); 
                    courseCard.className = 'course-card';
                    // courseCard.id = `course-card-${course.code}`; // Optional: for specific targeting
                    courseCard.setAttribute('draggable', 'true'); 
                    
                    courseCard.ondragstart = (event) => window.drag(event, course.code);
                    courseCard.ondragend = (event) => { 
                        event.target.classList.remove('opacity-50'); 
                        document.querySelectorAll('.semester').forEach(sem => sem.classList.remove('drag-over', 'drag-invalid')); 
                    };
                    courseCard.onclick = () => window.openCourseModalFromCard(course.code);
                    
                    let categoryClass = '';
                    switch (course.category) {
                        case 'program': categoryClass = 'program-bg'; break;
                        case 'breadth': categoryClass = 'breadth-bg'; break;
                        case 'free': categoryClass = 'free-bg'; break;
                    }
                    
                    courseCard.innerHTML = `
                        <div class="course-details">
                            <span class="course-code">${course.code}</span>
                            <span class="course-name">${course.name || 'No Name'}</span>
                        </div>
                        <div class="course-meta">
                            <span class="course-credits">${course.credits} Cr</span>
                            <span class="course-category ${categoryClass}">${course.category.charAt(0).toUpperCase() + course.category.slice(1)}</span>
                        </div>
                        ${course.completed ? '<span class="completed-checkmark">&#10004;</span>' : ''}
                    `;
                    semesterDiv.appendChild(courseCard);
                });
                semesterRowDiv.appendChild(semesterDiv);
            }
        });
        yearGroupDiv.appendChild(semesterRowDiv);
        semesterViewContainer.appendChild(yearGroupDiv);
    });
    // UIService.updateLegendHandler(); // Ensure legend is consistent if view changes
    console.log("Semester view rendered.");
}

// Placeholder drag/drop handlers to be called by global functions in app.js
// The full logic will be moved here later.
export function handleDragStart(courseCode, eventTarget) {
    State.setDraggedCourseCode(courseCode);
    if (eventTarget) eventTarget.classList.add('opacity-50');
    console.log(`SemesterViewService: Drag started for ${courseCode}`);
}

export function handleAllowDrop(targetYear, targetSemester, eventCurrentTarget) {
    const draggedCourse = State.getCourses().find(c => c.code === State.getDraggedCourseCode());
    if (!draggedCourse || !eventCurrentTarget) return;

    const meetsPrerequisites = canPlaceCourse(draggedCourse, targetYear, targetSemester);
    const wontBreakDownstream = !willBreakDownstreamDependencies(draggedCourse.code, targetYear, targetSemester);
    const isValidDrop = meetsPrerequisites && wontBreakDownstream;

    if (isValidDrop) { 
        eventCurrentTarget.classList.add('drag-over'); 
        eventCurrentTarget.classList.remove('drag-invalid'); 
    } else { 
        eventCurrentTarget.classList.add('drag-invalid'); 
        eventCurrentTarget.classList.remove('drag-over'); 
    }
    console.log(`SemesterViewService: Allow drop over ${targetYear} ${targetSemester} - Valid: ${isValidDrop}`);
}

export function handleDragLeave(eventCurrentTarget) {
    if(eventCurrentTarget) eventCurrentTarget.classList.remove('drag-over', 'drag-invalid');
    console.log("SemesterViewService: Drag leave");
}

export function handleDrop(courseCode, targetYear, targetSemester, eventCurrentTarget) {
    if(eventCurrentTarget) eventCurrentTarget.classList.remove('drag-over', 'drag-invalid');
    const draggedCourse = State.getCourses().find(c => c.code === courseCode);

    // const originalDraggedElement = DOMUtils.getElementById(`course-card-${courseCode}`); // If cards have IDs
    // if (originalDraggedElement) originalDraggedElement.classList.remove('opacity-50');

    if (!draggedCourse) { 
        State.setDraggedCourseCode(null); 
        console.error("SemesterViewService: Dragged course not found during drop");
        return; 
    }

    const meetsPrerequisites = canPlaceCourse(draggedCourse, targetYear, targetSemester);
    const wontBreakDownstream = !willBreakDownstreamDependencies(draggedCourse.code, targetYear, targetSemester);

    if (meetsPrerequisites && wontBreakDownstream) {
        draggedCourse.year = targetYear; 
        draggedCourse.semester = targetSemester;
        // const { network, updateAllViewsAndSummaries } = await import('../app.js'); // Dynamic import for app functions
        // if (network) network.setOptions({ physics: true });
        // State.setPhysicsEnabledAfterInitialLayout(false);
        // updateAllViewsAndSummaries(); // This will re-render graph and UI summaries
        console.log(`SemesterViewService: Course ${courseCode} dropped to ${targetYear} ${targetSemester}. State updated. App update needed.`);
        // For now, rely on global updateAllViewsAndSummaries being called elsewhere or trigger manually if needed
        // A more robust solution would be a pub/sub or direct call to app.updateAllViewsAndSummaries()
        window.postMessage({ type: 'COURSE_MOVED_IN_SEMESTER_VIEW'}, '*'); // Basic way to signal app.js to update

    } else { 
        let errorMessages = [];
        if (!meetsPrerequisites) errorMessages.push("Prerequisites not met (must be in an earlier semester).");
        if (!wontBreakDownstream) errorMessages.push("Move would break a downstream dependency.");
        DOMUtils.showMessageBox(`<b>Failed to move ${courseCode} to ${targetSemester} ${targetYear}:</b><br>${errorMessages.join('<br>')}`);
    }
    State.setDraggedCourseCode(null);
}

export function handleOpenCourseModalFromCard(courseCode) {
    State.setSelectedCourseCode(courseCode); 
    const course = State.getCourses().find(c => c.code === courseCode);
    if (course) {
        DOMUtils.setElementValue('modalCourseCode', course.code);
        DOMUtils.setElementValue('modalCourseName', course.name || '');
        DOMUtils.setElementValue('modalPrerequisites', course.prereqs.join(','));
        DOMUtils.setElementValue('modalCredits', course.credits);
        DOMUtils.setElementValue('modalCategory', course.category);
        DOMUtils.setElementValue('modalGrade', course.grade || "");
        DOMUtils.setElementValue('modalYear', course.year || "");
        DOMUtils.setElementValue('modalSemester', course.semester || "");
        DOMUtils.setElementChecked('modalMajorCGPA', course.majorCGPA);
        DOMUtils.setElementChecked('modalCompleted', course.completed);
        DOMUtils.showModal('courseModal');
    }
    console.log(`SemesterViewService: Opening modal for ${courseCode}`);
} 