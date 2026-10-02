import { create } from "zustand";
import { balance, items, producers, upgrades } from "../game/data";
import {
  buyUpgrade,
  createNewGame,
  deliverOrder,
  fillOrders,
  moveBoard,
  moveInventory,
  produce,
  regenerate,
  rerollOrder,
  returnItem,
  sellItem,
  storeItem,
  undoSale,
} from "../game/engine";
import type { Cell, GameState } from "../game/types";
import { loadSave, parseSave, saveGame, SAVE_KEY } from "./persistence";

type Selection = { location: "board" | "storage"; index: number } | null;
interface Store {
  game: GameState;
  screen: "board" | "hollow" | "collection";
  selection: Selection;
  notice: string;
  celebration: string;
  mergeAt: number | null;
  sold: {
    cell: Cell;
    location: "board" | "storage";
    index: number;
    until: number;
  } | null;
  settingsOpen: boolean;
  debugOpen: boolean;
  setScreen: (screen: Store["screen"]) => void;
  select: (selection: Selection) => void;
  setNotice: (notice: string) => void;
  clearCelebration: () => void;
  tapProducer: (index: number) => void;
  move: (from: number, to: number) => void;
  transfer: (
    from: "board" | "storage",
    fromIndex: number,
    to: "board" | "storage",
    toIndex: number,
  ) => void;
  storeSelected: () => void;
  returnSelected: () => void;
  deliver: (id: string) => void;
  reroll: (id: string) => void;
  buy: (id: string) => void;
  sell: () => void;
  undo: () => void;
  skipTutorial: () => void;
  tick: () => void;
  setSettingsOpen: (open: boolean) => void;
  setDebugOpen: (open: boolean) => void;
  setSetting: (
    key: keyof GameState["settings"],
    value: number | boolean,
  ) => void;
  importGame: (state: GameState) => void;
  reset: () => void;
  debug: (action: string, value?: string) => void;
}
const initial = loadSave();
const noticeFrom = (before: GameState, after: GameState, fallback: string) => {
  const discovered = after.discoveries.find(
    (id) => !before.discoveries.includes(id),
  );
  return discovered
    ? `New discovery! ${items[discovered].name} · +${balance.discoveryXp} XP`
    : fallback;
};
export const useGameStore = create<Store>((set, get) => ({
  game: initial,
  screen: "board",
  selection: null,
  notice: "",
  celebration: "",
  mergeAt: null,
  sold: null,
  settingsOpen: false,
  debugOpen: false,
  setScreen: (screen) => set({ screen, selection: null }),
  select: (selection) => set({ selection }),
  setNotice: (notice) => set({ notice }),
  clearCelebration: () => set({ celebration: "" }),
  tapProducer: (index) => {
    const before = get().game;
    const result = produce(before, index);
    set({
      game: result.state,
      selection: { location: "board", index },
      notice:
        result.error ||
        noticeFrom(
          before,
          result.state,
          `${producers[(before.board[index] as { producerId: string }).producerId].name} shared a little something.`,
        ),
    });
  },
  move: (from, to) => {
    const before = get().game;
    const result = moveBoard(before, from, to);
    set({
      game: result.state,
      selection:
        result.result === "invalid" ? { location: "board", index: from } : null,
      mergeAt: result.result === "merge" ? to : null,
      notice:
        result.result === "invalid"
          ? "Those items cannot merge. Try two matching items."
          : result.result === "merge"
            ? noticeFrom(before, result.state, "A lovely merge!")
            : "",
    });
  },
  transfer: (from, fromIndex, to, toIndex) => {
    const result = moveInventory(get().game, from, fromIndex, to, toIndex);
    set({
      game: result.state,
      selection: result.error ? get().selection : null,
      notice: result.error || "",
    });
  },
  storeSelected: () => {
    const s = get().selection;
    if (!s || s.location !== "board") return;
    const result = storeItem(get().game, s.index);
    set({
      game: result.state,
      selection: result.error ? s : null,
      notice: result.error || "Tucked safely into storage.",
    });
  },
  returnSelected: () => {
    const s = get().selection;
    if (!s || s.location !== "storage") return;
    const result = returnItem(get().game, s.index);
    set({
      game: result.state,
      selection: result.error ? s : null,
      notice: result.error || "Back on the board.",
    });
  },
  deliver: (id) => {
    const result = deliverOrder(get().game, id);
    if (result.error) return set({ notice: result.error });
    set({
      game: result.state,
      celebration: "Order delivered! ✦",
      notice: `+${get().game.orders.find((o) => o.id === id)?.coins || 0} coins for Bear Hollow`,
      selection: null,
    });
    window.setTimeout(
      () => set((s) => ({ game: fillOrders(s.game), celebration: "" })),
      balance.orderReplacementMs,
    );
  },
  reroll: (id) => {
    const result = rerollOrder(get().game, id);
    set({
      game: result.state,
      notice: result.error || "A new request arrived.",
    });
  },
  buy: (id) => {
    const before = get().game;
    const result = buyUpgrade(before, id);
    const upgrade = upgrades.find((u) => u.id === id);
    set({
      game: result.state,
      notice: result.error || `${upgrade?.place} is getting cozier!`,
      celebration: result.error ? "" : `New in Bear Hollow ✦ ${upgrade?.title}`,
    });
    if (!result.error) window.setTimeout(() => set({ celebration: "" }), 2400);
  },
  sell: () => {
    const s = get().selection;
    if (!s) return;
    const result = sellItem(get().game, s.location, s.index);
    set({
      game: result.state,
      selection: null,
      notice: result.error || "Item sold.",
      sold: result.sold
        ? { cell: result.sold, ...s, until: Date.now() + 6000 }
        : null,
    });
  },
  undo: () => {
    const sold = get().sold;
    if (!sold || sold.until < Date.now()) return;
    set({
      game: undoSale(get().game, sold.cell, sold.location, sold.index),
      sold: null,
      notice: "Sale undone.",
    });
  },
  skipTutorial: () =>
    set((s) => ({
      game: fillOrders({ ...s.game, tutorialSkipped: true, tutorial: 4 }),
      notice: "Explore at your own pace.",
    })),
  tick: () =>
    set((s) => ({
      game: {
        ...regenerate(s.game),
        stats: { ...s.game.stats, playSeconds: s.game.stats.playSeconds + 1 },
      },
      sold: s.sold?.until && s.sold.until < Date.now() ? null : s.sold,
    })),
  setSettingsOpen: (settingsOpen) => set({ settingsOpen }),
  setDebugOpen: (debugOpen) => set({ debugOpen }),
  setSetting: (key, value) =>
    set((s) => ({
      game: { ...s.game, settings: { ...s.game.settings, [key]: value } },
    })),
  importGame: (game) =>
    set({
      game: regenerate(game),
      screen: "board",
      selection: null,
      notice: "Save imported. Welcome back!",
    }),
  reset: () =>
    set({
      game: createNewGame(),
      screen: "board",
      selection: null,
      notice: "A fresh Bear Hollow is ready.",
    }),
  debug: (action, value) =>
    set((s) => {
      let game = s.game;
      if (action === "coins") game = { ...game, coins: game.coins + 500 };
      if (action === "xp") game = { ...game, xp: game.xp + 500, level: 10 };
      if (action === "unlock") {
        const board = [...game.board];
        Object.keys(producers).forEach((id) => {
          if (
            !board.some((c) => c?.kind === "producer" && c.producerId === id)
          ) {
            const index = board.findIndex((c) => !c);
            if (index >= 0) board[index] = { kind: "producer", producerId: id };
          }
        });
        game = {
          ...game,
          board,
          unlockedProducers: Object.keys(producers),
          unlockedChains: [
            ...new Set(Object.values(producers).map((p) => p.chainId)),
          ],
          unlockedBears: ["bruno", "maple", "pippa", "bao", "sunny", "tilly"],
        };
      }
      if (action === "charges")
        game = {
          ...game,
          producers: Object.fromEntries(
            Object.entries(game.producers).map(([id, p]) => [
              id,
              {
                ...p,
                charges: producers[id].maxCharges,
                updatedAt: Date.now(),
              },
            ]),
          ),
        };
      if (action === "clear")
        game = {
          ...game,
          board: game.board.map((c) => (c?.kind === "item" ? null : c)),
        };
      if (action === "spawn" && value && items[value]) {
        const board = [...game.board],
          index = board.findIndex((c) => !c);
        if (index >= 0) {
          board[index] = {
            kind: "item",
            instanceId: crypto.randomUUID(),
            definitionId: value,
          };
          game = { ...game, board };
        }
      }
      if (action === "orders") {
        for (const order of [...game.orders]) {
          const board = [...game.board];
          for (const req of order.requirements)
            for (let i = 0; i < req.quantity; i++) {
              const slot = board.findIndex((c) => !c);
              if (slot >= 0)
                board[slot] = {
                  kind: "item",
                  instanceId: crypto.randomUUID(),
                  definitionId: req.itemId,
                };
            }
          game = deliverOrder({ ...game, board }, order.id).state;
        }
        game = fillOrders(game);
      }
      if (action === "offline") {
        game = {
          ...game,
          producers: Object.fromEntries(
            Object.entries(game.producers).map(([id, p]) => [
              id,
              {
                ...p,
                charges: 0,
                updatedAt: Date.now() - producers[id].rechargeMs * 25,
              },
            ]),
          ),
        };
        game = regenerate(game);
      }
      if (action === "resetProgress") game = createNewGame();
      return { game, notice: `Debug: ${action} complete.` };
    }),
}));

let applyingExternalSave = false;
useGameStore.subscribe((state, previous) => {
  if (
    applyingExternalSave ||
    state.game === previous.game ||
    state.game.stats.playSeconds !== previous.game.stats.playSeconds
  )
    return;
  try {
    saveGame(state.game);
  } catch {
    /* Storage may be disabled. The current session remains playable. */
  }
});
if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (event.key !== SAVE_KEY || !event.newValue) return;
    try {
      applyingExternalSave = true;
      useGameStore.setState({
        game: regenerate(parseSave(event.newValue)),
        selection: null,
      });
    } catch {
      /* Ignore invalid external writes. */
    } finally {
      applyingExternalSave = false;
    }
  });
  window.setInterval(() => useGameStore.getState().tick(), 1000);
  window.setInterval(() => {
    try {
      saveGame(useGameStore.getState().game);
    } catch {
      /* Storage may be disabled. */
    }
  }, 20000);
}
