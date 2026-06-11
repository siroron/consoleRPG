import type { SceneName } from './EventBus.js';
import type { PlayerData } from '../entities/Player.js';

export type { PlayerData };
export type AreaId = 'town' | 'forest' | 'cave';

export interface GameStateSnapshot {
  currentScene: SceneName;
  playtime: number;
  gold: number;
  party: PlayerData[];
  pendingBattle: { enemyIds: string[] } | null;
  ownedEquipment: string[];
  inventory: { itemId: string; count: number }[];
  currentArea: AreaId;
}

const DEFAULT_STATE: GameStateSnapshot = {
  currentScene: 'title',
  playtime: 0,
  gold: 0,
  party: [],
  pendingBattle: null,
  ownedEquipment: [],
  inventory: [],
  currentArea: 'town',
};

export class GameState {
  private state: GameStateSnapshot;

  constructor(initial?: Partial<GameStateSnapshot>) {
    this.state = { ...DEFAULT_STATE, ...initial };
  }

  get<K extends keyof GameStateSnapshot>(key: K): GameStateSnapshot[K] {
    return this.state[key];
  }

  set<K extends keyof GameStateSnapshot>(key: K, value: GameStateSnapshot[K]): void {
    this.state[key] = value;
  }

  snapshot(): GameStateSnapshot {
    return structuredClone(this.state);
  }

  restore(snapshot: GameStateSnapshot): void {
    this.state = structuredClone(snapshot);
  }
}
