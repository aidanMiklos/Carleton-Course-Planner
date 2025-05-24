// Vis.js network/graph related logic: updateGraph, event handlers, recenter, fullscreen 
import * as State from './state.js';
import * as Constants from './constants.js';
import * as DOMUtils from './domUtils.js'; // May be needed for DOM interactions related to graph
import { network } from '../app.js'; // To control the network (focus, fit, setOptions)
import * as UIService from './uiService.js';

// Helper to get the color for a course node
function getCourseColor(course) {
    // Completed status will be indicated by a checkmark in the label
    // if (course.completed) return '#22c55e'; // Green for completed - REMOVED
    switch (course.category) {
        case 'program': return Constants.categoryColors.program;
        case 'breadth': return Constants.categoryColors.breadth;
        case 'free': return Constants.categoryColors.free;
        default: return Constants.categoryColors.default;
    }
}

// Helper to get connected nodes in an adjacent level range
function getConnectedNeighborsInLevel(nodeId, targetLevelMin, targetLevelMax, edges, allNodes) {
    const neighbors = [];
    // Ensure allNodes is an array of node objects, not a DataSet, for .find()
    const allNodeArray = Array.isArray(allNodes) ? allNodes : allNodes.get({ fields: ['id', 'level', 'x'] });
    const edgeArray = edges.get({ filter: edge => edge.from === nodeId || edge.to === nodeId });

    edgeArray.forEach(edge => {
        const otherNodeId = edge.from === nodeId ? edge.to : edge.from;
        const otherNode = allNodeArray.find(n => n.id === otherNodeId);
        if (otherNode && typeof otherNode.level === 'number' && 
            otherNode.level >= targetLevelMin && otherNode.level <= targetLevelMax) {
            neighbors.push(otherNodeId);
        }
    });
    return neighbors;
}

