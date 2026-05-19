const STORAGE_KEY = "sudoku-da-minha-diva-v1";
const SIDE = 9;
const BOX = 3;

const difficultyConfig = {
  easy: {
    label: "Fácil",
    removals: 38,
    message: "Fácil pra aquecer. Tá entregando, mana."
  },
  medium: {
    label: "Médio",
    removals: 48,
    message: "Médio escolhido. Babado, agora a diva vai brilhar."
  },
  hard: {
    label: "Difícil",
    removals: 54,
    message: "Difícil? Eita bebês. Mas a diva dá conta."
  }
};

const phrases = {
  correct: [
    "Arrasou",
    "Divou",
    "Foi tudo",
    "Tá entregando",
    "Isso foi muito diva",
    "Tá jogando fino, mana"
  ],
  wrong: [
    "Ah não, mana",
    "Melhore, diva",
    "Que fase",
    "Eita bebês",
    "Respira, mana. Esse número não foi tudo"
  ],
  unit: [
    "Foi tudo e mais um pouco",
    "A linha tá divando",
    "Babado, fechou uma parte linda",
    "A diva organizou esse cantinho"
  ],
  hint: [
    "Diquinha entregue com carinho",
    "Uma ajudinha pra diva continuar brilhando",
    "Babado: esse número veio salvar a fase"
  ],
  reset: [
    "Novo jogo, nova chance de divar",
    "Partida reiniciada. Tá entregando energia de vitória",
    "Foi tudo, agora vamos de tabuleiro novinho"
  ],
  clear: [
    "Limpou e seguiu plena",
    "Apagou sem drama, mana",
    "Essa casa precisava de um recomeço"
  ],
  check: [
    "Tá quase, mana. Ainda tem casinhas pra resolver",
    "Verificado: a diva segue no controle",
    "Tá jogando fino, mas ainda não acabou"
  ],
  win: [
    "A diva venceu",
    "Foi tudo e mais um pouco",
    "Arrasou do começo ao fim"
  ]
};

let state = createEmptyState();
let selectedCell = null;
let timerId = null;
let transientCell = null;
let highlightedMistakes = false;
let toastTimerId = null;

const boardElement = document.getElementById("sudokuBoard");
const numberPad = document.getElementById("numberPad");
const timerElement = document.getElementById("timer");
const errorsElement = document.getElementById("errors");
const messageElement = document.getElementById("gameMessage");
const difficultyControls = document.getElementById("difficultyControls");
const hintButton = document.getElementById("hintButton");
const checkButton = document.getElementById("checkButton");
const newGameButton = document.getElementById("newGameButton");
const clearButton = document.getElementById("clearButton");
const resumePanel = document.getElementById("resumePanel");
const continueGameButton = document.getElementById("continueGameButton");
const discardSaveButton = document.getElementById("discardSaveButton");
const progressText = document.getElementById("progressText");
const progressBar = document.getElementById("progressBar");
const victoryModal = document.getElementById("victoryModal");
const victoryMessage = document.getElementById("victoryMessage");
const playAgainButton = document.getElementById("playAgainButton");
const confettiLayer = document.getElementById("confettiLayer");
const mobileTimerElement = document.getElementById("mobileTimer");
const mobileErrorsElement = document.getElementById("mobileErrors");
const mobileDifficultySelect = document.getElementById("mobileDifficultySelect");
const mobileProgressBar = document.getElementById("mobileProgressBar");
const mobileActionBar = document.getElementById("mobileActionBar");
const mobileNewGameButton = document.getElementById("mobileNewGameButton");
const toastElement = document.getElementById("toastStack");

document.addEventListener("DOMContentLoaded", initGame);

function initGame() {
  prepareOptionalAssets();
  bindEvents();

  const savedGame = loadGame();
  if (savedGame) {
    state = savedGame;
    setMessage("Babado, mana: achei sua partida salva. Pode continuar de onde parou.");
    resumePanel.classList.remove("hidden");
    renderAll();
    startTimer();
    return;
  }

  startNewGame("easy");
}

