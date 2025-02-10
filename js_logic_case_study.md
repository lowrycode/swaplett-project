# JavaScript Logic - A Case Study

Perhaps the most interesting aspect of the project relates to how to get a random collection of words which match the criteria of the specified grid (i.e. have intersecting characters in the correct positions).

The process involves the following steps
1. Fetching words of the correct length
2. Randomising the order of the words
3. Defining the grid criteria
4. Finding words which meet the criteria

Each of these steps are considered in more detail below.

## 1. Fetching words of the correct length

The `fetchRandomWords` function is tasked with fetching a large number of words (of a specified length) and returning the result as a randomly shuffled array.

```js
async function fetchRandomWords(wordLength) {

    // Validate input
    const MIN_WORD_LENGTH = 3;
    const MAX_WORD_LENGTH = 7;
    if (!Number.isInteger(wordLength) || wordLength < MIN_WORD_LENGTH || wordLength > MAX_WORD_LENGTH) {
        throw new Error(`Invalid word length - must be between ${MIN_WORD_LENGTH} and ${MAX_WORD_LENGTH}`);
    }

    // Write query string
    const filePath = `assets/json/wordbank-${wordLength}-letters.json`;

    // Fetch data
    try {
        const response = await fetch(filePath);

        if (!response.ok) {
            // Fetch request (was successful but) returned a HTTP error
            throw new Error(`HTTP error (status: ${response.status})`);
        }

        const data = await response.json();
        shuffleArray(data);  // Shuffles data (the array of words) in place
        return data;

    } catch (error) {
        // Includes network errors, JSON parsing errors, and runtime errors
        throw error;  // to be handled by the caller function
    }
}
```

In early stages of development, the function fetched words from the <a href="https://random-word-api.herokuapp.com/home" target="_blank" rel="noopener">Random Words API</a>. This API allows you to specify:
- the length of the words
- the language of the words
- how many words are returned

The results are returned as a randomly sorted array which is perfect for the use case here. However, due to significant periods of downtime, the obscurity of some of the words returned and the need for a blacklist, this turned out to not be an ideal solution.

The function now fetches the words from one of 5 JSON files which are stored within the **assets > json** directory. These files include a large array of words, each of a specified length, written in JSON format.

This approach overcame the difficulties that arose when using the Random Word API but the words were no longer returned in a random order. The `shuffleArray` function was used to randomise the order of these words before returning them.

## 2. Randomising the order of the words

The `shuffleArray` function uses a well known algorithm called the *Fisher-Yates (Knuth) Shuffle Algorithm*.

```js
// Code adapted from https://stackoverflow.com/questions/2450954/how-to-randomize-shuffle-a-javascript-array
function shuffleArray(arr) {
    for (let i = arr.length - 1; i >= 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
}
```

The algorithm works by looping through the array (in reverse order) and swapping that array item with an earlier item (or itself) which is chosen at random. This is a good approach because
1. **it ensures the array is truly random** - every possible arrangement of the array has the same probability 
2. **it is time efficient** - the time complexity is O(n) since the algorithm only makes one pass of the array
3. **it is space efficient** - the array is modified *in place* so no extra memory is required

***NOTE:*** *the above implementation of the algorithm uses destructuring assignment in order to swap the array items. This approach makes the swap operation more concise and readable while eliminating the need for an explicit temporary variable like in the equivalent code below:*
```js
let temp = arr[i];
arr[i] = arr[j];
arr[j] = temp;
```

## 3. Defining the grid criteria

Each grid of words involves intersecting characters between certain words. The positions of these intersecting characters depends on the size of the grid. For example, in the grids shown below:
- **5x5 grid:** the first character of the word in the middle column (INDIE) must match the **THIRD** character of the word in the top row (GRIEF)
- **7x7 grid:** the first character of the word in the middle column (PROTECT) must match the **FOURTH** character of the word in the top row (YAPPING)

![Example showing the need for different criteria for a 5x5 grid and a 7x7 grid](readme-images/grid-criteria-example.jpg)

In order to summarise the criteria for each grid:
- each word was assigned a word index between `0` and `n-1` (where `n` is the number of words in the grid)
- each character within the word is assigned a character index between `0` and `l-1` (where `l` is the length of the word)

When assigning each word an index, the rows were assigned first (top to bottom) and then the columns were assigned (left to right). This is illustrated in the image below.

![Example showing the order in which words are assigned an index](readme-images/grid-criteria-word-index.jpg)

A 2D array (called `criteria`) was used to summarise the criteria for each grid. Each array item consists of a 4 element array and takes the format as shown in the image below.

![Grid criteria array explained for a 5x5 grid](readme-images/grid-criteria-5x5.jpg)

Since the criteria changes depending on the grid size, the `getGridWordsCriteria` function is used to assign the relevant array to the `criteria` variable. Using a function (rather than one big object containing all of the arrays) was judged to be easier to understand, maintain and extend if needed.

```js
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
```

## 4. Finding words which meet the criteria

The `assignGridWords` function is responsible for finding a collection of words that meet the criteria for the grid. It uses **recursion** to perform a **depth-first search** until all grid words are assigned.

