/// <reference types="vite/client" />

import type { SynapseApi } from '../shared/api';

declare global {
  interface Window {
    synapse: SynapseApi;
  }
}
