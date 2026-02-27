import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  StyleSheet,
  FlatList,
} from "react-native";
import { router } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { trpc } from "@/lib/trpc";
import { useColors } from "@/hooks/use-colors";

type RoleFilter = "all" | "doctor" | "patient" | "caregiver" | "admin";

const ROLE_LABELS: Record<string, string> = {
  doctor: "Médico",
  patient: "Paciente",
  caregiver: "Cuidador",
  caregiver_patient: "Cuidador",
  admin: "Admin",
};

const ROLE_COLORS: Record<string, { bg: string; text: string }> = {
  doctor: { bg: "#EBF4FF", text: "#0D5BBF" },
  patient: { bg: "#F0FDF4", text: "#16A34A" },
  caregiver: { bg: "#FFF7ED", text: "#EA580C" },
  admin: { bg: "#FDF4FF", text: "#9333EA" },
};

function getRoleColor(appRole: string, role: string) {
  if (role === "admin") return ROLE_COLORS.admin;
  return ROLE_COLORS[appRole] ?? { bg: "#F3F4F6", text: "#6B7280" };
}

function getRoleLabel(appRole: string, role: string) {
  if (role === "admin") return "Admin";
  return ROLE_LABELS[appRole] ?? appRole;
}

export default function AdminUsers() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");

  const { data: users, isLoading } = trpc.mgm.adminGetAllUsers.useQuery();

  const filtered = (users ?? []).filter((u) => {
    const matchSearch =
      !search ||
      (u.name ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (u.email ?? "").toLowerCase().includes(search.toLowerCase());

    const matchRole =
      roleFilter === "all" ||
      (roleFilter === "admin" && u.role === "admin") ||
      (roleFilter !== "admin" && u.appRole === roleFilter);

    return matchSearch && matchRole;
  });

  const roleFilters: { key: RoleFilter; label: string }[] = [
    { key: "all", label: "Todos" },
    { key: "doctor", label: "Médicos" },
    { key: "patient", label: "Pacientes" },
    { key: "caregiver", label: "Cuidadores" },
    { key: "admin", label: "Admin" },
  ];

  const formatDate = (date: Date | string | null) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("pt-BR");
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
    searchContainer: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    searchInput: {
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 10,
      fontSize: 15,
      color: colors.foreground,
      lineHeight: 20,
    },
    filterRow: {
      flexDirection: "row",
      paddingHorizontal: 16,
      paddingVertical: 10,
      gap: 8,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    filterChip: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
      borderWidth: 1,
    },
    filterChipText: { fontSize: 12, fontWeight: "600", lineHeight: 16 },
    countText: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      fontSize: 12,
      color: colors.muted,
      lineHeight: 16,
    },
    userCard: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      gap: 12,
    },
    avatar: {
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: "center",
      justifyContent: "center",
    },
    avatarText: { fontSize: 17, fontWeight: "700", lineHeight: 22 },
    userInfo: { flex: 1 },
    userName: { fontSize: 14, fontWeight: "600", color: colors.foreground, lineHeight: 20 },
    userEmail: { fontSize: 12, color: colors.muted, lineHeight: 16, marginTop: 1 },
    userMeta: { fontSize: 11, color: colors.muted, lineHeight: 15, marginTop: 2 },
    roleBadge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 8,
    },
    roleBadgeText: { fontSize: 11, fontWeight: "700", lineHeight: 15 },
    emptyState: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 60,
      gap: 8,
    },
    emptyIcon: { fontSize: 40, lineHeight: 48 },
    emptyText: { fontSize: 14, color: colors.muted, lineHeight: 20, textAlign: "center" },
  });

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
          <Text style={styles.headerTitle}>Usuários</Text>
          <Text style={styles.headerSubtitle}>Todos os usuários da plataforma</Text>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por nome ou e-mail..."
          placeholderTextColor={colors.muted}
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
      </View>

      {/* Role Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterRow}
        contentContainerStyle={{ gap: 8, paddingRight: 8 }}
      >
        {roleFilters.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[
              styles.filterChip,
              {
                backgroundColor: roleFilter === f.key ? colors.primary : colors.background,
                borderColor: roleFilter === f.key ? colors.primary : colors.border,
              },
            ]}
            onPress={() => setRoleFilter(f.key)}
          >
            <Text
              style={[
                styles.filterChipText,
                { color: roleFilter === f.key ? "#fff" : colors.muted },
              ]}
            >
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <>
          <Text style={styles.countText}>
            {filtered.length} usuário{filtered.length !== 1 ? "s" : ""} encontrado{filtered.length !== 1 ? "s" : ""}
          </Text>
          <FlatList
            data={filtered}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) => {
              const roleColor = getRoleColor(item.appRole, item.role);
              const roleLabel = getRoleLabel(item.appRole, item.role);
              const initials = (item.name ?? item.email ?? "U")
                .split(" ")
                .slice(0, 2)
                .map((w) => w[0]?.toUpperCase() ?? "")
                .join("");
              return (
                <View style={styles.userCard}>
                  <View style={[styles.avatar, { backgroundColor: roleColor.bg }]}>
                    <Text style={[styles.avatarText, { color: roleColor.text }]}>{initials}</Text>
                  </View>
                  <View style={styles.userInfo}>
                    <Text style={styles.userName}>{item.name ?? "Sem nome"}</Text>
                    <Text style={styles.userEmail}>{item.email ?? "—"}</Text>
                    <Text style={styles.userMeta}>
                      Cadastro: {formatDate(item.createdAt)} · Último acesso: {formatDate(item.lastSignedIn)}
                    </Text>
                  </View>
                  <View style={[styles.roleBadge, { backgroundColor: roleColor.bg }]}>
                    <Text style={[styles.roleBadgeText, { color: roleColor.text }]}>{roleLabel}</Text>
                  </View>
                </View>
              );
            }}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>👤</Text>
                <Text style={styles.emptyText}>Nenhum usuário encontrado.</Text>
              </View>
            }
          />
        </>
      )}
    </ScreenContainer>
  );
}
