import { decode } from 'base-64';
import { PermissionsAndroid, Platform } from 'react-native';
import { BleManager, type Device, type Subscription } from 'react-native-ble-plx';

export const SERVICE_UUID = '4fafc201-1fb5-459e-8fcc-c5c9c331914b';
export const CHARACTERISTIC_UUID = 'beb5483e-36e1-4688-b7f5-ea07361b26a8';

/** Who opened a connection: the plant screen (live view) or the background monitor. */
export type ConnectionOwner = 'screen' | 'background';

/** Thrown when the background monitor finds a device already in use by the plant screen. */
export class DeviceBusyError extends Error {
  constructor() {
    super('Dispositivo já está conectado na tela da planta.');
  }
}

export type SensorReading = {
  temperatura: number;
  umidade_solo: number;
  luminosidade: number;
};

/**
 * Wraps react-native-ble-plx so the rest of the app never touches
 * BleManager directly. Single module-scoped BleManager instance, shared by
 * every plant screen (BleManager.destroy() tears down the native module and
 * is intentionally never called here — only on full app teardown).
 */
class PlantBleService {
  private manager = new BleManager();
  private owners = new Map<string, ConnectionOwner>();

  /** Asks for the Bluetooth permissions; resolves true when connecting to a device is allowed. */
  async requestPermissions(): Promise<boolean> {
    if (Platform.OS !== 'android') return true;
    const result = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
    ]);
    // BLUETOOTH_CONNECT only exists from Android 12 (API 31); older versions grant connections by default.
    if (Number(Platform.Version) < 31) return true;
    return result[PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT] === PermissionsAndroid.RESULTS.GRANTED;
  }

  /**
   * Only "Dispositivos próximos" (connect). Enough for the background monitor, which
   * connects straight to the paired device and never scans, so it doesn't need location.
   */
  async requestConnectPermission(): Promise<boolean> {
    if (Platform.OS !== 'android' || Number(Platform.Version) < 31) return true;
    const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT);
    return result === PermissionsAndroid.RESULTS.GRANTED;
  }

  /** Same check without prompting, for code that runs in the background. */
  async hasConnectPermission(): Promise<boolean> {
    if (Platform.OS !== 'android' || Number(Platform.Version) < 31) return true;
    return PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT);
  }

  async isBluetoothOn(): Promise<boolean> {
    try {
      return (await this.manager.state()) === 'PoweredOn';
    } catch {
      return false;
    }
  }

  isInUse(deviceId: string): boolean {
    return this.owners.has(deviceId);
  }

  scanForDevices(onDevice: (device: Device) => void, onError: (error: Error) => void): void {
    this.manager.startDeviceScan(null, null, (error, device) => {
      if (error) {
        onError(error);
        return;
      }
      if (device?.name) {
        onDevice(device);
      }
    });
  }

  stopScan(): void {
    this.manager.stopDeviceScan();
  }

  /**
   * The plant screen always wins: if the background monitor is mid-read on this
   * device, that read is cancelled. The background never interrupts the screen.
   */
  async connectToDevice(
    deviceId: string,
    { owner = 'screen', timeoutMs }: { owner?: ConnectionOwner; timeoutMs?: number } = {},
  ): Promise<Device> {
    const current = this.owners.get(deviceId);
    if (current === 'screen' && owner === 'background') throw new DeviceBusyError();
    if (current === 'background' && owner === 'screen') {
      await this.disconnectDevice(deviceId, 'background');
    }

    this.owners.set(deviceId, owner);
    try {
      const device = await this.manager.connectToDevice(deviceId, timeoutMs ? { timeout: timeoutMs } : undefined);
      await device.discoverAllServicesAndCharacteristics();
      return device;
    } catch (e) {
      if (this.owners.get(deviceId) === owner) this.owners.delete(deviceId);
      throw e;
    }
  }

  /**
   * Background read: connects, waits for the next sensor notification (the board
   * notifies every few seconds), then disconnects. Rejects if the plant is out of
   * range, the board doesn't send anything in time, or the screen is using it.
   */
  async readOnce(deviceId: string, { timeoutMs = 12_000 } = {}): Promise<SensorReading> {
    const device = await this.connectToDevice(deviceId, { owner: 'background', timeoutMs });
    let subscription: Subscription | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await new Promise<SensorReading>((resolve, reject) => {
        timer = setTimeout(() => reject(new Error('Nenhuma leitura recebida do sensor a tempo.')), timeoutMs);
        subscription = this.monitorSensorData(device, resolve, reject);
      });
    } finally {
      if (timer) clearTimeout(timer);
      (subscription as Subscription | null)?.remove();
      await this.disconnectDevice(deviceId, 'background');
    }
  }

  monitorSensorData(
    device: Device,
    onData: (reading: SensorReading) => void,
    onError: (error: Error) => void,
  ): Subscription {
    return device.monitorCharacteristicForService(
      SERVICE_UUID,
      CHARACTERISTIC_UUID,
      (error, characteristic) => {
        if (error) {
          onError(error);
          return;
        }
        if (!characteristic?.value) return;
        try {
          const reading = JSON.parse(decode(characteristic.value)) as SensorReading;
          onData(reading);
        } catch (e) {
          console.log('Erro no parsing JSON: ', e);
        }
      },
    );
  }

  /** Only closes the connection if `owner` opened it, so one side never drops the other's link. */
  async disconnectDevice(deviceId: string, owner: ConnectionOwner = 'screen'): Promise<void> {
    if (this.owners.get(deviceId) !== owner) return;
    this.owners.delete(deviceId);
    try {
      await this.manager.cancelDeviceConnection(deviceId);
    } catch {
      // Already disconnected — nothing to do.
    }
  }
}

export const plantBleService = new PlantBleService();
