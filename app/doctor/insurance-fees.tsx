import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  StyleSheet,
  ActivityIndicator,
  Switch,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { trpc } from "@/lib/trpc";
import { useColors } from "@/hooks/use-colors";

export default function InsuranceFeesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useColors();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [insuranceName, setInsuranceName] = useState("");
  const [feeAmount, setFeeAmount] = useState("");
  const [isDefault, setIsDefault] = useState(false);

  const { data: fees = [], refetch, isLoading } = trpc.insuranceFees.list.useQuery();
  const addMutation = trpc.insuranceFees.add.useMutation({ onSuccess: () => { refetch(); resetForm(); } });
  const updateMutation = trpc.insuranceFees.update.useMutation({ onSuccess: () => { refetch(); resetForm(); } });
  const removeMutation = trpc.insuranceFees.remove.useMutation({ onSuccess: () => refetch() });

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setInsuranceName("");
    setFeeAmount("");
    setIsDefault(false);
  };

  const handleEdit = (fee: any) => {
    setEditingId(fee.id);
    setInsuranceName(fee.insuranceName);
    setFeeAmount(String(Number(fee.feeAmount)));
    setIsDefault(fee.isDefault);
    setShowForm(true);
  };

  const handleSave = () => {
    const name = insuranceName.trim();
    const amount = parseFloat(feeAmount.replace(",", "."));
    if (!name) return Alert.alert("Atenção", "Informe o nome do convênio ou forma de pagamento.");
    if (isNaN(amount) || amount <= 0) return Alert.alert("Atenção", "Informe um valor válido.");
    if (amount < 120) {
      return Alert.alert(
        "Valor abaixo do mínimo",
        "O valor mínimo permitido por consulta é R$ 120,00. Por favor, ajuste o valor antes de salvar.",
        [{ text: "Entendi", style: "default" }]
      );
    }

    if (editingId) {
      updateMutation.mutate({ id: editingId, insuranceName: name, feeAmount: amount, isDefault });
    } else {
      addMutation.mutate({ insuranceName: name, feeAmount: amount, isDefault });
    }
  };

  const handleDelete = (id: number, name: string) => {
    Alert.alert("Remover", `Remover "${name}"?`, [
      { text: "Cancelar", style: "cancel" },
      { text: "Remover", style: "destructive", onPress: () => removeMutation.mutate({ id }) },
    ]);
  };

  const isSaving = addMutation.isPending || updateMutation.isPending;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12, backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={[styles.backIcon, { color: colors.primary }]}>‹</Text>
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Valores por Convênio</Text>
          <Text style={[styles.headerSub, { color: colors.muted }]}>Defina o valor de cada consulta</Text>
        </View>
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: colors.primary }]}
          onPress={() => { resetForm(); setShowForm(true); }}
        >
          <Text style={styles.addBtnText}>+ Novo</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {/* Info card */}
        <View style={[styles.infoCard, { backgroundColor: "#EFF6FF", borderColor: "#BFDBFE" }]}>
          <Text style={[styles.infoText, { color: "#1D4ED8" }]}>
            💡 Cadastre o valor de cada convênio ou forma de pagamento (particular, Unimed, etc.). Quando uma consulta for concluída, o sistema usará automaticamente o valor correto para calcular sua receita.
          </Text>
        </View>

        {/* Minimum value warning */}
        <View style={[styles.infoCard, { backgroundColor: "#FFF7ED", borderColor: "#FED7AA", marginBottom: 16 }]}>
          <Text style={[styles.infoText, { color: "#C2410C" }]}>
            ⚠️ Valor mínimo por consulta: R$ 120,00. Valores abaixo desse limite não são permitidos pela plataforma.
          </Text>
        </View>

        {/* Form */}
        {showForm && (
          <View style={[styles.formCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.formTitle, { color: colors.foreground }]}>
              {editingId ? "Editar Convênio" : "Novo Convênio / Forma de Pagamento"}
            </Text>

            <Text style={[styles.label, { color: colors.muted }]}>Nome do convênio ou forma de pagamento</Text>
            <TextInput
              style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
              placeholder="Ex: Particular, Unimed, Bradesco Saúde..."
              placeholderTextColor={colors.muted}
              value={insuranceName}
              onChangeText={setInsuranceName}
              returnKeyType="next"
            />

            <Text style={[styles.label, { color: colors.muted }]}>Valor da consulta (R$)</Text>
            <TextInput
              style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
              placeholder="Ex: 350,00"
              placeholderTextColor={colors.muted}
              value={feeAmount}
              onChangeText={setFeeAmount}
              keyboardType="decimal-pad"
              returnKeyType="done"
            />

            <View style={styles.switchRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.switchLabel, { color: colors.foreground }]}>Valor padrão</Text>
                <Text style={[styles.switchSub, { color: colors.muted }]}>Usado quando o convênio não for identificado</Text>
              </View>
              <Switch
                value={isDefault}
                onValueChange={setIsDefault}
                trackColor={{ false: colors.border, true: colors.primary }}
              />
            </View>

            <View style={styles.formBtns}>
              <TouchableOpacity style={[styles.cancelBtn, { borderColor: colors.border }]} onPress={resetForm}>
                <Text style={[styles.cancelBtnText, { color: colors.muted }]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: colors.primary, opacity: isSaving ? 0.7 : 1 }]}
                onPress={handleSave}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.saveBtnText}>{editingId ? "Salvar" : "Adicionar"}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* List */}
        {isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
        ) : fees.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>💰</Text>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Nenhum convênio cadastrado</Text>
            <Text style={[styles.emptyText, { color: colors.muted }]}>
              Adicione os convênios e formas de pagamento que você aceita para que o sistema calcule sua receita corretamente.
            </Text>
          </View>
        ) : (
          fees.map((fee: any) => (
            <View key={fee.id} style={[styles.feeCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Text style={[styles.feeName, { color: colors.foreground }]}>{fee.insuranceName}</Text>
                  {fee.isDefault && (
                    <View style={[styles.defaultBadge, { backgroundColor: "#DCFCE7" }]}>
                      <Text style={[styles.defaultBadgeText, { color: "#16A34A" }]}>Padrão</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.feeAmount, { color: colors.primary }]}>
                  R$ {Number(fee.feeAmount).toFixed(2).replace(".", ",")}
                </Text>
              </View>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <TouchableOpacity
                  style={[styles.actionBtn, { borderColor: colors.border }]}
                  onPress={() => handleEdit(fee)}
                >
                  <Text style={[styles.actionBtnText, { color: colors.foreground }]}>Editar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, { borderColor: "#FCA5A5" }]}
                  onPress={() => handleDelete(fee.id, fee.insuranceName)}
                >
                  <Text style={[styles.actionBtnText, { color: colors.error }]}>Remover</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 0.5,
  },
  backBtn: { padding: 4, marginRight: 8 },
  backIcon: { fontSize: 32, lineHeight: 36, fontWeight: "300" },
  headerText: { flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: "700" },
  headerSub: { fontSize: 12, marginTop: 1 },
  addBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  addBtnText: { color: "#fff", fontWeight: "600", fontSize: 13 },
  infoCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 16,
  },
  infoText: { fontSize: 13, lineHeight: 20 },
  formCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  formTitle: { fontSize: 16, fontWeight: "700", marginBottom: 16 },
  label: { fontSize: 12, fontWeight: "600", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: 14,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    paddingVertical: 8,
  },
  switchLabel: { fontSize: 15, fontWeight: "600" },
  switchSub: { fontSize: 12, marginTop: 2 },
  formBtns: { flexDirection: "row", gap: 10 },
  cancelBtn: { flex: 1, borderWidth: 1, borderRadius: 10, paddingVertical: 12, alignItems: "center" },
  cancelBtnText: { fontSize: 15, fontWeight: "600" },
  saveBtn: { flex: 2, borderRadius: 10, paddingVertical: 12, alignItems: "center" },
  saveBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  emptyState: { alignItems: "center", paddingVertical: 48 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: "700", marginBottom: 8 },
  emptyText: { fontSize: 14, textAlign: "center", lineHeight: 22, maxWidth: 280 },
  feeCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  feeName: { fontSize: 15, fontWeight: "600" },
  feeAmount: { fontSize: 20, fontWeight: "800", marginTop: 2 },
  defaultBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 },
  defaultBadgeText: { fontSize: 11, fontWeight: "700" },
  actionBtn: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  actionBtnText: { fontSize: 13, fontWeight: "600" },
});
