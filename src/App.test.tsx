import { cleanup, fireEvent, render, screen, waitForElementToBeRemoved } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import App from "./App";

const STORAGE_KEY = "tic-tac-toe-supreme-state";

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

describe("App", () => {
  it("falls back to a new game when persisted state is malformed", () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ match: { boards: [] }, scoreboard: { X: "1" } }));

    render(<App />);

    expect(screen.getByRole("heading", { name: "Tic Tac Toe Supreme" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Começar partida" })).toBeInTheDocument();
  });

  it("keeps focus within the tutorial and restores it on close", async () => {
    render(<App />);
    const trigger = screen.getByRole("button", { name: "Ver tutorial" });

    fireEvent.click(trigger);

    expect(screen.getByRole("dialog", { name: "Meta-tabuleiro" })).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });

    await waitForElementToBeRemoved(() => screen.queryByRole("dialog"));
    expect(trigger).toHaveFocus();
  });
});
