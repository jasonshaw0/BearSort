import { createNewGame } from "../game/engine";
import { balance, items, producers } from "../game/data";
import type { GameState } from "../game/types";

export const SAVE_KEY = "bear-and-burrow-save";
export const SAVE_VERSION = 1;
export function migrateSave(input: unknown): GameState {
  if (!input || typeof input !== "object")
    throw new Error("This file is not a Bear & Burrow save.");
  const raw = input as Record<string, unknown>;
  if (raw.version !== 1) throw new Error("This save version is not supported.");
  const state = raw as unknown as GameState;
  if (
    !Array.isArray(state.board) ||
    state.board.length !== balance.boardSize ||
    !Array.isArray(state.storage) ||
    state.storage.length > 100 ||
    !Array.isArray(state.orders) ||
    !Array.isArray(state.upgrades) ||
    !Array.isArray(state.discoveries) ||
    typeof state.coins !== "number" ||
    !Number.isFinite(state.coins) ||
    typeof state.xp !== "number" ||
    !Number.isFinite(state.xp) ||
    !state.producers ||
    !state.stats ||
    !state.settings
  )
    throw new Error("The save is incomplete or damaged.");
  for (const cell of [...state.board, ...state.storage]) {
    if (cell === null) continue;
    if (
      typeof cell !== "object" || cell.kind === "item"
        ? !cell ||
          cell.kind !== "item" ||
          !items[cell.definitionId] ||
          typeof cell.instanceId !== "string"
        : cell.kind !== "producer" || !producers[cell.producerId]
    )
      throw new Error("The save contains unknown board objects.");
  }
  for (const order of state.orders)
    if (
      !order ||
      !Array.isArray(order.requirements) ||
      order.requirements.some(
        (r) =>
          !items[r.itemId] || !Number.isInteger(r.quantity) || r.quantity < 1,
      )
    )
      throw new Error("The save contains an invalid order.");
  return {
    ...state,
    version: SAVE_VERSION,
    storage: [
      ...state.storage,
      ...Array(Math.max(0, balance.storageSlots - state.storage.length)).fill(
        null,
      ),
    ],
  };
}
export function parseSave(json: string): GameState {
  try {
    return migrateSave(JSON.parse(json));
  } catch (error) {
    throw new Error(
      error instanceof Error ? error.message : "Could not read this save.",
    );
  }
}
export function loadSave(): GameState {
  try {
    const json = localStorage.getItem(SAVE_KEY);
    return json ? parseSave(json) : createNewGame();
  } catch {
    return createNewGame();
  }
}
export function saveGame(state: GameState) {
  localStorage.setItem(SAVE_KEY, JSON.stringify(state));
}
