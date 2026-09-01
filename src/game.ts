export type PlayerMark = "X" | "O";
export type CellValue = PlayerMark | null;
export type BoardWinner = PlayerMark | "draw" | null;

export interface SmallBoard {
  cells: CellValue[];
  winner: BoardWinner;
}

export interface MatchState {
  boards: SmallBoard[];
  currentPlayer: PlayerMark;
  activeBoardIndex: number | null;
  winner: BoardWinner;
  moveCount: number;
}

const WINNING_LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

const isBoardIndex = (index: number): boolean => Number.isInteger(index) && index >= 0 && index < 9;

const isPlayerMark = (value: unknown): value is PlayerMark => value === "X" || value === "O";

const isCellValue = (value: unknown): value is CellValue => value === null || isPlayerMark(value);

export const createEmptySmallBoard = (): SmallBoard => ({
  cells: Array<CellValue>(9).fill(null),
  winner: null,
});

export const createInitialMatch = (): MatchState => ({
  boards: Array.from({ length: 9 }, createEmptySmallBoard),
  currentPlayer: "X",
  activeBoardIndex: null,
  winner: null,
  moveCount: 0,
});

export const getWinningLine = (cells: CellValue[]): number[] | null => {
  for (const [a, b, c] of WINNING_LINES) {
    if (cells[a] && cells[a] === cells[b] && cells[a] === cells[c]) {
      return [a, b, c];
    }
  }

  return null;
};

export const getSmallBoardWinningLine = (board: SmallBoard): number[] | null => {
  if (board.winner !== "X" && board.winner !== "O") {
    return null;
  }

  return getWinningLine(board.cells);
};

export const getBoardWinner = (cells: CellValue[]): BoardWinner => {
  const winningLine = getWinningLine(cells);

  if (winningLine) {
    return cells[winningLine[0]];
  }

  return cells.every(Boolean) ? "draw" : null;
};

export const getPlayableBoards = (boards: SmallBoard[], activeBoardIndex: number | null): number[] => {
  if (activeBoardIndex !== null && isBoardIndex(activeBoardIndex) && boards[activeBoardIndex]?.winner === null) {
    return [activeBoardIndex];
  }

  return boards
    .map((board, index) => (board.winner === null ? index : -1))
    .filter((index) => index !== -1);
};

export const getMacroWinner = (boards: SmallBoard[]): BoardWinner => {
  const macroCells = boards.map((board) => (board.winner === "draw" ? null : board.winner));
  const winnerLine = getWinningLine(macroCells);

  if (winnerLine) {
    return macroCells[winnerLine[0]];
  }

  return boards.every((board) => board.winner !== null) ? "draw" : null;
};

export const getMacroWinningLine = (boards: SmallBoard[]): number[] | null => {
  const macroCells = boards.map((board) => (board.winner === "draw" ? null : board.winner));

  return getWinningLine(macroCells);
};

export const getNextActiveBoard = (boards: SmallBoard[], targetBoardIndex: number): number | null => {
  return isBoardIndex(targetBoardIndex) && boards[targetBoardIndex]?.winner === null ? targetBoardIndex : null;
};

export const isValidMatchState = (value: unknown): value is MatchState => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const match = value as MatchState;

  if (
    !Array.isArray(match.boards) ||
    match.boards.length !== 9 ||
    !isPlayerMark(match.currentPlayer) ||
    (match.activeBoardIndex !== null && !isBoardIndex(match.activeBoardIndex)) ||
    !Number.isSafeInteger(match.moveCount) ||
    match.moveCount < 0
  ) {
    return false;
  }

  if (
    !match.boards.every(
      (board) =>
        board &&
        Array.isArray(board.cells) &&
        board.cells.length === 9 &&
        board.cells.every(isCellValue) &&
        board.winner === getBoardWinner(board.cells)
    )
  ) {
    return false;
  }

  const moveCount = match.boards.flatMap((board) => board.cells).filter(Boolean).length;
  const xCount = match.boards.flatMap((board) => board.cells).filter((cell) => cell === "X").length;
  const oCount = moveCount - xCount;
  const macroWinner = getMacroWinner(match.boards);
  const lastPlayer = xCount === oCount ? "O" : "X";

  if (
    moveCount !== match.moveCount ||
    xCount < oCount ||
    xCount > oCount + 1 ||
    match.winner !== macroWinner ||
    (match.winner && match.currentPlayer !== lastPlayer) ||
    (!match.winner && match.currentPlayer !== (xCount === oCount ? "X" : "O"))
  ) {
    return false;
  }

  return match.activeBoardIndex === null || match.boards[match.activeBoardIndex].winner === null;
};

export const makeMove = (
  match: MatchState,
  boardIndex: number,
  cellIndex: number
): MatchState => {
  if (match.winner || !isBoardIndex(boardIndex) || !isBoardIndex(cellIndex)) {
    return match;
  }

  const playableBoards = getPlayableBoards(match.boards, match.activeBoardIndex);
  const board = match.boards[boardIndex];

  if (!board || !playableBoards.includes(boardIndex) || board.winner || board.cells[cellIndex]) {
    return match;
  }

  const updatedBoardCells = [...board.cells];
  updatedBoardCells[cellIndex] = match.currentPlayer;

  const updatedBoards = match.boards.map((currentBoard, currentIndex) =>
    currentIndex === boardIndex
      ? {
          cells: updatedBoardCells,
          winner: getBoardWinner(updatedBoardCells),
        }
      : currentBoard
  );

  const winner = getMacroWinner(updatedBoards);

  return {
    boards: updatedBoards,
    currentPlayer: winner ? match.currentPlayer : match.currentPlayer === "X" ? "O" : "X",
    activeBoardIndex: winner ? null : getNextActiveBoard(updatedBoards, cellIndex),
    winner,
    moveCount: match.moveCount + 1,
  };
};

export const getBoardLabel = (index: number): string => {
  const rows = ["superior", "central", "inferior"];
  const columns = ["esquerdo", "meio", "direito"];
  const row = Math.floor(index / 3);
  const column = index % 3;

  return `${rows[row]} ${columns[column]}`;
};
