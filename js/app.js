import * as State from './modules/state.js';
import * as Constants from './modules/constants.js';
import * as DOMUtils from './modules/domUtils.js';
import { initializeEventListeners } from './modules/eventListeners.js';
import * as GraphService from './modules/graphService.js';
import * as UIService from './modules/uiService.js';
import * as SemesterViewService from './modules/semesterViewService.js';

// import * as CourseService from './modules/courseService.js'; // Already being used by eventListeners

let network = null; // Exported, can be used by services
let layoutPending = false; // Flag to indicate custom layout needs to be run
let initialLayoutComplete = false; // New flag

function initializeNetwork() {
    const visContainer = DOMUtils.getElementById('flowchart-canvas');
    if (visContainer) {
        // Log current dimensions of the container Vis.js will use
        console.log(`initializeNetwork: flowchart-canvas offsetWidth = ${visContainer.offsetWidth}, offsetHeight = ${visContainer.offsetHeight}`);

        if (visContainer.offsetWidth === 0) {
            console.error("CRITICAL: flowchart-canvas has zero width before network initialization! Layout will fail.");
            // Optionally, try to force a size for testing, though this hides the root cause
            // visContainer.style.width = '1000px'; 
            // visContainer.style.height = '600px';
            // console.log(`Applied forced size. New offsetWidth = ${visContainer.offsetWidth}`);
        }

        const initialData = { nodes: State.getNodes(), edges: State.getEdges() };
        const initialOptions = {
            layout: {
                hierarchical: false
            },
            nodes: {
                shape: 'box',
                font: {
                  size: 14,
                  color: '#e2e8f0',
                  multi: true,
                  bold: { color: '#22c55e' },
                  face: 'Inter'
                },
                margin: 15,
                widthConstraint: { minimum: 160, maximum: 260 },
                heightConstraint: { minimum: 65 },
                shapeProperties: { borderRadius: 8 },
                mass: 1
            },
            edges: {
                arrows: 'to',
                color: { color: '#a0aec0', highlight: '#63b3ed', hover: '#63b3ed' },
                width: 1.5,
                smooth: {
                    enabled: true,
                    type: 'cubicBezier',
                    forceDirection: 'vertical',
                    roundness: 0.15
                }
            },
            physics: false,
            interaction: {
                hover: true,
                tooltipDelay: 200,
                dragView: true,
                zoomView: true,
                dragNodes: false
            }
        };
        network = new vis.Network(visContainer, initialData, initialOptions);

        network.on('click', (params) => {
            if (params.nodes.length > 0) {
                const courseCode = params.nodes[0];
                if (String(courseCode).startsWith('year-')) return;
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
            }
        });
        
        // Attempt to run layout after the network has drawn initially or subsequently
        network.on('afterDrawing', () => {
            if (layoutPending) {
                console.log("afterDrawing event: layoutPending is true.");
                const visContainerInEvent = DOMUtils.getElementById('flowchart-canvas');
                if (visContainerInEvent && visContainerInEvent.offsetWidth > 0) {
                    GraphService.applyCustomLayout();
                    initialLayoutComplete = true; 
                } else {
                    console.error("afterDrawing: flowchart-canvas still has no dimensions. Aborting layout.", 
                                  `Width: ${visContainerInEvent ? visContainerInEvent.offsetWidth : 'N/A'}`);
                    if (!initialLayoutComplete) {
                         console.log("Retrying redraw shortly for initial layout...");
                         setTimeout(() => { if(layoutPending) network.redraw(); }, 250); 
                    }
                }
                layoutPending = false;
            }
        });

    } else {
        console.error("Flowchart container not found for network initialization.");
    }
}

function updateAllViewsAndSummaries() {
    console.log("updateAllViewsAndSummaries called for custom layout.");
    GraphService.updateGraph(); // This now just prepares data
    layoutPending = true;     // Signal that layout is needed
    network.redraw();         // Trigger a redraw, which should fire 'afterDrawing'
    
    // GraphService.applyCustomLayout(); // MOVED to be triggered by 'afterDrawing'
    // if (network) network.fit(); // MOVED to applyCustomLayout

    if (State.getCurrentView() === 'semester') {
        SemesterViewService.renderSemesterViewHandler();
    }
    UIService.updateCreditSummaryHandler();
    UIService.updateCGPAHandler();
    UIService.initializeAutocompleteHandler();
    console.log("Custom layout applied and views updated.");
}

// Listen for custom event to trigger update after drag/drop in semester view
window.addEventListener('message', (event) => {
    if (event.source === window && event.data && event.data.type === 'COURSE_MOVED_IN_SEMESTER_VIEW') {
        console.log("app.js: Received COURSE_MOVED_IN_SEMESTER_VIEW message, updating all views with custom layout.");
        updateAllViewsAndSummaries();
    }
});

document.addEventListener('DOMContentLoaded', () => {
    initializeNetwork();
    initializeEventListeners(); 

    DOMUtils.updateElementHTML('toggleViewButton', Constants.calendarIconSVG);
    DOMUtils.updateElementHTML('toggleViewButtonSemester', Constants.calendarIconSVG);
    GraphService.handleFullscreenChangeHandler(); 

    setTimeout(() => {
        console.log("DOMContentLoaded: Deferred initial updateAllViewsAndSummaries.");
        updateAllViewsAndSummaries(); 
    }, 100); // Small delay
    
    console.log("DOMContentLoaded: Application initialized (core setup).");
});

// --- Global drag/drop functions for Semester View, delegating to SemesterViewService ---
window.drag = function(event, courseCode) {
    SemesterViewService.handleDragStart(courseCode, event.target);
    // event.dataTransfer.setData is still needed here for the browser's drag API
    event.dataTransfer.setData("text/plain", courseCode);
};

window.allowDrop = function(event, targetYear, targetSemester) {
    event.preventDefault(); // Necessary for the drop event to fire
    SemesterViewService.handleAllowDrop(targetYear, targetSemester, event.currentTarget);
};

window.dragLeave = function(event) {
    SemesterViewService.handleDragLeave(event.currentTarget);
};

window.drop = function(event, targetYear, targetSemester) {
    event.preventDefault(); // Prevent default drop behavior (e.g., opening as link)
    const courseCode = event.dataTransfer.getData("text/plain");
    SemesterViewService.handleDrop(courseCode, targetYear, targetSemester, event.currentTarget);
    // The actual update of views will be triggered by the postMessage from SemesterViewService
};

window.openCourseModalFromCard = function(courseCode) {
    SemesterViewService.handleOpenCourseModalFromCard(courseCode);
};

export { network, updateAllViewsAndSummaries }; 