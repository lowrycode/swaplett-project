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
    try {
        const words = await fetchRandomWords(wordLength);
        console.log(words);
    } catch (error) {
        displayAlert("Error", "Could not fetch words. Please check your internet connection.");
        console.error("FAILED TO FETCH RANDOM WORDS", error);
        // NOTE could use fallback words here e.g. return fallbackWords.filter(word => word.length === wordLength);
    }

}

// HELPER FUNCTIONS
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

