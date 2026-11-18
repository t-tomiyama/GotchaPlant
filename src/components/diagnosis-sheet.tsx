import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LocalModelCard } from './local-model-card';
import { SeverityBadge } from './severity-badge';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import { AI_MODEL } from '@/constants/ai-model';
import { getCategoryEmoji } from '@/constants/plant';
import { SEVERITY_META } from '@/constants/severity';
import { Spacing } from '@/constants/theme';
import { usePlantAdvisor } from '@/hooks/use-plant-advisor';
import { formatAge } from '@/utils/format-age';

import type { Finding, PlantAdvice, PlantDiagnosis } from '@/types/diagnosis';
import type { PlantProfile, SensorHistoryEntry } from '@/types/plant';

type DiagnosisSheetProps = {
  visible: boolean;
  onClose: () => void;
  plant: PlantProfile;
  diagnosis: PlantDiagnosis;
  history: SensorHistoryEntry[];
};

export function DiagnosisSheet({ visible, onClose, plant, diagnosis, history }: DiagnosisSheetProps) {
  const insets = useSafeAreaInsets();
  const advisor = usePlantAdvisor({ plant, history, diagnosis, active: visible });

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Fechar diagnóstico" />
        <ThemedView style={[styles.sheet, { paddingBottom: insets.bottom + Spacing.three }]}>
          <View style={styles.handle} />
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.header}>
              <ThemedText style={styles.emoji}>{getCategoryEmoji(plant.category)}</ThemedText>
              <View style={styles.headerText}>
                <ThemedText type="subtitle" style={styles.plantName} numberOfLines={1}>
                  {plant.name}
                </ThemedText>
                <SeverityBadge
                  severity={diagnosis.source === 'none' ? 'ok' : diagnosis.severity}
                  label={diagnosis.source === 'none' ? 'Sem leituras' : undefined}
                />
              </View>
            </View>

            <ReadingLine diagnosis={diagnosis} />
            <Findings diagnosis={diagnosis} plant={plant} />

            <ThemedText type="smallBold" style={styles.sectionTitle}>
              Análise da IA (no aparelho)
            </ThemedText>
            {advisor.model.status !== 'ready' ? (
              <LocalModelCard
                state={advisor.model}
                onDownload={advisor.download}
                onCancel={advisor.cancelDownload}
              />
            ) : (
              <AdvicePanel diagnosis={diagnosis} advisor={advisor} />
            )}

            <ThemedText type="small" themeColor="textSecondary" style={styles.privacy}>
              🔒 Nenhum dado é enviado para terceiros: os dados são analisados apenas localmente, no seu dispositivo.
            </ThemedText>
          </ScrollView>

          <TouchableOpacity onPress={onClose}>
            <ThemedView type="backgroundSelected" style={styles.closeButton}>
              <ThemedText type="smallBold">Fechar</ThemedText>
            </ThemedView>
          </TouchableOpacity>
        </ThemedView>
      </View>
    </Modal>
  );
}

function ReadingLine({ diagnosis }: { diagnosis: PlantDiagnosis }) {
  if (!diagnosis.reading || diagnosis.readingAt === null) {
    return (
      <ThemedText type="small" themeColor="textSecondary">
        Ainda não há leituras. Conecte o sensor para começar o diagnóstico.
      </ThemedText>
    );
  }
  const { temp, moist, light } = diagnosis.reading;
  const when =
    diagnosis.source === 'live' ? 'agora' : `${formatAge(Date.now() - diagnosis.readingAt)} (última salva)`;
  return (
    <View style={styles.readingBlock}>
      <ThemedText type="small" themeColor="textSecondary">
        Leitura {when}
      </ThemedText>
      <ThemedText type="smallBold">
        🌡️ {temp}°C   💧 {moist}%   💡 {light} lx
      </ThemedText>
      {diagnosis.stale && (
        <ThemedText type="small" style={styles.warnText}>
          Essa leitura é antiga e pode não refletir a planta agora. Conecte o sensor para atualizar.
        </ThemedText>
      )}
    </View>
  );
}

