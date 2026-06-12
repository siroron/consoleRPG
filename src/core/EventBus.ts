export type SceneName = 'title' | 'field' | 'battle' | 'menu' | 'shop' | 'gameover' | 'gameclear';

type EventMap = {
  'scene:change': { to: SceneName };
  'battle:start': { enemies: string[] };
  'battle:end': { victory: boolean };
  'party:levelup': { characterIndex: number; newLevel: number };
  'game:save': { slot: number };
  'game:quit': Record<string, never>;
};

type EventHandler<T> = (payload: T) => void | Promise<void>;

export class EventBus {
  private readonly listeners = new Map<string, EventHandler<unknown>[]>();

  on<K extends keyof EventMap>(event: K, handler: EventHandler<EventMap[K]>): void {
    const list = this.listeners.get(event) ?? [];
    list.push(handler as EventHandler<unknown>);
    this.listeners.set(event, list);
  }

  off<K extends keyof EventMap>(event: K, handler: EventHandler<EventMap[K]>): void {
    const list = this.listeners.get(event) ?? [];
    const filtered = list.filter((h) => h !== (handler as EventHandler<unknown>));
    this.listeners.set(event, filtered);
  }

  once<K extends keyof EventMap>(event: K, handler: EventHandler<EventMap[K]>): void {
    const wrapper: EventHandler<EventMap[K]> = async (payload) => {
      this.off(event, wrapper);
      await handler(payload);
    };
    this.on(event, wrapper);
  }

  async emit<K extends keyof EventMap>(event: K, payload: EventMap[K]): Promise<void> {
    const list = this.listeners.get(event) ?? [];
    for (const handler of list) {
      await handler(payload as unknown);
    }
  }

  clear(): void {
    this.listeners.clear();
  }
}
