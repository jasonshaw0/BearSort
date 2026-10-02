import type { GameSettings } from "./game/types";
let context: AudioContext | undefined;
export function playSound(
  kind: "tap" | "merge" | "order" | "unlock",
  settings: GameSettings,
) {
  if (settings.mute || settings.sfx <= 0) return;
  try {
    context ??= new AudioContext();
    const notes = {
      tap: [440],
      merge: [440, 660],
      order: [523, 659, 784],
      unlock: [392, 523, 659, 784],
    }[kind];
    notes.forEach((frequency, index) => {
      const oscillator = context!.createOscillator(),
        gain = context!.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, context!.currentTime + index * 0.08);
      gain.gain.exponentialRampToValueAtTime(
        0.055 * settings.sfx,
        context!.currentTime + index * 0.08 + 0.012,
      );
      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        context!.currentTime + index * 0.08 + 0.18,
      );
      oscillator.connect(gain).connect(context!.destination);
      oscillator.start(context!.currentTime + index * 0.08);
      oscillator.stop(context!.currentTime + index * 0.08 + 0.2);
    });
  } catch {
    /* Audio is optional in restricted browsers. */
  }
}
