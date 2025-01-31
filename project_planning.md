# PROJECT PLANNING

## Personal Goals
In this second portfolio project I aim to demonstrate proficiency with the JavaScript language by developing an interactive webpage.

I hope to demonstrate best coding practices, particularly with regards to:
- **Readability** - descriptive variable names, following standard conventions (e.g. camelCase), using comments appropriately
- **Maintainability** - appropriate use of scoping (variables defined using let/const, not in global scope), code documentation (using JSDoc), prefer using constants over "magic numbers/strings"
- **Logic** - efficient procedures/algorithms, appropriate data structures, handling exceptions, DRY principle

I was keen to learn about APIs and this project seemed to provide the best opportunity to incorporate one. Although the learning material about APIs is scheduled for later in the course I decided to visit it early in preparation for this project.

I am already familiar with how to use mouse drag-and-drop events but am less familiar with similar events on touch screen devices so I also hope to incorporate these events into this project.

In seeking to incorporate both of these features, I chose to build a word game which requires users to swap the positions of letters to make words.

## Project Overview

The game is probably most similar to a popular game called [Waffle](https://wafflegame.net/daily).

### Instructions
- words are positioned in a grid (both horizontally and vertically)
- users need to swap the jumbled letters around until they are all in the correct location in the grid
- grid cells turns green if the letter is in the correct location or yellow if it is found somewhere else in the row or column
- users are given a limited number of swaps to arrange all letters correctly

### Intended Features

- **MUST HAVE** - users can view instructions for the game

- **MUST HAVE** - users can choose the grid size (to allow for different word lengths)

- **SHOULD HAVE** - Users can choose the difficulty level, which determines the number of swaps needed to solve the puzzle

- **SHOULD HAVE** - at the end of the game, word definitions are shown

- **COULD HAVE** - option of playing an audio clip to hear how a word is pronounced

- **COULD HAVE** - dark mode

- **COULD HAVE** - check words against a blacklist

## Pseudo Code
### Event listeners for static elements
1. **"New Game" button** *(click)* - call newGame()
2. **? button** *(click)* - call openInstructionsModal()
3. **X button** *(click)* - closeModal()

### Main async function - **newGame()**
1. **resetVisibility()** - adds "hidden" class to hide/show various elements, removes any previous definitions
2. **initialise game settings** - wordLength (determines gridShape), difficulty (number of swaps required to win), remainingSwaps
3. **fetchRandomWords()** - from API *(NOTE: changed to local JSON files in later stages of development due to unreliability of the chosen API)*
4. **assign arrays** - gridWords, gridArr, gridAnswerArr
    - get array of words which meet criteria for grid (recursive DFS)
    - assign to gridArr (e.g. gridArr[r][c] with null for empty spaces)
    - copy gridArr (gridAnswerArr) then jumble gridArr
5. **displayGrid** - dynamically generate div elements, absolute positioning using inline styles
6. **add event listeners for dynamic elements** - for both mouse and touch
    - **touchStart()** / **dragStart()**
    - **touchMove()** / **dragMove()**
    - **touchEnd()** / **dragEnd()**
        - **makeSwap()** - swaps contents, updates classes / conditionally removes event handlers, updates count for remainingSwaps, if game has ended call **endGame()**

### Another async function - **endGame()**
1. **removeDragEvents()** - to lock letter positions
2. **displayEndGame()**
    - hide remaining swap count
    - show win / lose message
    - show definitions placeholder ("fetching definitions")
2. **fetchDefinitions()** - from API
3. **writeDefinitionsHTML()** - display definitions