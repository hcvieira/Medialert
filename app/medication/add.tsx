import { useState, useCallback } from "react";
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
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useApp } from "@/lib/app-context";
import { useColors } from "@/hooks/use-colors";
import { DoseTime, generateId } from "@/lib/storage";
import { TimeInput } from "@/components/time-input";

const PILL_COLORS = [
  "#EF4444", // vermelho
  "#F97316", // laranja
  "#EAB308", // amarelo
  "#22C55E", // verde
  "#3B82F6", // azul
  "#8B5CF6", // roxo
  "#EC4899", // rosa
  "#6B7280", // cinza
];

const FREQUENCY_OPTIONS = [
  { label: "1x ao dia", times: ["08:00"] },
  { label: "2x ao dia", times: ["08:00", "20:00"] },
  { label: "3x ao dia", times: ["08:00", "14:00", "20:00"] },
  { label: "4x ao dia", times: ["08:00", "12:00", "16:00", "20:00"] },
  { label: "Personalizado", times: [] },
];

export default function AddMedicationScreen() {
  const colors = useColors();
  const router = useRouter();
  const { addMed } = useApp();

  const [name, setName] = useState("");
  const [dosage, setDosage] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedColor, setSelectedColor] = useState(PILL_COLORS[4]);
  const [selectedFreqIndex, setSelectedFreqIndex] = useState(0);
  const [customTimes, setCustomTimes] = useState<string[]>(["08:00"]);
  const [isSaving, setIsSaving] = useState(false);

  const isCustom = selectedFreqIndex === FREQUENCY_OPTIONS.length - 1;
  const currentTimes = isCustom
    ? customTimes
    : FREQUENCY_OPTIONS[selectedFreqIndex].times;

  const handleSave = useCallback(async () => {
    if (!name.trim()) {
      Alert.alert("Atenção", "Por favor, informe o nome do medicamento.");
      return;
    }
    if (currentTimes.length === 0) {
      Alert.alert("Atenção", "Adicione pelo menos um horário.");
      return;
    }

    setIsSaving(true);
    try {
      const times: DoseTime[] = currentTimes.map((t) => ({ id: generateId(), time: t }));
      await addMed({
        name: name.trim(),
        dosage: dosage.trim() || "1 dose",
        color: selectedColor,
        times,
        notes: notes.trim(),
        active: true,
      });
      if (Platform.OS !== "web") {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      router.back();
    } finally {
      setIsSaving(false);
    }
  }, [name, dosage, notes, selectedColor, currentTimes, addMed, router]);

  const handleAddTime = useCallback(() => {
    setCustomTimes((prev) => [...prev, "08:00"]);
  }, []);

  const handleUpdateTime = useCallback((index: number, value: string) => {
    setCustomTimes((prev) => prev.map((t, i) => (i === index ? value : t)));
  }, []);

  const handleRemoveTime = useCallback((index: number) => {
    setCustomTimes((prev) => prev.filter((_, i) => i !== index));
  }, []);

  return (
    <ScreenContainer containerClassName="bg-background" edges={["top", "left", "right", "bottom"]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={0.7}>
          <IconSymbol name="xmark.circle.fill" size={28} color={colors.muted} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          Novo Medicamento
        </Text>
        <TouchableOpacity
          onPress={handleSave}
          style={[styles.saveButton, { backgroundColor: colors.primary }]}
          activeOpacity={0.8}
          disabled={isSaving}
        >
          <Text style={styles.saveButtonText}>{isSaving ? "Salvando..." : "Salvar"}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Color Preview */}
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

        {/* Name */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.foreground }]}>Nome do medicamento *</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
            placeholder="Ex: Losartana, Metformina..."
            placeholderTextColor={colors.muted}
            value={name}
            onChangeText={setName}
            returnKeyType="next"
          />
        </View>

        {/* Dosage */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.foreground }]}>Dosagem</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
            placeholder="Ex: 500mg, 1 comprimido, 10ml..."
            placeholderTextColor={colors.muted}
            value={dosage}
            onChangeText={setDosage}
            returnKeyType="next"
          />
        </View>

        {/* Color */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.foreground }]}>Cor do medicamento</Text>
          <View style={styles.colorRow}>
            {PILL_COLORS.map((color) => (
              <TouchableOpacity
                key={color}
                style={[
                  styles.colorDot,
                  { backgroundColor: color },
                  selectedColor === color && styles.colorDotSelected,
                ]}
                onPress={() => setSelectedColor(color)}
                activeOpacity={0.8}
              />
            ))}
          </View>
        </View>

        {/* Frequency */}
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
                <Text
                  style={[
                    styles.freqChipText,
                    { color: colors.muted },
                    selectedFreqIndex === i && { color: "#fff" },
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Times */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.foreground }]}>Horários</Text>
          {isCustom ? (
            <View style={styles.timesContainer}>
              {customTimes.map((time, index) => (
                <View key={index} style={styles.timeRow}>
                  <TimeInput
                    style={[styles.timeInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
                    value={time}
                    onChangeText={(v) => handleUpdateTime(index, v)}
                    placeholderTextColor={colors.muted}
                  />
                  {customTimes.length > 1 && (
                    <TouchableOpacity
                      onPress={() => handleRemoveTime(index)}
                      style={[styles.removeTimeBtn, { backgroundColor: colors.error + "22" }]}
                      activeOpacity={0.7}
                    >
                      <IconSymbol name="xmark.circle.fill" size={20} color={colors.error} />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
              <TouchableOpacity
                style={[styles.addTimeBtn, { borderColor: colors.primary }]}
                onPress={handleAddTime}
                activeOpacity={0.8}
              >
                <IconSymbol name="plus" size={16} color={colors.primary} />
                <Text style={[styles.addTimeBtnText, { color: colors.primary }]}>
                  Adicionar horário
                </Text>
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

        {/* Notes */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.foreground }]}>Observações</Text>
          <TextInput
            style={[styles.input, styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
            placeholder="Ex: Tomar com água, antes das refeições..."
            placeholderTextColor={colors.muted}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    gap: 12,
  },
  backButton: {
    padding: 2,
  },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: "600",
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  scrollContent: {
    padding: 20,
    gap: 24,
    paddingBottom: 40,
  },
  previewCard: {
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
  },
  pillIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  previewName: {
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 24,
  },
  previewDosage: {
    fontSize: 14,
    lineHeight: 20,
  },
  section: {
    gap: 10,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    lineHeight: 22,
  },
  textArea: {
    minHeight: 80,
    paddingTop: 12,
  },
  colorRow: {
    flexDirection: "row",
    gap: 12,
    flexWrap: "wrap",
  },
  colorDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  colorDotSelected: {
    borderWidth: 3,
    borderColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  freqRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  freqChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  freqChipText: {
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 18,
  },
  timesPreview: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  timeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  timeBadgeText: {
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
  },
  timesContainer: {
    gap: 10,
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  timeInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  removeTimeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  addTimeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: "dashed",
  },
  addTimeBtnText: {
    fontSize: 14,
    fontWeight: "600",
  },
});
