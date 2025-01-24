// GLOBAL VARIABLES
let draggedElement = null; // An element being dragged

// EVENT LISTENERS FOR STATIC ELEMENTS

// Click button to show instructions (opens Instructions modal)
document.getElementById("btn-show-instructions").addEventListener("click", () => {
    document.getElementById("modal-instructions").classList.remove("hidden");
});

// Click close buttons (in all modal headers)
const closeButtons = document.getElementsByClassName("btn-close-modal");
for (let btn of closeButtons) {
    btn.addEventListener("click", (e) => {
        let modalElement = e.target.closest(".modal-overlay");
        modalElement.classList.add("hidden");
    });
}

// Click "New Game" button
document.getElementById("btn-new-game").addEventListener("click", newGame);

// MAIN FUNCTION
async function newGame() {

    // Reset styles (hidden class to hide/display elements)
    resetVisibility();

    // Game settings
    const wordLength = parseInt(document.getElementById("grid-select").value);
    const difficulty = document.getElementById("difficulty").value;
    let remainingSwaps = 15;
    let jumbleSwaps = getJumbleSwapNum(difficulty);

    // Get random words
    let words = [];
    try {
        words = await fetchRandomWords(wordLength);
    } catch (error) {
        displayAlert("Error", "Could not fetch words. Please check your internet connection.");
        console.error("FAILED TO FETCH RANDOM WORDS", error);
        // NOTE could use fallback words here e.g. return fallbackWords.filter(word => word.length === wordLength);
        return;
    }

    // Get criteria for gridWords array
    let criteria = [];
    try {
        criteria = getGridWordsCriteria(wordLength);
    } catch (error) {
        displayAlert("Error", "Invalid grid size");
        console.error("FAILED TO GET CRITERIA FOR GRID WORDS", error);
        return;
    }

    // Initialise gridWords array
    let gridWords = [];
    try {
        gridWords = initialiseGridWords(wordLength);
    } catch (error) {
        displayAlert("Error", "Invalid grid size");
        console.error("FAILED TO INITIALISE GRID WORDS", error);
        return;
    }

    // Build gridWords array
    let getGridWords = assignGridWords(words, gridWords, criteria);
    if (!getGridWords.success) {
        displayAlert("Error", "Unable to build grid. To try again, press the New Game button");
        console.error("FAILED TO ASSIGN GRID WORDS: could not fulfill the criteria");
        return;
    }
    gridWords = getGridWords.data;

    // Build gridAnswerArr
    let gridAnswerArr = getGridArr(wordLength, gridWords);

    // Build gridArr (by jumbling a copy of gridAnswerArr)
    let getNewGridArr = jumbleGridArr(gridAnswerArr, jumbleSwaps);
    let gridArr = getNewGridArr.gridArr;
    let unresolvedGridCells = getNewGridArr.unresolvedGridCells;

    // Draw grid
    try {
        drawGrid(gridArr, gridAnswerArr);
    } catch (error) {
        displayAlert("Error", "Unable to draw grid to the page. Try refreshing the page and starting a new game.");
        console.error("FAILED TO DRAW GRID", error);
        return;
    }

    // Add event listeners to grid cells with draggable class
    addDragEvents();


}

// HELPER FUNCTIONS

/**
 * Adds drag-and-drop events to all elements with the 'draggable' class at the start of the game.
 * It includes both touch events and mouse events.
 */
function addDragEvents() {
    document.querySelectorAll('.draggable').forEach(div => {
        // Touch events
        div.addEventListener('touchstart', onDragStart);
        div.addEventListener('touchmove', onDragMove);
        div.addEventListener('touchend', onDragEnd);
        // Mouse events
        div.addEventListener('mousedown', onDragStart);
        div.addEventListener('mousemove', onDragMove);
        div.addEventListener('mouseup', onDragEnd);
    });
}

/**
 * Recursively assigns words to the gridWords array.
 * 
 * @param {string[]} words - An array of all available words.
 * @param {string[]} gridWords - The array of words that is being being built recursively.
 * @param {number[][]} criteria - Constraints defining relationships between grid words.
 * @param {Set<string>} [usedWords=new Set()] - A set of words already being used in the gridWords array.
 * @param {number} [i=0] - The current index in the gridWords array being processed.
 * @returns {{data: string[], success: boolean}} The updated gridWords array and a success flag.
 */