```js
function assignGridWords(words, gridWords, criteria, usedWords = new Set(), wordIndex = 0) {
    // Base case
    if (wordIndex >= gridWords.length) return { data: gridWords, success: true };

    // Recursive backtracking
    for (let word of words) {
        // Check word is not already used
        if (usedWords.has(word)) continue;
        
        // Provisionally add word
        gridWords[wordIndex] = word;
        usedWords.add(word);
        
        // Check word against criteria
        if (matchesCriteria(wordIndex, gridWords, criteria)) {
            // Recursive call
            const response = assignGridWords(words, gridWords, criteria, usedWords, wordIndex + 1);
            if (response.success) return response;
        }

        // Backtrack
        gridWords[wordIndex] = null;
        usedWords.delete(word);
    }

    // If reaches here, no valid word found for this position
    return { data: gridWords, success: false };
}
```

The function returns an object with the following properties:
- `success`: A boolean indicating whether the word was assigned successfully (i.e. passed the criteria checks)
- `data`: The updated `gridWords` array

Here is a detailed breakdown of how the function works...

### (a) Initial Call

The function is first called from the `newGame` function and takes the following parameters:
- `words`: The randomly shuffled array of words that was returned by the `fetchRandomWords` function (see step 1)
- `gridWords`: The array where the words meeting the criteria are stored
    - ***NOTE:*** *Before the function is first called, this array is initialised (by the `initialiseGridWords` function) as a null filled array with a length matching the number of words required by the grid.*
- `criteria`: The array specifying the criteria for the grid (see step 3)
- `usedWords`: A `set` containing words that have already been assigned in the `gridWords` array
    - ***NOTE:*** *This is not explicitly defined when first called by the newGame function but is assigned as an empty `set` by default.*
- `wordIndex`: The index for the word currently being assigned in the `gridWords` array
    - ***NOTE:*** *This is not explicitly defined when first called by the newGame function but is assigned a value of `0` by default. It also relates to the word index used in the `criteria` array.*

### (b) Base Case

As is common in recursive functions, the **base case** comes first. This ensures that the function returns immediately when a solution is found without making unnecessary recursive calls thus optimising performance.

The base case in this function involves checking whether all positions in `gridWords` have been filled. This will be the case when `wordIndex` exceeds the length of the `gridWords` array.
- If this is the case, the function returns a successful result.
- If not, the function will continue the search

### (c) Recursive Backtracking

The function loops through the words in the randomly shuffled `words` array and first checks whether the word is already included in the `gridWords` array. If so, the loop jumps to the next iteration (since we do not want to use the same word twice in the grid).

If the word is not already used, the word is provisionally added to the `gridWords` array and the `usedWords` set. The new state of the `gridWords` array is then tested to see if it meets the criteria for the grid. These checks are made by the `matchesCriteria` function (more details below).

If the new state of the `gridWords` array passes the checks, another recursive call is made to find the next word in the `gridWords` array. If it fails the checks, the word is removed again from the `gridWords` array and `usedWords` set (i.e. backtracked) before moving on to the next iteration.

### (d) Failure Case

If the last line of the function is reached, no valid word could be found at that depth of search and so the function returns a failure message (`success: false`) to the caller function which then continues the search by iterating to the next word.

If the failure message propagates all the way back to the `newGame` function itself (which made the initial call), the function has exhausted all possible variations of the words and no solution was found. ***NOTE:*** *this will never happen with the current words in the JSON files but it could if the list of words in these files was sufficiently small.*

### (e) Success Case

If the base case finds that the `gridWords` array has been completed, the function will immediately return the object with a success message.

```js
// Base case
if (wordIndex >= gridWords.length) return { data: gridWords, success: true };
```

Immediately following the recursive call, the state of the `success` property is checked and (if found to be true) the response is immediately propagated up to the caller function.

```js
// Recursive call
const response = assignGridWords(words, gridWords, criteria, usedWords, wordIndex + 1);
if (response.success) return response;
```

Therefore, once a solution is found, the recursion process is immediately halted and the function very quickly returns the solution to the function that made the initial call (without looking for other solutions). This ensures that the function is optimised and that the user is not waiting a long time for the grid to generate.

### (f) The `matchesCriteria` Function

The `matchesCriteria` function is responsible for checking whether the words in the `gridWords` array match the criteria specified for the grid in the `criteria` array.

The function takes the following parameters:
- `lastIndex`: The index of the most recently added word to the `gridWords` array
- `gridWords`: The current state of the `gridWords` array (including the provisionally added word)
- `criteria`: The `criteria` array for the specified grid

The function returns a boolean value:
- `true`: If the current state of `gridArray` passes all checks
- `false`: If the current state of `gridArray` fails one of the criteria in the `criteria` array

```js
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
```

The function loops through each item in the `criteria` array and first checks whether the criteria relates to the newly added word by checking if either word index matches `lastIndex`. This approach ensures that any irrelevant checks are skipped over and optimises the performance of the function.

It then checks that both words have been assigned a value in the `gridWords` array. This check is necessary because if a word later in the array has not yet been assigned, the first word has not yet been shown to be invalid.

The final check is to see if the criteria rule is broken by comparing the relevant characters in each word.

If all of these conditions are met, the current state of gridWords has failed to meet the criteria and so the function returns immediately with a value of `false`. This ensures that there are no unnecessary iterations and optimises the performance of the function.

If after iterating through all the criteria the function has not already been terminated, this means that the current state of `gridArray` has passed all the criteria checks and the function returns with a value of `true`.