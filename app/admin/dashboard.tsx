import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/use-colors";
import { useAuthContext } from "@/lib/auth-context";
import { trpc } from "@/lib/trpc";

export default function AdminDashboard() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { logout } = useAuthContext();

  const kpisQuery = trpc.mgm.adminGetKPIs.useQuery();
  const kpis = kpisQuery.data;
  const platformQuery = trpc.mgm.adminGetPlatformKPIs.useQuery();
  const platform = platformQuery.data;
  const financialQuery = trpc.mgm.adminGetFinancialKPIs.useQuery();
  const financial = financialQuery.data;
  const platformFeesKPIsQuery = trpc.platformFees.adminKPIs.useQuery();
  const platformFeesKPIs = platformFeesKPIsQuery.data;

  const formatCurrency = (val: number) =>
    val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const handleLogout = async () => {
    if (Platform.OS === "web") {
      if (window.confirm("Deseja sair da conta admin?")) {
        await logout();
        router.replace("/welcome" as any);
      }
    } else {
      const { Alert } = require("react-native");
      Alert.alert("Sair", "Deseja sair da conta admin?", [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Sair",
          style: "destructive",
          onPress: async () => {
            await logout();
            router.replace("/welcome" as any);
          },
        },
      ]);
    }
  };

  const styles = StyleSheet.create({
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingTop: insets.top + 12,
      paddingBottom: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.surface,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: "700",
      color: colors.foreground,
      lineHeight: 28,
    },
    headerSubtitle: {
      fontSize: 13,
      color: colors.muted,
      lineHeight: 18,
    },
    logoutBtn: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: "#EF4444",
    },
    logoutText: {
      fontSize: 13,
      fontWeight: "600",
      color: "#EF4444",
      lineHeight: 18,
    },
    section: {
      paddingHorizontal: 20,
      paddingTop: 24,
      paddingBottom: 8,
    },
    sectionTitle: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.muted,
      textTransform: "uppercase",
      letterSpacing: 0.8,
      lineHeight: 18,
      marginBottom: 12,
    },
    kpiRow: {
      flexDirection: "row",
      gap: 12,
      marginBottom: 12,
    },
    kpiCard: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center",
    },
    kpiValue: {
      fontSize: 22,
      fontWeight: "700",
      color: colors.foreground,
      lineHeight: 30,
    },
    kpiLabel: {
      fontSize: 12,
      color: colors.muted,
      lineHeight: 16,
      marginTop: 4,
      textAlign: "center",
    },
    menuCard: {
      backgroundColor: colors.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      marginHorizontal: 20,
      marginBottom: 12,
      overflow: "hidden",
    },
    menuItem: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 16,
      gap: 14,
    },
    menuItemBorder: {
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    menuIcon: {
      width: 40,
      height: 40,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
    },
    menuLabel: {
      flex: 1,
      fontSize: 15,
      fontWeight: "600",
      color: colors.foreground,
      lineHeight: 22,
    },
    menuDesc: {
      fontSize: 12,
      color: colors.muted,
      lineHeight: 16,
      marginTop: 2,
    },
    menuArrow: {
      fontSize: 18,
      color: colors.muted,
    },
  });

  return (
    <ScreenContainer edges={["left", "right", "bottom"]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Painel Admin</Text>
          <Text style={styles.headerSubtitle}>MediAlert — Gestão da plataforma</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
          <Text style={styles.logoutText}>Sair</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Resultado Financeiro */}
        <View style={[styles.section, { paddingBottom: 0 }]}>
          <Text style={styles.sectionTitle}>Resultado Financeiro</Text>
          {/* Linha 1: Bruto */}
          <View style={[styles.kpiCard, { marginBottom: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20 }]}>
            <View>
              <Text style={[styles.kpiLabel, { textAlign: "left", marginTop: 0 }]}>Receita Bruta</Text>
              <Text style={{ fontSize: 11, color: colors.muted, lineHeight: 14 }}>consultas realizadas × R$ 300</Text>
            </View>
            <Text style={[styles.kpiValue, { color: "#10B981", fontSize: 20 }]}>
              {financial ? formatCurrency(financial.grossRevenue) : "—"}
            </Text>
          </View>
          {/* Linha 2: Comissões Pendentes (clicável) */}
          <TouchableOpacity
            style={[styles.kpiCard, { marginBottom: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, borderColor: "#FEE2E2" }]}
            onPress={() => router.push("/admin/pending-commissions" as any)}
            activeOpacity={0.7}
          >
            <View>
              <Text style={[styles.kpiLabel, { textAlign: "left", marginTop: 0 }]}>Comissões Pendentes</Text>
              <Text style={{ fontSize: 11, color: colors.muted, lineHeight: 14 }}>a pagar no próximo dia 10 · toque para ver</Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Text style={[styles.kpiValue, { color: "#EF4444", fontSize: 20 }]}>
                {financial ? `− ${formatCurrency(financial.pendingCommissions)}` : "—"}
              </Text>
              <Text style={{ color: "#EF4444", fontSize: 16 }}>›</Text>
            </View>
          </TouchableOpacity>
          {/* Linha 3: Líquido */}
          <View style={[styles.kpiCard, { marginBottom: 4, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, backgroundColor: "#F0FDF4", borderColor: "#BBF7D0" }]}>
            <View>
              <Text style={[styles.kpiLabel, { textAlign: "left", marginTop: 0, fontWeight: "700", color: colors.foreground }]}>Líquido</Text>
              <Text style={{ fontSize: 11, color: colors.muted, lineHeight: 14 }}>bruto − comissões pendentes</Text>
            </View>
            <Text style={[styles.kpiValue, { color: "#059669", fontSize: 20, fontWeight: "800" }]}>
              {financial ? formatCurrency(financial.netRevenue) : "—"}
            </Text>
          </View>
          <Text style={{ fontSize: 11, color: colors.muted, textAlign: "right", paddingRight: 4, paddingBottom: 8, lineHeight: 16 }}>
            Este mês: bruto {financial ? formatCurrency(financial.grossRevenueThisMonth) : "—"} · líquido {financial ? formatCurrency(financial.netRevenueThisMonth) : "—"}
          </Text>

          {/* Linha 4: Taxas de Plataforma Pendentes */}
          <TouchableOpacity
            style={[styles.kpiCard, { marginBottom: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, borderColor: "#FDE68A" }]}
            onPress={() => router.push("/admin/platform-fees" as any)}
            activeOpacity={0.7}
          >
            <View>
              <Text style={[styles.kpiLabel, { textAlign: "left", marginTop: 0 }]}>Taxas de Plataforma Pendentes</Text>
              <Text style={{ fontSize: 11, color: colors.muted, lineHeight: 14 }}>
                {platformFeesKPIs ? `${platformFeesKPIs.pendingCount} médico(s) · toque para gerenciar` : "carregando..."}
              </Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Text style={[styles.kpiValue, { color: "#D97706", fontSize: 20 }]}>
                {platformFeesKPIs ? `− ${formatCurrency(platformFeesKPIs.pendingTotal)}` : "—"}
              </Text>
              <Text style={{ color: "#D97706", fontSize: 16 }}>›</Text>
            </View>
          </TouchableOpacity>
        </View>
        {/* KPIs da Plataforma */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Plataforma</Text>
          <View style={styles.kpiRow}>
            <View style={styles.kpiCard}>
              <Text style={[styles.kpiValue, { color: "#0a7ea4" }]}>
                {platform ? platform.totalDoctors : "—"}
              </Text>
              <Text style={styles.kpiLabel}>Médicos</Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={[styles.kpiValue, { color: "#10B981" }]}>
                {platform ? platform.totalPatients : "—"}
              </Text>
              <Text style={styles.kpiLabel}>Pacientes</Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={[styles.kpiValue, { color: "#8B5CF6" }]}>
                {platform ? platform.totalCaregivers : "—"}
              </Text>
              <Text style={styles.kpiLabel}>Cuidadores</Text>
            </View>
          </View>
          <View style={styles.kpiRow}>
            <View style={styles.kpiCard}>
              <Text style={[styles.kpiValue, { color: "#F59E0B" }]}>
                {platform ? platform.totalAppointments : "—"}
              </Text>
              <Text style={styles.kpiLabel}>Consultas{"\n"}total</Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={[styles.kpiValue, { color: "#10B981" }]}>
                {platform ? platform.completedAppointments : "—"}
              </Text>
              <Text style={styles.kpiLabel}>Realizadas</Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={[styles.kpiValue, { color: "#EF4444" }]}>
                {platform ? platform.appointmentsThisMonth : "—"}
              </Text>
              <Text style={styles.kpiLabel}>Este{"\n"}mês</Text>
            </View>
          </View>
        </View>
        {/* KPIs MGM */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Resumo MGM</Text>
          <View style={styles.kpiRow}>
            <View style={styles.kpiCard}>
              <Text style={[styles.kpiValue, { color: colors.primary }]}>
                {kpis ? kpis.totalDoctors : "—"}
              </Text>
              <Text style={styles.kpiLabel}>Médicos{"\n"}cadastrados</Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={[styles.kpiValue, { color: "#10B981" }]}>
                {kpis ? kpis.referredDoctors : "—"}
              </Text>
              <Text style={styles.kpiLabel}>Médicos{"\n"}indicados</Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={[styles.kpiValue, { color: "#F59E0B" }]}>
                {kpis ? `${Math.round(kpis.conversionRate)}%` : "—"}
              </Text>
              <Text style={styles.kpiLabel}>Taxa de{"\n"}conversão</Text>
            </View>
          </View>
          <View style={styles.kpiRow}>
            <View style={styles.kpiCard}>
              <Text style={[styles.kpiValue, { color: "#EF4444" }]}>
                {kpis ? formatCurrency(kpis.pendingAmount) : "—"}
              </Text>
              <Text style={styles.kpiLabel}>Comissões{"\n"}pendentes</Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={[styles.kpiValue, { color: "#10B981" }]}>
                {kpis ? formatCurrency(kpis.paidAmount) : "—"}
              </Text>
              <Text style={styles.kpiLabel}>Comissões{"\n"}pagas</Text>
            </View>
          </View>
        </View>

        {/* Menu de navegação */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Gerenciamento</Text>
        </View>

        <View style={styles.menuCard}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push("/admin/mgm-dashboard" as any)}
            activeOpacity={0.7}
          >
            <View style={[styles.menuIcon, { backgroundColor: "#EFF6FF" }]}>
              <Text style={{ fontSize: 20 }}>💰</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.menuLabel}>Programa MGM</Text>
              <Text style={styles.menuDesc}>Comissões, regras e rede de indicações</Text>
            </View>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuItem, styles.menuItemBorder]}
            onPress={() => router.push("/admin/network-tree" as any)}
            activeOpacity={0.7}
          >
            <View style={[styles.menuIcon, { backgroundColor: "#F0FDF4" }]}>
              <Text style={{ fontSize: 20 }}>🌐</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.menuLabel}>Rede de Indicações</Text>
              <Text style={styles.menuDesc}>Visualizar hierarquia de médicos</Text>
            </View>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuItem, styles.menuItemBorder]}
            onPress={() => router.push("/admin/ranking" as any)}
            activeOpacity={0.7}
          >
            <View style={[styles.menuIcon, { backgroundColor: "#FFFBEB" }]}>
              <Text style={{ fontSize: 20 }}>🏆</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.menuLabel}>Ranking de Indicadores</Text>
              <Text style={styles.menuDesc}>Top médicos por indicações e comissões</Text>
            </View>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.menuItem, styles.menuItemBorder]}
            onPress={() => router.push("/admin/revenue-ranking" as any)}
            activeOpacity={0.7}
          >
            <View style={[styles.menuIcon, { backgroundColor: "#F0FDF4" }]}>
              <Text style={{ fontSize: 20 }}>💰</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.menuLabel}>Ranking de Receita</Text>
              <Text style={styles.menuDesc}>Faturamento por médico no período</Text>
            </View>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuItem, styles.menuItemBorder]}
            onPress={() => router.push("/admin/network-tree" as any)}
            activeOpacity={0.7}
          >
            <View style={[styles.menuIcon, { backgroundColor: "#F0FDF4" }]}>
              <Text style={{ fontSize: 20 }}>🌳</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.menuLabel}>Estrutura da Rede</Text>
              <Text style={styles.menuDesc}>Hierarquia e consulta de indicações</Text>
            </View>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuItem, styles.menuItemBorder]}
            onPress={() => router.push("/admin/users" as any)}
            activeOpacity={0.7}
          >
            <View style={[styles.menuIcon, { backgroundColor: "#FDF4FF" }]}>
              <Text style={{ fontSize: 20 }}>👥</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.menuLabel}>Gestão de Usuários</Text>
              <Text style={styles.menuDesc}>Médicos, pacientes e cuidadores</Text>
            </View>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuItem, styles.menuItemBorder]}
            onPress={() => router.push("/admin/export" as any)}
            activeOpacity={0.7}
          >
            <View style={[styles.menuIcon, { backgroundColor: "#FFF7ED" }]}>
              <Text style={{ fontSize: 20 }}>📊</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.menuLabel}>Exportar Relatório</Text>
              <Text style={styles.menuDesc}>Baixar comissões em CSV</Text>
            </View>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuItem, styles.menuItemBorder]}
            onPress={() => router.push("/admin/platform-fees" as any)}
            activeOpacity={0.7}
          >
            <View style={[styles.menuIcon, { backgroundColor: "#FFFBEB" }]}>
              <Text style={{ fontSize: 20 }}>🏷️</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.menuLabel}>Taxas de Plataforma</Text>
              <Text style={styles.menuDesc}>Cobrança mensal após 6 meses de uso</Text>
            </View>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </ScreenContainer>
  );
}
