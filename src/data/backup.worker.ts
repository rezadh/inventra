import { assertBackupSize, parseBackup } from '../domain/inventory';
self.onmessage = async (event: MessageEvent<File>) => {
  try {
    assertBackupSize(event.data.size);
    const data = parseBackup(JSON.parse(await event.data.text()));
    self.postMessage({ data });
  } catch (error) {
    self.postMessage({
      error:
        error instanceof SyntaxError
          ? 'File JSON tidak valid.'
          : error instanceof Error
            ? error.message
            : 'Backup tidak valid.',
    });
  }
};