function bindEvents() {
  boardElement.addEventListener("click", handleBoardClick);
  numberPad.addEventListener("click", handleNumberPadClick);
  difficultyControls.addEventListener("click", handleDifficultyClick);
  mobileActionBar.addEventListener("click", handleMobileActionClick);
  mobileNewGameButton.addEventListener("click", () => startNewGame(state.difficulty));
  mobileDifficultySelect.addEventListener("change", (event) => startNewGame(event.target.value));

  hintButton.addEventListener("click", giveHint);
  checkButton.addEventListener("click", verifyBoard);
  newGameButton.addEventListener("click", () => startNewGame(state.difficulty));
  clearButton.addEventListener("click", clearSelection);
  continueGameButton.addEventListener("click", continueSavedGame);
  discardSaveButton.addEventListener("click", () => startNewGame(state.difficulty || "easy"));
  playAgainButton.addEventListener("click", () => startNewGame(state.difficulty || "easy"));

  document.addEventListener("keydown", handleKeyboardInput);
  window.addEventListener("beforeunload", saveGame);
}

function createEmptyState() {
  return {
    solution: createEmptyBoard(),
    puzzle: createEmptyBoard(),
    board: createEmptyBoard(),
    fixed: createFixedMap(createEmptyBoard()),
    difficulty: "easy",
    errors: 0,
    elapsed: 0,
    completed: false
  };
}

function startNewGame(difficulty) {
  const chosenDifficulty = difficultyConfig[difficulty] ? difficulty : "easy";
  stopTimer();
  hideVictory();
  selectedCell = null;
  transientCell = null;
  highlightedMistakes = false;

  const solution = generateSolvedBoard();
  const puzzle = createPuzzle(solution, difficultyConfig[chosenDifficulty].removals);

  state = {
    solution,
    puzzle: cloneBoard(puzzle),
    board: cloneBoard(puzzle),
    fixed: createFixedMap(puzzle),
    difficulty: chosenDifficulty,
    errors: 0,
    elapsed: 0,
    completed: false
  };

  resumePanel.classList.add("hidden");
  setMessage(difficultyConfig[chosenDifficulty].message || randomPhrase(phrases.reset));
  renderAll();
  saveGame();
  startTimer();
}

function generateSolvedBoard() {
  const rows = shuffledGroups();
  const cols = shuffledGroups();
  const numbers = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  const board = createEmptyBoard();

  for (let row = 0; row < SIDE; row += 1) {
    for (let col = 0; col < SIDE; col += 1) {
      const valueIndex = pattern(rows[row], cols[col]);
      board[row][col] = numbers[valueIndex];
    }
  }

  return board;
}

function pattern(row, col) {
  return (BOX * (row % BOX) + Math.floor(row / BOX) + col) % SIDE;
}

function shuffledGroups() {
  const groups = shuffle([0, 1, 2]);
  const rows = [];
  groups.forEach((group) => {
    shuffle([0, 1, 2]).forEach((row) => rows.push(group * BOX + row));
  });
  return rows;
}

function createPuzzle(solution, targetRemovals) {
  const puzzle = cloneBoard(solution);
  const cells = shuffle([...Array(SIDE * SIDE).keys()]);
  let removed = 0;

  for (const index of cells) {
    if (removed >= targetRemovals) {
      break;
    }

    const row = Math.floor(index / SIDE);
    const col = index % SIDE;
    const backup = puzzle[row][col];
    puzzle[row][col] = 0;

    if (countSolutions(puzzle, 2) === 1) {
      removed += 1;
    } else {
      puzzle[row][col] = backup;
    }
  }

  return puzzle;
}

function countSolutions(board, limit) {
  const working = cloneBoard(board);
  let solutions = 0;

  function solve() {
    if (solutions >= limit) {
      return;
    }

    const empty = findMostConstrainedCell(working);
    if (!empty) {
      solutions += 1;
      return;
    }

    const candidates = getCandidates(working, empty.row, empty.col);
    for (const value of candidates) {
      working[empty.row][empty.col] = value;
      solve();
      working[empty.row][empty.col] = 0;
      if (solutions >= limit) {
        return;
      }
    }
  }

  solve();
  return solutions;
}

function findMostConstrainedCell(board) {
  let best = null;

  for (let row = 0; row < SIDE; row += 1) {
    for (let col = 0; col < SIDE; col += 1) {
      if (board[row][col] !== 0) {
        continue;
      }

      const candidates = getCandidates(board, row, col);
      if (candidates.length === 0) {
        return { row, col, candidates };
      }

      if (!best || candidates.length < best.candidates.length) {
        best = { row, col, candidates };
      }
    }
  }

  return best;
}

