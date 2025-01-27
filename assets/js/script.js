// EVENT LISTENERS FOR STATIC ELEMENTS

// Checkbox to toggle dark mode
const darkModeCheckbox = document.getElementById("dark-mode-checkbox");
darkModeCheckbox.addEventListener("change", function () {
    if (darkModeCheckbox.checked) {
        document.body.classList.add("dark-mode");
    } else {
        document.body.classList.remove("dark-mode");
    }
});

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
    let draggedElement = null; // References the element being dragged
    addDragEvents();

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
     * An async function which handles the end-of-game logic.
     *
     * @param {boolean} success - States whether the user won or lost the game ("true" for win, "false" for loss).
     * 
     * @returns {Promise<void>} Resolves when all end-of-game tasks are completed.
     * 
     * @throws {Error} If fetching word definitions fails (due to network issues or other errors).
     * 
     * @description
     * This function does the following tasks:
     * - Hides the "swaps-info" element.
     * - Displays the relevant win/lose message (based on the "success" parameter).
     * - Updates the remaining swaps information (for a win).
     * - Removes drag-and-drop event listeners from draggable elements (for a loss).
     * - Shows a placeholder message while fetching word definitions.
     * - Fetches definitions for all words in the grid and displays them.
     * - Displays an error alert if fetching definitions fails.
     */
    async function endGame(success) {

        // Hide swaps-info
        document.getElementById("swaps-info").classList.add("hidden");

        // Show win/lose message and remove remaining drag-and-drop event listeners
        if (success) {
            document.getElementById("win").classList.remove("hidden");
            document.getElementById("end-swaps-remaining").innerText = remainingSwaps === 1 ? "1 swap" : `${remainingSwaps} swaps`;
        } else {
            document.getElementById("lose").classList.remove("hidden");
            // Remove event listeners
            document.querySelectorAll('.draggable').forEach(div => {
                removeDragEvents(div);
            });
        }
        document.getElementById("game-end-info").classList.remove("hidden");

        // Show definitions placeholder
        const definitionsElement = document.getElementById("definitions");
        const definitionsPlaceholder = "<h2>Definitions</h2><hr><p>Fetching definitions...</p>";
        definitionsElement.innerHTML = definitionsPlaceholder;
        definitionsElement.classList.remove("hidden");

        //  Fetch definitions
        try {
            let definitionsArr = await fetchDefinitionsArr(gridWords);
            writeDefinitions(definitionsArr);
        } catch (error) {
            displayAlert("Error", "Unable to fetch definitions. Please check your internet connection.");
            console.error("FAILED TO FETCH DEFINITIONS ARRAY", error);
            return;
        }

    }

    /**
     * Handles swapping two grid cells, updating their contents, classes, and game state.
     *
     * @param {HTMLElement} draggedElement - The grid cell that is being dragged.
     * @param {HTMLElement} targetElement - The grid cell that is the target of the swap.
     *
     * @description
     * The function does the following:
     * 1. Retrieves the row and column indices of both grid cells.
     * 2. Updates "gridArr" to reflect the swap.
     * 3. Updates the contents of the grid cells to match the values in "gridArr".
     * 4. Updates CSS classes of the grid cells to show new colours and whether they are still draggable.
     * 5. Processes resolved cells by removing drag-and-drop event listeners and updating unresolvedGridCells set.
     * 6. Decrements the remaining swap count and updates the page display with the new value.
     * 7. Checks if the game has ended (either by resolving all cells or exhausting all swaps).
     */
    function makeSwap(draggedElement, targetElement) {

        // Get rows and columns
        let r1 = parseInt(draggedElement.getAttribute("data-row"));
        let c1 = parseInt(draggedElement.getAttribute("data-col"));
        let r2 = parseInt(targetElement.getAttribute("data-row"));
        let c2 = parseInt(targetElement.getAttribute("data-col"));

        // Update gridArr
        updateGridArr(gridArr, r1, c1, r2, c2);

        // Update grid cell contents to match updated gridArr
        updateGridCellContents(draggedElement, targetElement);

        // Update grid cell classes
        setGridCellClassNames(draggedElement, r1, c1, gridArr, gridAnswerArr);
        setGridCellClassNames(targetElement, r2, c2, gridArr, gridAnswerArr);

        // Process resolved cells
        processResolvedGridCells(draggedElement, unresolvedGridCells, r1, c1);
        processResolvedGridCells(targetElement, unresolvedGridCells, r2, c2);

        // Update remainingSwaps
        remainingSwaps--;
        document.getElementById("swaps-remaining").innerText = remainingSwaps;

        // Check game state
        if (unresolvedGridCells.size === 0) {
            endGame(true);
        }
        else if (remainingSwaps === 0) {
            endGame(false);
        }
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

        if (swapIsValid(draggedElement, targetElement)) {
            makeSwap(draggedElement, targetElement);
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
     * Processes a grid cell by checking if it is resolved (has a class name of "green").
     * If resolved, it removes drag events from the cell and removes its coordinates
     * from the unresolvedGridCells set.
     *
     * @param {HTMLElement} cell - The grid cell to process.
     * @param {Set<string>} unresolvedGridCells - A set containing string representations
     *        of unresolved grid cell coordinates in the format "row,column".
     * @param {number} r - The row index of the current cell.
     * @param {number} c - The column index of the current cell.
     * @returns {Set<string>} The updated unresolvedGridCells set.
     */
    function processResolvedGridCells(cell, unresolvedGridCells, r, c) {
        if (cell.classList.contains("green")) {
            removeDragEvents(cell);
            unresolvedGridCells.delete(`${r},${c}`);
        }
        return unresolvedGridCells;
    }

    /**
     * Removes drag-related event listeners (both touch and mouse) from a given grid cell.
     *
     * @param {HTMLElement} cell - The grid cell from which to remove drag event listeners.
     */
    function removeDragEvents(cell) {
        // Touch events
        cell.removeEventListener('touchstart', onDragStart);
        cell.removeEventListener('touchmove', onDragMove);
        cell.removeEventListener('touchend', onDragEnd);
        // Mouse events
        cell.removeEventListener('mousedown', onDragStart);
        cell.removeEventListener('mousemove', onDragMove);
        cell.removeEventListener('mouseup', onDragEnd);
    }
}

// HELPER FUNCTIONS

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
            const response = assignGridWords(words, gridWords, criteria, usedWords, i + 1);
            if (response.success) return response;
        }
        // Backtrack
        gridWords[i] = null;
        usedWords.delete(word);
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
                setGridCellClassNames(gridCell, r, c, gridArr, gridAnswerArr);
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
 * An async function which collates definitions for an array of words.
 * The definitions are fetched from a dictionary API in the fetchWordInfo function that is called for each word.
 *
 * The function processes API requests in parallel using Promise.all (to improve efficiency).
 * 
 * @param {Array<string>} wordsArr - An array of words to fetch definitions for.
 *
 * @returns {Promise<Array<Object>>} - A Promise that resolves to an array of objects.
 * The objects contain processed information about each word:
 * - "word": The word.
 * - "audioClipUrl": URL of the pronunciation audio clip (if available).
 * - "meanings": An array of objects, each representing a meaning, containing:
 *   - "partOfSpeech": noun, verb etc.
 *   - "definition": The definition of the word.
 * 
 @throws {Error} If any of the promises fail to resolve, the error is passed to the caller function to handle.
 */