export function applyCustomLayout() {
    const currentNodesDataSet = State.getNodes();
    const currentEdgesDataSet = State.getEdges();

    console.log(`applyCustomLayout: Received ${currentNodesDataSet.length} nodes and ${currentEdgesDataSet.length} edges.`);
    if (!network || !currentNodesDataSet || !currentEdgesDataSet) {
        console.warn("Custom layout cannot be applied: network or datasets missing.");
        return;
    }

    // Define nodeObjectsFromDataSet EARLIER
    const nodeObjectsFromDataSet = currentNodesDataSet.get({ fields: ['id', 'level', 'x', 'y', 'label', 'shape'] });

    console.log("Applying custom layout...");

    console.log("applyCustomLayout: nodeObjectsFromDataSet:", JSON.parse(JSON.stringify(nodeObjectsFromDataSet)));
    
    const layoutNodes = nodeObjectsFromDataSet.filter(node => typeof node.level === 'number' && node.shape !== 'text'); // Exclude year labels
    console.log("applyCustomLayout: layoutNodes (for barycenter):", JSON.parse(JSON.stringify(layoutNodes)));

    if (layoutNodes.length === 0 && !yearLabelNodesExist(nodeObjectsFromDataSet)) {
        console.log("applyCustomLayout: No course nodes or year labels to lay out. Network fit will not be called by applyCustomLayout.");
        return; // Nothing to arrange
    }

    const levels = {};
    layoutNodes.forEach(node => {
        if (!levels[node.level]) {
            levels[node.level] = [];
        }
        levels[node.level].push(node);
    });
    
    const levelKeys = Object.keys(levels).map(parseFloat).sort((a, b) => a - b);

    // Add a minimum horizontal gap between nodes
    const minHorizontalGap = 30; // pixels

    const visContainerElement = DOMUtils.getElementById('flowchart-canvas');
    let actualCanvasWidth = 1200; // Default fallback

    if (visContainerElement && visContainerElement.offsetWidth > 0) {
        actualCanvasWidth = visContainerElement.offsetWidth;
        console.log(`applyCustomLayout: Using visContainerElement.offsetWidth = ${actualCanvasWidth}`);
    } else {
        console.warn(`applyCustomLayout: visContainerElement.offsetWidth is 0 or element not found. Falling back to width ${actualCanvasWidth}. This might cause layout issues.`);
    }
    
    const canvasWidth = actualCanvasWidth; // Use this determined width
    const viewPadding = 50;
    const effectiveWidth = canvasWidth - (2 * viewPadding);
    console.log(`applyCustomLayout: effectiveWidth = ${effectiveWidth} (based on canvasWidth ${canvasWidth})`);

    const maxIterations = 5;
    for (let iter = 0; iter < maxIterations; iter++) {
        // Downward pass
        for (const level of levelKeys) {
            if (!levels[level]) continue;
            levels[level].forEach(node => {
                const parentLevel = level - 1;
                const neighbors = getConnectedNeighborsInLevel(node.id, parentLevel, parentLevel, currentEdgesDataSet, layoutNodes);
                let sumX = 0;
                let count = 0;
                neighbors.forEach(neighborId => {
                    const neighborNode = layoutNodes.find(n => n.id === neighborId);
                    if (neighborNode && typeof neighborNode.x === 'number') {
                        sumX += neighborNode.x;
                        count++;
                    }
                });
                node.barycenterX = count > 0 ? sumX / count : (node.x !== undefined ? node.x : effectiveWidth / 2 + viewPadding);
            });
            levels[level].sort((a, b) => a.barycenterX - b.barycenterX);
        }

        // Upward pass
        for (let i = levelKeys.length - 1; i >= 0; i--) {
            const level = levelKeys[i];
            if (!levels[level]) continue;
            levels[level].forEach(node => {
                const childLevel = level + 1;
                const neighbors = getConnectedNeighborsInLevel(node.id, childLevel, childLevel, currentEdgesDataSet, layoutNodes);
                let sumX = 0;
                let count = 0;
                neighbors.forEach(neighborId => {
                    const neighborNode = layoutNodes.find(n => n.id === neighborId);
                     if (neighborNode && typeof neighborNode.x === 'number') {
                        sumX += neighborNode.x;
                        count++;
                    }
                });
                node.barycenterX = count > 0 ? sumX / count : (node.x !== undefined ? node.x : effectiveWidth / 2 + viewPadding);
            });
            levels[level].sort((a, b) => a.barycenterX - b.barycenterX);
        }

        levelKeys.forEach(level => {
            if (!levels[level]) return;
            const currentLevelNodes = levels[level];
            const numNodesInLevel = currentLevelNodes.length;
            if (numNodesInLevel > 0) {
                // Estimate total width needed for nodes in this level
                // Using an average, as actual widths can vary due to widthConstraint
                const averageNodeWidth = 180; // Estimate based on (150+200)/2 and some margin
                const totalNodeWidth = numNodesInLevel * averageNodeWidth;
                const totalGapWidth = Math.max(0, numNodesInLevel - 1) * minHorizontalGap;
                const requiredWidth = totalNodeWidth + totalGapWidth;

                let startX = viewPadding;
                let actualSpacing = minHorizontalGap;

                if (requiredWidth < effectiveWidth) {
                    // Center the block of nodes if they take less than effectiveWidth
                    startX = viewPadding + (effectiveWidth - requiredWidth) / 2;
                    actualSpacing = minHorizontalGap; // Keep minimum gap, nodes will have more space via centering
                } else {
                    // Nodes and gaps will take up the whole effectiveWidth or more
                    // Distribute nodes across effectiveWidth, ensuring minHorizontalGap
                    // This might mean nodes effectively get less than averageNodeWidth if very crowded
                    if (numNodesInLevel > 1) {
                        actualSpacing = Math.max(minHorizontalGap, (effectiveWidth - totalNodeWidth) / (numNodesInLevel - 1));
                    } else {
                        actualSpacing = 0; // Only one node
                    }
                }

                currentLevelNodes.forEach((node, index) => {
                    if (numNodesInLevel === 1) {
                        node.x = viewPadding + effectiveWidth / 2;
                    } else {
                        node.x = startX + index * (averageNodeWidth + actualSpacing);
                    }
                });
            }
        });
    }

    const updatedNodesData = [];
    const yLevelSeparation = 200; // Increased spacing a bit for semester rows
    
    levelKeys.forEach((level, levelIndex) => {
        if (!levels[level]) return;
        levels[level].forEach(node => {
            // Find the original node data from updateGraph to preserve properties like title, label, color
            const originalNode = nodeObjectsFromDataSet.find(n => n.id === node.id);
            updatedNodesData.push({
                id: node.id,
                x: node.x,
                y: levelIndex * yLevelSeparation + yLevelSeparation,
                fixed: { x: true, y: true },
                // Carry over other essential properties from the original node data set by updateGraph
                label: originalNode ? originalNode.label : '', 
                title: originalNode ? originalNode.title : null, // This will be null
                color: originalNode ? originalNode.color : undefined,
                // level: originalNode ? originalNode.level : undefined, // level is already part of 'node' from levels[level]
                shape: originalNode && originalNode.id.startsWith('year-') ? 'text' : 'box' // Preserve shape for year/course
            });
        });
    });
    
    const yearLabelNodes = nodeObjectsFromDataSet.filter(node => node.shape === 'text');
    yearLabelNodes.forEach(yearNode => {
        const yearNum = parseInt(String(yearNode.id).split('-')[1]);
        
        // Find the smallest levelKey that belongs to this yearNum (e.g., for Year 1, find 1.0 or 1.1)
        let firstLevelKeyForYear = Infinity;
        let firstLevelKeyIndexForYear = -1;

        for (let i = 0; i < levelKeys.length; i++) {
            if (Math.floor(levelKeys[i]) === yearNum) {
                if (levelKeys[i] < firstLevelKeyForYear) {
                    firstLevelKeyForYear = levelKeys[i];
                    firstLevelKeyIndexForYear = i;
                }
            }
        }

        let yearNodeY;
        if (firstLevelKeyIndexForYear !== -1) {
            // Position year label slightly above the first semester of that year
            yearNodeY = (firstLevelKeyIndexForYear * yLevelSeparation + yLevelSeparation) - (yLevelSeparation / 1.2); 
        } else {
            // Fallback if no courses for this year, position based on year number among other year labels
            // This logic might need refinement if you can have empty years between populated years
            const sortedYearLabelYears = yearLabelNodes.map(n => parseInt(String(n.id).split('-')[1])).sort((a,b)=>a-b);
            const yearIndex = sortedYearLabelYears.indexOf(yearNum);
            yearNodeY = (yearIndex * yLevelSeparation * 2) + (yLevelSeparation / 2); // Simplified fallback y
            console.warn(`applyCustomLayout: No course levels found for Year ${yearNum}. Using fallback Y position.`);
        }

        console.log(`applyCustomLayout: Year Node ${yearNode.id} (Year ${yearNum}), firstLevelKeyForYear: ${firstLevelKeyForYear}, firstLevelKeyIndexForYear: ${firstLevelKeyIndexForYear}, y: ${yearNodeY}`);

        updatedNodesData.push({
            id: yearNode.id,
            x: viewPadding / 2, // Position year labels to the far left
            y: yearNodeY,
            fixed: { x: true, y: true },
            physics: false,
            shape: 'text', // Ensure shape is text, though it should be from nodeObjectsFromDataSet
            font: { align: 'left' } // Align text to the left of its x coordinate
        });
    });

    if (updatedNodesData.length > 0) {
        console.log("applyCustomLayout: Final updatedNodesData before update:", JSON.parse(JSON.stringify(updatedNodesData)));
        currentNodesDataSet.update(updatedNodesData);
        console.log("Custom layout applied, X and Y positions updated and fixed.");
        if (network) { 
            network.fit(); 
            console.log("applyCustomLayout: network.fit() called.");
            console.log("applyCustomLayout: network scale =", network.getScale());
            console.log("applyCustomLayout: network viewPosition =", JSON.stringify(network.getViewPosition()));
        }
    } else if (nodeObjectsFromDataSet.length > 0) { 
        currentNodesDataSet.update(yearLabelNodes.map(n => ({id: n.id, x: n.x, y: n.y, fixed: {x:true, y:true}})));
        if (network) {
             network.fit();
             console.log("applyCustomLayout: network.fit() called for year label update.");
             console.log("applyCustomLayout: network scale =", network.getScale());
             console.log("applyCustomLayout: network viewPosition =", JSON.stringify(network.getViewPosition()));
        }
    }
}