function getCandidates(board, row, col) {
  if (board[row][col] !== 0) {
    return [];
  }

  const used = new Set();
  for (let index = 0; index < SIDE; index += 1) {
    used.add(board[row][index]);
    used.add(board[index][col]);
  }

  const startRow = Math.floor(row / BOX) * BOX;
  const startCol = Math.floor(col / BOX) * BOX;
  for (let r = startRow; r < startRow + BOX; r += 1) {
    for (let c = startCol; c < startCol + BOX; c += 1) {
      used.add(board[r][c]);
    }
  }

  return shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9].filter((number) => !used.has(number)));
}

function renderAll() {
  renderBoard();
  renderStats();
  renderDifficulty();
  renderProgress();
  renderNumberPad();
}

function renderBoard() {
  const selectedValue = selectedCell ? state.board[selectedCell.row][selectedCell.col] : 0;
  const conflictCells = getAllConflictCells();
  const wrongCells = highlightedMistakes ? getWrongCells() : new Set();
  const fragment = document.createDocumentFragment();

  for (let row = 0; row < SIDE; row += 1) {
    for (let col = 0; col < SIDE; col += 1) {
      const value = state.board[row][col];
      const cell = document.createElement("button");
      const key = cellKey(row, col);
      const isSelected = selectedCell && selectedCell.row === row && selectedCell.col === col;
      const isRelated = selectedCell && isRelatedCell(row, col, selectedCell.row, selectedCell.col);
      const isSameNumber = value !== 0 && selectedValue !== 0 && value === selectedValue;

      cell.type = "button";
      cell.className = "cell";
      cell.dataset.row = String(row);
      cell.dataset.col = String(col);
      cell.textContent = value === 0 ? "" : String(value);
      cell.setAttribute("role", "gridcell");
      cell.setAttribute("aria-label", createCellLabel(row, col, value));

      if (state.fixed[row][col]) {
        cell.classList.add("fixed");
        cell.setAttribute("aria-readonly", "true");
      } else {
        cell.classList.add("editable");
      }

      if (col === 2 || col === 5) {
        cell.classList.add("block-right");
      }

      if (row === 2 || row === 5) {
        cell.classList.add("block-bottom");
      }

      if (isRelated) {
        cell.classList.add("related");
      }

      if (isSameNumber) {
        cell.classList.add("same-number");
      }

      if (isSelected) {
        cell.classList.add("selected");
        cell.setAttribute("aria-selected", "true");
      }

      if (conflictCells.has(key) || wrongCells.has(key)) {
        cell.classList.add("wrong");
      }

      if (transientCell === key) {
        cell.classList.add("correct-pop");
      }

      fragment.appendChild(cell);
    }
  }

  boardElement.replaceChildren(fragment);
  renderNumberPad();
}

