// Declares the react-native-background-actions service as a "connectedDevice"
// foreground service (required on Android 14+ to keep BLE work alive in the
// background) and adds the matching permissions.
const { AndroidConfig, withAndroidManifest } = require('expo/config-plugins');

const SERVICE_NAME = 'com.asterinet.react.bgactions.RNBackgroundActionsTask';
const PERMISSIONS = [
  'android.permission.FOREGROUND_SERVICE',
  'android.permission.FOREGROUND_SERVICE_CONNECTED_DEVICE',
];

module.exports = function withBackgroundMonitor(config) {
  config = AndroidConfig.Permissions.withPermissions(config, PERMISSIONS);
  return withAndroidManifest(config, (mod) => {
    const app = AndroidConfig.Manifest.getMainApplicationOrThrow(mod.modResults);
    app.service = app.service ?? [];
    let service = app.service.find((s) => s.$['android:name'] === SERVICE_NAME);
    if (!service) {
      service = { $: { 'android:name': SERVICE_NAME } };
      app.service.push(service);
    }
    service.$['android:foregroundServiceType'] = 'connectedDevice';
    service.$['android:exported'] = 'false';
    return mod;
  });
};