function Findings({ diagnosis, plant }: { diagnosis: PlantDiagnosis; plant: PlantProfile }) {
  if (diagnosis.source === 'none') return null;

  if (diagnosis.findings.length === 0) {
    return (
      <ThemedView type="backgroundElement" style={[styles.finding, { borderLeftColor: SEVERITY_META.ok.color }]}>
        <ThemedText type="smallBold">✅ Tudo certo com {plant.name}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Todos os valores estão dentro do ideal para plantas do tipo {plant.category}.
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <View style={styles.findingList}>
      <ThemedText type="smallBold" style={styles.sectionTitle}>
        Avisos e sugestões
      </ThemedText>
      {diagnosis.findings.map((finding) => (
        <FindingCard key={finding.id} finding={finding} />
      ))}
    </View>
  );
}

function FindingCard({ finding }: { finding: Finding }) {
  const meta = SEVERITY_META[finding.severity];
  return (
    <ThemedView type="backgroundElement" style={[styles.finding, { borderLeftColor: meta.color }]}>
      <ThemedText type="smallBold">
        {meta.emoji} {finding.title}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {finding.detail}
      </ThemedText>
      <ThemedText type="small">👉 {finding.suggestion}</ThemedText>
    </ThemedView>
  );
}

function AdvicePanel({
  diagnosis,
  advisor,
}: {
  diagnosis: PlantDiagnosis;
  advisor: ReturnType<typeof usePlantAdvisor>;
}) {
  const { advice, stale, status, error, generate, cancel } = advisor;

  if (status === 'generating') {
    return (
      <ThemedView type="backgroundElement" style={styles.adviceCard}>
        <ActivityIndicator />
        <ThemedText type="small" style={styles.center}>
          Lendo o histórico salvo e escrevendo a análise… Pode levar cerca de um minuto.
        </ThemedText>
        <TouchableOpacity onPress={cancel}>
          <ThemedText type="link" themeColor="textSecondary">
            Cancelar
          </ThemedText>
        </TouchableOpacity>
      </ThemedView>
    );
  }

  if (status === 'error') {
    return (
      <ThemedView type="backgroundElement" style={styles.adviceCard}>
        <ThemedText type="small" style={styles.errorText}>
          {error}
        </ThemedText>
        <RegenerateButton label="Tentar de novo" onPress={generate} />
      </ThemedView>
    );
  }

  if (!advice) {
    return (
      <ThemedView type="backgroundElement" style={styles.adviceCard}>
        <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
          {diagnosis.source === 'none'
            ? 'A análise começa assim que houver a primeira leitura.'
            : 'Peça uma análise escrita a partir das leituras salvas desta planta.'}
        </ThemedText>
        {diagnosis.source !== 'none' && <RegenerateButton label="Analisar agora" onPress={generate} />}
      </ThemedView>
    );
  }

  return (
    <AdviceView
      advice={advice}
      stale={stale}
      onRegenerate={generate}
      canRegenerate={diagnosis.source !== 'none'}
    />
  );
}

function AdviceView({
  advice,
  stale,
  onRegenerate,
  canRegenerate,
}: {
  advice: PlantAdvice;
  stale: boolean;
  onRegenerate: () => void;
  canRegenerate: boolean;
}) {
  return (
    <ThemedView type="backgroundElement" style={styles.adviceCard}>
      {stale && (
        <ThemedText type="small" style={styles.warnText}>
          A situação da planta mudou desde esta análise.
        </ThemedText>
      )}
      <ThemedText>{advice.diagnosis}</ThemedText>

      {advice.suggestions.length > 0 && (
        <View style={styles.bullets}>
          <ThemedText type="smallBold">Sugestões</ThemedText>
          {advice.suggestions.map((text) => (
            <ThemedText key={text} type="small">
              • {text}
            </ThemedText>
          ))}
        </View>
      )}

      {advice.warnings.length > 0 && (
        <View style={styles.bullets}>
          <ThemedText type="smallBold">Avisos</ThemedText>
          {advice.warnings.map((text) => (
            <ThemedText key={text} type="small">
              ⚠️ {text}
            </ThemedText>
          ))}
        </View>
      )}

      <ThemedText type="small" themeColor="textSecondary">
        Gerado {formatAge(Date.now() - advice.generatedAt)} por {AI_MODEL.label}, no aparelho. É um texto
        automático: em caso de dúvida, confie nos avisos acima.
      </ThemedText>
      {canRegenerate && <RegenerateButton label="Gerar nova análise" onPress={onRegenerate} />}
    </ThemedView>
  );
}

function RegenerateButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress}>
      <ThemedView type="backgroundSelected" style={styles.regenerate}>
        <ThemedText type="smallBold">{label}</ThemedText>
      </ThemedView>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    maxHeight: '88%',
    borderTopLeftRadius: Spacing.four,
    borderTopRightRadius: Spacing.four,
    paddingTop: Spacing.two,
    paddingHorizontal: Spacing.four,
    gap: Spacing.two,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(128,128,128,0.5)',
  },
  content: { gap: Spacing.two, paddingVertical: Spacing.two },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  emoji: { fontSize: 40 },
  headerText: { flex: 1, gap: Spacing.one },
  plantName: { fontSize: 24, lineHeight: 32 },
  readingBlock: { gap: Spacing.half },
  sectionTitle: { marginTop: Spacing.two },
  findingList: { gap: Spacing.two },
  finding: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    borderLeftWidth: 4,
    gap: Spacing.one,
  },
  adviceCard: { padding: Spacing.three, borderRadius: Spacing.three, gap: Spacing.two, alignItems: 'stretch' },
  bullets: { gap: Spacing.one },
  center: { textAlign: 'center' },
  warnText: { color: '#E5960B' },
  errorText: { color: '#E5484D' },
  regenerate: { paddingVertical: Spacing.two, borderRadius: Spacing.five, alignItems: 'center' },
  privacy: { marginTop: Spacing.two, textAlign: 'center' },
  closeButton: { paddingVertical: Spacing.three, borderRadius: Spacing.five, alignItems: 'center' },
});
