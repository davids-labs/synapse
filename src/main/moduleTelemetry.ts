import type {
  ModuleRuntimeEvent,
  ModuleRuntimeEventInput,
  ModuleRuntimeEventType,
  ModuleRuntimeHealthReport,
} from '../shared/types';
import { REQUIRED_MODULE_OBSERVABILITY_EVENTS } from '../shared/constants';

const MAX_EVENTS = 500;

const counters: Record<ModuleRuntimeEventType, number> = REQUIRED_MODULE_OBSERVABILITY_EVENTS.reduce(
  (collection, eventType) => {
    collection[eventType] = 0;
    return collection;
  },
  {} as Record<ModuleRuntimeEventType, number>,
);

const events: ModuleRuntimeEvent[] = [];

function nextEventId(): string {
  return `module-event-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function recordModuleRuntimeEvent(input: ModuleRuntimeEventInput): ModuleRuntimeEvent {
  const event: ModuleRuntimeEvent = {
    id: nextEventId(),
    moduleType: input.moduleType,
    eventType: input.eventType,
    message: input.message,
    severity: input.severity ?? 'error',
    context: input.context,
    timestamp: new Date().toISOString(),
  };

  counters[event.eventType] = (counters[event.eventType] ?? 0) + 1;
  events.unshift(event);
  if (events.length > MAX_EVENTS) {
    events.length = MAX_EVENTS;
  }

  return event;
}

export function getModuleRuntimeHealthReport(limit = 60): ModuleRuntimeHealthReport {
  const normalizedLimit = Math.max(1, Math.min(limit, 200));
  return {
    generatedAt: new Date().toISOString(),
    counters: { ...counters },
    recentEvents: events.slice(0, normalizedLimit),
  };
}
