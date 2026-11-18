import { useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { Garden } from '@/constants/garden';

const SKY_BANDS = 8;

function mix(a: string, b: string, t: number): string {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return `rgb(${pa.map((v, i) => Math.round(v + (pb[i] - v) * t)).join(',')})`;
}

function Cloud({ top, left, scale }: { top: number; left: number; scale: number }) {
  return (
    <View style={[styles.cloud, { top, left, transform: [{ scale }] }]}>
      <View style={[styles.puff, { width: 50, height: 50, top: -25, left: 15 }]} />
      <View style={[styles.puff, { width: 40, height: 40, top: -15, right: 15 }]} />
    </View>
  );
}

/**
 * Sky, clouds and rolling hills behind the native screens — the same scenery
 * as the plant dashboard, drawn with plain Views (no extra native modules).
 */
export function GardenBackground() {
  const window = useWindowDimensions();
  // The screen is shorter than the window (tab bar, modal insets), so measure it:
  // otherwise the hills end up hidden behind the tab bar.
  const [size, setSize] = useState({ width: window.width, height: window.height });
  const { width, height } = size;
  const hill = width * 1.6;

  return (
    <View
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
      onLayout={(e) => setSize({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}>
      {Array.from({ length: SKY_BANDS }, (_, i) => (
        <View
          key={i}
          style={{ flex: 1, backgroundColor: mix(Garden.sky1, Garden.sky2, i / (SKY_BANDS - 1)) }}
        />
      ))}

      <Cloud top={height * 0.1} left={-20} scale={0.9} />
      <Cloud top={height * 0.2} left={width - 110} scale={1.15} />
      <Cloud top={height * 0.06} left={width * 0.5} scale={0.6} />

      <View
        style={[
          styles.hill,
          { width: hill, height: hill, borderRadius: hill / 2, backgroundColor: Garden.hillBack },
          { left: -hill * 0.55, top: height - hill * 0.16 },
        ]}
      />
      <View
        style={[
          styles.hill,
          { width: hill, height: hill, borderRadius: hill / 2, backgroundColor: Garden.hillFront },
          { left: width - hill * 0.62, top: height - hill * 0.1 },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  cloud: {
    position: 'absolute',
    width: 100,
    height: 30,
    borderRadius: 50,
    backgroundColor: Garden.cloud,
    opacity: 0.9,
  },
  puff: { position: 'absolute', borderRadius: 50, backgroundColor: Garden.cloud },
  hill: { position: 'absolute' },
});
