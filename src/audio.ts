let audioContext: AudioContext | null = null;

const getAudioContext = (): AudioContext | null => {
  if (typeof window === "undefined") {
    return null;
  }

  const AudioContextConstructor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

  if (!AudioContextConstructor) {
    return null;
  }

  if (!audioContext) {
    audioContext = new AudioContextConstructor();
  }

  if (audioContext.state === "suspended") {
    void audioContext.resume();
  }

  return audioContext;
};

const playTone = (frequency: number, duration: number, type: OscillatorType, gainValue: number, startDelay = 0) => {
  const context = getAudioContext();

  if (!context) {
    return;
  }

  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const startTime = context.currentTime + startDelay;
  const endTime = startTime + duration;

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, startTime);
  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.exponentialRampToValueAtTime(gainValue, startTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, endTime);

  oscillator.connect(gain);
  gain.connect(context.destination);

  oscillator.start(startTime);
  oscillator.stop(endTime + 0.02);
};

export const playMoveSound = (mark: "X" | "O") => {
  playTone(mark === "X" ? 392 : 294, 0.16, "triangle", 0.035);
};

export const playBoardWinSound = (mark: "X" | "O") => {
  playTone(mark === "X" ? 523.25 : 440, 0.18, "triangle", 0.045);
  playTone(mark === "X" ? 659.25 : 554.37, 0.24, "sine", 0.032, 0.08);
};

export const playMatchEndSound = (winner: "X" | "O" | "draw") => {
  if (winner === "draw") {
    playTone(220, 0.15, "sawtooth", 0.025);
    playTone(196, 0.22, "triangle", 0.025, 0.1);
    return;
  }

  playTone(winner === "X" ? 523.25 : 392, 0.18, "triangle", 0.05);
  playTone(winner === "X" ? 659.25 : 493.88, 0.22, "triangle", 0.04, 0.08);
  playTone(winner === "X" ? 783.99 : 587.33, 0.32, "sine", 0.03, 0.18);
};
