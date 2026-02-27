import React, { useCallback, useState } from "react";
import {
  ScrollView,
  Text,
  View,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useApp } from "@/lib/app-context";
import { useColors } from "@/hooks/use-colors";
import { Medication } from "@/lib/storage";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/hooks/use-auth";

type MedCardProps = {
  medication: Medication;
  onEdit: (id: string) => void;
  onDelete: (id: string, name: string) => void;
  colors: ReturnType<typeof useColors>;
};

function MedCard({ medication, onEdit, onDelete, colors }: MedCardProps) {
  const nextTime = medication.times.length > 0 ? medication.times[0].time : "--:--";
  const timesLabel =
    medication.times.length === 1
      ? "1 horário"
      : `${medication.times.length} horários`;

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={[styles.colorStripe, { backgroundColor: medication.color }]} />
      <View style={styles.cardBody}>
        <View style={[styles.pillCircle, { backgroundColor: medication.color + "22" }]}>
          <IconSymbol name="pill.fill" size={22} color={medication.color} />
        </View>
        <View style={styles.cardInfo}>
          <Text style={[styles.medName, { color: colors.foreground }]} numberOfLines={1}>
            {medication.name}
          </Text>
          <Text style={[styles.medDosage, { color: colors.muted }]}>
            {medication.dosage}
          </Text>
          <View style={styles.metaRow}>
            <View style={[styles.metaBadge, { backgroundColor: colors.primary + "15" }]}>
              <IconSymbol name="clock.fill" size={11} color={colors.primary} />
              <Text style={[styles.metaText, { color: colors.primary }]}>{timesLabel}</Text>
            </View>
            <View style={[styles.metaBadge, { backgroundColor: colors.primary + "15" }]}>
              <Text style={[styles.metaText, { color: colors.primary }]}>Próxima: {nextTime}</Text>
            </View>
          </View>
        </View>
        <View style={styles.cardActions}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.primary + "15" }]}
            onPress={() => onEdit(medication.id)}
            activeOpacity={0.7}
          >
            <IconSymbol name="pencil" size={16} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.error + "15" }]}
            onPress={() => onDelete(medication.id, medication.name)}
            activeOpacity={0.7}
          >
            <IconSymbol name="trash.fill" size={16} color={colors.error} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