function assignGridWords(words, gridWords, criteria, usedWords = new Set(), i = 0) {
    if (i >= gridWords.length) return { data: gridWords, success: true };  // gridWords complete
    for (let word of words) {
        if (usedWords.has(word)) continue;
        // Add word
        gridWords[i] = word;
        usedWords.add(word);
        if (matchesCriteria(i, gridWords, criteria)) {
            // Recursive call
            // console.log(word, "passed tests - call again", gridWords);
            const response = assignGridWords(words, gridWords, criteria, usedWords, i + 1);
            if (response.success) return response;
        }
        // Backtrack
        gridWords[i] = null;
        usedWords.delete(word);
        // console.log(word, "failed tests - try next word", gridWords);
    }
    return { data: gridWords, success: false };
}

/**
 * Creates a div element representing a cell in the word grid.
 * This function is called by the `drawGrid` function to generate individual grid cells
 * with specific styles and attributes, which are later added to the DOM.
 * 
 * @param {string} char - The letter to display within the grid cell.
 * @param {number} xPos - The x-coordinate of the grid cell, expressed as a percentage.
 * @param {number} yPos - The y-coordinate of the grid cell, expressed as a percentage.
 * @param {number} offset - The percentage offset applied to the coordinates to create equal spacing around grid cells.
 * @param {number} w - The width of the grid cell, expressed as a percentage.
 * @param {number} h - The height of the grid cell, expressed as a percentage.
 * @param {number} r - The row index of the grid cell in the grid.
 * @param {number} c - The column index of the grid cell in the grid.
 * @returns {HTMLDivElement} - A div element representing a grid cell.
 */
function createGridCell(char, xPos, yPos, offset, w, h, r, c) {
    const gridCell = document.createElement("div");
    gridCell.innerText = char;
    gridCell.style.left = `${xPos + offset}%`;
    gridCell.style.top = `${yPos + offset}%`;
    gridCell.style.width = `${w - (2 * offset)}%`;
    gridCell.style.height = `${h - (2 * offset)}%`;
    gridCell.setAttribute("data-row", `${r}`);
    gridCell.setAttribute("data-col", `${c}`);
    return gridCell;
}

/**
 * This function is called by the drawGrid function. It sets the class names for a grid cell element 
 * based on whether the letter it contains is in the:
 * - correct position (.green)
 * - correct row or column (.yellow .dragabble),
 * 
 * @param {HTMLElement} gridCell - The grid cell element to modify.
 * @param {string[]} row - The current row in the grid as an array of characters.
 * @param {number} r - The row index of the grid cell.
 * @param {number} c - The column index of the grid cell.
 * @param {string[][]} gridArr - The current state of the grid as a 2D array of characters.
 * @param {string[][]} gridAnswerArr - The solution grid as a 2D array of characters.
 * @returns {HTMLElement} - The modified grid cell element with the appropriate class names.
 */
function setGridCellClassNames(gridCell, row, r, c, gridArr, gridAnswerArr) {
    // set class names
    if (row[c] === gridAnswerArr[r][c]) {
        gridCell.classList = "grid-cell green";
    } else {
        gridCell.classList = "grid-cell draggable";
        // check if letter is in correct column
        for (let rTest = 0; rTest < gridArr.length; rTest++) {
            if (row[c] === gridAnswerArr[rTest][c]) {
                gridCell.classList.add("yellow");
                return gridCell;
            }
        }
        // check if letter is in correct row
        for (let cTest = 0; cTest < row.length; cTest++) {
            if (row[c] === gridAnswerArr[r][cTest]) {
                gridCell.classList.add("yellow");
                return gridCell;
            }
        }
    }
    return gridCell;
}

/**
 * Draws the initial state of the game grid by creating and styling grid cell elements, and appending them to the game-board.
 * 
 * @param {string[][]} gridArr - A 2D array representing the initial state of the game grid.
 * @param {string[][]} gridAnswerArr - A 2D array representing the solution grid, used to determine the correct placement and styling of grid cells.
 * @returns {void} - This function does not return a value; it modifies the DOM directly.
 */
