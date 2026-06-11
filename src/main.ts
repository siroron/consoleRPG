import chalk from 'chalk';
import { GameLoop } from './core/GameLoop.js';
import { GameState } from './core/GameState.js';
import { SceneManager } from './core/SceneManager.js';
import { EventBus } from './core/EventBus.js';
import { RNG } from './core/RNG.js';
import { DataLoader } from './data-access/DataLoader.js';
import { TitleScene } from './scenes/TitleScene.js';
import { FieldScene } from './scenes/FieldScene.js';
import { BattleScene } from './scenes/BattleScene.js';
import { GameOverScene } from './scenes/GameOverScene.js';

async function main(): Promise<void> {
  const eventBus    = new EventBus();
  const gameState   = new GameState();
  const rng         = new RNG();
  const dataLoader  = new DataLoader();
  const sceneManager = new SceneManager();

  const ctx = { sceneManager, gameState, eventBus, rng, dataLoader };

  try {
    await dataLoader.getMonsters();
    await dataLoader.getSkills();
  } catch (err) {
    console.error(chalk.red('Failed to load game data:'), err);
    process.exit(1);
  }

  sceneManager.register('title',   () => new TitleScene(ctx));
  sceneManager.register('field',   () => new FieldScene(ctx));
  sceneManager.register('battle',  () => new BattleScene(ctx));
  sceneManager.register('gameover', () => new GameOverScene(ctx));

  const loop = new GameLoop(sceneManager, gameState);

  eventBus.on('game:quit', async () => {
    loop.stop();
    console.log(chalk.dim('\nGoodbye!'));
    process.exit(0);
  });

  await sceneManager.transition('title');
  await loop.start();
}

main().catch((err: unknown) => {
  console.error(chalk.red('Fatal error:'), err);
  process.exit(1);
});