export default function MedicationsScreen() {
  const colors = useColors();
  const router = useRouter();
  const { user } = useAuth();
  const { medications, deleteMed } = useApp();
  const [showEncerradas, setShowEncerradas] = useState(false);

  // Fetch all server medications (active + inactive) for prescription history
  const allServerMedsQuery = trpc.medications.listAllMine.useQuery(undefined, {
    enabled: !!user,
    staleTime: 30_000,
  });

  const inactiveServerMeds = (allServerMedsQuery.data ?? []).filter((m: any) => !m.active);

  const handleEdit = useCallback(
    (id: string) => {
      router.push(`/medication/${id}` as any);
    },
    [router]
  );

  const handleDelete = useCallback(
    (id: string, name: string) => {
      Alert.alert(
        "Excluir Medicamento",
        `Deseja excluir "${name}"?`,
        [
          { text: "Cancelar", style: "cancel" },
          { text: "Excluir", style: "destructive", onPress: () => deleteMed(id) },
        ]
      );
    },
    [deleteMed]
  );

  const handleAdd = useCallback(() => {
    router.push("/medication/add");
  }, [router]);

  const hasContent = medications.length > 0 || inactiveServerMeds.length > 0;

  return (
    <ScreenContainer containerClassName="bg-background">
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Meus Remédios</Text>
          <Text style={[styles.headerSubtitle, { color: colors.muted }]}>
            {medications.length} medicamento{medications.length !== 1 ? "s" : ""} cadastrado{medications.length !== 1 ? "s" : ""}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: colors.primary }]}
          onPress={handleAdd}
          activeOpacity={0.8}
        >
          <IconSymbol name="plus" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {!hasContent ? (
        <View style={styles.emptyState}>
          <View style={[styles.emptyIconBg, { backgroundColor: colors.primary + "15" }]}>
            <IconSymbol name="cross.case.fill" size={48} color={colors.primary} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
            Nenhum medicamento
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.muted }]}>
            Adicione seus medicamentos para receber lembretes e acompanhar o tratamento
          </Text>
          <TouchableOpacity
            style={[styles.emptyButton, { backgroundColor: colors.primary }]}
            onPress={handleAdd}
            activeOpacity={0.8}
          >
            <IconSymbol name="plus" size={18} color="#fff" />
            <Text style={styles.emptyButtonText}>Adicionar Medicamento</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Active local medications */}
          {medications.map((item) => (
            <MedCard
              key={item.id}
              medication={item}
              onEdit={handleEdit}
              onDelete={handleDelete}
              colors={colors}
            />
          ))}

          {/* Prescrições encerradas (inactive server meds) */}
          {inactiveServerMeds.length > 0 && (
            <View style={styles.encerradasSection}>
              {/* Collapsible header */}
              <TouchableOpacity
                style={[styles.encerradasHeader, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => setShowEncerradas((v) => !v)}
                activeOpacity={0.7}
              >
                <View style={styles.encerradasHeaderLeft}>
                  <View style={[styles.encerradasIconBg, { backgroundColor: "#94A3B820" }]}>
                    <IconSymbol name="xmark.circle.fill" size={18} color="#94A3B8" />
                  </View>
                  <View>
                    <Text style={[styles.encerradasTitle, { color: colors.muted }]}>
                      Prescrições encerradas
                    </Text>
                    <Text style={[styles.encerradasCount, { color: colors.muted }]}>
                      {inactiveServerMeds.length} medicamento{inactiveServerMeds.length !== 1 ? "s" : ""}
                    </Text>
                  </View>
                </View>
                <IconSymbol
                  name={showEncerradas ? "chevron.up" : "chevron.down"}
                  size={16}
                  color={colors.muted}
                />
              </TouchableOpacity>

              {/* Collapsed list */}
              {showEncerradas && (
                <View style={styles.encerradasList}>
                  {inactiveServerMeds.map((med: any) => {
                    const canceledDate = med.canceledAt
                      ? new Date(med.canceledAt).toLocaleDateString("pt-BR", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        })
                      : null;
                    const times = (med.times ?? []).map((t: any) => t.time).join(" · ");
                    return (
                      <View
                        key={med.id}
                        style={[styles.encerradaCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                      >
                        <View style={[styles.encerradaDot, { backgroundColor: med.color + "60" }]} />
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.encerradaName, { color: colors.muted }]} numberOfLines={1}>
                            {med.name}
                          </Text>
                          <Text style={[styles.encerradaDosage, { color: colors.muted }]}>
                            {med.dosage}
                            {times ? `  ·  ${times}` : ""}
                          </Text>
                          {canceledDate && (
                            <Text style={[styles.encerradaDate, { color: "#94A3B8" }]}>
                              Encerrado em {canceledDate}
                            </Text>
                          )}
                        </View>
                        <View style={[styles.encerradaBadge, { backgroundColor: "#94A3B815" }]}>
                          <Text style={styles.encerradaBadgeText}>Encerrado</Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          )}
        </ScrollView>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    lineHeight: 28,
  },
  headerSubtitle: {
    fontSize: 13,
    marginTop: 2,
    lineHeight: 18,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  listContent: {
    padding: 16,
    gap: 12,
    paddingBottom: 32,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    overflow: "hidden",
  },
  colorStripe: {
    width: 5,
  },
  cardBody: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 12,
  },
  pillCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  cardInfo: {
    flex: 1,
    gap: 3,
  },
  medName: {
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 22,
  },
  medDosage: {
    fontSize: 13,
    lineHeight: 18,
  },
  metaRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 4,
    flexWrap: "wrap",
  },
  metaBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  metaText: {
    fontSize: 11,
    fontWeight: "500",
  },
  cardActions: {
    gap: 8,
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    gap: 14,
  },
  emptyIconBg: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 28,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 22,
  },
  emptyButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 13,
    borderRadius: 14,
  },
  emptyButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  // Prescrições encerradas
  encerradasSection: {
    marginTop: 8,
    gap: 0,
  },
  encerradasHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  encerradasHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  encerradasIconBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  encerradasTitle: {
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
  },
  encerradasCount: {
    fontSize: 12,
    lineHeight: 16,
  },
  encerradasList: {
    marginTop: 8,
    gap: 8,
  },
  encerradaCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    opacity: 0.8,
  },
  encerradaDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  encerradaName: {
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
  },
  encerradaDosage: {
    fontSize: 12,
    lineHeight: 17,
  },
  encerradaDate: {
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },
  encerradaBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  encerradaBadgeText: {
    fontSize: 11,
    fontWeight: "500",
    color: "#94A3B8",
  },
});
