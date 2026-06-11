import type { Player } from './Player.js';

export class Party {
  readonly members: Player[];

  constructor(members: Player[]) {
    this.members = members;
  }

  get aliveMembers(): Player[] {
    return this.members.filter((m) => m.isAlive);
  }

  get isWiped(): boolean {
    return this.members.every((m) => m.isKO);
  }

  get size(): number {
    return this.members.length;
  }
}
