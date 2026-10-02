export type Cell =
  | null
  | { kind: "item"; instanceId: string; definitionId: string }
  | { kind: "producer"; producerId: string };
export interface ItemDefinition {
  id: string;
  chainId: string;
  tier: number;
  name: string;
  asset: string;
  spriteIndex: number;
  sellValue: number;
  nextItemId?: string;
}
export interface ChainDefinition {
  id: string;
  name: string;
  short: string;
  description: string;
  items: ItemDefinition[];
  color: string;
}
export interface ProducerDefinition {
  id: string;
  name: string;
  chainId: string;
  asset: string;
  spriteIndex: number;
  maxCharges: number;
  rechargeMs: number;
  outputs: { itemId: string; weight: number }[];
}
export interface BearDefinition {
  id: string;
  name: string;
  species: string;
  personality: string;
  asset: string;
  note: string;
}
export interface UpgradeDefinition {
  id: string;
  place: string;
  title: string;
  description: string;
  cost: number;
  xp: number;
  prerequisite?: string;
  level?: number;
  unlockProducer?: string;
  unlockBear?: string;
  stage: number;
  icon: string;
}
export interface Order {
  id: string;
  bearId: string;
  requirements: { itemId: string; quantity: number }[];
  coins: number;
  xp: number;
  signature: string;
}
export interface ProducerState {
  charges: number;
  updatedAt: number;
  uses: number;
}
export interface GameSettings {
  mute: boolean;
  music: number;
  sfx: number;
  reducedMotion: boolean;
}
export interface GameState {
  version: number;
  board: Cell[];
  storage: (Cell | null)[];
  coins: number;
  xp: number;
  level: number;
  producers: Record<string, ProducerState>;
  unlockedProducers: string[];
  unlockedChains: string[];
  unlockedBears: string[];
  upgrades: string[];
  discoveries: string[];
  orders: Order[];
  recentOrders: string[];
  tutorial: number;
  tutorialSkipped: boolean;
  stats: {
    merges: number;
    orders: number;
    coinsEarned: number;
    itemsProduced: number;
    highestTier: number;
    playSeconds: number;
  };
  settings: GameSettings;
  lastReroll: number;
}
