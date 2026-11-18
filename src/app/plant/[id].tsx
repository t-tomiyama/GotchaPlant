import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

import { BleDevicePicker } from '@/components/ble-device-picker';
import { DiagnosisSheet } from '@/components/diagnosis-sheet';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { CHART_HISTORY_POINTS } from '@/constants/plant';
import { SEVERITY_META } from '@/constants/severity';
import { Spacing } from '@/constants/theme';
import { usePlantMonitor } from '@/hooks/use-plant-monitor';

const htmlContent = require('../../../index.html');

export default function PlantMonitorScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const webViewRef = useRef<WebView>(null);
  const [webViewReady, setWebViewReady] = useState(false);
  const [diagnosisOpen, setDiagnosisOpen] = useState(false);

  const {
    plant,
    loaded,
    history,
    liveReading,
    diagnosis,
    connectionState,
    connect,
    connectAndBind,
    disconnect,
  } = usePlantMonitor(id);

  useEffect(() => {
    if (!webViewReady || !plant) return;
    webViewRef.current?.injectJavaScript(
      `window.setPlantProfile(${JSON.stringify(plant.name)}, ${JSON.stringify(plant.category)}); true;`,
    );
  }, [webViewReady, plant]);

  useEffect(() => {
    if (!webViewReady) return;
    webViewRef.current?.injectJavaScript(
      `window.syncHistory(${JSON.stringify(JSON.stringify(history.slice(-CHART_HISTORY_POINTS)))}); true;`,
    );
  }, [webViewReady, history]);

  useEffect(() => {
    if (!webViewReady || !liveReading) return;
    webViewRef.current?.injectJavaScript(
      `window.receberDadosDoBluetooth(${liveReading.temperatura}, ${liveReading.umidade_solo}, ${liveReading.luminosidade}); true;`,
    );
  }, [webViewReady, liveReading]);

  if (!plant) {
    return (
      <ThemedView style={styles.centerContainer}>
        {loaded ? (
          <ThemedText themeColor="textSecondary">Planta não encontrada.</ThemedText>
        ) : (
          <ActivityIndicator />
        )}
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <WebView
        ref={webViewRef}
        source={htmlContent}
        style={styles.webview}
        originWhitelist={['*']}
        javaScriptEnabled
        bounces={false}
        scrollEnabled={false}
        onLoadEnd={() => setWebViewReady(true)}
      />

      <SafeAreaView style={styles.topBar} pointerEvents="box-none">
        <TouchableOpacity onPress={() => router.back()}>
          <ThemedView type="backgroundElement" style={styles.backButton}>
            <ThemedText type="smallBold">‹ Início</ThemedText>
          </ThemedView>
        </TouchableOpacity>
        {diagnosis && (
          <TouchableOpacity onPress={() => setDiagnosisOpen(true)} accessibilityLabel="Abrir diagnóstico">
            <ThemedView type="backgroundElement" style={styles.backButton}>
              <ThemedText type="smallBold">
                {diagnosis.source === 'none' ? '🩺' : SEVERITY_META[diagnosis.severity].emoji} Diagnóstico
              </ThemedText>
            </ThemedView>
          </TouchableOpacity>
        )}
      </SafeAreaView>

      <View style={styles.overlayButtonContainer} pointerEvents="box-none">
        {connectionState === 'connected' ? (
          <TouchableOpacity onPress={disconnect}>
            <ThemedView type="backgroundElement" style={styles.pillButton}>
              <ThemedText type="smallBold">Desconectar</ThemedText>
            </ThemedView>
          </TouchableOpacity>
        ) : !plant.deviceId ? (
          <ThemedView type="backgroundElement" style={styles.pickerCard}>
            <ThemedText type="small" style={styles.pickerLabel}>
              Escolha o dispositivo Bluetooth desta planta
            </ThemedText>
            <BleDevicePicker selectedDeviceId={plant.deviceId} onSelect={connectAndBind} />
          </ThemedView>
        ) : (
          <TouchableOpacity onPress={connect} disabled={connectionState === 'connecting'}>
            <ThemedView type="backgroundSelected" style={styles.pillButton}>
              {connectionState === 'connecting' ? (
                <ActivityIndicator />
              ) : (
                <ThemedText type="smallBold">
                  {connectionState === 'error' ? 'Tentar novamente' : 'Conectar Bluetooth'}
                </ThemedText>
              )}
            </ThemedView>
          </TouchableOpacity>
        )}
      </View>

      {diagnosis && (
        <DiagnosisSheet
          visible={diagnosisOpen}
          onClose={() => setDiagnosisOpen(false)}
          plant={plant}
          diagnosis={diagnosis}
          history={history}
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centerContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  webview: { flex: 1, backgroundColor: 'transparent' },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    padding: Spacing.three,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  backButton: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.five,
  },
  overlayButtonContainer: {
    position: 'absolute',
    bottom: Spacing.five,
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
  },
  pillButton: {
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.five,
    borderRadius: Spacing.five,
    elevation: 4,
  },
  pickerCard: {
    width: '100%',
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.two,
  },
  pickerLabel: { textAlign: 'center' },
});
