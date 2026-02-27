import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { trpc } from "@/lib/trpc";
import { useColors } from "@/hooks/use-colors";

const MEDAL = ["🥇", "🥈", "🥉"];

export default function AdminRanking() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState("");
  const { data, isLoading } = trpc.mgm.adminGetRanking.useQuery();

  const filtered = (data ?? []).filter((d) =>
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    (d.referralCode ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const formatCurrency = (val: number) =>
    val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

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
    searchBox: {
      margin: 16,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 10,
      fontSize: 15,
      color: colors.foreground,
      backgroundColor: colors.surface,
      lineHeight: 20,
    },
    podiumRow: {
      flexDirection: "row",
      justifyContent: "center",
      gap: 10,
      paddingHorizontal: 16,
      marginBottom: 20,
    },
    podiumCard: {
      flex: 1,
      borderRadius: 14,
      padding: 12,
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      gap: 4,
    },
    podiumMedal: { fontSize: 28, lineHeight: 36 },
    podiumName: {
      fontSize: 12,
      fontWeight: "700",
      color: colors.foreground,
      textAlign: "center",
      lineHeight: 16,
    },
    podiumReferrals: {
      fontSize: 18,
      fontWeight: "800",
      color: "#0a7ea4",
      lineHeight: 24,
    },
    podiumLabel: { fontSize: 10, color: colors.muted, lineHeight: 14 },
    podiumEarned: { fontSize: 11, color: "#10B981", fontWeight: "600", lineHeight: 15 },
    sectionTitle: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.muted,
      textTransform: "uppercase",
      letterSpacing: 0.8,
      lineHeight: 18,
      paddingHorizontal: 16,
      marginBottom: 8,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      gap: 12,
    },
    rankBadge: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
    },
    rankNum: { fontSize: 13, fontWeight: "700", color: colors.muted, lineHeight: 18 },
    rowName: { flex: 1, fontSize: 15, fontWeight: "600", color: colors.foreground, lineHeight: 22 },
    rowCode: { fontSize: 12, color: colors.muted, lineHeight: 16 },
    rowReferrals: { fontSize: 15, fontWeight: "700", color: "#0a7ea4", lineHeight: 22 },
    rowEarned: { fontSize: 12, color: "#10B981", fontWeight: "600", lineHeight: 16, textAlign: "right" },
    emptyText: { textAlign: "center", color: colors.muted, fontSize: 15, lineHeight: 22, marginTop: 40 },
  });

  const top3 = (data ?? []).slice(0, 3);
  const rest = filtered.slice(3);

  return (
    <ScreenContainer edges={["left", "right", "bottom"]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Ranking de Indicadores</Text>
          <Text style={styles.headerSubtitle}>Top médicos por indicações ativas</Text>
        </View>
      </View>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={rest}
          keyExtractor={(item) => String(item.profileId)}
          ListHeaderComponent={
            <>
              <TextInput
                style={styles.searchBox}
                placeholder="Buscar por nome ou código..."
                placeholderTextColor={colors.muted}
                value={search}
                onChangeText={setSearch}
                returnKeyType="search"
              />
              {/* Podium */}
              {top3.length > 0 && (
                <>
                  <Text style={styles.sectionTitle}>Pódio</Text>
                  <View style={styles.podiumRow}>
                    {top3.map((item, idx) => (
                      <View key={item.profileId} style={[styles.podiumCard, idx === 0 && { borderColor: "#F59E0B", borderWidth: 2 }]}>
                        <Text style={styles.podiumMedal}>{MEDAL[idx]}</Text>
                        <Text style={styles.podiumName} numberOfLines={2}>{item.name}</Text>
                        <Text style={styles.podiumReferrals}>{item.totalReferrals}</Text>
                        <Text style={styles.podiumLabel}>indicações</Text>
                        <Text style={styles.podiumEarned}>{formatCurrency(item.totalEarned + item.pendingAmount)}</Text>
                      </View>
                    ))}
                  </View>
                  <Text style={[styles.sectionTitle, { marginTop: 8 }]}>Classificação completa</Text>
                </>
              )}
            </>
          }
          renderItem={({ item, index }) => (
            <View style={styles.row}>
              <View style={styles.rankBadge}>
                <Text style={styles.rankNum}>{index + 4}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.rowCode}>{item.referralCode ?? "—"}</Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={styles.rowReferrals}>{item.totalReferrals} ind.</Text>
                <Text style={styles.rowEarned}>{formatCurrency(item.totalEarned + item.pendingAmount)}</Text>
              </View>
            </View>
          )}
          ListEmptyComponent={
            !isLoading && (data ?? []).length === 0 ? (
              <Text style={styles.emptyText}>Nenhum indicador encontrado ainda.</Text>
            ) : null
          }
          contentContainerStyle={{ paddingBottom: 40 }}
        />
      )}
    </ScreenContainer>
  );
}