export function updateGraph() {
    // TEMPORARY LOG: Show the raw course data being processed
    // console.log("updateGraph: Initial courses data:", JSON.parse(JSON.stringify(State.getCourses())));

    if (!network) {
        console.error("Network not initialized. Cannot update graph.");
        return;
    }

    const nodesDataSet = State.getNodes();
    const edgesDataSet = State.getEdges();

    const courses = State.getCourses();
    const activeCourseCodes = new Set(courses.map(c => c.code));
    const activeYearNumbers = new Set(courses.map(c => parseInt(c.year)));

    console.log(`updateGraph: Found ${courses.length} courses. Active years:`, Array.from(activeYearNumbers));

    // 1. Update or Add Year Nodes
    const allPossibleYears = [1, 2, 3, 4]; // Or derive from a larger range or actual data
    allPossibleYears.forEach(year => {
        const yearId = `year-${year}`;
        if (activeYearNumbers.has(year)) {
            nodesDataSet.update({
                id: yearId,
                label: `Year ${year}`,
                shape: 'text',
                level: year, // Year labels stay at the integer year level for now
                physics: false,
                // fixed: true, // Custom layout will fix it
                font: { size: 20, face: 'Inter', color: '#cbd5e1', strokeWidth: 0.5, strokeColor: '#4a5568' },
                margin: { top: 25, bottom: 10 }
            });
        } else {
            if (nodesDataSet.get(yearId)) nodesDataSet.remove(yearId); // Remove if no courses for this year
        }
    });

    // 2. Update or Add Course Nodes
    courses.forEach(course => {
        const nodeId = course.code;
        const baseYearLevel = parseInt(course.year);
        let semesterOffset = 0;
        if (course.semester && Constants.semesterToLevelOffset.hasOwnProperty(String(course.semester))) {
            semesterOffset = Constants.semesterToLevelOffset[String(course.semester)];
        }
        const courseLevel = baseYearLevel + semesterOffset;
        // console.log(`updateGraph: Course ${course.code}, Year: ${course.year}, Raw Semester: ${course.semester} (type: ${typeof course.semester}), String Semester: ${String(course.semester)}, Offset: ${semesterOffset}, Final Level: ${courseLevel}`); // Keep this for now, useful

        const displayName = course.name.length > 25 ? course.name.substring(0,22)+'...' : course.name;
        let finalLabel;
        if (course.completed) {
            finalLabel = `<b>✓</b> ${course.code}\n${displayName}`;
        } else {
            finalLabel = `${course.code}\n${displayName}`;
        }

        const nodeData = {
            id: nodeId,
            label: finalLabel,
            title: null, // Set to null to remove tooltip
            level: courseLevel,
            color: getCourseColor(course),
            shapeProperties: { borderRadius: 6 },
            font: {
                size: 13,
                color: '#e2e8f0',
                multi: true, // boolean, not string
                bold: { color: '#22c55e' }, // green for <b> parts
                face: 'Inter',
                align: 'center'
            },
            margin: 12,
            widthConstraint: { minimum: 150, maximum: 200 },
            heightConstraint: { minimum: 60 },
            // x, y, fixed will be set by applyCustomLayout
        };
        // console.log(`updateGraph: Processing course ${course.code}, level: ${courseLevel}`); // Log each course
        if (nodesDataSet.get(nodeId)) {
            // console.log(`updateGraph: Updating node ${nodeId}`);
            nodesDataSet.update(nodeData);
        } else {
            // console.log(`updateGraph: Adding new node ${nodeId}`);
            nodesDataSet.add(nodeData);
        }
    });

    console.log(`updateGraph: nodesDataSet has ${nodesDataSet.length} nodes after course processing.`);

    // 3. Remove Obsolete Course Nodes
    const nodesToRemove = [];
    nodesDataSet.forEach(node => {
        if (!String(node.id).startsWith('year-') && !activeCourseCodes.has(node.id)) {
            nodesToRemove.push(node.id);
        }
    });
    if (nodesToRemove.length > 0) nodesDataSet.remove(nodesToRemove);

    // 4. Update or Add Edges
    const activeEdgeIds = new Set();
    courses.forEach(course => {
        course.prereqs.forEach(prereqCode => {
            if (prereqCode && activeCourseCodes.has(prereqCode) && activeCourseCodes.has(course.code)) {
                const edgeId = `${prereqCode}-${course.code}`;
                activeEdgeIds.add(edgeId);
                if (!edgesDataSet.get(edgeId)) {
                    // console.log(`updateGraph: Adding edge ${edgeId}`);
                    edgesDataSet.add({ id: edgeId, from: prereqCode, to: course.code, arrows: 'to' });
                }
            }
        });
    });

    console.log(`updateGraph: edgesDataSet has ${edgesDataSet.length} edges after processing.`);

    // 5. Remove Obsolete Edges
    const edgesToRemove = [];
    edgesDataSet.forEach(edge => {
        if (!activeEdgeIds.has(edge.id)) {
            edgesToRemove.push(edge.id);
        }
    });
    if (edgesToRemove.length > 0) edgesDataSet.remove(edgesToRemove);
    
    console.log("Graph data updated by updateGraph for custom layout.");
    // The custom layout will be called by updateAllViewsAndSummaries in app.js
}

