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
    console.log("New Game");
}