async function fetchDefinitionsArr(wordsArr) {
    return Promise.all(wordsArr.map(fetchWordInfo));
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
 * An async function which fetches information about a word from a Dictionary API.
 *
 * @param {string} word - The word to fetch information for.
 *
 * @returns {Promise<Object>} - A Promise that resolves to an object containing processed information about the word:
 * - "word": The word.
 * - "audioClipUrl": URL of the pronunciation audio clip (if available).
 * - "meanings": An array of objects, each representing a meaning, containing:
 *   - "partOfSpeech": noun, verb etc.
 *   - "definition": The definition of the word.
 * If the word is not found, it returns a default object with `meanings` containing the placeholder "No defintion found".
 *
 * @throws {Error} - Throws an error if the fetch request fails (e.g., network issues) 
 * or the API response status is not successful (except for a 404 status).
 *
 */
async function fetchWordInfo(word) {

    const queryStr = `https://api.dictionaryapi.dev/api/v2/entries/en/${word}`;
    try {
        const response = await fetch(queryStr);

        if (!response.ok) {
            // Fetch request (was successful but) returned a HTTP error
            if (response.status === 404) {
                // Likely that word was not found in API
                console.warn(`Unable to find entry for ${word} in dictionary API`);
                return { word: word, meanings: [{ partOfSpeech: "", definition: "No definition found" }] }
            } else {
                throw new Error(`HTTP error (status: ${response.status})`);
            }
        }

        const data = await response.json();
        return processWordData(word, data);

    } catch (error) {
        // Includes network errors, JSON parsing errors, and runtime errors
        throw error;  // to be handled by the caller function
    }
}

/**
 * Extracts an audio clip URL from the data returned from an API request.
 * 
 * @param {Array<Object>} phonetics - An array of objects which potentially contains an "audio" property.
 * @returns {string} - The URL of the first audio clip found, or an empty string if no audio clip is available.
 */
function getAudioClipUrl(phonetics) {
    for (let item of phonetics) {
        if (item["audio"]) {
            return item["audio"];
        }
    }
    return "";
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
 * Plays the audio associated with the given audio element ID.
 *
 * @param {string} audioId - The ID of the <audio> element to play.
 * @returns {void} This function does not return a value.
 */
function playAudio(audioId) {
    document.getElementById(audioId).play();
}

/**
 * Processes raw word data fetched from a dictionary API into a structured format. 
 * The function is called from the fetchWordInfo function
 *
 * @param {string} word - The word being processed.
 * @param {Array<Object>} data - The raw API response containing information about the word. 
 *
 * @returns {Object} - A structured object containing:
 * - "word": The word.
 * - "audioClipUrl": URL of the pronunciation audio clip (if available).
 * - "meanings": An array of objects, each representing a meaning, containing:
 *   - "partOfSpeech": noun, verb etc.
 *   - "definition": The definition of the word. 
 */
function processWordData(word, data) {

    // Get audioClipUrl
    const phonetics = data[0]["phonetics"];
    const audioClipUrl = getAudioClipUrl(phonetics);

    // Initialise wordInfo
    let wordInfo = { word: word, audioClipUrl: audioClipUrl, meanings: [] }

    // Get meanings and append data to wordInfo
    const meanings = data[0]["meanings"];
    for (let meaning of meanings) {
        const partOfSpeech = meaning["partOfSpeech"];
        const definitions = meaning["definitions"];
        const definition = definitions[0]["definition"];
        wordInfo["meanings"].push({ partOfSpeech: partOfSpeech, definition: definition })
    }

    return wordInfo;
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
function setGridCellClassNames(gridCell, r, c, gridArr, gridAnswerArr) {
    // set class names
    let row = gridArr[r];
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
function swapIsValid(draggedElement, targetElement) {
    if (targetElement && targetElement.classList.contains('draggable') &&
        targetElement.innerText !== draggedElement.innerText) {
        return true;
    }
    return false;
}

/**
 * Swaps the values of two cells in a 2D grid array using row and column references.
 *
 * @param {Array<Array<string | null>>} gridArr - A 2D array representing the grid.
 * @param {number} r1 - The row index of the first cell.
 * @param {number} c1 - The column index of the first cell.
 * @param {number} r2 - The row index of the second cell.
 * @param {number} c2 - The column index of the second cell.
 * @returns {Array<Array<string | null>>} The updated grid array after swapping the values.
 */
function updateGridArr(gridArr, r1, c1, r2, c2) {
    const tempVal = gridArr[r1][c1];
    gridArr[r1][c1] = gridArr[r2][c2];
    gridArr[r2][c2] = tempVal;
    return gridArr;
}

/**
 * Swaps the innerHTML content of two grid cells.
 *
 * @param {HTMLElement} cell1 - The first grid cell to swap.
 * @param {HTMLElement} cell2 - The second grid cell to swap.
 */
function updateGridCellContents(cell1, cell2) {
    const tempContent = cell1.innerHTML;
    cell1.innerHTML = cell2.innerHTML;
    cell2.innerHTML = tempContent;
}

/**
 * Writes definitions and audio clips to the DOM.
 *
 * @param {Array<Object>} definitionsArr - An array of objects containing word definitions and audio information.
 * Each object should have the following properties:
 * - "word": The word.
 * - "audioClipUrl": URL of the pronunciation audio clip (if available).
 * - "meanings": An array of objects, each representing a meaning, containing:
 *   - "partOfSpeech": noun, verb etc.
 *   - "definition": The definition of the word. 
 *
 * @returns {void} Updates the inner HTML of the element with an id of "definitions".
 */
function writeDefinitions(definitionsArr) {
    let html = "<h2>Definitions</h2>";
    let htmlDefinitionAudio = "";
    html += "<dl>";
    let iAudio = 0;

    for (let wordMap of definitionsArr) {
        html += '<div class="definition-entry">';

        // Write word heading (optionally with audio button)
        if (wordMap.audioClipUrl) {
            iAudio++;
            html += `<dt class="definition-word">${wordMap.word}
                        <button class="btn-audio" type="button" onclick="playAudio('audio${iAudio}')" aria-label="Play audio clip" title="Play audio clip">
                        <i class="fa-solid fa-circle-play" aria-hidden="true"></i></button>
                    </dt>`;
            htmlDefinitionAudio += `<audio id="audio${iAudio}" aria-hidden="true">
                                        <source src="${wordMap.audioClipUrl}" type="audio/mpeg">
                                    </audio>`;
        } else {
            html += `<dt class="definition-word">${wordMap.word}</dt>`;
        }

        // Write word definition(s)
        html += "<dd>";
        for (let meaning of wordMap.meanings) {
            html += "<p>";
            if (meaning.partOfSpeech) {
                html += `<span class="partOfSpeech">${meaning.partOfSpeech}:</span> `;
            }
            html += `<span class="definition-meaning">${meaning.definition}</span>`;
            html += "</p>";
        }
        html += "</dd>";
        html += "</div>";
    }

    html += "</dl>";

    // Append audio HTML (if exists)
    if (htmlDefinitionAudio) {
        html += `<div id="definition-audio">${htmlDefinitionAudio}</div>`;
    }

    // Write to DOM
    document.getElementById("definitions").innerHTML = html;
}