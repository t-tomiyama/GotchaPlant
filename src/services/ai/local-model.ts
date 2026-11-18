import { Directory, File, Paths } from 'expo-file-system';

import { AI_MODEL } from '@/constants/ai-model';

export type LocalModelState =
  | { status: 'checking' }
  | { status: 'missing' }
  | { status: 'downloading'; progress: number }
  | { status: 'ready'; uri: string }
  | { status: 'error'; message: string };

type Listener = () => void;

/**
 * Owns the model file in the app's private storage and exposes its state as an
 * external store, so every screen sees the same download progress and a
 * download keeps running when the sheet that started it is closed.
 *
 * The file is downloaded to `<name>.part` and only renamed once its size matches,
 * so a partial download is never mistaken for a usable model.
 */
class LocalModelManager {
  private state: LocalModelState = { status: 'checking' };
  private listeners = new Set<Listener>();
  private abort: AbortController | null = null;

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = (): LocalModelState => this.state;

  private setState(next: LocalModelState) {
    this.state = next;
    this.listeners.forEach((listener) => listener());
  }

  private get directory() {
    return new Directory(Paths.document, 'models');
  }

  private get modelFile() {
    return new File(this.directory, AI_MODEL.fileName);
  }

  private get partialFile() {
    return new File(this.directory, `${AI_MODEL.fileName}.part`);
  }

  /** Checks what is on disk. Safe to call repeatedly; never interrupts a download. */
  refresh(): void {
    if (this.state.status === 'downloading') return;
    try {
      const file = this.modelFile;
      if (file.exists && file.size === AI_MODEL.sizeBytes) {
        this.setState({ status: 'ready', uri: file.uri });
        return;
      }
      // A file with the wrong size is a leftover from an interrupted download.
      if (file.exists) file.delete();
      if (this.partialFile.exists) this.partialFile.delete();
      this.setState({ status: 'missing' });
    } catch (e) {
      this.setState({ status: 'error', message: errorMessage(e) });
    }
  }

  async download(): Promise<void> {
    if (this.state.status === 'downloading' || this.state.status === 'ready') return;

    const controller = new AbortController();
    this.abort = controller;
    this.setState({ status: 'downloading', progress: 0 });

    try {
      this.directory.create({ intermediates: true, idempotent: true });
      if (this.partialFile.exists) this.partialFile.delete();

      let lastPercent = -1;
      await File.downloadFileAsync(AI_MODEL.url, this.partialFile, {
        signal: controller.signal,
        onProgress: ({ bytesWritten, totalBytes }) => {
          const total = totalBytes > 0 ? totalBytes : AI_MODEL.sizeBytes;
          const percent = Math.min(100, Math.floor((bytesWritten / total) * 100));
          if (percent === lastPercent) return;
          lastPercent = percent;
          this.setState({ status: 'downloading', progress: percent / 100 });
        },
      });

      if (this.partialFile.size !== AI_MODEL.sizeBytes) {
        throw new Error('O download ficou incompleto. Verifique a conexão e tente novamente.');
      }
      if (this.modelFile.exists) this.modelFile.delete();
      await this.partialFile.move(this.modelFile);
      this.setState({ status: 'ready', uri: this.modelFile.uri });
    } catch (e) {
      try {
        if (this.partialFile.exists) this.partialFile.delete();
      } catch {
        // Nothing left to clean up.
      }
      this.setState(
        controller.signal.aborted
          ? { status: 'missing' }
          : { status: 'error', message: errorMessage(e) },
      );
    } finally {
      this.abort = null;
    }
  }

  cancelDownload(): void {
    this.abort?.abort();
  }

  remove(): void {
    try {
      if (this.modelFile.exists) this.modelFile.delete();
      this.setState({ status: 'missing' });
    } catch (e) {
      this.setState({ status: 'error', message: errorMessage(e) });
    }
  }
}

function errorMessage(e: unknown): string {
  return e instanceof Error && e.message ? e.message : 'Não foi possível baixar o modelo.';
}

export const localModel = new LocalModelManager();