function renderNumberPad() {
  if (!numberPad) {
    return;
  }

  const selectedValue = selectedCell ? state.board[selectedCell.row][selectedCell.col] : 0;
  numberPad.querySelectorAll("button[data-number]").forEach((button) => {
    const isActive = selectedValue !== 0 && Number(button.dataset.number) === selectedValue;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
}

function handleBoardClick(event) {
  const cell = event.target.closest(".cell");
  if (!cell) {
    return;
  }

  selectedCell = {
    row: Number(cell.dataset.row),
    col: Number(cell.dataset.col)
  };
  highlightedMistakes = false;
  renderBoard();
}

function handleNumberPadClick(event) {
  const button = event.target.closest("button[data-number]");
  if (!button) {
    return;
  }

  placeNumber(Number(button.dataset.number));
}

function handleKeyboardInput(event) {
  if (victoryModal && !victoryModal.classList.contains("hidden") && event.key === "Escape") {
    hideVictory();
    return;
  }

  if (!selectedCell) {
    return;
  }

  if (/^[1-9]$/.test(event.key)) {
    placeNumber(Number(event.key));
  }

  if (event.key === "Backspace" || event.key === "Delete" || event.key === "0") {
    clearSelection();
  }
}

function handleDifficultyClick(event) {
  const button = event.target.closest("button[data-difficulty]");
  if (!button) {
    return;
  }

  const difficulty = button.dataset.difficulty;
  startNewGame(difficulty);
}

function handleMobileActionClick(event) {
  const button = event.target.closest("button[data-mobile-action]");
  if (!button) {
    return;
  }

  const action = button.dataset.mobileAction;
  if (action === "clear") {
    clearSelection();
  }

  if (action === "hint") {
    giveHint();
  }

  if (action === "check") {
    verifyBoard();
  }

  if (action === "new") {
    startNewGame(state.difficulty);
  }
}

function placeNumber(number) {
  if (!selectedCell) {
    setMessage("Escolhe uma casinha primeiro, mana.");
    return;
  }

  const { row, col } = selectedCell;
  if (state.fixed[row][col] || state.completed) {
    setMessage("Essa casinha já veio pronta, diva.");
    return;
  }

  if (state.board[row][col] === number) {
    return;
  }

  state.board[row][col] = number;
  highlightedMistakes = false;
  transientCell = cellKey(row, col);

  const repeated = findRepeatedCells(row, col, number);
  const isCorrect = number === state.solution[row][col] && repeated.size === 0;

  if (isCorrect) {
    const completedMessage = getCompletedUnitMessage(row, col);
    setMessage(completedMessage || randomPhrase(phrases.correct));
    renderAll();
    saveGame();
    flashTransientCell();
    checkVictory();
    return;
  }

  state.errors += 1;
  const wrongMessage = repeated.size > 0
    ? "Ah não, mana. Esse número repetiu na linha, coluna ou bloquinho."
    : randomPhrase(phrases.wrong);
  setMessage(wrongMessage);
  renderAll();
  saveGame();
  flashTransientCell();
}

function clearSelection() {
  if (!selectedCell) {
    setMessage("Escolhe uma casinha pra limpar, diva.");
    return;
  }

  const { row, col } = selectedCell;
  if (state.fixed[row][col]) {
    setMessage("Essa casinha é fixa, mana.");
    return;
  }

  state.board[row][col] = 0;
  highlightedMistakes = false;
  transientCell = null;
  setMessage(randomPhrase(phrases.clear));
  renderAll();
  saveGame();
}

function giveHint() {
  if (state.completed) {
    return;
  }

  const target = findHintTarget();
  if (!target) {
    checkVictory();
    return;
  }

  selectedCell = target;
  state.board[target.row][target.col] = state.solution[target.row][target.col];
  transientCell = cellKey(target.row, target.col);
  highlightedMistakes = false;

  setMessage(randomPhrase(phrases.hint));
  renderAll();
  saveGame();
  flashTransientCell();
  checkVictory();
}

function findHintTarget() {
  if (
    selectedCell &&
    !state.fixed[selectedCell.row][selectedCell.col] &&
    state.board[selectedCell.row][selectedCell.col] !== state.solution[selectedCell.row][selectedCell.col]
  ) {
    return selectedCell;
  }

  for (let row = 0; row < SIDE; row += 1) {
    for (let col = 0; col < SIDE; col += 1) {
      if (!state.fixed[row][col] && state.board[row][col] !== state.solution[row][col]) {
        return { row, col };
      }
    }
  }

  return null;
}

function verifyBoard() {
  const emptyCount = countEmptyCells();
  const wrongCells = getWrongCells();
  const conflictCells = getAllConflictCells();

  highlightedMistakes = wrongCells.size > 0 || conflictCells.size > 0;
  renderBoard();

  if (emptyCount > 0) {
    setMessage(`${randomPhrase(phrases.check)} Faltam ${emptyCount} casinhas.`);
    return;
  }

  if (wrongCells.size > 0 || conflictCells.size > 0) {
    state.errors += 1;
    renderStats();
    saveGame();
    setMessage("Que fase, mana. Tem número fora do babado certo.");
    return;
  }

  checkVictory();
}

function checkVictory() {
  if (!isBoardComplete() || !isBoardSolved()) {
    return false;
  }

  state.completed = true;
  stopTimer();
  localStorage.removeItem(STORAGE_KEY);
  setMessage("A diva venceu. Foi tudo e mais um pouco.");
  renderAll();
  showVictory();
  return true;
}

function isBoardComplete() {
  return state.board.every((row) => row.every((value) => value !== 0));
}

function isBoardSolved() {
  for (let row = 0; row < SIDE; row += 1) {
    for (let col = 0; col < SIDE; col += 1) {
      if (state.board[row][col] !== state.solution[row][col]) {
        return false;
      }
    }
  }

  return true;
}

function getCompletedUnitMessage(row, col) {
  const rowComplete = state.board[row].every((value, index) => value === state.solution[row][index]);
  const colComplete = state.board.every((line, index) => line[col] === state.solution[index][col]);
  const blockComplete = isBlockComplete(row, col);

  if (rowComplete || colComplete || blockComplete) {
    return randomPhrase(phrases.unit);
  }

  return "";
}

function isBlockComplete(row, col) {
  const startRow = Math.floor(row / BOX) * BOX;
  const startCol = Math.floor(col / BOX) * BOX;

  for (let r = startRow; r < startRow + BOX; r += 1) {
    for (let c = startCol; c < startCol + BOX; c += 1) {
      if (state.board[r][c] !== state.solution[r][c]) {
        return false;
      }
    }
  }

  return true;
}

function findRepeatedCells(row, col, value) {
  const conflicts = new Set();
  if (value === 0) {
    return conflicts;
  }

  for (let index = 0; index < SIDE; index += 1) {
    if (index !== col && state.board[row][index] === value) {
      conflicts.add(cellKey(row, index));
      conflicts.add(cellKey(row, col));
    }

    if (index !== row && state.board[index][col] === value) {
      conflicts.add(cellKey(index, col));
      conflicts.add(cellKey(row, col));
    }
  }

  const startRow = Math.floor(row / BOX) * BOX;
  const startCol = Math.floor(col / BOX) * BOX;
  for (let r = startRow; r < startRow + BOX; r += 1) {
    for (let c = startCol; c < startCol + BOX; c += 1) {
      if ((r !== row || c !== col) && state.board[r][c] === value) {
        conflicts.add(cellKey(r, c));
        conflicts.add(cellKey(row, col));
      }
    }
  }

  return conflicts;
}

function getAllConflictCells() {
  const conflicts = new Set();

  for (let row = 0; row < SIDE; row += 1) {
    for (let col = 0; col < SIDE; col += 1) {
      const value = state.board[row][col];
      if (value !== 0) {
        findRepeatedCells(row, col, value).forEach((key) => conflicts.add(key));
      }
    }
  }

  return conflicts;
}

function getWrongCells() {
  const wrongCells = new Set();

  for (let row = 0; row < SIDE; row += 1) {
    for (let col = 0; col < SIDE; col += 1) {
      if (!state.fixed[row][col] && state.board[row][col] !== 0 && state.board[row][col] !== state.solution[row][col]) {
        wrongCells.add(cellKey(row, col));
      }
    }
  }

  return wrongCells;
}

function renderStats() {
  const formattedTime = formatTime(state.elapsed);
  const errors = String(state.errors);
  timerElement.textContent = formattedTime;
  errorsElement.textContent = errors;
  mobileTimerElement.textContent = formattedTime;
  mobileErrorsElement.textContent = errors;
}

function renderDifficulty() {
  difficultyControls.querySelectorAll("button[data-difficulty]").forEach((button) => {
    const active = button.dataset.difficulty === state.difficulty;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  mobileDifficultySelect.value = state.difficulty;
}

function renderProgress() {
  const filled = SIDE * SIDE - countEmptyCells();
  const percent = Math.round((filled / (SIDE * SIDE)) * 100);
  progressText.textContent = `${filled}/81`;
  progressBar.style.width = `${percent}%`;
  mobileProgressBar.style.width = `${percent}%`;
}

function countEmptyCells() {
  let empty = 0;
  for (let row = 0; row < SIDE; row += 1) {
    for (let col = 0; col < SIDE; col += 1) {
      if (state.board[row][col] === 0) {
        empty += 1;
      }
    }
  }
  return empty;
}

function startTimer() {
  stopTimer();
  timerId = window.setInterval(() => {
    if (!state.completed) {
      state.elapsed += 1;
      renderStats();
      saveGame();
    }
  }, 1000);
}

function stopTimer() {
  if (timerId) {
    window.clearInterval(timerId);
    timerId = null;
  }
}

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
}

function saveGame() {
  if (!state || state.completed) {
    return;
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn("Não foi possível salvar a partida.", error);
  }
}

function loadGame() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const saved = JSON.parse(raw);
    if (!isValidSavedGame(saved)) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }

    return saved;
  } catch (error) {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

function isValidSavedGame(saved) {
  return (
    saved &&
    isBoardShape(saved.solution) &&
    isBoardShape(saved.puzzle) &&
    isBoardShape(saved.board) &&
    isFixedShape(saved.fixed) &&
    difficultyConfig[saved.difficulty] &&
    Number.isInteger(saved.errors) &&
    Number.isInteger(saved.elapsed)
  );
}

function continueSavedGame() {
  resumePanel.classList.add("hidden");
  setMessage("Continuando do jeitinho que a diva deixou.");
}

function prepareOptionalAssets() {
  document.querySelectorAll("[data-asset-slot]").forEach((slot) => {
    const fileName = slot.dataset.assetSlot;
    const altText = slot.dataset.assetAlt || "";
    const image = new Image();
    image.onload = () => {
      const visibleImage = document.createElement("img");
      visibleImage.src = image.src;
      visibleImage.alt = altText;
      slot.prepend(visibleImage);
      slot.classList.add("has-image");
    };
    image.src = `assets/${fileName}`;
  });

  const pattern = new Image();
  pattern.onload = () => {
    document.body.classList.add("has-pattern");
    document.body.style.setProperty("--pattern-image", `url("assets/background-pattern.png")`);
  };
  pattern.src = "assets/background-pattern.png";
}

function showVictory() {
  const finalPhrase = randomPhrase(phrases.win);
  victoryMessage.textContent = `${finalPhrase}. Você terminou em ${formatTime(state.elapsed)} com ${state.errors} erro(s). Foi tudo.`;
  victoryModal.classList.remove("hidden");
  createConfetti();
}

function hideVictory() {
  victoryModal.classList.add("hidden");
  confettiLayer.replaceChildren();
}

function createConfetti() {
  confettiLayer.replaceChildren();
  const symbols = ["♡", "✦", "✧", "•"];
  const colors = ["#ff5fa2", "#ff8fc7", "#e7d6ff", "#fff1a8", "#b9f2de"];

  for (let index = 0; index < 90; index += 1) {
    const piece = document.createElement("span");
    piece.className = "confetti";
    piece.textContent = symbols[index % symbols.length];
    piece.style.setProperty("--x", `${Math.random() * 100}%`);
    piece.style.setProperty("--c", colors[index % colors.length]);
    piece.style.setProperty("--s", `${14 + Math.random() * 18}px`);
    piece.style.setProperty("--d", `${2.4 + Math.random() * 2.8}s`);
    piece.style.setProperty("--drift", `${-120 + Math.random() * 240}px`);
    confettiLayer.appendChild(piece);
  }
}

function setMessage(message) {
  messageElement.textContent = message;
  showToast(message);
}

function showToast(message) {
  if (!toastElement) {
    return;
  }

  toastElement.textContent = message;
  toastElement.classList.add("show");

  if (toastTimerId) {
    window.clearTimeout(toastTimerId);
  }

  toastTimerId = window.setTimeout(() => {
    toastElement.classList.remove("show");
  }, 2600);
}

function flashTransientCell() {
  window.setTimeout(() => {
    transientCell = null;
    renderBoard();
  }, 380);
}

function isRelatedCell(row, col, selectedRow, selectedCol) {
  return (
    row === selectedRow ||
    col === selectedCol ||
    (Math.floor(row / BOX) === Math.floor(selectedRow / BOX) && Math.floor(col / BOX) === Math.floor(selectedCol / BOX))
  );
}

function createCellLabel(row, col, value) {
  const content = value === 0 ? "vazia" : `com número ${value}`;
  const fixed = state.fixed[row][col] ? "fixa" : "editável";
  return `Linha ${row + 1}, coluna ${col + 1}, ${content}, ${fixed}`;
}

function createEmptyBoard() {
  return Array.from({ length: SIDE }, () => Array(SIDE).fill(0));
}

function createFixedMap(board) {
  return board.map((row) => row.map((value) => value !== 0));
}

function cloneBoard(board) {
  return board.map((row) => [...row]);
}

function isBoardShape(board) {
  return (
    Array.isArray(board) &&
    board.length === SIDE &&
    board.every(
      (row) =>
        Array.isArray(row) &&
        row.length === SIDE &&
        row.every((value) => Number.isInteger(value) && value >= 0 && value <= 9)
    )
  );
}

function isFixedShape(fixed) {
  return (
    Array.isArray(fixed) &&
    fixed.length === SIDE &&
    fixed.every(
      (row) =>
        Array.isArray(row) &&
        row.length === SIDE &&
        row.every((value) => typeof value === "boolean")
    )
  );
}

function shuffle(array) {
  const copy = [...array];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[randomIndex]] = [copy[randomIndex], copy[index]];
  }
  return copy;
}

function randomPhrase(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function cellKey(row, col) {
  return `${row}-${col}`;
}
