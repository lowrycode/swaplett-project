# Swaplett

Swaplett is a word puzzle game where players complete a grid of words by swapping letters into their correct positions. Letters can be moved by dragging them with a mouse or finger (on touch-screen devices). To win the game, players have to complete the grid within 15 swaps.

The project uses two third-party APIs:
- <a href="https://random-word-api.herokuapp.com/home" target="_blank" rel="noopener">**Random Word API**</a> - to fetch a specified number of random words with the correct word length
- <a href="https://dictionaryapi.dev/" target="_blank" rel="noopener">**Free Dictionary API**</a> - to fetch information about the words such as meanings and links to pronounciation audio clips

You can visit the deployed website <a href="https://lowrycode.github.io/swaplett-project/" target="_blank" rel="noopener">**here**</a>.
 
![Swaplett Responsive Design](readme-images/responsive.jpg)

# Project Planning

The [**Project Planning**](project_planning.md) document outlines my personal goals for the project as well as the pseudo code for the JavaScript functionality.

# User Experience (UX) Design

## Responsive Design

The website was developed using a mobile-first approach, ensuring an optimized experience for mobile users before adapting to larger screens. This applies to functionality (e.g. touch events for dragging letters across the grid), layout (using Flexbox), and sizing (using relative units like rem, %, and vh). The custom .container class, combined with media queries, keeps content centered and prevents it from stretching too wide on larger screens.

Wireframes were produced using <a href="https://balsamiq.com/" target="_blank" rel="noopener">**Balsamiq**</a> at the earliest stages of planning to ensure that the webpage had a good layout on different devices.

![Wireframe for initial page load](readme-images/wire-frame-initial-page-load.jpg)
![Wireframe for normal game play](readme-images/wire-frame-normal-game-play.jpg)
![Wireframe for end of game](readme-images/wire-frame-finished-game.jpg)
![Wireframe for definitions](readme-images/wire-frame-scroll-down.jpg)
![Wireframe for instructions modal](readme-images/wire-frame-instructions-modal.jpg)
![Wireframe for alert modal](readme-images/wire-frame-alert-modal.jpg)

## User Interaction Design

The following features aim to ensure an enjoyable user experience when interacting with the site:

- **Intuitive Design** - icons use standard conventions (e.g. a toggle switch for dark-mode, a question mark icon for instructions), "X" button for closing modals (positioned in top right), placeholder instructions on game-board (shown on initial page load)
- **Text Legibility** - legible font (sans-serif), suitable text size and spacing, good colour contrast between text and background
- **Consistent Style** - similar elements look and behave in a similar way, e.g. colour themes for clickable buttons, hyperlinked text, select boxes, modals
- **User Feedback** - hover effects (e.g. colour changes, tooltips, mouse cursor changes) to show interactive elements, in-game feedback (colour of grid cells, count of remaining swaps), end of game feedback (win / lose message displayed), elements in focus show outline (e.g. when using tab key to cycle through elements)
- **Transition Effects** - Smooth transitions for hover events and toggling dark mode colour theme

## Accessibility

The webpage is primarily designed for touch screen devices and so draggable elements can be moved using finger swipes. However, mouse drag-and-drop events are also supported for those accessing the website from a laptop / desktop computer.

The following features are included to assist screen readers:
- **Semantic HTML**
- **Form labels** are associated with inputs (though these are visibly hidden from the screen)
- **Alt text** is used to describe images
- **Aria-labels** are used for buttons, icons and checkboxes (e.g. buttons for playing audio clips or closing modals, checkbox  close modal buttons, dark-mode toggle switch)
- **Aria-labelledby** attributes are used for identifying the relevant modal (instructions or alert)
- **Aria-checked** attribute is used on toggle switch to indicate whether dark-mode is activated
- **Aria-hidden** for elements that are only used for aesthetics (e.g. icons) or for hidden functionality (e.g. audio elements)

