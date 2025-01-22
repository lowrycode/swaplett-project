// EVENT LISTENERS FOR STATIC ELEMENTS

// Click button to show instructions (opens Instructions modal)
document.getElementById("btn-show-instructions").addEventListener("click", () => {
    document.getElementById("modal-instructions").classList.remove("hidden");
});

// Click close buttons (in all modal headers)
const closeButtons = document.getElementsByClassName("btn-close-modal");
for (btn of closeButtons) {
    btn.addEventListener("click", (e) => {
        let modalElement = e.target.closest(".modal-overlay");
        modalElement.classList.add("hidden");
    });
};

// Click "New Game" button
document.getElementById("btn-new-game").addEventListener("click", newGame);

// MAIN FUNCTION
function newGame() {

    // Reset styles (hidden class to hide/display elements)
    resetVisibility();

    // Game settings
    const wordLength = parseInt(document.getElementById("grid-select").value);
    const difficulty = document.getElementById("difficulty").value;
    let remainingSwaps = 15;
    let remainingBoxes = new Set();
    let jumbleSwaps = getJumbleSwapNum(difficulty);
    console.log(jumbleSwaps);

}

// HELPER FUNCTIONS
function displayAlert(title, msg) {
    document.getElementById("modal-alert-title").innerText = title;
    document.getElementById("modal-alert-msg").innerHTML = `<p>${msg}</p>`;
    document.getElementById("modal-alert").classList.remove("hidden");
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
            displayAlert("An Error Occurred", "Unrecognised difficulty rating")
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

