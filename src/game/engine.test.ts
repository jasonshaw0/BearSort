import { describe, expect, it } from "vitest";
import { balance, items, producers } from "./data";
import {
  buyUpgrade,
  canMerge,
  createNewGame,
  deliverOrder,
  fillOrders,
  generateOrder,
  moveBoard,
  moveInventory,
  orderAvailability,
  produce,
  regenerate,
  seededRandom,
  storeItem,
  weightedPick,
} from "./engine";
import type { Cell } from "./types";
import { migrateSave, parseSave } from "../store/persistence";

const berry = (id: string): Cell => ({
  kind: "item",
  definitionId: id,
  instanceId: crypto.randomUUID(),
});
describe("merge engine", () => {
  it("merges exactly two identical items into the next tier", () => {
    const game = createNewGame();
    game.board[0] = berry("forest-1");
    game.board[1] = berry("forest-1");
    const result = moveBoard(game, 0, 1);
    expect(result.result).toBe("merge");
    expect(result.state.board[0]).toBeNull();
    expect(result.state.board[1]).toMatchObject({
      kind: "item",
      definitionId: "forest-2",
    });
    expect(result.state.board.filter((c) => c?.kind === "item")).toHaveLength(
      1,
    );
    expect(result.state.stats.merges).toBe(1);
  });
  it("rejects mismatched and max-tier merges without consuming items", () => {
    const game = createNewGame();
    game.board[0] = berry("forest-1");
    game.board[1] = berry("honey-1");
    expect(canMerge(game.board[0], game.board[1])).toBe(false);
    expect(moveBoard(game, 0, 1).state).toBe(game);
    game.board[0] = berry("forest-6");
    game.board[1] = berry("forest-6");
    expect(canMerge(game.board[0], game.board[1])).toBe(false);
    expect(moveBoard(game, 0, 1).state).toBe(game);
  });
});
describe("producers", () => {
  it("uses valid weighted outputs and one charge", () => {
    const game = createNewGame(1000);
    const result = produce(game, 36, () => 0.99, 1000);
    expect(result.itemId).toBe("honey-3");
    expect(items[result.itemId!]).toBeDefined();
    expect(result.state.producers.beehive.charges).toBe(24);
  });
  it("does not spend a charge when the board is full", () => {
    const game = createNewGame();
    game.board = game.board.map((c) => c || berry("forest-1"));
    const result = produce(game, 27);
    expect(result.error).toMatch(/board is full/);
    expect(result.state.producers.basket.charges).toBe(25);
  });
  it("regenerates offline only to capacity", () => {
    const game = createNewGame(1000);
    game.producers.basket.charges = 3;
    game.producers.basket.updatedAt = 1000;
    const result = regenerate(game, 1000 + producers.basket.rechargeMs * 50);
    expect(result.producers.basket.charges).toBe(25);
  });
  it("weighted random can be seeded", () => {
    const rng = seededRandom(5);
    expect([
      weightedPick(
        [
          { value: "a", weight: 1 },
          { value: "b", weight: 1 },
        ],
        rng,
      ),
      weightedPick(
        [
          { value: "a", weight: 1 },
          { value: "b", weight: 1 },
        ],
        rng,
      ),
    ]).toEqual(["a", "b"]);
  });
});
describe("orders and progression", () => {
  it("never requests a locked chain", () => {
    const game = createNewGame();
    const rng = seededRandom(42);
    for (let i = 0; i < 50; i++) {
      const order = generateOrder(game, rng);
      expect(
        order.requirements.every((r) =>
          ["forest", "honey"].includes(items[r.itemId].chainId),
        ),
      ).toBe(true);
    }
  });
  it("detects stored items, consumes only requirements, rewards, and refills", () => {
    const game = createNewGame();
    game.tutorial = 3;
    game.storage[0] = berry("forest-2");
    game.board[0] = berry("honey-1");
    expect(orderAvailability(game, game.orders[0])).toBe(true);
    const result = deliverOrder(game, game.orders[0].id).state;
    expect(result.storage[0]).toBeNull();
    expect(result.board[0]).toMatchObject({ definitionId: "honey-1" });
    expect(result.coins).toBe(18);
    expect(result.xp).toBe(15);
    expect(result.stats.orders).toBe(1);
    expect(fillOrders(result, seededRandom(1)).orders).toHaveLength(
      balance.orderSlots,
    );
  });
  it("unlocks producers and chains through configured upgrades", () => {
    let game = createNewGame();
    game.coins = 1000;
    game = buyUpgrade(game, "grove-1").state;
    game = buyUpgrade(game, "honey-1").state;
    game.level = 3;
    game = buyUpgrade(game, "river-1").state;
    expect(game.unlockedProducers).toContain("fishing");
    expect(game.unlockedChains).toContain("fish");
    expect(
      game.board.some(
        (c) => c?.kind === "producer" && c.producerId === "fishing",
      ),
    ).toBe(true);
  });
});
describe("inventory and saves", () => {
  it("moves items to storage and back without losing them", () => {
    const game = createNewGame();
    game.board[0] = berry("forest-1");
    const stored = storeItem(game, 0).state;
    expect(stored.board[0]).toBeNull();
    expect(stored.storage[0]).toMatchObject({ definitionId: "forest-1" });
    const moved = moveInventory(stored, "storage", 0, "board", 0).state;
    expect(moved.board[0]).toMatchObject({ definitionId: "forest-1" });
    expect(moved.storage[0]).toBeNull();
  });
  it("respects storage capacity", () => {
    const game = createNewGame();
    game.board[0] = berry("forest-1");
    game.storage = game.storage.map(() => berry("honey-1"));
    expect(storeItem(game, 0).error).toMatch(/full/);
    expect(game.board[0]).not.toBeNull();
  });
  it("round trips, migrates, and rejects malformed imports", () => {
    const game = createNewGame();
    const parsed = parseSave(JSON.stringify(game));
    expect(parsed.board).toEqual(game.board);
    expect(migrateSave(game).version).toBe(1);
    expect(() => parseSave("{oops")).toThrow();
    expect(() => parseSave(JSON.stringify({ ...game, board: [] }))).toThrow();
    expect(() => parseSave(JSON.stringify({ ...game, version: 99 }))).toThrow();
  });
});
