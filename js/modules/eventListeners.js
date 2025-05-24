import * as domUtils from './domUtils.js';
import * as courseService from './courseService.js';
import * as graphService from './graphService.js';
import * as uiService from './uiService.js';
// import * as semesterViewService from './semesterViewService.js'; // Will be created later
import * as state from './state.js'; // May not be needed here if services handle all state interaction

export function initializeEventListeners() {
    // Add Course Button
    const addCourseButton = domUtils.getElementById('addCourseButton');
    if (addCourseButton) addCourseButton.addEventListener('click', courseService.addCourseHandler);

    // Save Courses Button
    const saveCoursesButton = domUtils.getElementById('saveCoursesButton');
    if (saveCoursesButton) saveCoursesButton.addEventListener('click', courseService.saveCoursesHandler);

    // Load Courses Button & Input
    const loadCoursesButton = domUtils.getElementById('loadCoursesButton');
    const loadCoursesInput = domUtils.getElementById('loadCoursesInput');
    if (loadCoursesButton) loadCoursesButton.addEventListener('click', () => loadCoursesInput.click());
    if (loadCoursesInput) loadCoursesInput.addEventListener('change', courseService.loadCoursesHandler);

    // Open Requirements Modal Button
    const openReqModalButton = domUtils.getElementById('openRequirementsModalButton');
    if (openReqModalButton) openReqModalButton.addEventListener('click', uiService.openRequirementsModalHandler);

    // Credits Wrapper (for toggling table)
    const totalCreditsWrapper = domUtils.getElementById('totalCreditsWrapper');
    if (totalCreditsWrapper) totalCreditsWrapper.addEventListener('click', uiService.toggleCreditsTableHandler);
    const creditsProgress = domUtils.getElementById('creditsProgress');
    if (creditsProgress) creditsProgress.addEventListener('click', uiService.toggleCreditsTableHandler);

    // Recenter Button
    const recenterButton = domUtils.getElementById('recenterButton');
    if (recenterButton) recenterButton.addEventListener('click', graphService.recenterGraph);

    // Toggle View Button (Flowchart)
    const toggleViewButton = domUtils.getElementById('toggleViewButton');
    if (toggleViewButton) toggleViewButton.addEventListener('click', uiService.toggleViewHandler);

    // Fullscreen Button
    const fullscreenButton = domUtils.getElementById('fullscreenButton');
    if (fullscreenButton) fullscreenButton.addEventListener('click', graphService.toggleFullScreenFlowchartHandler);

    // Toggle View Button (Semester)
    const toggleViewButtonSemester = domUtils.getElementById('toggleViewButtonSemester');
    if (toggleViewButtonSemester) toggleViewButtonSemester.addEventListener('click', uiService.toggleViewHandler); // Same handler

    // --- Course Modal Buttons ---
    const updateCourseButton = domUtils.getElementById('updateCourseButton');
    if (updateCourseButton) updateCourseButton.addEventListener('click', courseService.updateCourseHandler);

    const deleteCourseButton = domUtils.getElementById('deleteCourseButton');
    if (deleteCourseButton) deleteCourseButton.addEventListener('click', courseService.deleteCourseHandler);

    const closeCourseModalButton = domUtils.getElementById('closeCourseModalButton');
    if (closeCourseModalButton) closeCourseModalButton.addEventListener('click', () => domUtils.closeModal('courseModal'));

    // --- Requirements Modal Buttons ---
    const updateRequirementsButton = domUtils.getElementById('updateRequirementsButton');
    if (updateRequirementsButton) updateRequirementsButton.addEventListener('click', courseService.updateRequirementsHandler);

    const closeRequirementsModalButton = domUtils.getElementById('closeRequirementsModalButton');
    if (closeRequirementsModalButton) closeRequirementsModalButton.addEventListener('click', () => domUtils.closeModal('requirementsModal'));

    // --- Message Box Button ---
    const closeMessageBoxButton = domUtils.getElementById('closeMessageBoxButton');
    if (closeMessageBoxButton) closeMessageBoxButton.addEventListener('click', () => domUtils.closeModal('messageBox'));

    // --- Fullscreen change events ---
    document.addEventListener('fullscreenchange', graphService.handleFullscreenChangeHandler);
    document.addEventListener('webkitfullscreenchange', graphService.handleFullscreenChangeHandler);
    document.addEventListener('mozfullscreenchange', graphService.handleFullscreenChangeHandler);
    document.addEventListener('MSFullscreenChange', graphService.handleFullscreenChangeHandler);

    // Autocomplete listeners are now handled within uiService.initializeAutocompleteHandler
    // No specific listeners needed here for those input fields anymore.

    console.log("Event listeners initialized.");
} 