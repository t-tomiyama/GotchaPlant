import React, { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  PermissionsAndroid,
  ActivityIndicator,
} from "react-native";
import { WebView } from "react-native-webview";
import { BleManager, Device } from "react-native-ble-plx";
import { decode } from "base-64";

const htmlContent = require("../../index.html");

const ESP32_NAME = "PG";
const SERVICE_UUID = "4fafc201-1fb5-459e-8fcc-c5c9c331914b";
const CHARACTERISTIC_UUID = "beb5483e-36e1-4688-b7f5-ea07361b26a8";

const manager = new BleManager();

export default function IndexScreen() {
  const webViewRef = useRef<WebView>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [deviceConnected, setDeviceConnected] = useState(false);

  useEffect(() => {
    async function requestPermissions() {
      if (Platform.OS === "android") {
        await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        ]);
      }
    }
    requestPermissions();
    return () => {
      manager.destroy();
    };
  }, []);

  const scanAndConnect = () => {
    setIsScanning(true);
    manager.startDeviceScan(null, null, (error, scannedDevice) => {
      if (error) {
        console.warn(error);
        setIsScanning(false);
        return;
      }

      if (scannedDevice && scannedDevice.name === ESP32_NAME) {
        manager.stopDeviceScan();
        setIsScanning(false);
        connectToDevice(scannedDevice);
      }
    });
  };

  const connectToDevice = async (scannedDevice: Device) => {
    try {
      const connectedDevice = await scannedDevice.connect();
      await connectedDevice.discoverAllServicesAndCharacteristics();
      setDeviceConnected(true);

      connectedDevice.monitorCharacteristicForService(
        SERVICE_UUID,
        CHARACTERISTIC_UUID,
        (error, characteristic) => {
          if (error) {
            console.warn(error);
            setDeviceConnected(false);
            return;
          }

          if (characteristic?.value) {
            const rawData = decode(characteristic.value);
            try {
              const data = JSON.parse(rawData);
              const script = `window.receberDadosDoBluetooth(${data.temperatura}, ${data.umidade_solo}, ${data.luminosidade}); true;`;
              if (webViewRef.current) {
                webViewRef.current.injectJavaScript(script);
              }
            } catch (e) {
              console.log("Erro no parsing JSON: ", e);
            }
          }
        },
      );
    } catch (e) {
      console.log("Erro de Conexão", e);
      setDeviceConnected(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <WebView
        ref={webViewRef}
        source={htmlContent}
        style={styles.webview}
        originWhitelist={["*"]}
        javaScriptEnabled={true}
        bounces={false}
        scrollEnabled={false}
      />

      {!deviceConnected && (
        <View style={styles.overlayButtonContainer}>
          <TouchableOpacity
            style={styles.connectBtn}
            onPress={scanAndConnect}
            disabled={isScanning}
          >
            {isScanning ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.btnText}>Conectar Bluetooth</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F5F0" },
  webview: { flex: 1, backgroundColor: "transparent" },
  overlayButtonContainer: {
    position: "absolute",
    bottom: 40,
    width: "100%",
    alignItems: "center",
  },
  connectBtn: {
    backgroundColor: "#FF8BA7",
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 30,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  btnText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "bold",
  },
});
