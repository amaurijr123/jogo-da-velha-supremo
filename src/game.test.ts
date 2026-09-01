import { describe, expect, it } from "vitest";
import { getAiMove } from "./ai";
import {
  MatchState,
  SmallBoard,
  createEmptySmallBoard,
  createInitialMatch,
  getBoardWinner,
  getMacroWinner,
  isValidMatchState,
  makeMove,
} from "./game";

const wonByX = (): SmallBoard => ({
  cells: ["X", "X", "X", null, null, null, null, null, null],
  winner: "X",
});

describe("game rules", () => {
  it("routes the next player to the selected cell's board", () => {
    const nextMatch = makeMove(createInitialMatch(), 4, 2);

    expect(nextMatch.currentPlayer).toBe("O");
    expect(nextMatch.activeBoardIndex).toBe(2);
    expect(nextMatch.boards[4].cells[2]).toBe("X");
  });

  it("allows any open board when the destination is closed", () => {
    const match = createInitialMatch();
    match.boards[4] = wonByX();
    match.activeBoardIndex = 0;

    const nextMatch = makeMove(match, 0, 4);

    expect(nextMatch.activeBoardIndex).toBeNull();
  });

  it("rejects coordinates outside the board without changing the match", () => {
    const match = createInitialMatch();

    expect(makeMove(match, -1, 0)).toBe(match);
    expect(makeMove(match, 0, 9)).toBe(match);
    expect(makeMove(match, 1.5, 0)).toBe(match);
  });

  it("recognizes draws and macro-board victories", () => {
    expect(getBoardWinner(["X", "O", "X", "X", "O", "O", "O", "X", "X"])).toBe("draw");

    const boards = Array.from({ length: 9 }, createEmptySmallBoard);
    boards[0] = wonByX();
    boards[1] = wonByX();
    boards[2] = wonByX();

    expect(getMacroWinner(boards)).toBe("X");
  });

  it("accepts only coherent persisted matches", () => {
    const validMatch = createInitialMatch();
    const invalidMatch = { ...validMatch, moveCount: 3 } as MatchState;

    expect(isValidMatchState(validMatch)).toBe(true);
    expect(isValidMatchState(invalidMatch)).toBe(false);
    expect(isValidMatchState({ boards: [] })).toBe(false);
  });
});

describe("AI", () => {
  it("only returns a legal move in the forced board", () => {
    const match = makeMove(createInitialMatch(), 4, 0);
    const move = getAiMove(match, "O", "hard");

    expect(move).not.toBeNull();
    expect(move?.boardIndex).toBe(0);
    expect(match.boards[move?.boardIndex ?? 0].cells[move?.cellIndex ?? 0]).toBeNull();
  });
});
