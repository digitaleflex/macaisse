// Appareils de caisse (D6) : liste, enrôlement, révocation, définition du PIN.
// Les données viennent du serveur (`api.devices`) ; rien n'est persisté ici.

import { create } from 'zustand';
import type { Device, DeviceEnrollment, EnrollDeviceInput } from '@/types';
import { api } from '@/services';

export type DevicesStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface DevicesState {
  devices: Device[];
  status: DevicesStatus;
  error: string | null;
  load: (organizationId: string) => Promise<void>;
  enroll: (organizationId: string, input: EnrollDeviceInput) => Promise<DeviceEnrollment>;
  revoke: (organizationId: string, deviceId: string) => Promise<void>;
  setPin: (organizationId: string, userId: string, pin: string) => Promise<void>;
  reset: () => void;
}

export const useDevicesStore = create<DevicesState>()((set) => ({
  devices: [],
  status: 'idle',
  error: null,
  load: async (organizationId) => {
    set({ status: 'loading', error: null });
    try {
      const devices = await api.devices.list(organizationId);
      set({ devices, status: 'ready' });
    } catch (error) {
      set({ status: 'error', error: error instanceof Error ? error.message : null });
    }
  },
  enroll: async (organizationId, input) => {
    const enrollment = await api.devices.enroll(organizationId, input);
    set((state) => ({ devices: [...state.devices, enrollment.device] }));
    return enrollment;
  },
  revoke: async (organizationId, deviceId) => {
    await api.devices.revoke(organizationId, deviceId);
    set((state) => ({
      devices: state.devices.map((device) =>
        device.id === deviceId ? { ...device, revokedAt: new Date().toISOString() } : device
      ),
    }));
  },
  setPin: async (organizationId, userId, pin) => {
    await api.devices.setPin(organizationId, userId, pin);
  },
  reset: () => set({ devices: [], status: 'idle', error: null }),
}));
