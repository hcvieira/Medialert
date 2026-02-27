import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Share,
  Platform,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { router } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
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

export default function MGMReferralScreen() {
  const colors = useColors();
  const [copied, setCopied] = useState(false);

  const { data: referralData, isLoading: loadingCode } = trpc.mgm.getMyReferralCode.useQuery();
  const { data: commissionsData, isLoading: loadingCommissions } = trpc.mgm.getMyCommissions.useQuery();

  const referralCode = referralData?.code ?? "";
  const shareLink = `Olá! Estou usando o MediAlert para gerenciar meus pacientes e adorei. Cadastre-se como médico usando meu código de indicação: *${referralCode}* e ganhe benefícios. Baixe o app em: https://medialert.app`;

  const handleShare = async () => {
    if (Platform.OS === "web") {
      try {
        await navigator.clipboard.writeText(shareLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        window.alert("Link copiado!\n\n" + shareLink);
      }
    } else {
      await Share.share({ message: shareLink, title: "Indicar MediAlert" });
    }
  };

  const handleCopyCode = async () => {
    if (Platform.OS === "web") {
      try {
        await navigator.clipboard.writeText(referralCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        window.alert("Código copiado: " + referralCode);
      }
    } else {
      try {
        const { setStringAsync } = require("expo-clipboard");
        await setStringAsync(referralCode);
      } catch {
        // fallback silencioso
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const pending = commissionsData?.pending ?? 0;
  const paid = commissionsData?.paid ?? 0;
  const total = commissionsData?.total ?? 0;
  const entries = commissionsData?.entries ?? [];

  const formatCurrency = (val: number) =>
    val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const formatMonth = (ref: string) => {
    const [year, month] = ref.split("-");
    const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    return `${months[parseInt(month) - 1]}/${year}`;
  };

  return (
    <ScreenContainer>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>Programa de Indicações</Text>
          <Text style={styles.headerSubtitle}>Indique médicos e ganhe descontos na sua assinatura</Text>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* How it works */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>🎯 Como funciona</Text>
          <View style={styles.levelRow}>
            <View style={[styles.levelBadge, { backgroundColor: "#EBF4FF" }]}>
              <Text style={[styles.levelLabel, { color: "#0D5BBF" }]}>Nível 1</Text>
            </View>
            <Text style={[styles.levelDesc, { color: colors.foreground }]}>
              Médico que você indicou diretamente
            </Text>
          </View>
          <View style={styles.commissionTable}>
            <View style={styles.commissionRow}>
              <Text style={[styles.commissionYear, { color: colors.muted }]}>1º ano</Text>
              <Text style={[styles.commissionAmount, { color: colors.primary }]}>R$ 150,00/mês de desconto</Text>
            </View>
            <View style={styles.commissionRow}>
              <Text style={[styles.commissionYear, { color: colors.muted }]}>2º ano em diante</Text>
              <Text style={[styles.commissionAmount, { color: colors.primary }]}>R$ 100,00/mês de desconto</Text>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.levelRow}>
            <View style={[styles.levelBadge, { backgroundColor: "#F0FDF4" }]}>
              <Text style={[styles.levelLabel, { color: "#16A34A" }]}>Nível 2</Text>
            </View>
            <Text style={[styles.levelDesc, { color: colors.foreground }]}>
              Médico indicado pelo seu indicado
            </Text>
          </View>
          <View style={styles.commissionTable}>
            <View style={styles.commissionRow}>
              <Text style={[styles.commissionYear, { color: colors.muted }]}>1º ano</Text>
              <Text style={[styles.commissionAmount, { color: "#16A34A" }]}>R$ 75,00/mês de desconto</Text>
            </View>
            <View style={styles.commissionRow}>
              <Text style={[styles.commissionYear, { color: colors.muted }]}>2º ano em diante</Text>
              <Text style={[styles.commissionAmount, { color: "#16A34A" }]}>R$ 50,00/mês de desconto</Text>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.levelRow}>
            <View style={[styles.levelBadge, { backgroundColor: "#FFF7ED" }]}>
              <Text style={[styles.levelLabel, { color: "#EA580C" }]}>Nível 3</Text>
            </View>
            <Text style={[styles.levelDesc, { color: colors.foreground }]}>
              3ª geração da sua rede
            </Text>
          </View>
          <View style={styles.commissionTable}>
            <View style={styles.commissionRow}>
              <Text style={[styles.commissionYear, { color: colors.muted }]}>1º ano</Text>
              <Text style={[styles.commissionAmount, { color: "#EA580C" }]}>R$ 50,00/mês de desconto</Text>
            </View>
            <View style={styles.commissionRow}>
              <Text style={[styles.commissionYear, { color: colors.muted }]}>2º ano em diante</Text>
              <Text style={[styles.commissionAmount, { color: "#EA580C" }]}>R$ 25,00/mês de desconto</Text>
            </View>
          </View>

          <View style={[styles.infoBox, { backgroundColor: "#EBF4FF" }]}>
            <Text style={[styles.infoText, { color: "#0D5BBF" }]}>
              💡 O desconto é aplicado diretamente na sua mensalidade MediAlert. Você não recebe dinheiro — você paga menos. O desconto é ativado enquanto o médico indicado estiver ativo e faturando pelo menos R$ 12.000/mês.
            </Text>
          </View>
        </View>

        {/* Referral Code */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>🔗 Seu código de indicação</Text>
          {loadingCode ? (
            <ActivityIndicator color={colors.primary} style={{ marginVertical: 20 }} />
          ) : (
            <>
              <TouchableOpacity
                style={[styles.codeBox, { backgroundColor: "#EBF4FF", borderColor: colors.primary }]}
                onPress={handleCopyCode}
                activeOpacity={0.7}
              >
                <Text style={[styles.codeText, { color: colors.primary }]}>{referralCode}</Text>
                <Text style={[styles.copyHint, { color: colors.muted }]}>
                  {copied ? "✓ Copiado!" : "Toque para copiar"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.shareBtn, { backgroundColor: colors.primary }]}
                onPress={handleShare}
                activeOpacity={0.85}
              >
                <Text style={styles.shareBtnText}>
                  {Platform.OS === "web" ? "📋 Copiar link de indicação" : "📤 Compartilhar link de indicação"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.shareBtn, { backgroundColor: "#1a1a2e", marginTop: 4 }]}
                onPress={() => router.push("/doctor/mgm-my-network" as any)}
                activeOpacity={0.85}
              >
                <Text style={styles.shareBtnText}>👥 Ver minha rede e descontos detalhados</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Commissions Summary */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>🏷️ Meus descontos acumulados</Text>
          {loadingCommissions ? (
            <ActivityIndicator color={colors.primary} style={{ marginVertical: 20 }} />
          ) : (
            <>
              <View style={styles.summaryRow}>
                <View style={[styles.summaryBox, { backgroundColor: "#FFF7ED" }]}>
                  <Text style={[styles.summaryLabel, { color: "#EA580C" }]}>Desconto pendente</Text>
                  <Text style={[styles.summaryValue, { color: "#EA580C" }]}>{formatCurrency(pending)}</Text>
                </View>
                <View style={[styles.summaryBox, { backgroundColor: "#F0FDF4" }]}>
                  <Text style={[styles.summaryLabel, { color: "#16A34A" }]}>Desconto aplicado</Text>
                  <Text style={[styles.summaryValue, { color: "#16A34A" }]}>{formatCurrency(paid)}</Text>
                </View>
              </View>
              <View style={[styles.totalRow, { borderTopColor: colors.border }]}>
                <Text style={[styles.totalLabel, { color: colors.muted }]}>Total acumulado</Text>
                <Text style={[styles.totalValue, { color: colors.primary }]}>{formatCurrency(total)}</Text>
              </View>

              {entries.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyIcon}>📊</Text>
                  <Text style={[styles.emptyText, { color: colors.muted }]}>
                    Nenhum desconto calculado ainda.{"\n"}Compartilhe seu código para começar!
                  </Text>
                </View>
              ) : (
                <>
                  <Text style={[styles.historyTitle, { color: colors.foreground }]}>Histórico</Text>
                  {entries.slice(0, 12).map((entry: any) => (
                    <View
                      key={entry.id}
                      style={[styles.entryRow, { borderBottomColor: colors.border }]}
                    >
                      <View style={styles.entryLeft}>
                        <Text style={[styles.entryMonth, { color: colors.foreground }]}>
                          {formatMonth(entry.referenceMonth)}
                        </Text>
                        <Text style={[styles.entryLevel, { color: colors.muted }]}>
                          Nível {entry.level} · {entry.appointmentsCount} consultas
                        </Text>
                      </View>
                      <View style={styles.entryRight}>
                        <Text style={[styles.entryAmount, { color: colors.primary }]}>
                          {formatCurrency(Number(entry.amount))}
                        </Text>
                        <View
                          style={[
                            styles.statusBadge,
                            { backgroundColor: entry.status === "paid" ? "#DCFCE7" : "#FEF3C7" },
                          ]}
                        >
                          <Text
                            style={[
                              styles.statusText,
                              { color: entry.status === "paid" ? "#16A34A" : "#D97706" },
                            ]}
                          >
                            {entry.status === "paid" ? "Aplicado" : "Pendente"}
                          </Text>
                        </View>
                      </View>
                    </View>
                  ))}
                </>
              )}
            </>
          )}
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
    paddingVertical: 16,
    gap: 12,
  },
  backBtn: { padding: 4 },
  backIcon: { color: "#fff", fontSize: 32, lineHeight: 36, fontWeight: "300" },
  headerTextContainer: { flex: 1 },
  headerTitle: { color: "#fff", fontSize: 20, fontWeight: "700", lineHeight: 26 },
  headerSubtitle: { color: "rgba(255,255,255,0.8)", fontSize: 13, lineHeight: 18, marginTop: 2 },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 16, paddingBottom: 40 },
  card: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    gap: 12,
  },
  cardTitle: { fontSize: 16, fontWeight: "700", lineHeight: 22 },
  levelRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  levelBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  levelLabel: { fontSize: 12, fontWeight: "700", lineHeight: 16 },
  levelDesc: { fontSize: 13, lineHeight: 18, flex: 1 },
  commissionTable: { gap: 4, paddingLeft: 8 },
  commissionRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  commissionYear: { fontSize: 13, lineHeight: 18 },
  commissionAmount: { fontSize: 13, fontWeight: "600", lineHeight: 18 },
  divider: { height: 1, marginVertical: 4 },
  infoBox: { borderRadius: 10, padding: 12, marginTop: 4 },
  infoText: { fontSize: 12, lineHeight: 18 },
  codeBox: {
    borderRadius: 12,
    borderWidth: 2,
    padding: 16,
    alignItems: "center",
    gap: 4,
  },
  codeText: { fontSize: 28, fontWeight: "800", letterSpacing: 6, lineHeight: 36 },
  copyHint: { fontSize: 12, lineHeight: 16 },
  shareBtn: {
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
  },
  shareBtnText: { color: "#fff", fontSize: 15, fontWeight: "700", lineHeight: 20 },
  summaryRow: { flexDirection: "row", gap: 12 },
  summaryBox: { flex: 1, borderRadius: 12, padding: 14, alignItems: "center", gap: 4 },
  summaryLabel: { fontSize: 12, fontWeight: "600", lineHeight: 16 },
  summaryValue: { fontSize: 20, fontWeight: "800", lineHeight: 26 },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
  },
  totalLabel: { fontSize: 14, lineHeight: 20 },
  totalValue: { fontSize: 18, fontWeight: "700", lineHeight: 24 },
  emptyState: { alignItems: "center", paddingVertical: 20, gap: 8 },
  emptyIcon: { fontSize: 36, lineHeight: 44 },
  emptyText: { fontSize: 14, lineHeight: 20, textAlign: "center" },
  historyTitle: { fontSize: 14, fontWeight: "600", lineHeight: 20, marginTop: 4 },
  entryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  entryLeft: { gap: 2 },
  entryMonth: { fontSize: 14, fontWeight: "600", lineHeight: 20 },
  entryLevel: { fontSize: 12, lineHeight: 16 },
  entryRight: { alignItems: "flex-end", gap: 4 },
  entryAmount: { fontSize: 15, fontWeight: "700", lineHeight: 20 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  statusText: { fontSize: 11, fontWeight: "600", lineHeight: 16 },
});
