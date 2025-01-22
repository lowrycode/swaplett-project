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
    let remainingBoxes = getNewGridArr.remainingBoxes;


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

function jumbleGridArr(gridArr, numSwaps) {

    // Create a deep copy of gridArr
    let jumbledGridArr = structuredClone(gridArr);

    // Define remainingBoxes (used later to keep track of game state)
    const remainingBoxes = new Set();

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
        if (jumbledGridArr[r1][c1] !== null
            && jumbledGridArr[r2][c2] !== null
            && jumbledGridArr[r1][c1] !== jumbledGridArr[r2][c2]
            && jumbledGridArr[r1][c1] !== gridArr[r2][c2]
            && jumbledGridArr[r2][c2] !== gridArr[r1][c1]
        ) {
            // Make the swap
            const tempStr = jumbledGridArr[r1][c1];
            jumbledGridArr[r1][c1] = jumbledGridArr[r2][c2];
            jumbledGridArr[r2][c2] = tempStr;
            remainingBoxes.add(`${r1},${c1}`);
            remainingBoxes.add(`${r2},${c2}`);
            swapsMade++;
        }

        attempts++;
    }

    // Show a warning in the console if maximum attempts reached
    if (attempts >= maxAttempts) {
        console.warn(`Max attempts (${maxAttempts}) reached - only ${swapsMade} of ${numSwaps} were made.`);
    }

    return { gridArr: jumbledGridArr, remainingBoxes: remainingBoxes };
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