export function recenterGraph() {
    console.log("recenterGraph called");
    console.log("network object in recenterGraph:", network);
    if (network) {
        network.fit({ animation: { duration: 500, easingFunction: 'easeInOutQuad' } });
        console.log("recenterGraph: network.fit() called");
    } else {
        console.error("recenterGraph: network object is missing!");
    }
}

export function toggleFullScreenFlowchartHandler() {
    const flowchartElement = DOMUtils.getElementById('flowchart');
    if (!flowchartElement) {
        console.error("Flowchart element not found for fullscreen toggle.");
        DOMUtils.showMessageBox("Could not enter fullscreen: flowchart element missing.");
        return;
    }

    const isFullscreenEnabled = document.fullscreenEnabled || document.webkitFullscreenEnabled || document.mozFullScreenEnabled || document.msFullscreenEnabled;
    if (!isFullscreenEnabled) {
        DOMUtils.showMessageBox("Fullscreen mode is not available or not permitted in this browser/environment.");
        return;
    }

    try {
        if (!document.fullscreenElement && !document.mozFullScreenElement && !document.webkitFullscreenElement && !document.msFullscreenElement) {
            if (flowchartElement.requestFullscreen) flowchartElement.requestFullscreen();
            else if (flowchartElement.mozRequestFullScreen) flowchartElement.mozRequestFullScreen();
            else if (flowchartElement.webkitRequestFullscreen) flowchartElement.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
            else if (flowchartElement.msRequestFullscreen) flowchartElement.msRequestFullscreen();
        } else {
            if (document.exitFullscreen) document.exitFullscreen();
            else if (document.mozCancelFullScreen) document.mozCancelFullScreen();
            else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
            else if (document.msExitFullscreen) document.msExitFullscreen();
        }
    } catch (e) {
        console.error("Fullscreen API error:", e);
        DOMUtils.showMessageBox("Could not toggle fullscreen mode. It might be blocked by browser settings or an iframe.");
    }
}

export function handleFullscreenChangeHandler() {
    const enterIcon = DOMUtils.getElementById('fullscreenIconEnter');
    const exitIcon = DOMUtils.getElementById('fullscreenIconExit');
    const isFullScreen = !!(document.fullscreenElement || document.webkitIsFullScreen || document.mozFullScreenElement || document.msFullscreenElement);
    
    if (enterIcon) DOMUtils.toggleElementClass(enterIcon.id, 'hidden', isFullScreen);
    if (exitIcon) DOMUtils.toggleElementClass(exitIcon.id, 'hidden', !isFullScreen);
    
    // Hide calendar view toggle button in fullscreen
    const calendarToggle = DOMUtils.getElementById('toggleViewButton');
    if (calendarToggle) {
        calendarToggle.style.display = isFullScreen ? 'none' : '';
    }
    
    if(network) {
        setTimeout(() => {
            // Re-apply custom layout on fullscreen change to adjust to new width
            // applyCustomLayout(); // This might be too aggressive if fit() is enough
            network.fit(); 
        }, 300); // Delay to allow browser to settle fullscreen transition
    }
}

// Helper function to check if any year label nodes exist
function yearLabelNodesExist(nodes) {
    return nodes.some(node => node.shape === 'text');
} 