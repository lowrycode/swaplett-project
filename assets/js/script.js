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
};

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
    let remainingBoxes = new Set();
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
    console.log(words);

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
    let gridWords = []
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
    console.log(gridWords);

}

// HELPER FUNCTIONS

function assignGridWords(words, gridWords, criteria, usedWords = new Set(), i = 0) {
    if (i >= gridWords.length) return {data: gridWords, success: true};  // gridWords complete
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
    return {data: gridWords, success: false};
}

function displayAlert(title, msg) {
    document.getElementById("modal-alert-title").innerText = title;
    document.getElementById("modal-alert-msg").innerHTML = `<p>${msg}</p>`;
    document.getElementById("modal-alert").classList.remove("hidden");
}

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
 * Returns information about where the common letters are within the grid words.
 * This is used when building the "gridWords" array.
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
            ]
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
            ]
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
            ]
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

function matchesCriteria(lastIndex, gridWords, criteria) {
    for (let [iGridWord, jGridWord, iChar, jChar] of criteria) {
        if (((iGridWord === lastIndex || jGridWord === lastIndex))
            && gridWords[iGridWord]
            && gridWords[jGridWord]
            && (gridWords[iGridWord][iChar] !== gridWords[jGridWord][jChar])
        ) {
            return false;
        }
    }
    return true;
}

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

