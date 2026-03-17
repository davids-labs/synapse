import { useEffect, useState } from 'react';
import type { BootstrapData } from '../../shared/types';
import { useGraphStore } from '../store/graphStore';
import { useSettingsStore } from '../store/settingsStore';

export function useBootstrap() {
  const [bootstrap, setBootstrap] = useState<BootstrapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hydrateSettings = useSettingsStore((state) => state.hydrateSettings);

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      try {
        const result = await window.synapse.loadBootstrap();
        if (!mounted) {
          return;
        }
        hydrateSettings(result.settings);
        setBootstrap(result);
        setError(null);
      } catch (cause) {
        if (mounted) {
          setError(cause instanceof Error ? cause.message : 'Failed to load bootstrap data');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void load();
    return () => {
      mounted = false;
    };
  }, [hydrateSettings]);

  return {
    bootstrap,
    loading,
    error,
    setBootstrap,
  };
}

export function useGraphData(coursePath: string | null) {
  const setCourse = useGraphStore((state) => state.setCourse);
  const clearCourse = useGraphStore((state) => state.clearCourse);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadCourse() {
      if (!coursePath) {
        clearCourse();
        return;
      }

      setLoading(true);
      try {
        const course = await window.synapse.loadCourse(coursePath);
        if (!mounted) {
          return;
        }
        setCourse(course);
        setError(null);
      } catch (cause) {
        if (mounted) {
          setError(cause instanceof Error ? cause.message : 'Failed to load course');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void loadCourse();
    return () => {
      mounted = false;
    };
  }, [coursePath, clearCourse, setCourse]);

  useEffect(() => {
    if (!coursePath) {
      return;
    }

    return window.synapse.onCourseUpdated((course) => {
      if (course.coursePath === coursePath) {
        setCourse(course);
      }
    });
  }, [coursePath, setCourse]);

  return {
    loading,
    error,
  };
}
