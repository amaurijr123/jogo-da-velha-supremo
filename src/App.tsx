import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AiDifficulty, getAiMove } from "./ai";
import { playBoardWinSound, playMatchEndSound, playMoveSound } from "./audio";
import {
  BoardWinner,
  MatchState,
  PlayerMark,
  createInitialMatch,
  getBoardLabel,
  getMacroWinningLine,
  getPlayableBoards,
  getSmallBoardWinningLine,
  makeMove,
} from "./game";
import "./index.css";

type Players = Record<PlayerMark, string>;
type Scoreboard = Record<PlayerMark, number> & { draws: number };

interface TutorialStep {
  title: string;
  description: string;
}

interface PersistedState {
  players: Players;
  draftPlayers: Players;
  match: MatchState;
  scoreboard: Scoreboard;
  isPlaying: boolean;
  gameMode: GameMode;
  humanMark: PlayerMark;
  aiDifficulty: AiDifficulty;
}

interface InitialAppState {
  players: Players;
  draftPlayers: Players;
  match: MatchState;
  scoreboard: Scoreboard;
  isPlaying: boolean;
  gameMode: GameMode;
  humanMark: PlayerMark;
  aiDifficulty: AiDifficulty;
}

type GameMode = "pvp" | "ai";

const defaultPlayers: Players = {
  X: "Jogador X",
  O: "Jogador O",
};

const cpuName = "CPU Supreme";

const initialScoreboard: Scoreboard = {
  X: 0,
  O: 0,
  draws: 0,
};

const STORAGE_KEY = "tic-tac-toe-supreme-state";

const getDefaultAppState = (): InitialAppState => ({
  players: defaultPlayers,
  draftPlayers: defaultPlayers,
  match: createInitialMatch(),
  scoreboard: initialScoreboard,
  isPlaying: false,
  gameMode: "pvp",
  humanMark: "X",
  aiDifficulty: "medium",
});

const loadPersistedState = (): InitialAppState => {
  if (typeof window === "undefined") {
    return getDefaultAppState();
  }

  try {
    const savedState = window.localStorage.getItem(STORAGE_KEY);

    if (!savedState) {
      return getDefaultAppState();
    }

    const parsedState = JSON.parse(savedState) as Partial<PersistedState>;
    const defaults = getDefaultAppState();

    return {
      players: parsedState.players ?? defaults.players,
      draftPlayers: parsedState.draftPlayers ?? parsedState.players ?? defaults.draftPlayers,
      match: parsedState.match ?? defaults.match,
      scoreboard: parsedState.scoreboard ?? defaults.scoreboard,
      isPlaying: parsedState.isPlaying ?? defaults.isPlaying,
      gameMode: parsedState.gameMode ?? defaults.gameMode,
      humanMark: parsedState.humanMark ?? defaults.humanMark,
      aiDifficulty: parsedState.aiDifficulty ?? defaults.aiDifficulty,
    };
  } catch (_error) {
    window.localStorage.removeItem(STORAGE_KEY);
    return getDefaultAppState();
  }
};

const tutorialSteps: TutorialStep[] = [
  {
    title: "Meta-tabuleiro",
    description:
      "O tabuleiro grande tem 9 mini-tabuleiros. Para vencer a partida, voce precisa conquistar 3 mini-tabuleiros em linha no grid principal.",
  },
  {
    title: "Como jogar uma rodada",
    description:
      "Cada mini-tabuleiro funciona como um jogo da velha normal. Quando voce vence um deles, aquela casa passa a valer para o tabuleiro principal.",
  },
  {
    title: "Regra de redirecionamento",
    description:
      "A casa escolhida dentro do mini-tabuleiro envia o adversario para o mini-tabuleiro correspondente na rodada seguinte.",
  },
  {
    title: "Quando o destino esta fechado",
    description:
      "Se o mini-tabuleiro de destino ja estiver vencido ou cheio, o proximo jogador pode agir em qualquer mini-tabuleiro ainda aberto.",
  },
  {
    title: "Lendo a interface",
    description:
      "O topo do tabuleiro mostra turno, alvo atual e empates. O painel flutuante traz placar, controles da rodada e tela cheia.",
  },
];

const MotionSection = motion.section;
const MotionButton = motion.button;