function drawGrid(gridArr, gridAnswerArr) {

    // Remove text from game-board
    const gameBoard = document.getElementById("game-board");
    gameBoard.innerText = "";

    // Define position variables
    const xPosStart = 0, yPosStart = 0;
    let xPos = xPosStart;
    let yPos = yPosStart;
    let offset = 0.5;  // used for spacing between blocks

    // Define width and height for grid cells
    let w = 100 / gridArr.length;
    let h = w;

    // Define document fragment (improves performance by reducing number of reflows & repaints)
    const fragment = document.createDocumentFragment();

    // Draw grid (as fragment)
    for (let r = 0; r < gridArr.length; r++) {
        const row = gridArr[r];
        xPos = xPosStart;
        for (let c = 0; c < row.length; c++) {
            const char = row[c];
            if (char !== null) {
                let gridCell = createGridCell(char, xPos, yPos, offset, w, h, r, c);
                setGridCellClassNames(gridCell, row, r, c, gridArr, gridAnswerArr);
                fragment.appendChild(gridCell);
            }
            xPos += w;
        }
        yPos += h;
    }

    // Add to DOM
    gameBoard.appendChild(fragment);
}

function displayAlert(title, msg) {
    document.getElementById("modal-alert-title").innerText = title;
    document.getElementById("modal-alert-msg").innerHTML = `<p>${msg}</p>`;
    document.getElementById("modal-alert").classList.remove("hidden");
}

/**
 * Fetches a list of random words of a specified length from an external API.
 * 
 * @param {number} wordLength - The length of the words to fetch.
 * @returns {Promise<string[]>} Promise which resolves to an array of random words.
 * @throws {Error} If the word length is invalid or the fetch request fails.
 */
async function fetchRandomWords(wordLength) {

    // Validate input
    const MIN_WORD_LENGTH = 3;
    const MAX_WORD_LENGTH = 7;
    if (!Number.isInteger(wordLength) || wordLength < MIN_WORD_LENGTH || wordLength > MAX_WORD_LENGTH) {
        throw new Error(`Invalid word length - must be between ${MIN_WORD_LENGTH} and ${MAX_WORD_LENGTH}`);
    }

    // Write query string
    const NUM_WORDS = 1000;
    const LANGUAGE = "en";
    const queryStr = `https://random-word-api.herokuapp.com/word?length=${wordLength}&number=${NUM_WORDS}&lang=${LANGUAGE}`;

    // Fetch data
    try {
        const response = await fetch(queryStr);

        if (!response.ok) {
            // Fetch request (was successful but) returned a HTTP error
            throw new Error(`HTTP error (status: ${response.status})`);
        }

        const data = await response.json();
        return data;

    } catch (error) {
        // Includes network errors, JSON parsing errors, and runtime errors
        throw error;  // to be handled by the caller function
    }
}

/**
 * Generates a 2-D array representing the grid of words by positioning letters in the 
 * correct row and column in the grid (in the format gridWords[row][column])
 *
 * @param {number} gridSize - The size of the grid (e.g., 5 for a 5x5 grid).
 * @param {Array<string>} gridWords - An array of words to be placed in the grid.
 * @returns {Array<Array<string | null>>} - A 2D array representing the grid.
 */
function getGridArr(gridSize, gridWords) {

    // Initialise rowsArr
    let gridArr = Array(gridSize).fill(null).map(() => Array(gridSize).fill(null));

    // Get wordGap - the number of rows down (or columns across) to position the next word
    let wordGap = gridSize >= 5 ? Math.floor((gridSize - 1) / 2) : 2;

    // Initialise iWord (the index of the word in gridWords)
    let iWord = 0;

    // Position horizontal words in correct rows
    for (let r = 0; r < gridSize; r = r + wordGap) {
        for (let c = 0; c < gridSize; c++) {
            const word = gridWords[iWord];
            gridArr[r][c] = word[c];
        }
        iWord++;
    }

    // Position vertical words in correct columns
    for (let c = 0; c < gridSize; c = c + wordGap) {
        for (let r = 1; r < gridSize; r++) {
            const word = gridWords[iWord];
            gridArr[r][c] = word[r];
        }
        iWord++;
    }

    // Output
    return gridArr;
}

/**
 * Returns information about where the intersecting characters are between the grid words.
 * 
 * This function is used when building the "gridWords" array.
 * 
 * @param {number} wordLength The length of the words used in the gridWords array
 * @returns {number[][]} A two-dimensional array where each sub-array contains four numbers:
 *                       [gridWord index for word 1, gridWord index for word 2, character index for word 1, character index for word 2].
 * @throws {Error} If the wordLength is invalid.
 */
