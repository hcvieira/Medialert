import { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
  Alert,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useApp } from "@/lib/app-context";
import { useColors } from "@/hooks/use-colors";
import { DoseTime, Medication, generateId } from "@/lib/storage";
import { TimeInput } from "@/components/time-input";

const PILL_COLORS = [
  "#EF4444", "#F97316", "#EAB308", "#22C55E",
  "#3B82F6", "#8B5CF6", "#EC4899", "#6B7280",
];

const FREQUENCY_OPTIONS = [
  { label: "1x ao dia", times: ["08:00"] },
  { label: "2x ao dia", times: ["08:00", "20:00"] },
  { label: "3x ao dia", times: ["08:00", "14:00", "20:00"] },
  { label: "4x ao dia", times: ["08:00", "12:00", "16:00", "20:00"] },
  { label: "Personalizado", times: [] },
];

export default function EditMedicationScreen() {
  const colors = useColors();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { medications, updateMed, deleteMed } = useApp();

  const medication = medications.find((m) => m.id === id);

  const [name, setName] = useState(medication?.name ?? "");
  const [dosage, setDosage] = useState(medication?.dosage ?? "");
  const [notes, setNotes] = useState(medication?.notes ?? "");
  const [selectedColor, setSelectedColor] = useState(medication?.color ?? PILL_COLORS[4]);
  const [selectedFreqIndex, setSelectedFreqIndex] = useState(4); // custom by default
  const [customTimes, setCustomTimes] = useState<string[]>(
    medication?.times.map((t) => t.time) ?? ["08:00"]
  );
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!medication) return;
    const times = medication.times.map((t) => t.time);
    const matchedFreq = FREQUENCY_OPTIONS.findIndex(
      (opt) =>
        opt.times.length === times.length &&
        opt.times.every((t, i) => t === times[i])
    );
    setSelectedFreqIndex(matchedFreq >= 0 ? matchedFreq : 4);
    setCustomTimes(times);
  }, [medication]);

  const isCustom = selectedFreqIndex === FREQUENCY_OPTIONS.length - 1;
  const currentTimes = isCustom
    ? customTimes
    : FREQUENCY_OPTIONS[selectedFreqIndex].times;

  const handleSave = useCallback(async () => {
    if (!medication) return;
    if (!name.trim()) {
      Alert.alert("Atenção", "Por favor, informe o nome do medicamento.");
      return;
    }
    setIsSaving(true);
    try {
      const times: DoseTime[] = currentTimes.map((t) => ({ id: generateId(), time: t }));
      const updated: Medication = {
        ...medication,
        name: name.trim(),
        dosage: dosage.trim() || "1 dose",
        color: selectedColor,
        times,
        notes: notes.trim(),
      };
      await updateMed(updated);
      if (Platform.OS !== "web") {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      router.back();
    } finally {
      setIsSaving(false);
    }
  }, [medication, name, dosage, notes, selectedColor, currentTimes, updateMed, router]);

  const handleDelete = useCallback(() => {
    Alert.alert(
      "Excluir Medicamento",
      `Deseja excluir "${medication?.name}"? Esta ação não pode ser desfeita.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: async () => {
            if (medication) {
              await deleteMed(medication.id);
              router.back();
            }
          },
        },
      ]
    );
  }, [medication, deleteMed, router]);

  if (!medication) {
    return (
      <ScreenContainer>
        <View style={styles.notFound}>
          <Text style={[styles.notFoundText, { color: colors.muted }]}>
            Medicamento não encontrado
          </Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={{ color: colors.primary }}>Voltar</Text>
          </TouchableOpacity>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer containerClassName="bg-background" edges={["top", "left", "right", "bottom"]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={0.7}>
          <IconSymbol name="xmark.circle.fill" size={28} color={colors.muted} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Editar Medicamento</Text>
        <TouchableOpacity
          onPress={handleSave}
          style={[styles.saveButton, { backgroundColor: colors.primary }]}
          activeOpacity={0.8}
          disabled={isSaving}
        >
          <Text style={styles.saveButtonText}>{isSaving ? "..." : "Salvar"}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.previewCard, { backgroundColor: selectedColor + "22", borderColor: selectedColor + "44" }]}>
          <View style={[styles.pillIcon, { backgroundColor: selectedColor }]}>
            <IconSymbol name="pill.fill" size={28} color="#fff" />
          </View>
          <Text style={[styles.previewName, { color: colors.foreground }]}>
            {name || "Nome do medicamento"}
          </Text>
          <Text style={[styles.previewDosage, { color: colors.muted }]}>
            {dosage || "Dosagem"}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.foreground }]}>Nome *</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
            value={name}
            onChangeText={setName}
            placeholder="Nome do medicamento"
            placeholderTextColor={colors.muted}
          />
        </View>

        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.foreground }]}>Dosagem</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
            value={dosage}
            onChangeText={setDosage}
            placeholder="Ex: 500mg, 1 comprimido..."
            placeholderTextColor={colors.muted}
          />
        </View>

        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.foreground }]}>Cor</Text>
          <View style={styles.colorRow}>
            {PILL_COLORS.map((color) => (
              <TouchableOpacity
                key={color}
                style={[styles.colorDot, { backgroundColor: color }, selectedColor === color && styles.colorDotSelected]}
                onPress={() => setSelectedColor(color)}
                activeOpacity={0.8}
              />
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.foreground }]}>Frequência</Text>
          <View style={styles.freqRow}>
            {FREQUENCY_OPTIONS.map((opt, i) => (
              <TouchableOpacity
                key={opt.label}
                style={[
                  styles.freqChip,
                  { borderColor: colors.border, backgroundColor: colors.surface },
                  selectedFreqIndex === i && { backgroundColor: colors.primary, borderColor: colors.primary },
                ]}
                onPress={() => setSelectedFreqIndex(i)}
                activeOpacity={0.8}
              >
                <Text style={[styles.freqChipText, { color: colors.muted }, selectedFreqIndex === i && { color: "#fff" }]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.foreground }]}>Horários</Text>
          {isCustom ? (
            <View style={styles.timesContainer}>
              {customTimes.map((time, index) => (
                <View key={index} style={styles.timeRow}>
                  <TimeInput
                    style={[styles.timeInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
                    value={time}
                    onChangeText={(v) => setCustomTimes((prev) => prev.map((t, i) => (i === index ? v : t)))}
                    placeholderTextColor={colors.muted}
                  />
                  {customTimes.length > 1 && (
                    <TouchableOpacity
                      onPress={() => setCustomTimes((prev) => prev.filter((_, i) => i !== index))}
                      style={[styles.removeTimeBtn, { backgroundColor: colors.error + "22" }]}
                    >
                      <IconSymbol name="xmark.circle.fill" size={20} color={colors.error} />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
              <TouchableOpacity
                style={[styles.addTimeBtn, { borderColor: colors.primary }]}
                onPress={() => setCustomTimes((prev) => [...prev, "08:00"])}
                activeOpacity={0.8}
              >
                <IconSymbol name="plus" size={16} color={colors.primary} />
                <Text style={[styles.addTimeBtnText, { color: colors.primary }]}>Adicionar horário</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.timesPreview}>
              {currentTimes.map((time, i) => (
                <View key={i} style={[styles.timeBadge, { backgroundColor: colors.primary + "22" }]}>
                  <IconSymbol name="clock.fill" size={13} color={colors.primary} />
                  <Text style={[styles.timeBadgeText, { color: colors.primary }]}>{time}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.foreground }]}>Observações</Text>
          <TextInput
            style={[styles.input, styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Ex: Tomar com água, antes das refeições..."
            placeholderTextColor={colors.muted}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        <TouchableOpacity
          style={[styles.deleteButton, { borderColor: colors.error }]}
          onPress={handleDelete}
          activeOpacity={0.8}
        >
          <IconSymbol name="trash.fill" size={18} color={colors.error} />
          <Text style={[styles.deleteButtonText, { color: colors.error }]}>
            Excluir Medicamento
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  notFound: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  notFoundText: { fontSize: 16 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    gap: 12,
  },
  backButton: { padding: 2 },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: "600" },
  saveButton: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
  saveButtonText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  scrollContent: { padding: 20, gap: 24, paddingBottom: 40 },
  previewCard: { borderRadius: 16, padding: 20, alignItems: "center", gap: 8, borderWidth: 1 },
  pillIcon: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center" },
  previewName: { fontSize: 18, fontWeight: "700", textAlign: "center", lineHeight: 24 },
  previewDosage: { fontSize: 14, lineHeight: 20 },
  section: { gap: 10 },
  label: { fontSize: 14, fontWeight: "600", lineHeight: 20 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, lineHeight: 22 },
  textArea: { minHeight: 80, paddingTop: 12 },
  colorRow: { flexDirection: "row", gap: 12, flexWrap: "wrap" },
  colorDot: { width: 36, height: 36, borderRadius: 18 },
  colorDotSelected: { borderWidth: 3, borderColor: "#fff", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 4 },
  freqRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  freqChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  freqChipText: { fontSize: 13, fontWeight: "500" },
  timesPreview: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  timeBadge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10 },
  timeBadgeText: { fontSize: 14, fontWeight: "600" },
  timesContainer: { gap: 10 },
  timeRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  timeInput: { flex: 1, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, fontWeight: "600", textAlign: "center" },
  removeTimeBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  addTimeBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 12, borderRadius: 12, borderWidth: 1.5, borderStyle: "dashed" },
  addTimeBtnText: { fontSize: 14, fontWeight: "600" },
  deleteButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 14, borderWidth: 1.5, marginTop: 8 },
  deleteButtonText: { fontSize: 15, fontWeight: "600" },
});
