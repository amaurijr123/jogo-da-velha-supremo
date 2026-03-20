import { MatchState, PlayerMark, SmallBoard, getPlayableBoards, makeMove } from "./game";

export type AiDifficulty = "easy" | "medium" | "hard";

interface MoveOption {
  boardIndex: number;
  cellIndex: number;
}

const CELL_WEIGHTS = [3, 4, 3, 4, 6, 4, 3, 4, 3];
const MACRO_LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

const getOpponent = (player: PlayerMark): PlayerMark => (player === "X" ? "O" : "X");

const getLegalMoves = (match: MatchState): MoveOption[] => {
  const playableBoards = getPlayableBoards(match.boards, match.activeBoardIndex);

  return playableBoards.flatMap((boardIndex) =>
    match.boards[boardIndex].cells.flatMap((cell, cellIndex) => (cell === null ? [{ boardIndex, cellIndex }] : []))
  );
};

const shuffleMoves = (moves: MoveOption[]): MoveOption[] => {
  const nextMoves = [...moves];

  for (let index = nextMoves.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [nextMoves[index], nextMoves[randomIndex]] = [nextMoves[randomIndex], nextMoves[index]];
  }

  return nextMoves;
};

const countBoardControlPotential = (boards: SmallBoard[], player: PlayerMark): number => {
  const macroCells = boards.map((board) => (board.winner === "draw" ? null : board.winner));

  return MACRO_LINES.reduce((score, line) => {
    const values = line.map((index) => macroCells[index]);
    const playerCount = values.filter((value) => value === player).length;
    const opponentCount = values.filter((value) => value === getOpponent(player)).length;

    if (opponentCount > 0) {
      return score;
    }

    return score + playerCount * playerCount * 14;
  }, 0);
};

const countSmallBoardPressure = (board: SmallBoard, player: PlayerMark): number => {
  if (board.winner === player) {
    return 24;
  }

  if (board.winner === getOpponent(player)) {
    return -20;
  }

  if (board.winner === "draw") {
    return 0;
  }

  return board.cells.reduce((score, cell, index) => {
    if (cell === player) {
      return score + CELL_WEIGHTS[index];
    }

    if (cell === getOpponent(player)) {
      return score - CELL_WEIGHTS[index] * 0.75;
    }

    return score;
  }, 0);
};

const evaluateMove = (match: MatchState, move: MoveOption, player: PlayerMark): number => {
  const opponent = getOpponent(player);
  const nextMatch = makeMove(match, move.boardIndex, move.cellIndex);

  if (nextMatch.winner === player) {
    return 1_000_000;
  }

  if (nextMatch.winner === opponent) {
    return -1_000_000;
  }

  let score = 0;
  const originalBoard = match.boards[move.boardIndex];
  const updatedBoard = nextMatch.boards[move.boardIndex];

  if (updatedBoard.winner === player && originalBoard.winner !== player) {
    score += 500;
  }

  if (move.cellIndex === 4) {
    score += 22;
  } else if ([0, 2, 6, 8].includes(move.cellIndex)) {
    score += 12;
  }

  if (nextMatch.activeBoardIndex === null) {
    score += 16;
  } else {
    const redirectedBoard = nextMatch.boards[nextMatch.activeBoardIndex];

    if (redirectedBoard.winner === player) {
      score += 18;
    }

    if (redirectedBoard.cells[4] === opponent) {
      score += 8;
    }
  }

  score += countBoardControlPotential(nextMatch.boards, player);
  score -= countBoardControlPotential(nextMatch.boards, opponent) * 0.8;
  score += nextMatch.boards.reduce((total, board) => total + countSmallBoardPressure(board, player), 0);

  const opponentResponses = getLegalMoves(nextMatch);

  for (const response of opponentResponses) {
    const opponentMatch = makeMove(nextMatch, response.boardIndex, response.cellIndex);

    if (opponentMatch.winner === opponent) {
      score -= 9000;
    }

    const beforeBoard = nextMatch.boards[response.boardIndex];
    const afterBoard = opponentMatch.boards[response.boardIndex];

    if (afterBoard.winner === opponent && beforeBoard.winner !== opponent) {
      score -= 220;
    }
  }

  return score;
};

export const getBestAiMove = (match: MatchState, player: PlayerMark): MoveOption | null => {
  const legalMoves = getLegalMoves(match);

  if (legalMoves.length === 0) {
    return null;
  }

  let bestMove = legalMoves[0];
  let bestScore = Number.NEGATIVE_INFINITY;

  for (const move of legalMoves) {
    const score = evaluateMove(match, move, player);

    if (score > bestScore) {
      bestMove = move;
      bestScore = score;
    }
  }

  return bestMove;
};

export const getAiMove = (match: MatchState, player: PlayerMark, difficulty: AiDifficulty): MoveOption | null => {
  const legalMoves = getLegalMoves(match);

  if (legalMoves.length === 0) {
    return null;
  }

  const rankedMoves = legalMoves.map((move) => ({ move, score: evaluateMove(match, move, player) }));
  rankedMoves.sort((left, right) => right.score - left.score);

  if (difficulty === "hard") {
    return rankedMoves[0]?.move ?? null;
  }

  if (difficulty === "medium") {
    const candidateMoves = rankedMoves.slice(0, Math.min(3, rankedMoves.length));
    const randomizedCandidates = shuffleMoves(candidateMoves.map((entry) => entry.move));

    return (Math.random() < 0.7 ? randomizedCandidates[0] : randomizedCandidates[randomizedCandidates.length - 1]) ?? null;
  }

  const tacticalMove = rankedMoves.find((entry) => entry.score >= 500 || entry.score <= -9000);

  if (tacticalMove && Math.random() < 0.45) {
    return tacticalMove.move;
  }

  return shuffleMoves(legalMoves)[0] ?? null;
};