function getGridWordsCriteria(wordLength) {
    switch (wordLength) {
        case 3:
        case 4:
            return [
                [0, 2, 0, 0],
                [0, 3, 2, 0],
                [1, 2, 0, 2],
                [1, 3, 2, 2]
            ];
        case 5:
        case 6:
            return [
                [0, 3, 0, 0],
                [0, 4, 2, 0],
                [0, 5, 4, 0],
                [1, 3, 0, 2],
                [1, 4, 2, 2],
                [1, 5, 4, 2],
                [2, 3, 0, 4],
                [2, 4, 2, 4],
                [2, 5, 4, 4]
            ];
        case 7:
            return [
                [0, 3, 0, 0],
                [0, 4, 3, 0],
                [0, 5, 6, 0],
                [1, 3, 0, 3],
                [1, 4, 3, 3],
                [1, 5, 6, 3],
                [2, 3, 0, 6],
                [2, 4, 3, 6],
                [2, 5, 6, 6]
            ];
        default:
            throw new Error("Invalid wordLength passed as argument");
    }
}

function getJumbleSwapNum(difficulty) {
    switch (difficulty.toLowerCase()) {
        case "easy":
            return 6;
        case "medium":
            return 8;
        case "hard":
            return 10;
        default:
            displayAlert("An Error Occurred", "Unrecognised difficulty rating");
            throw new Error("Unrecognised difficulty rating");
    }
}

function initialiseGridWords(wordLength) {
    switch (wordLength) {
        case 3:
        case 4:
            return Array(4).fill(null);
        case 5:
        case 6:
        case 7:
            return Array(6).fill(null);
        default:
            throw new Error("Unrecognised wordLength passed as argument");
    }
}

/**
 * Jumbles the grid by swapping random non-null values in the grid array a specified number of times.
 *
 * @param {Array<Array<string | null>>} gridArr - A 2D array representing the grid of words or null values. 
 * @param {number} numSwaps - The number of swaps to perform on the grid.
 *
 * @returns {{gridArr: Array<Array<string | null>>, unresolvedGridCells: Set<string>}} - The function returns an object
 * that contains:
 *   - gridArr: the jumbled grid array after the swaps.
 *   - unresolvedGridCells: a set containing the coordinates of the swapped grid cells (in the format "r,c")
 */
function jumbleGridArr(gridArr, numSwaps) {

    // Create a deep copy of gridArr
    let jumbledGridArr = structuredClone(gridArr);

    // Define unresolvedGridCells (used later to keep track of game state)
    const unresolvedGridCells = new Set();

    // Make specified number of swaps
    let swapsMade = 0;
    let attempts = 0;
    let maxAttempts = 1000;

    while (swapsMade < numSwaps && attempts < maxAttempts) {
        // Generate random coordinates for two grid cells
        const r1 = Math.floor(Math.random() * jumbledGridArr.length);
        const c1 = Math.floor(Math.random() * jumbledGridArr[r1].length);
        const r2 = Math.floor(Math.random() * jumbledGridArr.length);
        const c2 = Math.floor(Math.random() * jumbledGridArr[r2].length);

        // Check swap is valid
        if (jumbledGridArr[r1][c1] !== null &&
            jumbledGridArr[r2][c2] !== null &&
            jumbledGridArr[r1][c1] !== jumbledGridArr[r2][c2] &&
            jumbledGridArr[r1][c1] !== gridArr[r2][c2] &&
            jumbledGridArr[r2][c2] !== gridArr[r1][c1]
        ) {
            // Make the swap
            const tempStr = jumbledGridArr[r1][c1];
            jumbledGridArr[r1][c1] = jumbledGridArr[r2][c2];
            jumbledGridArr[r2][c2] = tempStr;
            unresolvedGridCells.add(`${r1},${c1}`);
            unresolvedGridCells.add(`${r2},${c2}`);
            swapsMade++;
        }

        attempts++;
    }

    // Show a warning in the console if maximum attempts reached
    if (attempts >= maxAttempts) {
        console.warn(`Max attempts (${maxAttempts}) reached - only ${swapsMade} of ${numSwaps} were made.`);
    }

    return { gridArr: jumbledGridArr, unresolvedGridCells: unresolvedGridCells };
}

/**
 * Checks if the current gridWords array (particularly the last word added) satisfies 
 * the specified grid criteria. It is called from within the assignGridWords function.
 * 
 * @param {number} lastIndex - The index of the last grid word added to the gridWords array.
 * @param {string[]} gridWords - An array of words currently in the grid.
 * @param {Array<[number, number, number, number]>} criteria - The 2 dimensional array of numbers (returned from the getGridWordsCriteria function)
 * @returns {boolean} - Returns "true" if the current gridWords array satisfies the criteria or otherwise `false`.
 */
