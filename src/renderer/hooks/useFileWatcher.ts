import { useEffect } from 'react';

export function useFileWatcher(coursePath: string | null) {
  useEffect(() => {
    if (!coursePath) {
      return;
    }

    void window.synapse.watchCourse(coursePath);
  }, [coursePath]);
}
