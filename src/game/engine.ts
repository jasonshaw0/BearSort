import { balance, bears, chains, items, producers, upgrades } from "./data";
import type { Cell, GameState, Order } from "./types";

export type Rng = () => number;
export const random: Rng = () => Math.random();
export function seededRandom(seed: number): Rng {
  let value = seed >>> 0;
  return () => {
    value = (1664525 * value + 1013904223) >>> 0;
    return value / 4294967296;
  };
}
export function weightedPick<T>(
  options: { value: T; weight: number }[],
  rng: Rng = random,
): T {
  const total = options.reduce(
    (sum, option) => sum + Math.max(0, option.weight),
    0,
  );
  if (!total) throw new Error("No weighted options");
  let point = rng() * total;
  for (const option of options) {
    point -= Math.max(0, option.weight);
    if (point < 0) return option.value;
  }
  return options[options.length - 1].value;
}
const uid = () => crypto.randomUUID();
const itemCell = (definitionId: string): Cell => ({
  kind: "item",
  definitionId,
  instanceId: uid(),
});
export const itemCost = (tier: number) => 2 ** (tier - 1);
export function levelForXp(xp: number): number {
  let level = 1,
    rest = xp;
  while (rest >= balance.xpForLevel(level)) {
    rest -= balance.xpForLevel(level++);
  }
  return level;
}
export function levelProgress(xp: number) {
  let rest = xp;
  let level = 1;
  while (rest >= balance.xpForLevel(level)) rest -= balance.xpForLevel(level++);
  return { value: rest, max: balance.xpForLevel(level) };
}
export function createNewGame(now = Date.now()): GameState {
  const board: Cell[] = Array(balance.boardSize).fill(null);
  board[27] = { kind: "producer", producerId: "basket" };
  board[36] = { kind: "producer", producerId: "beehive" };
  return {
    version: 1,
    board,
    storage: Array(balance.storageSlots).fill(null),
    coins: 0,
    xp: 0,
    level: 1,
    producers: Object.fromEntries(
      Object.keys(producers).map((id) => [
        id,
        { charges: producers[id].maxCharges, updatedAt: now, uses: 0 },
      ]),
    ),
    unlockedProducers: ["basket", "beehive"],
    unlockedChains: ["forest", "honey"],
    unlockedBears: ["bruno", "maple"],
    upgrades: [],
    discoveries: [],
    orders: [
      {
        id: uid(),
        bearId: "bruno",
        requirements: [{ itemId: "forest-2", quantity: 1 }],
        coins: 18,
        xp: 15,
        signature: "forest-2:1",
      },
    ],
    recentOrders: [],
    tutorial: 0,
    tutorialSkipped: false,
    stats: {
      merges: 0,
      orders: 0,
      coinsEarned: 0,
      itemsProduced: 0,
      highestTier: 0,
      playSeconds: 0,
    },
    settings: { mute: false, music: 0.25, sfx: 0.55, reducedMotion: false },
    lastReroll: 0,
  };
}
function discover(state: GameState, definitionId: string): GameState {
  if (state.discoveries.includes(definitionId)) return state;
  const definition = items[definitionId];
  return {
    ...state,
    discoveries: [...state.discoveries, definitionId],
    coins: state.coins + balance.discoveryCoins,
    xp: state.xp + balance.discoveryXp,
    level: levelForXp(state.xp + balance.discoveryXp),
    stats: {
      ...state.stats,
      highestTier: Math.max(state.stats.highestTier, definition.tier),
    },
  };
}
export function regenerate(state: GameState, now = Date.now()): GameState {
  let changed = false;
  const next = { ...state.producers };
  for (const [id, current] of Object.entries(state.producers)) {
    const definition = producers[id];
    if (!definition || current.charges >= definition.maxCharges) continue;
    const elapsed = Math.max(0, now - current.updatedAt),
      gained = Math.floor(elapsed / definition.rechargeMs);
    if (gained > 0) {
      next[id] = {
        ...current,
        charges: Math.min(definition.maxCharges, current.charges + gained),
        updatedAt: current.updatedAt + gained * definition.rechargeMs,
      };
      changed = true;
    }
  }
  return changed ? { ...state, producers: next } : state;
}
function nearbyEmpty(board: Cell[], origin: number): number {
  const row = Math.floor(origin / 8),
    col = origin % 8;
  return (
    board
      .map((cell, index) => ({
        cell,
        index,
        distance:
          Math.abs(Math.floor(index / 8) - row) + Math.abs((index % 8) - col),
      }))
      .filter((x) => x.cell === null)
      .sort((a, b) => a.distance - b.distance || a.index - b.index)[0]?.index ??
    -1
  );
}
export function produce(
  state: GameState,
  index: number,
  rng: Rng = random,
  now = Date.now(),
): { state: GameState; error?: string; itemId?: string } {
  const ready = regenerate(state, now),
    cell = ready.board[index];
  if (!cell || cell.kind !== "producer")
    return { state: ready, error: "Choose a producer." };
  const spot = nearbyEmpty(ready.board, index);
  if (spot < 0)
    return {
      state: ready,
      error: "Your board is full. Merge, store, or sell something first.",
    };
  const charge = ready.producers[cell.producerId];
  if (!charge || charge.charges < 1)
    return {
      state: ready,
      error:
        "This producer is recharging. Try another basket or take a moment to sort.",
    };
  const definition = producers[cell.producerId];
  const itemId =
    !ready.tutorialSkipped && ready.tutorial < 2 && cell.producerId === "basket"
      ? "forest-1"
      : weightedPick(
          definition.outputs.map((o) => ({
            value: o.itemId,
            weight: o.weight,
          })),
          rng,
        );
  const board = [...ready.board];
  board[spot] = itemCell(itemId);
  let next: GameState = {
    ...ready,
    board,
    producers: {
      ...ready.producers,
      [cell.producerId]: {
        ...charge,
        charges: charge.charges - 1,
        updatedAt:
          charge.charges === definition.maxCharges ? now : charge.updatedAt,
        uses: charge.uses + 1,
      },
    },
    stats: { ...ready.stats, itemsProduced: ready.stats.itemsProduced + 1 },
    tutorial:
      cell.producerId === "basket" &&
      ready.tutorial < 2 &&
      !ready.tutorialSkipped
        ? ready.tutorial + 1
        : ready.tutorial,
  };
  next = discover(next, itemId);
  return { state: next, itemId };
}
export function canMerge(a: Cell, b: Cell): boolean {
  return (
    !!a &&
    !!b &&
    a.kind === "item" &&
    b.kind === "item" &&
    a.definitionId === b.definitionId &&
    !!items[a.definitionId]?.nextItemId
  );
}
export function moveBoard(
  state: GameState,
  from: number,
  to: number,
): { state: GameState; result: "move" | "merge" | "invalid" } {
  if (from === to) return { state, result: "invalid" };
  const source = state.board[from],
    target = state.board[to];
  if (!source || source.kind !== "item") return { state, result: "invalid" };
  const board = [...state.board];
  if (!target) {
    board[to] = source;
    board[from] = null;
    return { state: { ...state, board }, result: "move" };
  }
  if (!canMerge(source, target)) return { state, result: "invalid" };
  const nextId = items[source.definitionId].nextItemId!;
  board[from] = null;
  board[to] = itemCell(nextId);
  let next: GameState = {
    ...state,
    board,
    stats: { ...state.stats, merges: state.stats.merges + 1 },
    tutorial:
      state.tutorial === 2 && !state.tutorialSkipped ? 3 : state.tutorial,
  };
  next = discover(next, nextId);
  return { state: next, result: "merge" };
}
export function moveInventory(
  state: GameState,
  from: "board" | "storage",
  fromIndex: number,
  to: "board" | "storage",
  toIndex: number,
): { state: GameState; error?: string } {
  if (from === to && fromIndex === toIndex) return { state };
  const source = state[from][fromIndex],
    target = state[to][toIndex];
  if (!source || source.kind !== "item")
    return { state, error: "Only items can be moved." };
  if (target) return { state, error: "That spot is occupied." };
  const board = [...state.board],
    storage = [...state.storage];
  (from === "board" ? board : storage)[fromIndex] = null;
  (to === "board" ? board : storage)[toIndex] = source;
  return { state: { ...state, board, storage } };
}
export function storeItem(state: GameState, boardIndex: number) {
  const empty = state.storage.findIndex((c) => !c);
  return empty < 0
    ? { state, error: "Storage is full." }
    : moveInventory(state, "board", boardIndex, "storage", empty);
}
export function returnItem(state: GameState, storageIndex: number) {
  const empty = state.board.findIndex((c) => !c);
  return empty < 0
    ? {
        state,
        error: "Your board is full. Merge, store, or sell something first.",
      }
    : moveInventory(state, "storage", storageIndex, "board", empty);
}
export function orderAvailability(state: GameState, order: Order): boolean {
  const all = [...state.board, ...state.storage];
  return order.requirements.every(
    (req) =>
      all.filter((c) => c?.kind === "item" && c.definitionId === req.itemId)
        .length >= req.quantity,
  );
}
export function generateOrder(state: GameState, rng: Rng = random): Order {
  const available = chains.filter((c) => state.unlockedChains.includes(c.id));
  const maxTier = Math.min(5, Math.max(3, Math.floor(state.level / 2) + 2));
  const choices = available.flatMap((c) =>
    c.items.filter((i) => i.tier >= 2 && i.tier <= maxTier),
  );
  const active = new Set(state.orders.map((o) => o.signature));
  const recent = new Set(state.recentOrders.slice(-5));
  const pickItem = () =>
    weightedPick(
      choices.map((i) => ({
        value: i,
        weight:
          ((active.has(`${i.id}:1`) ? 0.15 : 1) *
            (recent.has(`${i.id}:1`) ? 0.2 : 1) *
            (i.tier >= 5 ? 0.18 : i.tier === 4 ? 0.55 : 1)) /
          Math.sqrt(itemCost(i.tier)),
      })),
      rng,
    );
  const first = pickItem();
  const complex = state.stats.orders > 3 && rng() < 0.2;
  const multiple = !complex && state.stats.orders > 2 && rng() < 0.16;
  const second = complex
    ? weightedPick(
        choices
          .filter((i) => i.id !== first.id && i.tier <= 3)
          .map((i) => ({ value: i, weight: 1 / itemCost(i.tier) })),
        rng,
      )
    : undefined;
  const requirements = [
    { itemId: first.id, quantity: multiple ? 2 : 1 },
    ...(second ? [{ itemId: second.id, quantity: 1 }] : []),
  ];
  const cost = requirements.reduce(
    (sum, r) => sum + itemCost(items[r.itemId].tier) * r.quantity,
    0,
  );
  const bearPool = state.unlockedBears.filter((id) => !!bears[id]);
  const bearId = weightedPick(
    bearPool.map((id) => ({
      value: id,
      weight:
        (state.orders.some((order) => order.bearId === id) ? 0.25 : 1) *
        ((id === "sunny" && first.chainId === "honey") ||
        (id === "pippa" && first.chainId === "fish") ||
        (id === "tilly" && first.chainId === "comfort")
          ? 3
          : 1),
    })),
    rng,
  );
  return {
    id: uid(),
    bearId,
    requirements,
    coins: Math.round(7 + cost * 5.5),
    xp: Math.round(5 + cost * 2.7),
    signature: requirements.map((r) => `${r.itemId}:${r.quantity}`).join("|"),
  };
}
export function fillOrders(state: GameState, rng: Rng = random): GameState {
  let next = state;
  const target =
    state.tutorial >= 4 || state.tutorialSkipped ? balance.orderSlots : 1;
  while (next.orders.length < target) {
    const order = generateOrder(next, rng);
    next = { ...next, orders: [...next.orders, order] };
  }
  return next;
}
export function deliverOrder(
  state: GameState,
  orderId: string,
): { state: GameState; error?: string } {
  const order = state.orders.find((o) => o.id === orderId);
  if (!order || !orderAvailability(state, order))
    return { state, error: "Gather the requested items first." };
  const board = [...state.board],
    storage = [...state.storage];
  for (const req of order.requirements) {
    let remaining = req.quantity;
    for (const list of [board, storage])
      for (let index = 0; index < list.length && remaining; index++) {
        const cell = list[index];
        if (cell?.kind === "item" && cell.definitionId === req.itemId) {
          list[index] = null;
          remaining--;
        }
      }
  }
  const xp = state.xp + order.xp;
  return {
    state: {
      ...state,
      board,
      storage,
      coins: state.coins + order.coins,
      xp,
      level: levelForXp(xp),
      orders: state.orders.filter((o) => o.id !== orderId),
      recentOrders: [...state.recentOrders.slice(-7), order.signature],
      tutorial:
        state.tutorial === 3 && !state.tutorialSkipped ? 4 : state.tutorial,
      stats: {
        ...state.stats,
        orders: state.stats.orders + 1,
        coinsEarned: state.stats.coinsEarned + order.coins,
      },
    },
  };
}
export function rerollOrder(
  state: GameState,
  orderId: string,
  rng: Rng = random,
  now = Date.now(),
): { state: GameState; error?: string } {
  if (now - state.lastReroll < balance.rerollMs)
    return { state, error: "Another fresh request will be ready soon." };
  const old = state.orders.find((o) => o.id === orderId);
  if (!old) return { state, error: "Order not found." };
  const base = {
    ...state,
    orders: state.orders.filter((o) => o.id !== orderId),
    recentOrders: [...state.recentOrders.slice(-7), old.signature],
    lastReroll: now,
  };
  return { state: fillOrders(base, rng) };
}
export function buyUpgrade(
  state: GameState,
  id: string,
): { state: GameState; error?: string } {
  const upgrade = upgrades.find((u) => u.id === id);
  if (!upgrade || state.upgrades.includes(id))
    return { state, error: "Upgrade unavailable." };
  if (
    (upgrade.prerequisite && !state.upgrades.includes(upgrade.prerequisite)) ||
    (upgrade.level && state.level < upgrade.level)
  )
    return {
      state,
      error: "Keep helping the bears to unlock this improvement.",
    };
  if (state.coins < upgrade.cost)
    return { state, error: "You need a few more coins." };
  const producer = upgrade.unlockProducer;
  const board = [...state.board];
  if (producer) {
    const spot = board.findIndex((c) => !c);
    if (spot < 0)
      return {
        state,
        error: "Make room on your board for the new producer first.",
      };
    board[spot] = { kind: "producer", producerId: producer };
  }
  const xp = state.xp + upgrade.xp;
  return {
    state: {
      ...state,
      board,
      coins: state.coins - upgrade.cost,
      xp,
      level: levelForXp(xp),
      upgrades: [...state.upgrades, id],
      unlockedProducers: producer
        ? [...state.unlockedProducers, producer]
        : state.unlockedProducers,
      unlockedChains: producer
        ? [...state.unlockedChains, producers[producer].chainId]
        : state.unlockedChains,
      unlockedBears: upgrade.unlockBear
        ? [...state.unlockedBears, upgrade.unlockBear]
        : state.unlockedBears,
    },
  };
}
export function sellItem(
  state: GameState,
  location: "board" | "storage",
  index: number,
): { state: GameState; sold?: Cell; error?: string } {
  const cell = state[location][index];
  if (!cell || cell.kind !== "item")
    return { state, error: "Select an item to sell." };
  const list = [...state[location]];
  list[index] = null;
  return {
    state: {
      ...state,
      [location]: list,
      coins: state.coins + items[cell.definitionId].sellValue,
    },
    sold: cell,
  };
}
export function undoSale(
  state: GameState,
  cell: Cell,
  location: "board" | "storage",
  index: number,
): GameState {
  if (!cell || cell.kind !== "item") return state;
  const value = items[cell.definitionId].sellValue;
  if (state.coins < value) return state;
  const list = [...state[location]];
  const target = !list[index] ? index : list.findIndex((c) => !c);
  if (target < 0) return state;
  list[target] = cell;
  return { ...state, [location]: list, coins: state.coins - value };
}
