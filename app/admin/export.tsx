import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Platform,
  ScrollView,
  TextInput,
} from "react-native";
import { router } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { trpc } from "@/lib/trpc";
import { useColors } from "@/hooks/use-colors";

function showAlert(title: string, msg: string) {
  if (Platform.OS === "web") {
    window.alert(`${title}\n\n${msg}`);
  } else {
    const { Alert } = require("react-native");
    Alert.alert(title, msg);
  }
}

function downloadCSV(csv: string, filename: string) {
  if (Platform.OS === "web") {
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  } else {
    showAlert("Download disponível na web", "Acesse o painel pelo navegador para baixar o arquivo CSV.");
  }
}

export default function AdminExport() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [filterMonth, setFilterMonth] = useState("");
  const [enabled, setEnabled] = useState(false);

  const { data, isLoading, refetch } = trpc.mgm.adminExportCommissionsCSV.useQuery(
    { referenceMonth: filterMonth || undefined },
    { enabled }
  );

  const handleExport = async () => {
    setEnabled(true);
    const result = await refetch();
    if (result.data) {
      const month = filterMonth || "todos";
      downloadCSV(result.data.csv, `comissoes_mgm_${month}.csv`);
      showAlert(
        "Exportação concluída",
        `${result.data.count} registro${result.data.count !== 1 ? "s" : ""} exportado${result.data.count !== 1 ? "s" : ""}.`
      );
    }
  };

  const styles = StyleSheet.create({
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingBottom: 14,
      gap: 12,
      backgroundColor: "#1a1a2e",
    },
    backBtn: { padding: 4 },
    backIcon: { color: "#fff", fontSize: 32, lineHeight: 36, fontWeight: "300" },
    headerText: { flex: 1 },
    headerTitle: { color: "#fff", fontSize: 20, fontWeight: "700", lineHeight: 26 },
    headerSubtitle: { color: "rgba(255,255,255,0.7)", fontSize: 13, lineHeight: 18, marginTop: 2 },
    content: { padding: 20, gap: 20 },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 20,
      gap: 12,
    },
    cardTitle: { fontSize: 16, fontWeight: "700", color: colors.foreground, lineHeight: 22 },
    cardDesc: { fontSize: 14, color: colors.muted, lineHeight: 20 },
    label: { fontSize: 13, fontWeight: "600", color: colors.foreground, lineHeight: 18 },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
      color: colors.foreground,
      backgroundColor: colors.background,
      lineHeight: 20,
    },
    hint: { fontSize: 12, color: colors.muted, lineHeight: 16 },
    exportBtn: {
      backgroundColor: "#EA580C",
      borderRadius: 12,
      paddingVertical: 16,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: 8,
    },
    exportBtnText: { color: "#fff", fontSize: 16, fontWeight: "700", lineHeight: 22 },
    infoBox: {
      backgroundColor: "#EBF4FF",
      borderRadius: 12,
      padding: 16,
      gap: 8,
    },
    infoTitle: { fontSize: 14, fontWeight: "700", color: "#0D5BBF", lineHeight: 20 },
    infoText: { fontSize: 13, color: "#0D5BBF", lineHeight: 18 },
    columnRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
    columnChip: {
      backgroundColor: "#DBEAFE",
      borderRadius: 6,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    columnChipText: { fontSize: 11, color: "#1D4ED8", fontWeight: "600", lineHeight: 15 },
  });

  const columns = [
    "ID", "Indicador", "Email Indicador", "Indicado", "Email Indicado",
    "Nível", "Mês", "Ano Indicado", "Consultas", "Valor (R$)",
    "Status", "Pago em", "Criado em",
  ];

  return (
    <ScreenContainer edges={["left", "right", "bottom"]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Exportar Relatório</Text>
          <Text style={styles.headerSubtitle}>Comissões MGM em CSV</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Filter */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📅 Filtro por mês</Text>
          <Text style={styles.cardDesc}>
            Deixe em branco para exportar todas as comissões de todos os meses.
          </Text>
          <Text style={styles.label}>Mês de referência (opcional)</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: 2025-01"
            placeholderTextColor={colors.muted}
            value={filterMonth}
            onChangeText={setFilterMonth}
            keyboardType="numbers-and-punctuation"
            returnKeyType="done"
          />
          <Text style={styles.hint}>Formato: AAAA-MM (ex: 2025-01 para janeiro de 2025)</Text>
        </View>

        {/* Columns info */}
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>📋 Colunas do arquivo CSV</Text>
          <Text style={styles.infoText}>
            O arquivo será gerado com separador ponto-e-vírgula (;), compatível com Excel e Google Sheets.
          </Text>
          <View style={styles.columnRow}>
            {columns.map((col) => (
              <View key={col} style={styles.columnChip}>
                <Text style={styles.columnChipText}>{col}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Export button */}
        <TouchableOpacity
          style={[styles.exportBtn, (isLoading) && { opacity: 0.7 }]}
          onPress={handleExport}
          disabled={isLoading}
          activeOpacity={0.8}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.exportBtnText}>
              ⬇ Baixar CSV{filterMonth ? ` — ${filterMonth}` : " — Todos os meses"}
            </Text>
          )}
        </TouchableOpacity>

        {data && (
          <View style={[styles.card, { backgroundColor: "#F0FDF4", borderColor: "#86EFAC" }]}>
            <Text style={{ fontSize: 15, fontWeight: "700", color: "#16A34A", lineHeight: 22 }}>
              ✓ Exportação concluída
            </Text>
            <Text style={{ fontSize: 13, color: "#16A34A", lineHeight: 18 }}>
              {data.count} registro{data.count !== 1 ? "s" : ""} exportado{data.count !== 1 ? "s" : ""}.
              {Platform.OS !== "web" && " Acesse pelo navegador para baixar o arquivo."}
            </Text>
          </View>
        )}

        <View style={{ height: 20 }} />
      </ScrollView>
    </ScreenContainer>
  );
}
