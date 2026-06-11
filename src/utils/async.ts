export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function waitForKeypress(): Promise<void> {
  const { input } = await import('@inquirer/prompts');
  await input({ message: '' });
}

export function pollUntil(
  fn: () => boolean | Promise<boolean>,
  intervalMs = 100,
): Promise<void> {
  return new Promise((resolve) => {
    const check = async (): Promise<void> => {
      const done = await fn();
      if (done) {
        resolve();
      } else {
        setTimeout(check, intervalMs);
      }
    };
    void check();
  });
}
