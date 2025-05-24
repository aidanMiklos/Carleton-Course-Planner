let courses = [];
let nodes = new vis.DataSet([]);
let edges = new vis.DataSet([]);
let totalCreditsRequired = 20.0;
let programCreditsRequired = 13.0;
let breadthCreditsRequired = 3.0;
let freeCreditsRequired = 4.0;
let selectedCourseCode = null;
let newlyAddedCourse = null;
let currentView = 'prerequisite'; // 'prerequisite' or 'semester'
let physicsEnabledAfterInitialLayout = false; // Track if physics should be on after initial load
let draggedCourseCode = null;

export function getCourses() { return courses; }
export function setCourses(newCourses) { courses = newCourses; }

export function getNodes() { return nodes; }
export function getEdges() { return edges; }

export function getTotalCreditsRequired() { return totalCreditsRequired; }
export function setTotalCreditsRequired(value) { totalCreditsRequired = value; }

export function getProgramCreditsRequired() { return programCreditsRequired; }
export function setProgramCreditsRequired(value) { programCreditsRequired = value; }

export function getBreadthCreditsRequired() { return breadthCreditsRequired; }
export function setBreadthCreditsRequired(value) { breadthCreditsRequired = value; }

export function getFreeCreditsRequired() { return freeCreditsRequired; }
export function setFreeCreditsRequired(value) { freeCreditsRequired = value; }

export function getSelectedCourseCode() { return selectedCourseCode; }
export function setSelectedCourseCode(value) { selectedCourseCode = value; }

export function getNewlyAddedCourse() { return newlyAddedCourse; }
export function setNewlyAddedCourse(value) { newlyAddedCourse = value; }

export function getCurrentView() { return currentView; }
export function setCurrentView(value) { currentView = value; }

export function isPhysicsEnabledAfterInitialLayout() { return physicsEnabledAfterInitialLayout; }
export function setPhysicsEnabledAfterInitialLayout(value) { physicsEnabledAfterInitialLayout = value; }

export function getDraggedCourseCode() { return draggedCourseCode; }
export function setDraggedCourseCode(value) { draggedCourseCode = value; } 