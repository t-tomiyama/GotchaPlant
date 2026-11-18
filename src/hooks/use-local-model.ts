import { useEffect, useSyncExternalStore } from 'react';

import { localModel } from '@/services/ai/local-model';

const actions = {
  download: () => localModel.download(),
  cancel: () => localModel.cancelDownload(),
  remove: () => localModel.remove(),
};

/** State of the on-device model file, shared by every screen that shows it. */
export function useLocalModel() {
  const state = useSyncExternalStore(localModel.subscribe, localModel.getSnapshot);

  useEffect(() => {
    localModel.refresh();
  }, []);

  return { state, ...actions };
}
