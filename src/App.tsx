import { useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { bears, chains, items, producers, upgrades } from "./game/data";
import { levelProgress, orderAvailability } from "./game/engine";
import type { Cell, GameState, Order } from "./game/types";
import { playSound } from "./audio";
import { parseSave } from "./store/persistence";
import { useGameStore } from "./store/gameStore";

const icon = (cell: Cell, className = "") => {
  const definition =
    cell?.kind === "item"
      ? items[cell.definitionId]
      : cell?.kind === "producer"
        ? producers[cell.producerId]
        : null;
  if (!definition) return null;
  const column = definition.spriteIndex % 3;
  const row = Math.floor(definition.spriteIndex / 3);
  return (
    <span
      aria-hidden="true"
      className={`sprite-art ${className}`}
      style={{
        backgroundImage: `url(${definition.asset})`,
        backgroundPosition: `${column * 50}% ${row * 100}%`,
      }}
    />
  );
};
function Piece({
  cell,
  location,
  index,
  selected,
  highlighted,
  onClick,
  invalid,
}: {
  cell: Cell;
  location: "board" | "storage";
  index: number;
  selected: boolean;
  highlighted?: boolean;
  onClick: () => void;
  invalid?: boolean;
}) {
  const id = `${location}-${index}`;
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id,
    disabled: !cell || cell.kind === "producer",
  });
  const { setNodeRef: setDrop, isOver } = useDroppable({ id: `drop-${id}` });
  const setRefs = (node: HTMLElement | null) => {
    setDrop(node);
    setNodeRef(node);
  };
  return (
    <button
      ref={setRefs}
      type="button"
      data-testid={id}
      className={`cell ${cell ? "occupied" : ""} ${selected ? "selected" : ""} ${highlighted ? "highlighted" : ""} ${isOver ? "over" : ""} ${isDragging ? "dragging" : ""} ${invalid ? "invalid" : ""}`}
      aria-label={
        cell?.kind === "item"
          ? `${items[cell.definitionId]?.name}, tier ${items[cell.definitionId]?.tier}, ${location} slot ${index + 1}`
          : cell?.kind === "producer"
            ? `${producers[cell.producerId]?.name}, producer`
            : `Empty ${location} slot ${index + 1}`
      }
      onClick={onClick}
      {...(cell?.kind === "item" ? attributes : {})}
      {...(cell?.kind === "item" ? listeners : {})}
    >
      {icon(cell, "piece-art")}
      {cell?.kind === "producer" && (
        <span className="charge-badge">
          {useGameStore.getState().game.producers[cell.producerId]?.charges ??
            0}
          /{producers[cell.producerId].maxCharges}
        </span>
      )}
      {cell?.kind === "item" && (
        <span className="tier-badge">{items[cell.definitionId]?.tier}</span>
      )}
    </button>
  );
}
function BearPortrait({
  id,
  size = "normal",
}: {
  id: string;
  size?: "normal" | "small";
}) {
  return (
    <img
      className={`bear-portrait ${size}`}
      src={bears[id]?.asset}
      alt={`${bears[id]?.name} the ${bears[id]?.species}`}
    />
  );
}
function OrderCard({ order }: { order: Order }) {
  const game = useGameStore((s) => s.game),
    deliver = useGameStore((s) => s.deliver),
    reroll = useGameStore((s) => s.reroll);
  const ready = orderAvailability(game, order);
  return (
    <article className={`order-card ${ready ? "ready" : ""}`}>
      <div className="order-heading">
        <BearPortrait id={order.bearId} />
        <div>
          <span className="eyebrow">A request from</span>
          <h3>{bears[order.bearId]?.name}</h3>
          <small>{bears[order.bearId]?.note}</small>
        </div>
      </div>
      <div className="requirements">
        {order.requirements.map((req) => {
          const owned = [...game.board, ...game.storage].filter(
            (c) => c?.kind === "item" && c.definitionId === req.itemId,
          ).length;
          return (
            <div
              className={`requirement ${owned >= req.quantity ? "have" : ""}`}
              key={req.itemId}
            >
              {icon({ kind: "item", instanceId: "", definitionId: req.itemId })}
              <span>
                <strong>{items[req.itemId].name}</strong>
                <small>
                  {Math.min(owned, req.quantity)}/{req.quantity} ready
                </small>
              </span>
            </div>
          );
        })}
      </div>
      <div className="order-footer">
        <span className="reward">
          ✦ {order.coins} coins <small>+{order.xp} XP</small>
        </span>
        <button
          className="primary small"
          disabled={!ready}
          onClick={() => {
            playSound("order", game.settings);
            deliver(order.id);
          }}
        >
          Deliver
        </button>
      </div>
      <button
        className="text-button reroll"
        onClick={() => reroll(order.id)}
        aria-label={`Reroll ${bears[order.bearId]?.name}'s order`}
      >
        ↻ New request
      </button>
    </article>
  );
}
function Tutorial() {
  const game = useGameStore((s) => s.game),
    skip = useGameStore((s) => s.skipTutorial);
  if (game.tutorialSkipped || game.tutorial >= 4) return null;
  const lines = [
    <>
      Welcome to Bear Hollow! Tap the <strong>Foraging Basket</strong> twice.
    </>,
    <>
      One more tap on the <strong>Foraging Basket</strong>.
    </>,
    <>
      Drag one <strong>Wild Berries</strong> onto the other, or select each
      berry.
    </>,
    <>
      Lovely! <strong>Deliver Bruno’s Berry Bundle</strong> to earn coins.
    </>,
  ];
  return (
    <div className="tutorial" role="status">
      <span className="tutorial-star">✦</span>
      <span>{lines[game.tutorial]}</span>
      <button className="text-button" onClick={skip}>
        Skip hints
      </button>
    </div>
  );
}
function BoardScreen() {
  const game = useGameStore((s) => s.game),
    selected = useGameStore((s) => s.selection),
    select = useGameStore((s) => s.select),
    tapProducer = useGameStore((s) => s.tapProducer),
    move = useGameStore((s) => s.move),
    transfer = useGameStore((s) => s.transfer),
    storeSelected = useGameStore((s) => s.storeSelected),
    returnSelected = useGameStore((s) => s.returnSelected),
    sell = useGameStore((s) => s.sell);
  const [invalid, setInvalid] = useState(-1);
  const [dragCell, setDragCell] = useState<Cell>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 7 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 130, tolerance: 8 },
    }),
  );
  const selectedCell = selected
    ? game[selected.location][selected.index]
    : null;
  const handleCell = (location: "board" | "storage", index: number) => {
    const cell = game[location][index];
    if (cell?.kind === "producer") {
      playSound("tap", game.settings);
      tapProducer(index);
      return;
    }
    if (
      selected &&
      game[selected.location][selected.index]?.kind === "item" &&
      (selected.location !== location || selected.index !== index)
    ) {
      if (selected.location === "board" && location === "board") {
        const result = useGameStore.getState();
        result.move(selected.index, index);
        const after = useGameStore.getState();
        if (after.game === game) {
          setInvalid(index);
          window.setTimeout(() => setInvalid(-1), 380);
        } else if (after.mergeAt === index) playSound("merge", game.settings);
        return;
      }
      if (!cell) {
        transfer(selected.location, selected.index, location, index);
        return;
      }
    }
    select(cell ? { location, index } : null);
  };
  const handleDragEnd = (event: DragEndEvent) => {
    setDragCell(null);
    const from = String(event.active.id).match(/^(board|storage)-(\d+)$/),
      to = String(event.over?.id).match(/^drop-(board|storage)-(\d+)$/);
    if (!from || !to) return;
    const fromIndex = Number(from[2]),
      toIndex = Number(to[2]);
    if (from[1] === "board" && to[1] === "board") {
      const before = useGameStore.getState().game;
      move(fromIndex, toIndex);
      if (useGameStore.getState().game === before) {
        setInvalid(toIndex);
        window.setTimeout(() => setInvalid(-1), 380);
      } else if (useGameStore.getState().mergeAt === toIndex)
        playSound("merge", game.settings);
    } else
      transfer(
        from[1] as "board" | "storage",
        fromIndex,
        to[1] as "board" | "storage",
        toIndex,
      );
  };
  const selectedDefinition =
    selectedCell?.kind === "item" ? items[selectedCell.definitionId] : null;
  const selectedProducer =
    selectedCell?.kind === "producer"
      ? producers[selectedCell.producerId]
      : null;
  return (
    <DndContext
      sensors={sensors}
      onDragStart={(e) => {
        const match = String(e.active.id).match(/^(board|storage)-(\d+)$/);
        if (match)
          setDragCell(game[match[1] as "board" | "storage"][Number(match[2])]);
      }}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setDragCell(null)}
    >
      <div className="board-layout">
        <section className="orders-panel">
          <div className="section-title">
            <div>
              <span className="eyebrow">Friends at the doorstep</span>
              <h2>Bear requests</h2>
            </div>
            <span className="section-flourish">✿</span>
          </div>
          <div
            className={`orders-list ${game.orders.length === 1 ? "single" : ""}`}
          >
            {game.orders.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))}
          </div>
        </section>
        <main className="board-panel">
          <Tutorial />
          <div className="board-heading">
            <div>
              <span className="eyebrow">The little clearing</span>
              <h1>Merge board</h1>
              <p>Tap a basket to gather. Combine matching treasures.</p>
            </div>
            <div className="board-count">
              {game.board.filter(Boolean).length}
              <small> / 64 spots</small>
            </div>
          </div>
          <div className="board-frame">
            <div
              className="board-grid"
              role="grid"
              aria-label="8 by 8 merge board"
            >
              {game.board.map((cell, index) => (
                <Piece
                  key={index}
                  cell={cell}
                  location="board"
                  index={index}
                  selected={
                    selected?.location === "board" && selected.index === index
                  }
                  highlighted={
                    (!game.tutorialSkipped &&
                      game.tutorial < 2 &&
                      cell?.kind === "producer" &&
                      cell.producerId === "basket") ||
                    (!game.tutorialSkipped &&
                      game.tutorial === 2 &&
                      cell?.kind === "item" &&
                      cell.definitionId === "forest-1")
                  }
                  invalid={invalid === index}
                  onClick={() => handleCell("board", index)}
                />
              ))}
            </div>
          </div>
          <div className="board-caption">
            <span>✦</span> Tip: tap one item, then another spot to move or merge
            it.
          </div>
        </main>
        <aside className="side-panel">
          <section className="paper-card detail-card">
            <div className="section-title">
              <div>
                <span className="eyebrow">A closer look</span>
                <h2>Selected</h2>
              </div>
            </div>
            {selectedCell ? (
              <>
                <div className="selected-art">{icon(selectedCell)}</div>
                <h3>{selectedDefinition?.name || selectedProducer?.name}</h3>
                {selectedDefinition ? (
                  <>
                    <p>
                      Tier {selectedDefinition.tier} ·{" "}
                      {
                        chains.find((c) => c.id === selectedDefinition.chainId)
                          ?.name
                      }
                    </p>
                    <p>
                      {game.orders.some((o) =>
                        o.requirements.some(
                          (r) => r.itemId === selectedDefinition.id,
                        ),
                      )
                        ? "✦ Needed for an active request"
                        : "A lovely find for your collection."}
                    </p>
                    <div className="detail-actions">
                      {selected?.location === "board" ? (
                        <button className="secondary" onClick={storeSelected}>
                          Store item
                        </button>
                      ) : (
                        <button className="secondary" onClick={returnSelected}>
                          Put on board
                        </button>
                      )}
                      <button className="text-button sell" onClick={sell}>
                        Sell · {selectedDefinition.sellValue} coin
                        {selectedDefinition.sellValue !== 1 && "s"}
                      </button>
                    </div>
                  </>
                ) : (
                  selectedProducer && (
                    <>
                      <p>
                        Creates{" "}
                        {
                          chains.find((c) => c.id === selectedProducer.chainId)
                            ?.name
                        }
                        .
                      </p>
                      <p>
                        {game.producers[selectedProducer.id].charges}/
                        {selectedProducer.maxCharges} charges · 1 every{" "}
                        {selectedProducer.rechargeMs / 1000}s
                      </p>
                      <button
                        className="secondary"
                        onClick={() => selected && tapProducer(selected.index)}
                      >
                        Gather item
                      </button>
                    </>
                  )
                )}
              </>
            ) : (
              <div className="empty-detail">
                <span>✧</span>
                <p>
                  Select an item to see its story, or tap a producer to gather.
                </p>
              </div>
            )}
          </section>
          <section className="paper-card storage-card">
            <div className="section-title">
              <div>
                <span className="eyebrow">Tuck things away</span>
                <h2>Storage</h2>
              </div>
              <span className="storage-count">
                {game.storage.filter(Boolean).length}/{game.storage.length}
              </span>
            </div>
            <div className="storage-grid">
              {game.storage.map((cell, index) => (
                <Piece
                  key={index}
                  cell={cell}
                  location="storage"
                  index={index}
                  selected={
                    selected?.location === "storage" && selected.index === index
                  }
                  onClick={() => handleCell("storage", index)}
                />
              ))}
            </div>
            <p className="helper">
              Drag items here, or select one and choose Store item.
            </p>
          </section>
        </aside>
      </div>
      <DragOverlay dropAnimation={null}>
        {dragCell && <div className="drag-overlay">{icon(dragCell)}</div>}
      </DragOverlay>
    </DndContext>
  );
}
function HollowScreen() {
  const game = useGameStore((s) => s.game),
    buy = useGameStore((s) => s.buy);
  const places = [
    "Forager’s Grove",
    "Honey Hollow",
    "Riverside",
    "Cozy Den",
    "Picnic Meadow",
    "Ranger Camp",
  ];
  return (
    <div className="content-screen hollow-screen">
      <div className="page-intro">
        <span className="eyebrow">A home for every bear</span>
        <h1>Bear Hollow</h1>
        <p>
          Little by little, a cozy woodland village grows from the care you give
          its neighbors.
        </p>
      </div>
      <div
        className={`hollow-scene ${game.upgrades.length >= 3 ? "grown" : ""}`}
      >
        <div className="scene-sun" />
        <div className="scene-hill back" />
        <div className="scene-hill front" />
        <div className="scene-trees">
          <span>♠</span>
          <span>♠</span>
          <span>♠</span>
          <span>♠</span>
          <span>♠</span>
        </div>
        {game.upgrades.includes("grove-1") && (
          <div className="scene-cabin">
            <div className="cabin-roof" />
            <div className="cabin-body">
              <div className="cabin-door" />
            </div>
          </div>
        )}
        {game.upgrades.includes("grove-1") && <div className="scene-path" />}
        {game.upgrades.includes("honey-1") && (
          <div className="scene-flowers">✿ &nbsp; ✿ &nbsp; ✿</div>
        )}
        {game.upgrades.includes("river-1") && <div className="scene-river" />}
        {game.upgrades.includes("river-2") && <div className="scene-bridge" />}
        {game.upgrades.includes("camp-1") && (
          <div className="scene-tent">▲</div>
        )}
        {game.upgrades.includes("meadow-2") && (
          <div className="scene-bunting">✦ ✿ ✦ ✿ ✦</div>
        )}
        <div className="scene-label">
          Bear Hollow{" "}
          <small>
            {game.upgrades.length}/{upgrades.length} improvements
          </small>
        </div>
      </div>
      <div className="hollow-grid">
        {places.map((place) => {
          const list = upgrades.filter((u) => u.place === place),
            owned = list.filter((u) => game.upgrades.includes(u.id)),
            next = list.find((u) => !game.upgrades.includes(u.id)),
            eligible =
              next &&
              (!next.prerequisite ||
                game.upgrades.includes(next.prerequisite)) &&
              (!next.level || game.level >= next.level);
          return (
            <article
              className={`place-card ${owned.length ? "built" : ""}`}
              key={place}
            >
              <div className={`place-art ${list[0].icon}`}>
                <span>
                  {
                    (
                      {
                        grove: "♣",
                        honey: "✿",
                        river: "≈",
                        den: "⌂",
                        meadow: "✾",
                        camp: "▲",
                      } as Record<string, string>
                    )[list[0].icon]
                  }
                </span>
              </div>
              <div className="place-content">
                <span className="eyebrow">
                  {owned.length
                    ? `Stage ${owned.length} of ${list.length}`
                    : "Waiting to bloom"}
                </span>
                <h2>{place}</h2>
                <p>
                  {next?.description ||
                    "A lovely corner of Bear Hollow, complete for now."}
                </p>
                {next && (
                  <div className="upgrade-row">
                    <div>
                      <strong>{next.title}</strong>
                      <small>
                        {next.unlockProducer
                          ? `Unlocks ${producers[next.unlockProducer].name}`
                          : next.unlockBear
                            ? `Welcomes ${bears[next.unlockBear].name}`
                            : `+${next.xp} Friendship XP`}
                      </small>
                    </div>
                    <button
                      className="primary small"
                      disabled={!eligible || game.coins < next.cost}
                      onClick={() => buy(next.id)}
                    >
                      {!eligible
                        ? `Level ${next.level || "up"}`
                        : `${next.cost} coins`}
                    </button>
                  </div>
                )}
                {!next && <span className="complete-label">✦ All cozy</span>}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
function CollectionScreen() {
  const game = useGameStore((s) => s.game);
  return (
    <div className="content-screen collection-screen">
      <div className="page-intro">
        <span className="eyebrow">Every little discovery</span>
        <h1>Collection Book</h1>
        <p>
          Each new treasure is remembered here forever. What will you discover
          next?
        </p>
        <div className="collection-progress">
          <span>
            {game.discoveries.length} of {Object.keys(items).length} found
          </span>
          <div>
            <i
              style={{
                width: `${(game.discoveries.length / Object.keys(items).length) * 100}%`,
              }}
            />
          </div>
        </div>
      </div>
      <div className="collection-list">
        {chains.map((chain) => (
          <section className="collection-chain" key={chain.id}>
            <div className="collection-heading">
              <span className="chain-dot" style={{ background: chain.color }} />
              <div>
                <h2>{chain.name}</h2>
                <p>{chain.description}</p>
              </div>
              <small>
                {
                  chain.items.filter((i) => game.discoveries.includes(i.id))
                    .length
                }
                /6
              </small>
            </div>
            <div className="collection-items">
              {chain.items.map((item) => {
                const found = game.discoveries.includes(item.id);
                return (
                  <div
                    className={`collection-item ${found ? "" : "unknown"}`}
                    key={item.id}
                  >
                    <div className="collection-art">
                      {found ? (
                        icon(
                          {
                            kind: "item",
                            instanceId: item.id,
                            definitionId: item.id,
                          },
                          "collection-piece",
                        )
                      ) : (
                        <span>?</span>
                      )}
                    </div>
                    <small>Tier {item.tier}</small>
                    <strong>{found ? item.name : "Undiscovered"}</strong>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
function SettingsModal() {
  const game = useGameStore((s) => s.game),
    setOpen = useGameStore((s) => s.setSettingsOpen),
    setSetting = useGameStore((s) => s.setSetting),
    importGame = useGameStore((s) => s.importGame),
    reset = useGameStore((s) => s.reset),
    setNotice = useGameStore((s) => s.setNotice);
  const input = useRef<HTMLInputElement>(null);
  const [confirm, setConfirm] = useState<"reset" | "import" | null>(null),
    [pending, setPending] = useState<GameState | null>(null),
    [error, setError] = useState("");
  const exportSave = () => {
    const blob = new Blob([JSON.stringify(game, null, 2)], {
        type: "application/json",
      }),
      url = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = url;
    a.download = `bear-and-burrow-save-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setNotice("Save exported.");
  };
  const readFile = async (file?: File) => {
    if (!file) return;
    try {
      setPending(parseSave(await file.text()));
      setConfirm("import");
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read this file.");
    }
  };
  const favorite = Object.entries(game.producers).sort(
    (a, b) => b[1].uses - a[1].uses,
  )[0];
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) setOpen(false);
      }}
    >
      <div
        className="settings-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Settings"
      >
        <div className="modal-heading">
          <div>
            <span className="eyebrow">A little housekeeping</span>
            <h2>Settings</h2>
          </div>
          <button
            className="icon-button"
            onClick={() => setOpen(false)}
            aria-label="Close settings"
          >
            ×
          </button>
        </div>
        <div className="settings-scroll">
          <section>
            <h3>Sounds & motion</h3>
            <label className="setting-line">
              Mute all sounds
              <input
                type="checkbox"
                checked={game.settings.mute}
                onChange={(e) => setSetting("mute", e.target.checked)}
              />
            </label>
            <label className="setting-line">
              Sound effects{" "}
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={game.settings.sfx}
                onChange={(e) => setSetting("sfx", Number(e.target.value))}
              />
            </label>
            <label className="setting-line">
              Music volume{" "}
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={game.settings.music}
                onChange={(e) => setSetting("music", Number(e.target.value))}
              />
            </label>
            <p className="helper">
              Ambient music is prepared for future audio assets; it stays quiet
              for now.
            </p>
            <label className="setting-line">
              Reduce motion
              <input
                type="checkbox"
                checked={game.settings.reducedMotion}
                onChange={(e) => setSetting("reducedMotion", e.target.checked)}
              />
            </label>
          </section>
          <section>
            <h3>Your save</h3>
            <div className="button-row">
              <button className="secondary" onClick={exportSave}>
                Export save
              </button>
              <button
                className="secondary"
                onClick={() => input.current?.click()}
              >
                Import save
              </button>
              <input
                ref={input}
                type="file"
                accept="application/json,.json"
                hidden
                onChange={(e) => void readFile(e.target.files?.[0])}
              />
            </div>
            {error && <p className="error-text">{error}</p>}
            {confirm === "import" && (
              <div className="confirm-box">
                <strong>Replace your current Bear Hollow?</strong>
                <p>This imported save will overwrite your current progress.</p>
                <div className="button-row">
                  <button
                    className="secondary"
                    onClick={() => setConfirm(null)}
                  >
                    Cancel
                  </button>
                  <button
                    className="primary"
                    onClick={() => {
                      if (pending) importGame(pending);
                      setConfirm(null);
                      setOpen(false);
                    }}
                  >
                    Import save
                  </button>
                </div>
              </div>
            )}
            <button
              className="text-button danger"
              onClick={() => setConfirm("reset")}
            >
              Reset game
            </button>
            {confirm === "reset" && (
              <div className="confirm-box">
                <strong>Start a new Bear Hollow?</strong>
                <p>
                  Your current progress will be replaced. Export first if you
                  want to keep a copy.
                </p>
                <div className="button-row">
                  <button
                    className="secondary"
                    onClick={() => setConfirm(null)}
                  >
                    Cancel
                  </button>
                  <button
                    className="danger-button"
                    onClick={() => {
                      reset();
                      setConfirm(null);
                      setOpen(false);
                    }}
                  >
                    Reset everything
                  </button>
                </div>
              </div>
            )}
          </section>
          <section>
            <h3>Little numbers</h3>
            <div className="stats-grid">
              <span>
                Merges <strong>{game.stats.merges}</strong>
              </span>
              <span>
                Orders delivered <strong>{game.stats.orders}</strong>
              </span>
              <span>
                Coins earned <strong>{game.stats.coinsEarned}</strong>
              </span>
              <span>
                Items gathered <strong>{game.stats.itemsProduced}</strong>
              </span>
              <span>
                Highest tier <strong>{game.stats.highestTier}</strong>
              </span>
              <span>
                Favorite producer{" "}
                <strong>
                  {favorite?.[1].uses ? producers[favorite[0]].name : "Soon!"}
                </strong>
              </span>
              <span>
                Play time{" "}
                <strong>{Math.floor(game.stats.playSeconds / 60)} min</strong>
              </span>
              <span>
                Hollow complete{" "}
                <strong>
                  {Math.round((game.upgrades.length / upgrades.length) * 100)}%
                </strong>
              </span>
            </div>
          </section>
          <section>
            <h3>Credits</h3>
            <p>
              Bear & Burrow · Original little woodland illustrations and game by
              this project. Made for unhurried play.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
function DebugPanel() {
  const game = useGameStore((s) => s.game),
    debug = useGameStore((s) => s.debug),
    close = useGameStore((s) => s.setDebugOpen),
    [item, setItem] = useState("forest-1");
  return (
    <div className="debug-panel">
      <button
        className="icon-button"
        onClick={() => close(false)}
        aria-label="Close debug"
      >
        ×
      </button>
      <h2>Developer tools</h2>
      <div className="button-row">
        {[
          ["coins", "+500 coins"],
          ["xp", "+500 XP"],
          ["unlock", "Unlock all"],
          ["charges", "Fill charges"],
          ["clear", "Clear items"],
          ["orders", "Complete orders"],
          ["offline", "Simulate offline"],
          ["resetProgress", "Reset progression"],
        ].map(([action, label]) => (
          <button key={action} onClick={() => debug(action)}>
            {label}
          </button>
        ))}
      </div>
      <div className="button-row">
        <select
          aria-label="Item to spawn"
          value={item}
          onChange={(e) => setItem(e.target.value)}
        >
          {chains
            .flatMap((c) => c.items)
            .map((i) => (
              <option key={i.id} value={i.id}>
                {i.name}
              </option>
            ))}
        </select>
        <button onClick={() => debug("spawn", item)}>Spawn item</button>
      </div>
      <details>
        <summary>Raw game state</summary>
        <pre>{JSON.stringify(game, null, 2)}</pre>
      </details>
      <button
        onClick={() => {
          const blob = new Blob([JSON.stringify(game, null, 2)], {
              type: "application/json",
            }),
            url = URL.createObjectURL(blob),
            a = document.createElement("a");
          a.href = url;
          a.download = "bear-debug-state.json";
          a.click();
          URL.revokeObjectURL(url);
        }}
      >
        Export state
      </button>
    </div>
  );
}
export default function App() {
  const game = useGameStore((s) => s.game),
    screen = useGameStore((s) => s.screen),
    setScreen = useGameStore((s) => s.setScreen),
    notice = useGameStore((s) => s.notice),
    setNotice = useGameStore((s) => s.setNotice),
    celebration = useGameStore((s) => s.celebration),
    sold = useGameStore((s) => s.sold),
    undo = useGameStore((s) => s.undo),
    settingsOpen = useGameStore((s) => s.settingsOpen),
    setSettingsOpen = useGameStore((s) => s.setSettingsOpen),
    debugOpen = useGameStore((s) => s.debugOpen),
    setDebugOpen = useGameStore((s) => s.setDebugOpen);
  const xp = useMemo(() => levelProgress(game.xp), [game.xp]);
  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(""), 4200);
    return () => window.clearTimeout(timeout);
  }, [notice, setNotice]);
  useEffect(() => {
    if (game.settings.reducedMotion)
      document.documentElement.dataset.reduceMotion = "true";
    else delete document.documentElement.dataset.reduceMotion;
  }, [game.settings.reducedMotion]);
  return (
    <div className={`app-shell screen-${screen}`}>
      <header className="topbar">
        <button
          className="brand"
          onClick={() => setScreen("board")}
          aria-label="Bear and Burrow home"
        >
          <span className="brand-mark">
            <span>●</span>
            <span>●</span>
            <b>ᴥ</b>
          </span>
          <span>
            Bear <em>&</em> Burrow<small>A cozy little merge game</small>
          </span>
        </button>
        <div className="status-bar">
          <div className="level-status">
            <span className="level-medallion">{game.level}</span>
            <div>
              <strong>Friendship level {game.level}</strong>
              <div className="xp-track">
                <i style={{ width: `${(xp.value / xp.max) * 100}%` }} />
              </div>
              <small>
                {xp.value}/{xp.max} XP
              </small>
            </div>
          </div>
          <div className="coin-status">
            <span>✦</span>
            <strong>{game.coins}</strong>
            <small>coins</small>
          </div>
        </div>
        <nav className="nav-tabs" aria-label="Main navigation">
          <button
            className={screen === "board" ? "active" : ""}
            onClick={() => setScreen("board")}
          >
            Board
          </button>
          <button
            className={screen === "hollow" ? "active" : ""}
            onClick={() => setScreen("hollow")}
          >
            Bear Hollow
          </button>
          <button
            className={screen === "collection" ? "active" : ""}
            onClick={() => setScreen("collection")}
          >
            Collection
          </button>
        </nav>
        <button
          className="icon-button settings-button"
          onClick={() => setSettingsOpen(true)}
          aria-label="Open settings"
        >
          ⚙
        </button>
      </header>
      <div className="ambient-leaves" aria-hidden="true">
        <span>✦</span>
        <span>✦</span>
        <span>✦</span>
      </div>
      {screen === "board" ? (
        <BoardScreen />
      ) : screen === "hollow" ? (
        <HollowScreen />
      ) : (
        <CollectionScreen />
      )}
      <footer className="app-footer">
        <span>Made with care in Bear Hollow</span>
        <span>✿ Every little merge matters</span>
        {import.meta.env.DEV && (
          <button className="text-button" onClick={() => setDebugOpen(true)}>
            Developer tools
          </button>
        )}
      </footer>
      {notice && (
        <div className="toast" role="status">
          {notice}
          {sold && <button onClick={undo}>Undo</button>}
        </div>
      )}
      {celebration && (
        <div className="celebration" role="status">
          {celebration}
        </div>
      )}
      {settingsOpen && <SettingsModal />}
      {debugOpen && import.meta.env.DEV && <DebugPanel />}
    </div>
  );
}