function App() {
  const initialStateRef = useRef<InitialAppState>(loadPersistedState());
  const [players, setPlayers] = useState<Players>(initialStateRef.current.players);
  const [draftPlayers, setDraftPlayers] = useState<Players>(initialStateRef.current.draftPlayers);
  const [match, setMatch] = useState<MatchState>(initialStateRef.current.match);
  const [isPlaying, setIsPlaying] = useState(initialStateRef.current.isPlaying);
  const [scoreboard, setScoreboard] = useState<Scoreboard>(initialStateRef.current.scoreboard);
  const [gameMode, setGameMode] = useState<GameMode>(initialStateRef.current.gameMode);
  const [humanMark, setHumanMark] = useState<PlayerMark>(initialStateRef.current.humanMark);
  const [aiDifficulty, setAiDifficulty] = useState<AiDifficulty>(initialStateRef.current.aiDifficulty);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);
  const [tutorialStepIndex, setTutorialStepIndex] = useState(0);
  const previousMoveCountRef = useRef(initialStateRef.current.match.moveCount);
  const previousWinnerRef = useRef<BoardWinner>(initialStateRef.current.match.winner);
  const previousBoardWinnersRef = useRef<BoardWinner[]>(
    initialStateRef.current.match.boards.map((board) => board.winner)
  );
  const hasHydratedRef = useRef(false);

  const playableBoards = useMemo(
    () => getPlayableBoards(match.boards, match.activeBoardIndex),
    [match.activeBoardIndex, match.boards]
  );
  const macroWinningLine = useMemo(() => getMacroWinningLine(match.boards), [match.boards]);
  const aiMark = gameMode === "ai" ? (humanMark === "X" ? "O" : "X") : null;
  const isAiTurn = isPlaying && gameMode === "ai" && aiMark === match.currentPlayer && !match.winner;

  const currentPlayerName = players[match.currentPlayer];
  const activeBoardLabel =
    match.activeBoardIndex === null ? "qualquer mini-tabuleiro livre" : getBoardLabel(match.activeBoardIndex);
  const currentTutorialStep = tutorialSteps[tutorialStepIndex];

  useEffect(() => {
    const updateViewportHeight = () => {
      document.documentElement.style.setProperty("--app-height", `${window.innerHeight}px`);
    };

    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
      updateViewportHeight();
    };

    updateViewportHeight();
    window.addEventListener("resize", updateViewportHeight);
    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      window.removeEventListener("resize", updateViewportHeight);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  useEffect(() => {
    hasHydratedRef.current = true;
  }, []);

  useEffect(() => {
    if (!hasHydratedRef.current || typeof window === "undefined") {
      return;
    }

    const stateToPersist: PersistedState = {
      players,
      draftPlayers,
      match,
      scoreboard,
      isPlaying,
      gameMode,
      humanMark,
      aiDifficulty,
    };

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToPersist));
  }, [aiDifficulty, draftPlayers, gameMode, humanMark, isPlaying, match, players, scoreboard]);

  useEffect(() => {
    if (!isAiTurn || !aiMark) {
      setIsAiThinking(false);
      return;
    }

    setIsAiThinking(true);

    const thinkingDelay = aiDifficulty === "easy" ? 360 : aiDifficulty === "medium" ? 560 : 760;

    const timeoutId = window.setTimeout(() => {
      setMatch((currentMatch) => {
        const nextMove = getAiMove(currentMatch, aiMark, aiDifficulty);

        if (!nextMove) {
          return currentMatch;
        }

        return makeMove(currentMatch, nextMove.boardIndex, nextMove.cellIndex);
      });

      setIsAiThinking(false);
    }, thinkingDelay);

    return () => {
      window.clearTimeout(timeoutId);
      setIsAiThinking(false);
    };
  }, [aiDifficulty, aiMark, isAiTurn]);

  useEffect(() => {
    if (!hasHydratedRef.current) {
      return;
    }

    if (match.moveCount > previousMoveCountRef.current) {
      const lastPlayer = match.currentPlayer === "X" ? "O" : "X";
      playMoveSound(lastPlayer);
      previousMoveCountRef.current = match.moveCount;
    }
  }, [match.currentPlayer, match.moveCount]);

  useEffect(() => {
    if (!hasHydratedRef.current) {
      return;
    }

    match.boards.forEach((board, index) => {
      const previousWinner = previousBoardWinnersRef.current[index];

      if (!previousWinner && (board.winner === "X" || board.winner === "O")) {
        playBoardWinSound(board.winner);
      }
    });

    previousBoardWinnersRef.current = match.boards.map((board) => board.winner);
  }, [match.boards]);

  useEffect(() => {
    if (!hasHydratedRef.current) {
      return;
    }

    if (match.winner && previousWinnerRef.current !== match.winner) {
      playMatchEndSound(match.winner);
      setScoreboard((current) => {
        if (match.winner === "draw") {
          return { ...current, draws: current.draws + 1 };
        }

        if (match.winner !== "X" && match.winner !== "O") {
          return current;
        }

        const winningPlayer = match.winner;

        return { ...current, [winningPlayer]: current[winningPlayer] + 1 };
      });
    }

    previousWinnerRef.current = match.winner;
  }, [match.winner]);

  const syncRoundRefs = (nextMatch: MatchState) => {
    previousMoveCountRef.current = nextMatch.moveCount;
    previousWinnerRef.current = nextMatch.winner;
    previousBoardWinnersRef.current = nextMatch.boards.map((board) => board.winner);
  };

  const handleStart = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextMatch = createInitialMatch();
    const resolvedXName =
      gameMode === "ai" && humanMark === "O" ? cpuName : draftPlayers.X.trim() || defaultPlayers.X;
    const resolvedOName =
      gameMode === "ai" && humanMark === "X" ? cpuName : draftPlayers.O.trim() || defaultPlayers.O;

    setPlayers({
      X: resolvedXName,
      O: resolvedOName,
    });
    setDraftPlayers({
      X: gameMode === "ai" && humanMark === "O" ? cpuName : draftPlayers.X,
      O: gameMode === "ai" && humanMark === "X" ? cpuName : draftPlayers.O,
    });
    setScoreboard(initialScoreboard);
    setIsSidebarOpen(false);
    setIsAiThinking(false);
    syncRoundRefs(nextMatch);
    setMatch(nextMatch);
    setIsPlaying(true);
  };

  const handleRestart = () => {
    const nextMatch = createInitialMatch();
    syncRoundRefs(nextMatch);
    setIsAiThinking(false);
    setMatch(nextMatch);
  };

  const handleResetAll = () => {
    const nextMatch = createInitialMatch();
    syncRoundRefs(nextMatch);
    setMatch(nextMatch);
    setScoreboard(initialScoreboard);
    setIsSidebarOpen(false);
    setIsAiThinking(false);
    setIsPlaying(false);
  };

  const handleCellClick = (boardIndex: number, cellIndex: number) => {
    if (isAiTurn || isAiThinking) {
      return;
    }

    setMatch((currentMatch) => makeMove(currentMatch, boardIndex, cellIndex));
  };

  const handleFullscreenToggle = async () => {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen();
      return;
    }

    await document.exitFullscreen();
  };

  const openTutorial = (stepIndex = 0) => {
    setTutorialStepIndex(stepIndex);
    setIsTutorialOpen(true);
  };

  const closeTutorial = () => {
    setIsTutorialOpen(false);
  };

  const handleNextTutorialStep = () => {
    setTutorialStepIndex((current) => Math.min(current + 1, tutorialSteps.length - 1));
  };

  const handlePreviousTutorialStep = () => {
    setTutorialStepIndex((current) => Math.max(current - 1, 0));
  };

  const getStatusMessage = (winner: BoardWinner) => {
    if (winner === "draw") {
      return "Empate total. Ninguem dominou o meta-tabuleiro.";
    }

    if (winner) {
      return `${players[winner]} venceu a partida e tomou conta do tabuleiro supremo.`;
    }

    if (isAiThinking) {
      return `${currentPlayerName} esta calculando a proxima jogada no tabuleiro ${activeBoardLabel}.`;
    }

    return `${currentPlayerName} joga agora. O alvo e o tabuleiro ${activeBoardLabel}.`;
  };

  const getResultHeadline = () => {
    if (match.winner === "draw") {
      return "Empate supremo";
    }

    if (match.winner) {
      return `${players[match.winner]} domina o meta-tabuleiro`;
    }

    return `Setor ativo: ${activeBoardLabel}`;
  };

  return (
    <main className="app-shell">
      <div className="background-orb background-orb-left" />
      <div className="background-orb background-orb-right" />

      <AnimatePresence mode="wait">
        {!isPlaying ? (
          <MotionSection
            key="start"
            className="panel hero-panel"
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -24 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
          >
            <div className="hero-copy">
              <p className="eyebrow">Browser strategy showdown</p>
              <h1>Tic Tac Toe Supreme</h1>
              <p className="hero-text">
                Cada jogada decide o proximo campo de batalha. Vença mini-tabuleiros, controle o grid principal e
                force seu rival para armadilhas taticas.
              </p>

              <div className="hero-stats" aria-label="Destaques da partida">
                <div className="hero-stat-card">
                  <strong>9</strong>
                  <span>mini-tabuleiros</span>
                </div>
                <div className="hero-stat-card">
                  <strong>X / O</strong>
                  <span>azul e vermelho</span>
                </div>
                <div className="hero-stat-card">
                  <strong>1 alvo</strong>
                  <span>por rodada</span>
                </div>
              </div>
            </div>

            <form className="start-form" onSubmit={handleStart}>
              <div className="start-form-head">
                <div>
                  <p className="eyebrow">Preparar partida</p>
                  <h2>Escolha os jogadores</h2>
                </div>
                <span className="start-form-badge">{gameMode === "ai" ? "Solo vs IA" : "Local multiplayer"}</span>
              </div>

              <div className="mode-switch" role="tablist" aria-label="Modo de jogo">
                <button
                  type="button"
                  className={`mode-chip ${gameMode === "pvp" ? "mode-chip-active" : ""}`}
                  onClick={() => setGameMode("pvp")}
                >
                  2 jogadores
                </button>
                <button
                  type="button"
                  className={`mode-chip ${gameMode === "ai" ? "mode-chip-active" : ""}`}
                  onClick={() => setGameMode("ai")}
                >
                  Contra IA
                </button>
              </div>

              {gameMode === "ai" && (
                <div className="solo-options">
                  <div className="solo-copy">
                    <strong>Voce quer jogar como qual simbolo?</strong>
                    <span>Quem joga de X comeca a partida.</span>
                  </div>
                  <div className="mode-switch">
                    <button
                      type="button"
                      className={`mode-chip ${humanMark === "X" ? "mode-chip-active" : ""}`}
                      onClick={() => setHumanMark("X")}
                    >
                      Quero ser X
                    </button>
                    <button
                      type="button"
                      className={`mode-chip ${humanMark === "O" ? "mode-chip-active" : ""}`}
                      onClick={() => setHumanMark("O")}
                    >
                      Quero ser O
                    </button>
                  </div>

                  <div className="solo-copy">
                    <strong>Nivel da IA</strong>
                    <span>Facil joga mais solta, media equilibra, dificil prioriza estrategia.</span>
                  </div>
                  <div className="mode-switch mode-switch-triple">
                    <button
                      type="button"
                      className={`mode-chip ${aiDifficulty === "easy" ? "mode-chip-active" : ""}`}
                      onClick={() => setAiDifficulty("easy")}
                    >
                      Facil
                    </button>
                    <button
                      type="button"
                      className={`mode-chip ${aiDifficulty === "medium" ? "mode-chip-active" : ""}`}
                      onClick={() => setAiDifficulty("medium")}
                    >
                      Media
                    </button>
                    <button
                      type="button"
                      className={`mode-chip ${aiDifficulty === "hard" ? "mode-chip-active" : ""}`}
                      onClick={() => setAiDifficulty("hard")}
                    >
                      Dificil
                    </button>
                  </div>
                </div>
              )}

              <div className="player-input-grid">
                <label className="player-input-card player-input-card-x">
                  <span className="player-input-mark">X</span>
                  <div className="player-input-copy">
                    <strong>{gameMode === "ai" && humanMark === "O" ? "CPU azul" : "Jogador azul"}</strong>
                    <input
                      type="text"
                      maxLength={24}
                      value={gameMode === "ai" && humanMark === "O" ? cpuName : draftPlayers.X}
                      onChange={(event) => setDraftPlayers((current) => ({ ...current, X: event.target.value }))}
                      placeholder="Ex.: Lara"
                      disabled={gameMode === "ai" && humanMark === "O"}
                    />
                  </div>
                </label>

                <label className="player-input-card player-input-card-o">
                  <span className="player-input-mark">O</span>
                  <div className="player-input-copy">
                    <strong>{gameMode === "ai" && humanMark === "X" ? "CPU vermelho" : "Jogador vermelho"}</strong>
                    <input
                      type="text"
                      maxLength={24}
                      value={gameMode === "ai" && humanMark === "X" ? cpuName : draftPlayers.O}
                      onChange={(event) => setDraftPlayers((current) => ({ ...current, O: event.target.value }))}
                      placeholder="Ex.: Theo"
                      disabled={gameMode === "ai" && humanMark === "X"}
                    />
                  </div>
                </label>
              </div>

              <div className="rules-card">
                <h2>Regra principal</h2>
                <p>Onde voce joga agora define em qual mini-tabuleiro o adversario vai jogar depois.</p>
              </div>

              <div className="start-actions">
                <button className="primary-button" type="submit">
                  Comecar partida
                </button>
                <button className="ghost-button" type="button" onClick={() => openTutorial()}>
                  Ver tutorial
                </button>
              </div>
            </form>
          </MotionSection>
        ) : (
          <MotionSection
            key="game"
            className="game-layout"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -24 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            <aside className="game-sidebar">
              <button
                type="button"
                className="mobile-hud-toggle"
                onClick={() => setIsSidebarOpen((current) => !current)}
                aria-expanded={isSidebarOpen}
                aria-controls="game-hud"
              >
                {isSidebarOpen ? "Ocultar painel" : "Mostrar painel"}
              </button>

              <div id="game-hud" className={`sidebar-stack ${isSidebarOpen ? "sidebar-stack-open" : ""}`}>
                <header className="panel topbar compact-topbar">
                  <div>
                    <p className="eyebrow">Partida</p>
                    <h1>Tic Tac Toe Supreme</h1>
                  </div>

                  <div className="actions sidebar-actions">
                    <button className="secondary-button" type="button" onClick={handleRestart}>
                      Reiniciar rodada
                    </button>
                    <button className="ghost-button" type="button" onClick={handleResetAll}>
                      Trocar jogadores
                    </button>
                    <button className="ghost-button" type="button" onClick={() => void handleFullscreenToggle()}>
                      {isFullscreen ? "Sair da tela cheia" : "Tela cheia"}
                    </button>
                    <button className="ghost-button" type="button" onClick={() => openTutorial()}>
                      Tutorial
                    </button>
                  </div>
                </header>

                <section className="hud-grid sidebar-hud">
                  <article className="panel info-card scoreboard-card compact-card">
                    <div>
                      <p className="score-label">X</p>
                      <strong>{players.X}</strong>
                      <span>{scoreboard.X}</span>
                    </div>
                    <div>
                      <p className="score-label">O</p>
                      <strong>{players.O}</strong>
                      <span>{scoreboard.O}</span>
                    </div>
                    <div>
                      <p className="score-label">Empates</p>
                      <strong>{scoreboard.draws}</strong>
                      <span>{match.moveCount} jogadas</span>
                    </div>
                  </article>
                </section>
              </div>
            </aside>

            <section className="board-stage">
              <section className="board-wrapper">
                {match.winner && (
                  <div className="result-banner result-banner-visible">
                    <strong>{getResultHeadline()}</strong>
                    <span>{getStatusMessage(match.winner)}</span>
                  </div>
                )}

                <div className={`board-topline board-topline-minimal board-topline-player-${match.currentPlayer.toLowerCase()}`}>
                  <div className="board-chip">Turno: {currentPlayerName}</div>
                  <div className="board-chip">Alvo: {activeBoardLabel}</div>
                  {gameMode === "ai" && <div className="board-chip">IA: {aiDifficulty}</div>}
                  {isAiThinking && <div className="board-chip board-chip-thinking">CPU pensando...</div>}
                </div>

                <div
                  className={`supreme-board supreme-board-player-${match.currentPlayer.toLowerCase()}`}
                  role="grid"
                  aria-label="Tabuleiro supremo"
                >
                  {match.boards.map((board, boardIndex) => {
                    const isPlayable = playableBoards.includes(boardIndex) && !match.winner;
                    const isFocused = match.activeBoardIndex === boardIndex && !match.winner;
                    const boardWinningLine = getSmallBoardWinningLine(board);
                    const isMacroWinningBoard = !!macroWinningLine?.includes(boardIndex);

                    return (
                      <motion.div
                        key={`board-${boardIndex}`}
                        initial={{ opacity: 0, scale: 0.96 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.22, ease: "easeOut" }}
                        className={[
                          "mini-board",
                          isPlayable ? "mini-board-playable" : "mini-board-locked",
                          isFocused ? "mini-board-focused" : "",
                          board.winner ? "mini-board-complete" : "",
                          isMacroWinningBoard ? "mini-board-macro-winning" : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        <div className="mini-board-surface">
                          <div className="mini-board-grid">
                            {board.cells.map((cell, cellIndex) => {
                              const disabled = !isPlayable || !!cell || !!board.winner || !!match.winner;
                              const isWinningCell = !!boardWinningLine?.includes(cellIndex);

                              return (
                                <MotionButton
                                  key={`cell-${boardIndex}-${cellIndex}`}
                                  type="button"
                                  whileTap={disabled ? undefined : { scale: 0.94 }}
                                  animate={cell ? { opacity: [0.65, 1] } : { opacity: 1 }}
                                  transition={{ duration: 0.28, ease: "easeOut" }}
                                  className={[
                                    "cell-button",
                                    `cell-${cell ? cell.toLowerCase() : "empty"}`,
                                    isWinningCell ? "cell-winning" : "",
                                  ]
                                    .filter(Boolean)
                                    .join(" ")}
                                  onClick={() => handleCellClick(boardIndex, cellIndex)}
                                  disabled={disabled}
                                  aria-label={`Tabuleiro ${getBoardLabel(boardIndex)}, casa ${cellIndex + 1}`}
                                >
                                  {cell}
                                </MotionButton>
                              );
                            })}
                          </div>

                          {board.winner && (
                            <motion.div
                              className={`board-overlay overlay-${board.winner}`}
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                            >
                              {board.winner === "draw" ? "#" : board.winner}
                            </motion.div>
                          )}
                        </div>

                        <div className="mini-board-label">{getBoardLabel(boardIndex)}</div>
                      </motion.div>
                    );
                  })}
                </div>
              </section>
            </section>
          </MotionSection>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isTutorialOpen && (
          <motion.div
            className="tutorial-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.section
              className="tutorial-modal"
              initial={{ opacity: 0, y: 20, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
            >
              <div className="tutorial-header">
                <div>
                  <p className="eyebrow">Tutorial guiado</p>
                  <h2>{currentTutorialStep.title}</h2>
                </div>
                <button className="ghost-button tutorial-close" type="button" onClick={closeTutorial}>
                  Fechar
                </button>
              </div>

              <div className="tutorial-progress" aria-hidden="true">
                {tutorialSteps.map((step, index) => (
                  <span
                    key={step.title}
                    className={[
                      "tutorial-progress-dot",
                      index === tutorialStepIndex ? "tutorial-progress-dot-active" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  />
                ))}
              </div>

              <p className="tutorial-text">{currentTutorialStep.description}</p>

              <div className="tutorial-example">
                <strong>Dica rapida</strong>
                <span>
                  {tutorialStepIndex < 2
                    ? "Pense primeiro em qual mini-tabuleiro voce quer controlar no tabuleiro principal."
                    : tutorialStepIndex < 4
                      ? "Nem sempre a melhor jogada e a que vence localmente; as vezes ela prepara o proximo alvo do rival."
                      : "Use o painel apenas como apoio. O foco principal da leitura deve ficar no tabuleiro central."}
                </span>
              </div>

              <div className="tutorial-actions">
                <button
                  className="ghost-button"
                  type="button"
                  onClick={handlePreviousTutorialStep}
                  disabled={tutorialStepIndex === 0}
                >
                  Anterior
                </button>
                {tutorialStepIndex === tutorialSteps.length - 1 ? (
                  <button className="primary-button" type="button" onClick={closeTutorial}>
                    Entendi
                  </button>
                ) : (
                  <button className="primary-button" type="button" onClick={handleNextTutorialStep}>
                    Proximo
                  </button>
                )}
              </div>
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

export default App;