function matchesCriteria(lastIndex, gridWords, criteria) {
    for (let [iGridWord, jGridWord, iChar, jChar] of criteria) {
        if (((iGridWord === lastIndex || jGridWord === lastIndex)) &&
            gridWords[iGridWord] && gridWords[jGridWord] &&
            (gridWords[iGridWord][iChar] !== gridWords[jGridWord][jChar])
        ) {
            return false;
        }
    }
    return true;
}

/**
 * Handles end-of-drag operations for both touch and mouse moves.
 * It is used alongside the onDragStart and onDragMove functions.
 * 
 * @param {TouchEvent|MouseEvent} event - The event triggered by the touch or mouse interaction.
 */
function onDragEnd(event) {

    // Remove dragging style
    draggedElement.classList.remove('dragging');

    // Reset original position
    draggedElement.style.transform = '';

    // Get the touch that was removed or mouse up event
    const dragPoint = event.changedTouches ? event.changedTouches[0] : event;

    // Find the element located where the touch was released
    const targetElement = document.elementFromPoint(dragPoint.clientX, dragPoint.clientY);

    if (swapIsValid(targetElement)) {
        console.log(`MAKE SWAP: ${targetElement.innerText} and ${draggedElement.innerText}`);
    }

    draggedElement = null; // Reset the global dragged element
}

/**
 * Handles drag move operations for both touch and mouse moves.
 * It is used alongside the onDragStart and onDragEnd functions.
 * 
 * @param {TouchEvent|MouseEvent} event - The event triggered by the touch or mouse interaction.
 */
function onDragMove(event) {

    // Check an element is being dragged
    if (!draggedElement) return;

    // Prevent scrolling during drag
    event.preventDefault();

    // Use event.touches[0] for first touch, or event for mouse click
    const dragPoint = event.touches ? event.touches[0] : event;

    // Parse initial positions from dataset (ensure they are numbers)
    const startX = parseFloat(draggedElement.dataset.startX);
    const startY = parseFloat(draggedElement.dataset.startY);

    // Calculate offsets from the starting position
    const deltaX = dragPoint.clientX - startX;
    const deltaY = dragPoint.clientY - startY;

    // Move the element dynamically (translate is efficient as avoids reflow / repaint)
    draggedElement.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
}

/**
 * Handles the start of a drag operation for both touch and mouse interactions.
 * This function assigns a value to the global 'draggedElement' variable (if not already assigned)
 * 
 * It is used alongside the onDragMove and onDragEnd functions.
 * 
 * @param {TouchEvent|MouseEvent} event - The event triggered by the touch or mouse interaction.
 */
function onDragStart(event) {

    // Check an element is not already being dragged
    if (draggedElement) return;

    // Get the element being touched (by assigning to the global variable)
    draggedElement = event.target;

    // Add class for visual feedback
    draggedElement.classList.add('dragging');

    // Use event.touches[0] for first touch, or event for mouse click
    const dragPoint = event.touches ? event.touches[0] : event;

    // Create data-startX and data-startY attributes for storing initial touch coordinates
    draggedElement.dataset.startX = dragPoint.clientX;
    draggedElement.dataset.startY = dragPoint.clientY;

}

/**
 * Resets the visibility of game-related elements on the page and clears dynamic 
 * content in the "definitions" and "game-board" sections
 */
function resetVisibility() {
    // Hide elements
    document.getElementById("game-end-info").classList.add("hidden");
    document.getElementById("win").classList.add("hidden");
    document.getElementById("lose").classList.add("hidden");
    document.getElementById("definitions").classList.add("hidden");
    document.getElementById("definitions").innerHTML = "";
    // Show elements
    document.getElementById("swaps-info").classList.remove("hidden");
    document.getElementById("game-board").innerHTML = "<p>Generating board ...</p>";
}

/**
 * Determines whether a swap operation between the dragged element and the target element is valid.
 * 
 * @param {HTMLElement} targetElement - The target element being considered for a swap.
 * @returns {boolean} - Returns 'true' if the target element is valid for a swap, or 'false' if not.
 * 
 * Criteria for a valid swap:
 * - The target element exists (`targetElement` is not null or undefined).
 * - The target element has the class `draggable`.
 * - The target element's inner text is not the same as the dragged element's inner text.
 * 
 * Note that this function references the global 'draggedElement' variable when evaluating the criteria.
 */
function swapIsValid(targetElement) {
    if (targetElement && targetElement.classList.contains('draggable') &&
        targetElement.innerText !== draggedElement.innerText) {
        return true;
    }
    return false;
}