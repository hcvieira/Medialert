import { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  FlatList,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
  Platform,
  Image,
  Linking,
  Share,
  KeyboardAvoidingView,
} from "react-native";
import * as ImagePicker from "expo-image-picker";

function showAlert(title: string, message?: string) {
  if (Platform.OS === "web") {
    window.alert(message ? `${title}\n\n${message}` : title);
  } else {
    Alert.alert(title, message);
  }
}

function showConfirm(title: string, message: string, onConfirm: () => void, confirmLabel = "Confirmar", destructive = false) {
  if (Platform.OS === "web") {
    if (window.confirm(`${title}\n\n${message}`)) onConfirm();
  } else {
    Alert.alert(title, message, [
      { text: "Cancelar", style: "cancel" },
      { text: confirmLabel, style: destructive ? "destructive" : "default", onPress: onConfirm },
    ]);
  }
}
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useScreenSize } from "@/hooks/use-screen-size";
import { trpc } from "@/lib/trpc";
import { useAuthContext } from "@/lib/auth-context";
import { useRouter } from "expo-router";
import { DateInput, isoToDisplay } from "@/components/date-input";
import { TimeInput } from "@/components/time-input";
import { NotificationBell } from "@/components/notification-bell";

type Tab = "patients" | "agenda" | "requests" | "reports" | "profile";

// ─── Add Patient Modal ────────────────────────────────────────────────────────

function AddPatientModal({ visible, onClose, onSuccess }: { visible: boolean; onClose: () => void; onSuccess: (code: string, name: string) => void }) {
  const colors = useColors();
  const [form, setForm] = useState({ patientName: "", patientEmail: "", patientPhone: "", patientBirthDate: "", patientInsurancePlan: "", patientNotes: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const addMutation = trpc.doctor.addPatient.useMutation({
    onSuccess: (data) => {
      const name = form.patientName;
      setForm({ patientName: "", patientEmail: "", patientPhone: "", patientBirthDate: "", patientInsurancePlan: "", patientNotes: "" });
      onSuccess(data.inviteCode, name);
    },
    onError: (e) => setErrors({ general: e.message }),
  });

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.patientName.trim()) errs.patientName = "Nome é obrigatório";
    if (!form.patientEmail.trim()) errs.patientEmail = "E-mail é obrigatório";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.patientEmail)) errs.patientEmail = "E-mail inválido";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onClose}><Text style={[styles.modalCancelText, { color: colors.muted }]}>Cancelar</Text></TouchableOpacity>
          <Text style={[styles.modalTitle, { color: colors.foreground }]}>Novo Paciente</Text>
          <TouchableOpacity onPress={() => { if (validate()) addMutation.mutate(form); }} disabled={addMutation.isPending}>
            {addMutation.isPending ? <ActivityIndicator size="small" color="#0D5BBF" /> : <Text style={styles.modalSaveText}>Adicionar</Text>}
          </TouchableOpacity>
        </View>
        <ScrollView style={{ flex: 1, padding: 20 }} keyboardShouldPersistTaps="handled">
          {errors.general ? <View style={styles.errorBanner}><Text style={styles.errorBannerText}>{errors.general}</Text></View> : null}
          <Text style={[styles.fieldLabel, { color: colors.muted }]}>NOME COMPLETO *</Text>
          <TextInput style={[styles.input, { color: colors.foreground, borderColor: errors.patientName ? "#EF4444" : colors.border, backgroundColor: colors.surface }]} placeholder="Nome do paciente" placeholderTextColor={colors.muted} value={form.patientName} onChangeText={(v) => setForm((f) => ({ ...f, patientName: v }))} />
          {errors.patientName ? <Text style={styles.fieldError}>{errors.patientName}</Text> : null}
          <Text style={[styles.fieldLabel, { color: colors.muted }]}>E-MAIL *</Text>
          <TextInput style={[styles.input, { color: colors.foreground, borderColor: errors.patientEmail ? "#EF4444" : colors.border, backgroundColor: colors.surface }]} placeholder="email@exemplo.com" placeholderTextColor={colors.muted} value={form.patientEmail} onChangeText={(v) => setForm((f) => ({ ...f, patientEmail: v }))} keyboardType="email-address" autoCapitalize="none" />
          {errors.patientEmail ? <Text style={styles.fieldError}>{errors.patientEmail}</Text> : null}
          <Text style={[styles.fieldLabel, { color: colors.muted }]}>TELEFONE</Text>
          <TextInput style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.surface }]} placeholder="(11) 99999-9999" placeholderTextColor={colors.muted} value={form.patientPhone} onChangeText={(v) => setForm((f) => ({ ...f, patientPhone: v }))} keyboardType="phone-pad" />
          <Text style={[styles.fieldLabel, { color: colors.muted }]}>DATA DE NASCIMENTO</Text>
          <DateInput style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.surface }]} placeholderTextColor={colors.muted} value={form.patientBirthDate} onChangeText={(v) => setForm((f) => ({ ...f, patientBirthDate: v }))} />
          <Text style={[styles.fieldLabel, { color: colors.muted }]}>PLANO DE SAÚDE</Text>
          <TextInput style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.surface }]} placeholder="Ex: Unimed, Bradesco Saúde..." placeholderTextColor={colors.muted} value={form.patientInsurancePlan} onChangeText={(v) => setForm((f) => ({ ...f, patientInsurancePlan: v }))} />
          <Text style={[styles.fieldLabel, { color: colors.muted }]}>OBSERVAÇÕES INICIAIS</Text>
          <TextInput style={[styles.input, styles.textArea, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.surface }]} placeholder="Histórico relevante, alergias, condições..." placeholderTextColor={colors.muted} value={form.patientNotes} onChangeText={(v) => setForm((f) => ({ ...f, patientNotes: v }))} multiline numberOfLines={4} />
          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </Modal>
  );
}

// ─── Patients Tab ─────────────────────────────────────────────────────────────

type StatusFilter = "todos" | "vinculado" | "pendente";
type SortOrder = "nome" | "recente" | "adesao";

function PatientsTab() {
  const colors = useColors();
  const { isWeb } = useScreenSize();
  const router = useRouter();
  const patientsQuery = trpc.doctor.getPatientsAll.useQuery();
  const [showAddModal, setShowAddModal] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [invitePatientName, setInvitePatientName] = useState("");
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("todos");
  const [sortOrder, setSortOrder] = useState<SortOrder>("recente");
  const [showSortMenu, setShowSortMenu] = useState(false);

  const allPatients = patientsQuery.data ?? [];
  const [pendingPatient, setPendingPatient] = useState<{ id: number; linkId: number; name: string; email: string; phone?: string; birthDate?: string; insurancePlan?: string; notes?: string; code: string } | null>(null);

  const onAddSuccess = (code: string, name: string) => {
    setInviteCode(code);
    setInvitePatientName(name);
    setShowAddModal(false);
    setShowInviteModal(true);
    patientsQuery.refetch();
  };

  // Count by status for badges
  const countLinked = allPatients.filter(p => p.accepted && p.patientId > 0).length;
  const countPending = allPatients.filter(p => !(p.accepted && p.patientId > 0)).length;

  // Filter patients by search query and status
  const filteredPatients = allPatients.filter((item) => {
    const isLinked = item.accepted && item.patientId > 0;
    const name = (item.userInfo?.name ?? item.patientName ?? "").toLowerCase();
    const email = (item.patientEmail ?? item.userInfo?.email ?? "").toLowerCase();
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = q === "" || name.includes(q) || email.includes(q);
    const matchesStatus =
      statusFilter === "todos" ||
      (statusFilter === "vinculado" && isLinked) ||
      (statusFilter === "pendente" && !isLinked);
    return matchesSearch && matchesStatus;
  });

  // Sort patients
  const patients = [...filteredPatients].sort((a, b) => {
    if (sortOrder === "nome") {
      const na = (a.userInfo?.name ?? a.patientName ?? "").toLowerCase();
      const nb = (b.userInfo?.name ?? b.patientName ?? "").toLowerCase();
      return na.localeCompare(nb, "pt-BR");
    }
    if (sortOrder === "adesao") {
      // Linked patients first, then by id desc
      const la = a.accepted && a.patientId > 0 ? 1 : 0;
      const lb = b.accepted && b.patientId > 0 ? 1 : 0;
      return lb - la || b.id - a.id;
    }
    // Default: recente (by id desc)
    return b.id - a.id;
  });

  const SORT_LABELS: Record<SortOrder, string> = {
    nome: "Nome (A-Z)",
    recente: "Mais recente",
    adesao: "Status (ativos primeiro)",
  };

  const STATUS_FILTERS: { key: StatusFilter; label: string; count?: number }[] = [
    { key: "todos", label: "Todos", count: allPatients.length },
    { key: "vinculado", label: "Ativos", count: countLinked },
    { key: "pendente", label: "Pendentes", count: countPending },
  ];

  return (
    <View style={{ flex: 1 }}>
      <View style={[styles.sectionHeader, { backgroundColor: colors.background }]}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Meus Pacientes ({allPatients.length})</Text>
        <TouchableOpacity style={styles.inviteBtn} onPress={() => setShowAddModal(true)} activeOpacity={0.8}>
          <IconSymbol name="person.badge.plus" size={18} color="#fff" />
          <Text style={styles.inviteBtnText}>Adicionar</Text>
        </TouchableOpacity>
      </View>

      {/* Search bar */}
      {allPatients.length > 0 && (
        <View style={[styles.searchContainer, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
          {/* Search + sort row */}
          <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
            <View style={[styles.searchBar, { flex: 1, backgroundColor: colors.surface, borderColor: colors.border }]}>
              <IconSymbol name="magnifyingglass" size={16} color={colors.muted} />
              <TextInput
                style={[styles.searchInput, { color: colors.foreground }]}
                placeholder="Buscar por nome ou e-mail..."
                placeholderTextColor={colors.muted}
                value={searchQuery}
                onChangeText={setSearchQuery}
                returnKeyType="search"
                autoCapitalize="none"
                autoCorrect={false}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery("")} style={{ padding: 4 }}>
                  <IconSymbol name="xmark.circle.fill" size={16} color={colors.muted} />
                </TouchableOpacity>
              )}
            </View>
            {/* Sort button */}
            <TouchableOpacity
              style={[styles.sortBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => setShowSortMenu(true)}
              activeOpacity={0.8}
            >
              <IconSymbol name="list.bullet" size={16} color={colors.muted} />
            </TouchableOpacity>
          </View>
          {/* Status filter chips with count badges */}
          <View style={styles.filterRow}>
            {STATUS_FILTERS.map((f) => (
              <TouchableOpacity
                key={f.key}
                style={[styles.filterChip, statusFilter === f.key && styles.filterChipActive]}
                onPress={() => setStatusFilter(f.key)}
                activeOpacity={0.8}
              >
                <Text style={[styles.filterChipText, statusFilter === f.key && styles.filterChipTextActive]}>{f.label}</Text>
                {f.count !== undefined && f.count > 0 && (
                  <View style={[styles.filterBadge, statusFilter === f.key ? styles.filterBadgeActive : { backgroundColor: colors.border }]}>
                    <Text style={[styles.filterBadgeText, statusFilter === f.key && { color: "#0D5BBF" }]}>{f.count}</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Sort menu modal */}
      <Modal visible={showSortMenu} transparent animationType="fade">
        <TouchableOpacity style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)" }} onPress={() => setShowSortMenu(false)} activeOpacity={1}>
          <View style={[styles.sortMenuCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Text style={[styles.sortMenuTitle, { color: colors.muted }]}>ORDENAR POR</Text>
            {(["recente", "nome", "adesao"] as SortOrder[]).map((key) => (
              <TouchableOpacity
                key={key}
                style={[styles.sortMenuItem, sortOrder === key && { backgroundColor: "#EBF4FF" }]}
                onPress={() => { setSortOrder(key); setShowSortMenu(false); }}
                activeOpacity={0.8}
              >
                <Text style={[styles.sortMenuItemText, { color: sortOrder === key ? "#0D5BBF" : colors.foreground }]}>{SORT_LABELS[key]}</Text>
                {sortOrder === key && <IconSymbol name="checkmark" size={16} color="#0D5BBF" />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {patientsQuery.isLoading ? (
        <View style={styles.centered}><ActivityIndicator size="large" color="#0D5BBF" /></View>
      ) : patientsQuery.isError ? (
        <View style={styles.centered}>
          <Text style={{ fontSize: 36, marginBottom: 12 }}>📡</Text>
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Erro ao carregar pacientes</Text>
          <Text style={[styles.emptyDesc, { color: colors.muted }]}>Verifique sua conexão e tente novamente.</Text>
          <TouchableOpacity style={styles.emptyBtn} onPress={() => patientsQuery.refetch()} activeOpacity={0.85}>
            <Text style={styles.emptyBtnText}>Tentar novamente</Text>
          </TouchableOpacity>
        </View>
      ) : allPatients.length === 0 ? (
        <View style={styles.emptyState}>
          <IconSymbol name="person.2.fill" size={56} color={colors.muted} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Nenhum paciente ainda</Text>
          <Text style={[styles.emptyDesc, { color: colors.muted }]}>Adicione um paciente informando nome e e-mail. Ele receberá um código para vincular a conta.</Text>
          <TouchableOpacity style={styles.emptyBtn} onPress={() => setShowAddModal(true)} activeOpacity={0.85}>
            <Text style={styles.emptyBtnText}>Adicionar primeiro paciente</Text>
          </TouchableOpacity>
        </View>
      ) : patients.length === 0 ? (
        <View style={styles.emptyState}>
          <IconSymbol name="magnifyingglass" size={48} color={colors.muted} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Nenhum resultado</Text>
          <Text style={[styles.emptyDesc, { color: colors.muted }]}>Nenhum paciente encontrado para "{searchQuery || statusFilter}".</Text>
        </View>
      ) : (
        <FlatList
          data={patients}
          keyExtractor={(item) => String(item.id)}
          numColumns={isWeb ? 2 : 1}
          key={isWeb ? "web-grid" : "mobile-list"}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          columnWrapperStyle={isWeb ? { gap: 12 } : undefined}
          renderItem={({ item }) => {
            const isLinked = item.accepted && item.patientId > 0;
            const name = item.userInfo?.name ?? item.patientName ?? "Paciente";
            const initials = name.split(" ").slice(0, 2).map((n: string) => n[0]).join("").toUpperCase();
            // Prefer the patient's own uploaded photo (from users.photoUrl), fallback to doctor-uploaded photo
            const photoUrl = (item.userInfo as any)?.photoUrl ?? item.patientPhotoUrl;
            return (
              <TouchableOpacity
                style={[styles.patientCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => {
                  if (isLinked) {
                    router.push({ pathname: "/doctor/patient-detail", params: { patientId: item.patientId, linkId: item.id, patientName: item.patientName ?? "" } } as any);
                  } else {
                    setPendingPatient({ id: item.id, linkId: item.id, name: item.patientName ?? "Paciente", email: item.patientEmail ?? "", phone: item.patientPhone ?? undefined, birthDate: item.patientBirthDate ?? undefined, insurancePlan: item.patientInsurancePlan ?? undefined, notes: item.patientNotes ?? undefined, code: item.inviteCode ?? "" });
                  }
                }}
                activeOpacity={0.85}
              >
                <View style={[styles.patientAvatar, { backgroundColor: isLinked ? "#0D5BBF" : colors.border, overflow: "hidden" }]}>
                  {photoUrl
                    ? <Image source={{ uri: photoUrl }} style={{ width: 48, height: 48, borderRadius: 24 }} />
                    : <Text style={[styles.patientAvatarText, { color: isLinked ? "#fff" : colors.muted }]}>{initials}</Text>}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.patientName, { color: colors.foreground }]}>{name}</Text>
                  <Text style={[styles.patientEmail, { color: colors.muted }]}>{item.patientEmail ?? item.userInfo?.email ?? ""}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: isLinked ? "#DCFCE720" : "#FEF9C320" }]}>
                  <Text style={[styles.statusText, { color: isLinked ? "#16A34A" : "#CA8A04" }]}>{isLinked ? "Vinculado" : "Pendente"}</Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}

      <AddPatientModal visible={showAddModal} onClose={() => setShowAddModal(false)} onSuccess={onAddSuccess} />

      {/* Pending Patient Modal */}
      <Modal visible={!!pendingPatient} transparent animationType="fade" onRequestClose={() => setPendingPatient(null)}>
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: 24 }} keyboardShouldPersistTaps="handled">
          <View style={[styles.modalCard, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={styles.pendingModalHeader}>
              <View style={styles.modalIcon}><Text style={{ fontSize: 28 }}>⏳</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalTitle, { color: colors.foreground, textAlign: "left", fontSize: 17 }]}>{pendingPatient?.name}</Text>
                <Text style={[styles.modalDesc, { color: colors.muted, textAlign: "left", marginTop: 2 }]}>{pendingPatient?.email}</Text>
              </View>
            </View>

            {/* Dados cadastrais */}
            {(pendingPatient?.phone || pendingPatient?.birthDate || pendingPatient?.insurancePlan) && (
              <View style={[styles.patientInfoBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                {pendingPatient?.phone ? (
                  <View style={styles.infoRow}>
                    <Text style={[styles.infoLabel, { color: colors.muted }]}>Telefone</Text>
                    <Text style={[styles.infoValue2, { color: colors.foreground }]}>{pendingPatient.phone}</Text>
                  </View>
                ) : null}
                {pendingPatient?.birthDate ? (
                  <View style={styles.infoRow}>
                    <Text style={[styles.infoLabel, { color: colors.muted }]}>Nascimento</Text>
                    <Text style={[styles.infoValue2, { color: colors.foreground }]}>{pendingPatient.birthDate}</Text>
                  </View>
                ) : null}
                {pendingPatient?.insurancePlan ? (
                  <View style={styles.infoRow}>
                    <Text style={[styles.infoLabel, { color: colors.muted }]}>Plano</Text>
                    <Text style={[styles.infoValue2, { color: colors.foreground }]}>{pendingPatient.insurancePlan}</Text>
                  </View>
                ) : null}
              </View>
            )}

            {/* Código de convite */}
            <Text style={[styles.pendingCodeLabel, { color: colors.muted }]}>CÓDIGO DE CONVITE</Text>
            <View style={styles.codeBox}>
              <Text style={styles.codeText}>{pendingPatient?.code}</Text>
            </View>
            <Text style={[styles.modalNote, { color: colors.muted }]}>
              O paciente deve abrir o app, ir em "Meus Médicos" e digitar este código de 6 dígitos.
            </Text>
            <TouchableOpacity
              style={[styles.modalCloseBtn, { backgroundColor: "#0D5BBF", marginBottom: 8 }]}
              onPress={() => {
                const { Share } = require("react-native");
                Share.share({
                  message: `Olá ${pendingPatient?.name}! Seu médico convidou você para o MediAlert.\n\nBaixe o app e use o código de convite:\n${pendingPatient?.code}\n\nAcesse: https://medialert.com.br`,
                });
              }}
            >
              <Text style={styles.modalCloseBtnText}>Compartilhar código</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalCloseBtn, { backgroundColor: "#F0FDF4", marginBottom: 0 }]}
              onPress={() => {
                const p = pendingPatient;
                setPendingPatient(null);
                if (p) {
                  router.push({ pathname: "/doctor/patient-detail", params: { patientId: "0", linkId: String(p.linkId), patientName: p.name } } as any);
                }
              }}
            >
              <Text style={[styles.modalCloseBtnText, { color: "#16A34A" }]}>Ver ficha completa</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modalCloseBtn, { backgroundColor: colors.surface, marginTop: 0 }]} onPress={() => setPendingPatient(null)}>
              <Text style={[styles.modalCloseBtnText, { color: colors.foreground }]}>Fechar</Text>
            </TouchableOpacity>
          </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Invite Code Modal */}
      <Modal visible={showInviteModal} transparent animationType="fade">
        <View style={[styles.modalOverlay, { alignItems: "center", justifyContent: "center", padding: 24 }]}>
          <View style={[styles.modalCard, { backgroundColor: colors.background }]}>
            <View style={styles.modalIcon}><Text style={{ fontSize: 32 }}>✅</Text></View>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Paciente adicionado!</Text>
            <Text style={[styles.modalDesc, { color: colors.muted }]}>Compartilhe o código abaixo com {invitePatientName} para que ele vincule a conta no MediAlert.</Text>
            <View style={styles.codeBox}><Text style={styles.codeText}>{inviteCode}</Text></View>
            <Text style={[styles.modalNote, { color: colors.muted }]}>Um e-mail com o código também foi enviado para o paciente.</Text>
            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setShowInviteModal(false)}>
              <Text style={styles.modalCloseBtnText}>Entendido</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Agenda Tab ───────────────────────────────────────────────────────────────

const STATUS_FLOW: Record<string, { next: string; label: string; color: string }> = {
  scheduled:  { next: "confirmed",  label: "Confirmar",  color: "#22C55E" },
  confirmed:  { next: "completed",  label: "Concluir",   color: "#6366F1" },
  completed:  { next: "completed",  label: "Realizada",  color: "#6366F1" },
  cancelled:  { next: "cancelled",  label: "Cancelada",  color: "#EF4444" },
};

function AgendaTab() {
  const colors = useColors();
  const { isWeb } = useScreenSize();
  const appointmentsQuery = trpc.appointments.listForDoctor.useQuery();
  const doctorProfileQuery = trpc.doctor.getProfile.useQuery(undefined, { staleTime: 60_000 });
  const doctorAddress = (doctorProfileQuery.data as any)?.address ?? "";
  const utils = trpc.useUtils();
  const [agendaSearch, setAgendaSearch] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "week" | "month">("list");
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() }; // 0-indexed
  });
  const [selectedDaySheet, setSelectedDaySheet] = useState<string | null>(null); // date string YYYY-MM-DD

  // Date range filter (DD/MM/AAAA para exibição, ISO para filtragem)
  const [dateFrom, setDateFrom] = useState(""); // DD/MM/AAAA
  const [dateFromISO, setDateFromISO] = useState(""); // AAAA-MM-DD
  const [dateTo, setDateTo] = useState(""); // DD/MM/AAAA
  const [dateToISO, setDateToISO] = useState(""); // AAAA-MM-DD
  const [showDateFilter, setShowDateFilter] = useState(false);

  const clearDateFilter = () => { setDateFrom(""); setDateFromISO(""); setDateTo(""); setDateToISO(""); };
  const hasDateFilter = dateFromISO.length > 0 || dateToISO.length > 0;

  // Edit appointment modal state
  const [editAppt, setEditAppt] = useState<any>(null);
  const [editDate, setEditDate] = useState(""); // DD/MM/AAAA (display)
  const [editDateISO, setEditDateISO] = useState(""); // AAAA-MM-DD (backend)
  const [editTime, setEditTime] = useState("");
  const [editInsurance, setEditInsurance] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editLocationEdited, setEditLocationEdited] = useState(false);
  const [editNotes, setEditNotes] = useState("");
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});

  const openEditModal = (item: any) => {
    setEditAppt(item);
    // Converter de ISO (AAAA-MM-DD) para DD/MM/AAAA para exibição
    const displayDate = item.date.match(/^\d{4}-\d{2}-\d{2}$/) ? isoToDisplay(item.date) : item.date;
    setEditDate(displayDate);
    setEditDateISO(item.date);
    setEditTime(item.time);
    setEditInsurance(item.insurance ?? "");
    setEditLocation(item.location ?? "");
    setEditLocationEdited(!!(item.location)); // already has a location = user had set it
    setEditNotes(item.notes ?? "");
    setEditErrors({});
  };

  const updateApptMutation = trpc.appointments.update.useMutation({
    onSuccess: () => {
      utils.appointments.listForDoctor.invalidate();
      setEditAppt(null);
    },
  });

  const handleSaveEdit = async () => {
    const errors: Record<string, string> = {};
    if (!editDateISO.match(/^\d{4}-\d{2}-\d{2}$/)) errors.date = "Data inválida (ex: 28/02/2026)";
    if (!editTime.match(/^\d{2}:\d{2}$/)) errors.time = "Hora inválida (HH:MM)";
    setEditErrors(errors);
    if (Object.keys(errors).length > 0) return;
    try {
      await updateApptMutation.mutateAsync({
        appointmentId: editAppt.id,
        date: editDateISO,
        time: editTime,
        insurance: editInsurance.trim() || undefined,
        location: editLocation.trim() || undefined,
        notes: editNotes.trim() || undefined,
      });
      showAlert("✅ Consulta atualizada", `Reagendada para ${editDate} às ${editTime}.`);
    } catch (e: any) {
      showAlert("Erro", e.message ?? "Não foi possível atualizar.");
    }
  };

  const updateStatusMutation = trpc.appointments.updateStatus.useMutation({
    onSuccess: () => utils.appointments.listForDoctor.invalidate(),
  });

  const allAppts = (appointmentsQuery.data ?? []).sort((a, b) => {
    const da = `${a.date}T${a.time}`;
    const db2 = `${b.date}T${b.time}`;
    return da < db2 ? -1 : 1;
  });

  // Filter by patient name or date + date range
  const appts = allAppts.filter((a) => {
    const q = agendaSearch.toLowerCase().trim();
    if (q) {
      const name = (a.patientName ?? "").toLowerCase();
      const dateBR = a.date.split("-").reverse().join("/");
      if (!name.includes(q) && !a.date.includes(q) && !dateBR.includes(q)) return false;
    }
    if (dateFromISO && a.date < dateFromISO) return false;
    if (dateToISO && a.date > dateToISO) return false;
    return true;
  });

  const today = new Date().toISOString().split("T")[0];
  const upcoming = appts.filter((a) => a.date >= today && a.status !== "cancelled");
  const past = appts.filter((a) => a.date < today || a.status === "cancelled");

  const handleExportAgenda = useCallback(() => {
    const list = appts.slice();
    if (list.length === 0) {
      showAlert("Agenda vazia", "Nenhuma consulta para exportar no período selecionado.");
      return;
    }
    const statusLabelMap: Record<string, string> = {
      scheduled: "Agendada",
      confirmed: "Confirmada",
      completed: "Realizada",
      cancelled: "Cancelada",
    };
    const lines = list.map((a) => {
      const dateBR = a.date.split("-").reverse().join("/");
      const parts = [
        `📅 ${dateBR} às ${a.time}`,
        `👤 ${a.patientName ?? "—"}`,
        a.insurance ? `🏥 ${a.insurance}` : null,
        a.location ? `📍 ${a.location}` : null,
        `🔖 ${statusLabelMap[a.status] ?? a.status}`,
        a.notes ? `📝 ${a.notes}` : null,
      ].filter(Boolean).join("\n");
      return parts;
    });
    const header = hasDateFilter
      ? `Agenda: ${dateFrom || "início"} a ${dateTo || "hoje"} — ${list.length} consulta(s)`
      : `Agenda completa — ${list.length} consulta(s)`;
    const text = `${header}\n${"-".repeat(40)}\n\n${lines.join("\n\n")}`;
    Share.share({ message: text, title: "Agenda de Consultas" }).catch(() => {});
  }, [appts, hasDateFilter, dateFrom, dateTo]);

  const statusColor = (s: string) => {
    if (s === "confirmed") return "#22C55E";
    if (s === "cancelled") return "#EF4444";
    if (s === "completed") return "#6366F1";
    return "#F59E0B";
  };

  const statusLabel = (s: string) => {
    if (s === "confirmed") return "Confirmada";
    if (s === "cancelled") return "Cancelada";
    if (s === "completed") return "Realizada";
    return "Agendada";
  };

  const handleStatusChange = (apptId: number, currentStatus: string) => {
    const flow = STATUS_FLOW[currentStatus];
    if (!flow || flow.next === currentStatus) return;
    if (Platform.OS === "web") {
      if (window.confirm(`Marcar consulta como "${statusLabel(flow.next)}"?`)) {
        updateStatusMutation.mutate({ appointmentId: apptId, status: flow.next as any });
      }
    } else {
      showConfirm(
        "Alterar status",
        `Marcar consulta como "${statusLabel(flow.next)}"?`,
        () => updateStatusMutation.mutate({ appointmentId: apptId, status: flow.next as any })
      );
    }
  };

  const handleCancelAppt = (apptId: number) => {
    if (Platform.OS === "web") {
      if (window.confirm("Deseja cancelar esta consulta?")) {
        updateStatusMutation.mutate({ appointmentId: apptId, status: "cancelled" });
      }
    } else {
      showConfirm(
        "Cancelar consulta",
        "Deseja cancelar esta consulta?",
        () => updateStatusMutation.mutate({ appointmentId: apptId, status: "cancelled" }),
        "Cancelar consulta",
        true
      );
    }
  };

  const renderAppt = ({ item }: any) => {
    const flow = STATUS_FLOW[item.status];
    const canAdvance = flow && flow.next !== item.status;
    return (
      <View style={[styles.apptCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={[styles.apptDateBadge, { backgroundColor: "#EBF4FF" }]}>
          <Text style={styles.apptDay}>{item.date.split("-")[2]}</Text>
          <Text style={styles.apptMonth}>
            {new Date(item.date + "T12:00:00").toLocaleDateString("pt-BR", { month: "short" }).replace(".", "").toUpperCase()}
          </Text>
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={[styles.apptPatient, { color: colors.foreground }]}>{item.patientName}</Text>
          <Text style={[styles.apptTime, { color: colors.muted }]}>
            {item.time} {item.insurance ? `· ${item.insurance}` : ""}
          </Text>
          {item.location ? (
            <TouchableOpacity
              onPress={() => {
                const encoded = encodeURIComponent(item.location);
                const url = Platform.OS === "ios" ? `maps:?q=${encoded}` : `geo:0,0?q=${encoded}`;
                Linking.canOpenURL(url).then((can) => {
                  Linking.openURL(can ? url : `https://maps.google.com/?q=${encoded}`);
                });
              }}
              activeOpacity={0.7}
            >
              <Text style={[styles.apptNotes, { color: "#0D5BBF" }]} numberOfLines={1}>📍 {item.location}</Text>
            </TouchableOpacity>
          ) : null}
          {item.notes ? <Text style={[styles.apptNotes, { color: colors.muted }]} numberOfLines={1}>{item.notes}</Text> : null}
          {/* Status action row */}
          {item.status !== "cancelled" && (
            <View style={{ flexDirection: "row", gap: 6, marginTop: 4 }}>
              {canAdvance && (
                <TouchableOpacity
                  style={[styles.apptStatusBtn, { backgroundColor: flow.color + "18", borderColor: flow.color }]}
                  onPress={() => handleStatusChange(item.id, item.status)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.apptStatusBtnText, { color: flow.color }]}>{flow.label} →</Text>
                </TouchableOpacity>
              )}
              {item.status !== "completed" && (
                <TouchableOpacity
                  style={[styles.apptStatusBtn, { backgroundColor: "#F5F5F5", borderColor: colors.border }]}
                  onPress={() => openEditModal(item)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.apptStatusBtnText, { color: colors.muted }]}>✏️ Editar</Text>
                </TouchableOpacity>
              )}
              {item.status !== "completed" && (
                <TouchableOpacity
                  style={[styles.apptStatusBtn, { backgroundColor: "#FEE2E220", borderColor: "#EF4444" }]}
                  onPress={() => handleCancelAppt(item.id)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.apptStatusBtnText, { color: "#EF4444" }]}>Cancelar</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusColor(item.status) + "20" }]}>
          <Text style={[styles.statusText, { color: statusColor(item.status) }]}>{statusLabel(item.status)}</Text>
        </View>
      </View>
    );
  };

  // ── Weekly view helpers ──────────────────────────────────────────────────────
  const getWeekDays = () => {
    const now = new Date();
    const day = now.getDay(); // 0=Sun
    const monday = new Date(now);
    monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d.toISOString().split("T")[0];
    });
  };
  const weekDays = getWeekDays();
  const weekAppts = allAppts.filter((a) => weekDays.includes(a.date) && a.status !== "cancelled");

  const DAY_LABELS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

  return (
    <View style={{ flex: 1 }}>
      {/* ── Edit Appointment Modal ── */}
      <Modal visible={!!editAppt} transparent animationType="slide" onRequestClose={() => setEditAppt(null)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>Editar consulta</Text>
              <TouchableOpacity onPress={() => setEditAppt(null)}>
                <IconSymbol name="xmark" size={22} color={colors.muted} />
              </TouchableOpacity>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 440 }}>
              <View style={{ gap: 14 }}>
                <View style={{ gap: 6 }}>
                  <Text style={styles.fieldLabel}>DATA *</Text>
                  <DateInput
                    style={[styles.input, { backgroundColor: colors.surface, color: colors.foreground, borderColor: editErrors.date ? "#EF4444" : colors.border }]}
                    value={editDate}
                    onChangeText={setEditDate}
                    onChangeISO={setEditDateISO}
                    placeholderTextColor={colors.muted}
                    returnKeyType="next"
                  />
                  {editErrors.date ? <Text style={styles.fieldError}>{editErrors.date}</Text> : null}
                </View>
                <View style={{ gap: 6 }}>
                  <Text style={styles.fieldLabel}>HORÁRIO *</Text>
                  <TimeInput
                    style={[styles.input, { backgroundColor: colors.surface, color: colors.foreground, borderColor: editErrors.time ? "#EF4444" : colors.border }]}
                    value={editTime} onChangeText={setEditTime}
                    placeholderTextColor={colors.muted}
                    returnKeyType="next"
                  />
                  {editErrors.time ? <Text style={styles.fieldError}>{editErrors.time}</Text> : null}
                </View>
                <View style={{ gap: 6 }}>
                  <Text style={styles.fieldLabel}>CONVÊINIO</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.surface, color: colors.foreground, borderColor: colors.border }]}
                    value={editInsurance} onChangeText={setEditInsurance}
                    placeholder="Ex: Unimed, Particular..." placeholderTextColor={colors.muted}
                  />
                </View>
                <View style={{ gap: 6 }}>
                  <Text style={styles.fieldLabel}>LOCAL / ENDEREÇO</Text>
                  {/* Show doctor's address as suggestion when field is empty */}
                  {doctorAddress && !editLocationEdited && editLocation === "" && (
                    <TouchableOpacity
                      style={{ backgroundColor: "#EBF4FF", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 }}
                      onPress={() => { setEditLocation(doctorAddress); setEditLocationEdited(false); }}
                      activeOpacity={0.75}
                    >
                      <IconSymbol name="mappin.circle.fill" size={16} color="#0D5BBF" />
                      <Text style={{ color: "#0D5BBF", fontSize: 13, fontWeight: "600", flex: 1 }} numberOfLines={1}>{doctorAddress}</Text>
                      <Text style={{ color: "#0D5BBF", fontSize: 11 }}>Usar</Text>
                    </TouchableOpacity>
                  )}
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.surface, color: colors.foreground, borderColor: colors.border, flex: 1 }]}
                      value={editLocation}
                      onChangeText={(t) => { setEditLocation(t); setEditLocationEdited(true); }}
                      placeholder="Ex: Rua das Flores, 123 — Sala 45" placeholderTextColor={colors.muted}
                    />
                    {editLocation !== "" && (
                      <TouchableOpacity onPress={() => { setEditLocation(""); setEditLocationEdited(false); }} style={{ padding: 4 }}>
                        <IconSymbol name="xmark.circle.fill" size={20} color={colors.muted} />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
                <View style={{ gap: 6 }}>
                  <Text style={styles.fieldLabel}>OBSERVAÇÕES</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.surface, color: colors.foreground, borderColor: colors.border, minHeight: 72 }]}
                    value={editNotes} onChangeText={setEditNotes}
                    placeholder="Ex: Trazer exames anteriores..." placeholderTextColor={colors.muted}
                    multiline numberOfLines={3} textAlignVertical="top"
                  />
                </View>
                <TouchableOpacity
                  style={[styles.saveBtn, { backgroundColor: "#0D5BBF" }, updateApptMutation.isPending && { opacity: 0.6 }]}
                  onPress={handleSaveEdit}
                  disabled={updateApptMutation.isPending}
                  activeOpacity={0.85}
                >
                  {updateApptMutation.isPending ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Salvar alterações</Text>}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Day Detail Bottom Sheet ── */}
      <Modal
        visible={!!selectedDaySheet}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedDaySheet(null)}
      >
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)" }}
          activeOpacity={1}
          onPress={() => setSelectedDaySheet(null)}
        />
        <View style={[styles.bottomSheet, { backgroundColor: colors.background }]}>
          <View style={[styles.bottomSheetHandle, { backgroundColor: colors.border }]} />
          <View style={styles.modalHeader}>
            <View>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>
                {selectedDaySheet
                  ? new Date(selectedDaySheet + "T12:00:00").toLocaleDateString("pt-BR", {
                      weekday: "long", day: "numeric", month: "long",
                    }).replace(/^\w/, (c) => c.toUpperCase())
                  : ""}
              </Text>
              <Text style={{ fontSize: 13, color: colors.muted, marginTop: 2 }}>
                {selectedDaySheet ? allAppts.filter((a) => a.date === selectedDaySheet && a.status !== "cancelled").length : 0} consulta(s)
              </Text>
            </View>
            <TouchableOpacity onPress={() => setSelectedDaySheet(null)}>
              <IconSymbol name="xmark" size={22} color={colors.muted} />
            </TouchableOpacity>
          </View>
          <ScrollView style={{ maxHeight: 400 }} contentContainerStyle={{ padding: 16, gap: 10 }}>
            {selectedDaySheet &&
              allAppts
                .filter((a) => a.date === selectedDaySheet)
                .sort((a, b) => a.time.localeCompare(b.time))
                .map((item) => {
                  const flow = STATUS_FLOW[item.status];
                  const canAdvance = flow && flow.next !== item.status;
                  return (
                    <View key={item.id} style={[styles.apptCard, { backgroundColor: colors.surface, borderColor: colors.border, marginBottom: 8 }]}>
                      <View style={[styles.apptDateBadge, { backgroundColor: "#EBF4FF" }]}>
                        <Text style={styles.apptDay}>{item.time.split(":")[0]}</Text>
                        <Text style={styles.apptMonth}>{item.time.split(":")[1]}h</Text>
                      </View>
                      <View style={{ flex: 1, gap: 4 }}>
                        <Text style={[styles.apptPatient, { color: colors.foreground }]}>{item.patientName}</Text>
                        <Text style={[styles.apptTime, { color: colors.muted }]}>{item.insurance ?? "Particular"}</Text>
                        {item.location ? (
                          <Text style={[styles.apptNotes, { color: "#0D5BBF" }]} numberOfLines={1}>📍 {item.location}</Text>
                        ) : null}
                        <View style={{ flexDirection: "row", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
                          {canAdvance && (
                            <TouchableOpacity
                              style={[styles.statusBadge, { backgroundColor: flow.color + "18", borderColor: flow.color, borderWidth: 1 }]}
                              onPress={() => updateStatusMutation.mutate({ appointmentId: item.id, status: flow.next as any })}
                              activeOpacity={0.8}
                            >
                              <Text style={[styles.statusText, { color: flow.color }]}>{flow.label}</Text>
                            </TouchableOpacity>
                          )}
                          <TouchableOpacity
                            style={[styles.statusBadge, { backgroundColor: "#EBF4FF", borderColor: "#0D5BBF", borderWidth: 1 }]}
                            onPress={() => { setSelectedDaySheet(null); openEditModal(item); }}
                            activeOpacity={0.8}
                          >
                            <Text style={[styles.statusText, { color: "#0D5BBF" }]}>✏️ Editar</Text>
                          </TouchableOpacity>
                          {item.status !== "cancelled" && (
                            <TouchableOpacity
                              style={[styles.statusBadge, { backgroundColor: "#FEF2F2", borderColor: "#EF4444", borderWidth: 1 }]}
                              onPress={() => handleCancelAppt(item.id)}
                              activeOpacity={0.8}
                            >
                              <Text style={[styles.statusText, { color: "#EF4444" }]}>Cancelar</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                      <View style={[styles.statusBadge, { backgroundColor: statusColor(item.status) + "20" }]}>
                        <Text style={[styles.statusText, { color: statusColor(item.status) }]}>{statusLabel(item.status)}</Text>
                      </View>
                    </View>
                  );
                })}
          </ScrollView>
        </View>
      </Modal>

      {/* View mode toggle + search */}
      <View style={[styles.searchContainer, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
          <View style={[styles.searchBar, { flex: 1, backgroundColor: colors.surface, borderColor: colors.border }]}>
            <IconSymbol name="magnifyingglass" size={16} color={colors.muted} />
            <TextInput
              style={[styles.searchInput, { color: colors.foreground }]}
              placeholder="Buscar por paciente ou data (dd/mm)..."
              placeholderTextColor={colors.muted}
              value={agendaSearch}
              onChangeText={setAgendaSearch}
              returnKeyType="search"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {agendaSearch.length > 0 && (
              <TouchableOpacity onPress={() => setAgendaSearch("")} style={{ padding: 4 }}>
                <IconSymbol name="xmark.circle.fill" size={16} color={colors.muted} />
              </TouchableOpacity>
            )}
          </View>
          {/* Date range filter toggle */}
          <TouchableOpacity
            style={[styles.sortBtn, { backgroundColor: hasDateFilter ? "#22C55E" : (showDateFilter ? "#0D5BBF" : colors.surface), borderColor: hasDateFilter ? "#22C55E" : (showDateFilter ? "#0D5BBF" : colors.border) }]}
            onPress={() => setShowDateFilter(v => !v)}
            activeOpacity={0.8}
          >
            <IconSymbol name="line.3.horizontal.decrease" size={16} color={(hasDateFilter || showDateFilter) ? "#fff" : colors.muted} />
          </TouchableOpacity>
          {/* Toggle list/week/month */}
          <TouchableOpacity
            style={[styles.sortBtn, { backgroundColor: viewMode === "week" ? "#0D5BBF" : colors.surface, borderColor: viewMode === "week" ? "#0D5BBF" : colors.border }]}
            onPress={() => setViewMode(v => v === "week" ? "list" : "week")}
            activeOpacity={0.8}
          >
            <IconSymbol name="calendar" size={16} color={viewMode === "week" ? "#fff" : colors.muted} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sortBtn, { backgroundColor: viewMode === "month" ? "#6366F1" : colors.surface, borderColor: viewMode === "month" ? "#6366F1" : colors.border }]}
            onPress={() => setViewMode(v => v === "month" ? "list" : "month")}
            activeOpacity={0.8}
          >
            <IconSymbol name="calendar.badge.plus" size={16} color={viewMode === "month" ? "#fff" : colors.muted} />
          </TouchableOpacity>
          {/* Export agenda */}
          <TouchableOpacity
            style={[styles.sortBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={handleExportAgenda}
            activeOpacity={0.8}
          >
            <IconSymbol name="square.and.arrow.up" size={16} color={colors.muted} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Date range filter panel */}
      {showDateFilter && (
        <View style={[{ backgroundColor: colors.surface, borderBottomWidth: 0.5, borderBottomColor: colors.border, paddingHorizontal: 16, paddingVertical: 12, gap: 10 }]}>
          <Text style={{ fontSize: 12, fontWeight: "700", color: colors.muted, letterSpacing: 0.5 }}>FILTRAR POR PERÍODO</Text>
          <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={{ fontSize: 11, color: colors.muted }}>De</Text>
              <DateInput
                style={[styles.input, { backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border, paddingVertical: 8, fontSize: 14 }]}
                value={dateFrom}
                onChangeText={setDateFrom}
                onChangeISO={setDateFromISO}
                placeholderTextColor={colors.muted}
                returnKeyType="next"
              />
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={{ fontSize: 11, color: colors.muted }}>Até</Text>
              <DateInput
                style={[styles.input, { backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border, paddingVertical: 8, fontSize: 14 }]}
                value={dateTo}
                onChangeText={setDateTo}
                onChangeISO={setDateToISO}
                placeholderTextColor={colors.muted}
                returnKeyType="done"
              />
            </View>
          </View>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {/* Quick presets */}
            {[
              { label: "Esta semana", fn: () => {
                const now = new Date();
                const day = now.getDay();
                const mon = new Date(now); mon.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
                const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
                const monISO = mon.toISOString().split("T")[0];
                const sunISO = sun.toISOString().split("T")[0];
                setDateFromISO(monISO); setDateFrom(isoToDisplay(monISO));
                setDateToISO(sunISO); setDateTo(isoToDisplay(sunISO));
              }},
              { label: "Este mês", fn: () => {
                const now = new Date();
                const first = new Date(now.getFullYear(), now.getMonth(), 1);
                const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                const firstISO = first.toISOString().split("T")[0];
                const lastISO = last.toISOString().split("T")[0];
                setDateFromISO(firstISO); setDateFrom(isoToDisplay(firstISO));
                setDateToISO(lastISO); setDateTo(isoToDisplay(lastISO));
              }},
              { label: "Próx. 30 dias", fn: () => {
                const now = new Date();
                const end = new Date(now); end.setDate(now.getDate() + 30);
                const nowISO = now.toISOString().split("T")[0];
                const endISO = end.toISOString().split("T")[0];
                setDateFromISO(nowISO); setDateFrom(isoToDisplay(nowISO));
                setDateToISO(endISO); setDateTo(isoToDisplay(endISO));
              }},
            ].map((p) => (
              <TouchableOpacity
                key={p.label}
                style={[styles.filterChip, { borderColor: "#0D5BBF", paddingHorizontal: 10, paddingVertical: 5 }]}
                onPress={p.fn}
                activeOpacity={0.8}
              >
                <Text style={{ fontSize: 12, fontWeight: "600", color: "#0D5BBF" }}>{p.label}</Text>
              </TouchableOpacity>
            ))}
            {hasDateFilter && (
              <TouchableOpacity
                style={[styles.filterChip, { borderColor: "#EF4444", paddingHorizontal: 10, paddingVertical: 5 }]}
                onPress={clearDateFilter}
                activeOpacity={0.8}
              >
                <Text style={{ fontSize: 12, fontWeight: "600", color: "#EF4444" }}>Limpar</Text>
              </TouchableOpacity>
            )}
          </View>
          {hasDateFilter && (
            <Text style={{ fontSize: 12, color: "#22C55E", fontWeight: "600" }}>
              {upcoming.length + past.length} consulta(s) no período
            </Text>
          )}
        </View>
      )}

      {viewMode === "month" ? (
        // ── Monthly view ─────────────────────────────────────────────────────
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
          {/* Month navigation */}
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <TouchableOpacity
              style={[styles.sortBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => setSelectedMonth(m => {
                const d = new Date(m.year, m.month - 1, 1);
                return { year: d.getFullYear(), month: d.getMonth() };
              })}
              activeOpacity={0.8}
            >
              <IconSymbol name="chevron.left" size={16} color={colors.foreground} />
            </TouchableOpacity>
            <Text style={[styles.sectionTitle, { color: colors.foreground, marginBottom: 0 }]}>
              {new Date(selectedMonth.year, selectedMonth.month, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" }).replace(/^\w/, c => c.toUpperCase())}
            </Text>
            <TouchableOpacity
              style={[styles.sortBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => setSelectedMonth(m => {
                const d = new Date(m.year, m.month + 1, 1);
                return { year: d.getFullYear(), month: d.getMonth() };
              })}
              activeOpacity={0.8}
            >
              <IconSymbol name="chevron.right" size={16} color={colors.foreground} />
            </TouchableOpacity>
          </View>

          {/* Day-of-week headers */}
          <View style={{ flexDirection: "row", marginBottom: 6 }}>
            {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((d) => (
              <Text key={d} style={{ flex: 1, textAlign: "center", fontSize: 11, fontWeight: "700", color: colors.muted }}>{d}</Text>
            ))}
          </View>

          {/* Calendar grid */}
          {(() => {
            const year = selectedMonth.year;
            const month = selectedMonth.month;
            const firstDay = new Date(year, month, 1);
            const lastDay = new Date(year, month + 1, 0);
            // Shift: Mon=0 ... Sun=6
            const startOffset = (firstDay.getDay() + 6) % 7;
            const totalCells = startOffset + lastDay.getDate();
            const rows = Math.ceil(totalCells / 7);
            const todayStr = new Date().toISOString().split("T")[0];

            return Array.from({ length: rows }, (_, rowIdx) => (
              <View key={rowIdx} style={{ flexDirection: "row", marginBottom: 6 }}>
                {Array.from({ length: 7 }, (_, colIdx) => {
                  const cellIdx = rowIdx * 7 + colIdx;
                  const dayNum = cellIdx - startOffset + 1;
                  if (dayNum < 1 || dayNum > lastDay.getDate()) {
                    return <View key={colIdx} style={{ flex: 1 }} />;
                  }
                  const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
                  const dayAppts = allAppts.filter((a) => a.date === dateStr && a.status !== "cancelled");
                  const isToday = dateStr === todayStr;
                  const hasAppts = dayAppts.length > 0;

                  // Group dots by status
                  const statusGroups: Record<string, number> = {};
                  dayAppts.forEach((a) => { statusGroups[a.status] = (statusGroups[a.status] ?? 0) + 1; });

                  return (
                    <TouchableOpacity
                      key={colIdx}
                      style={[
                        styles.monthCell,
                        {
                          backgroundColor: isToday ? "#EBF4FF" : (hasAppts ? colors.surface : colors.background),
                          borderColor: isToday ? "#0D5BBF" : (hasAppts ? colors.border : colors.border + "60"),
                        },
                      ]}
                      onPress={() => hasAppts && setSelectedDaySheet(dateStr)}
                      activeOpacity={hasAppts ? 0.7 : 1}
                    >
                      <Text style={[
                        styles.monthCellDay,
                        { color: isToday ? "#0D5BBF" : colors.foreground, fontWeight: isToday ? "800" : "600" },
                      ]}>{dayNum}</Text>
                      {hasAppts && (
                        <View style={styles.monthDotRow}>
                          {Object.entries(statusGroups).slice(0, 3).map(([status, _count], i) => (
                            <View key={i} style={[styles.monthDot, { backgroundColor: statusColor(status) }]} />
                          ))}
                        </View>
                      )}
                      {hasAppts && (
                        <Text style={{ fontSize: 8, color: colors.muted, lineHeight: 10 }}>{dayAppts.length}</Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            ));
          })()}

          {/* Legend */}
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 12, paddingTop: 12, borderTopWidth: 0.5, borderTopColor: colors.border }}>
            {[
              { label: "Agendada", color: "#F59E0B" },
              { label: "Confirmada", color: "#22C55E" },
              { label: "Realizada", color: "#6366F1" },
            ].map((item) => (
              <View key={item.label} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: item.color }} />
                <Text style={{ fontSize: 12, color: colors.muted }}>{item.label}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      ) : viewMode === "week" ? (
        // ── Weekly view ──────────────────────────────────────────────────────
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
          <Text style={[styles.sectionTitle, { color: colors.foreground, marginBottom: 12 }]}>Semana atual</Text>
          <View style={{ flexDirection: "row", gap: 6 }}>
            {weekDays.map((date, idx) => {
              const dayAppts = weekAppts.filter((a) => a.date === date);
              const isToday = date === today;
              return (
                <View key={date} style={{ flex: 1, alignItems: "center", gap: 6 }}>
                  <Text style={{ fontSize: 11, fontWeight: "600", color: isToday ? "#0D5BBF" : colors.muted }}>{DAY_LABELS[idx]}</Text>
                  <View style={[
                    styles.weekDayCell,
                    { backgroundColor: isToday ? "#EBF4FF" : colors.surface, borderColor: isToday ? "#0D5BBF" : colors.border }
                  ]}>
                    <Text style={{ fontSize: 16, fontWeight: "700", color: isToday ? "#0D5BBF" : colors.foreground }}>
                      {parseInt(date.split("-")[2])}
                    </Text>
                    {dayAppts.length > 0 && (
                      <View style={styles.weekDotRow}>
                        {dayAppts.slice(0, 3).map((a, i) => (
                          <View key={i} style={[styles.weekDot, { backgroundColor: statusColor(a.status) }]} />
                        ))}
                      </View>
                    )}
                    {dayAppts.length === 0 && <Text style={{ fontSize: 10, color: colors.muted }}>livre</Text>}
                  </View>
                  {dayAppts.map((a) => (
                    <View key={a.id} style={[styles.weekApptChip, { backgroundColor: statusColor(a.status) + "18", borderColor: statusColor(a.status) }]}>
                      <Text style={{ fontSize: 10, fontWeight: "600", color: statusColor(a.status) }} numberOfLines={1}>{a.time}</Text>
                      <Text style={{ fontSize: 9, color: colors.muted }} numberOfLines={1}>{(a.patientName ?? "").split(" ")[0]}</Text>
                    </View>
                  ))}
                </View>
              );
            })}
          </View>
        </ScrollView>
      ) : (
        // ── List view ────────────────────────────────────────────────────────
        <ScrollView contentContainerStyle={{ padding: 16, gap: 20, paddingBottom: 40 }}>
          <View style={[styles.sectionHeader, { backgroundColor: "transparent", paddingHorizontal: 0 }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Próximas consultas</Text>
            {agendaSearch.length > 0 && (
              <Text style={{ fontSize: 13, color: colors.muted }}>{upcoming.length + past.length} resultado(s)</Text>
            )}
          </View>

          {appointmentsQuery.isLoading ? (
            <ActivityIndicator size="large" color="#0D5BBF" style={{ marginTop: 40 }} />
          ) : upcoming.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <IconSymbol name="calendar" size={40} color={colors.muted} />
              <Text style={[styles.emptyCardText, { color: colors.muted }]}>
                {agendaSearch ? `Nenhum resultado para "${agendaSearch}"` : "Nenhuma consulta agendada"}
              </Text>
            </View>
          ) : (
            upcoming.map((a) => <View key={a.id}>{renderAppt({ item: a })}</View>)
          )}

          {past.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { color: colors.muted, marginTop: 8 }]}>Histórico</Text>
              {past.slice(0, 10).map((a) => <View key={a.id}>{renderAppt({ item: a })}</View>)}
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}

// ─── Profile Tab ──────────────────────────────────────────────────────────────

function ProfileTab() {
  const colors = useColors();
  const { isWeb } = useScreenSize();
  const router = useRouter();
  const { user, logout } = useAuthContext();
  const profileQuery = trpc.doctor.getProfile.useQuery();
  const profile = profileQuery.data;
  const utils = trpc.useUtils();
  const [doctorPhotoUrl, setDoctorPhotoUrl] = useState<string | null>(profile?.photoUrl ?? null);

  useEffect(() => {
    if (profile?.photoUrl) setDoctorPhotoUrl(profile.photoUrl);
  }, [profile?.photoUrl]);

  const uploadDoctorPhoto = trpc.doctor.uploadDoctorPhoto.useMutation({
    onSuccess: (data) => {
      setDoctorPhotoUrl(data.url);
      utils.doctor.getProfile.invalidate();
    },
  });

  const handlePickDoctorPhoto = () => {
    const buttons: any[] = [
      {
        text: "Câmera",
        onPress: async () => {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== "granted") { showAlert("Permissão necessária", "Permita o acesso à câmera."); return; }
          const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.7, base64: true });
          if (!result.canceled && result.assets[0].base64) {
            const asset = result.assets[0];
            await uploadDoctorPhoto.mutateAsync({ base64: asset.base64!, mimeType: asset.mimeType ?? "image/jpeg" });
          }
        },
      },
      {
        text: "Galeria",
        onPress: async () => {
          const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (status !== "granted") { showAlert("Permissão necessária", "Permita o acesso à galeria."); return; }
          const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.7, base64: true });
          if (!result.canceled && result.assets[0].base64) {
            const asset = result.assets[0];
            await uploadDoctorPhoto.mutateAsync({ base64: asset.base64!, mimeType: asset.mimeType ?? "image/jpeg" });
          }
        },
      },
    ];
    if (doctorPhotoUrl) {
      buttons.push({
        text: "Remover foto",
        style: "destructive" as const,
        onPress: () => {
          showConfirm(
            "Remover foto",
            "Tem certeza que deseja remover sua foto de perfil?",
            () => uploadDoctorPhoto.mutateAsync({ base64: null as any, mimeType: "" }),
            "Remover",
            true
          );
        },
      });
    }
    buttons.push({ text: "Cancelar", style: "cancel" });
    if (Platform.OS === "web") {
      showAlert("Foto do perfil", "Use a versão mobile para alterar a foto de perfil.");
    } else {
      Alert.alert("Foto do perfil", "Escolha a origem da foto", buttons);
    }
  };

  const insurances = (() => {
    try { return JSON.parse(profile?.insurances ?? "[]") as string[]; }
    catch { return []; }
  })();

  return (
    <ScrollView contentContainerStyle={{ padding: isWeb ? 32 : 24, gap: 20, paddingBottom: 48, maxWidth: isWeb ? 720 : undefined, alignSelf: isWeb ? "center" as any : undefined, width: "100%" }}>
      {/* Doctor Card */}
      <View style={[styles.profileCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <TouchableOpacity onPress={handlePickDoctorPhoto} style={styles.profileAvatar} activeOpacity={0.8}>
          {doctorPhotoUrl
            ? <Image source={{ uri: doctorPhotoUrl }} style={{ width: 56, height: 56, borderRadius: 28 }} />
            : <Text style={styles.profileAvatarText}>{(user?.name ?? "M").charAt(0).toUpperCase()}</Text>}
          {uploadDoctorPhoto.isPending
            ? <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, borderRadius: 28, backgroundColor: "rgba(0,0,0,0.4)", alignItems: "center", justifyContent: "center" }}><ActivityIndicator size="small" color="#fff" /></View>
            : <View style={{ position: "absolute", bottom: 0, right: 0, backgroundColor: "#0D5BBF", borderRadius: 8, padding: 2 }}><IconSymbol name="camera.fill" size={10} color="#fff" /></View>}
        </TouchableOpacity>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={[styles.profileName, { color: colors.foreground }]}>{user?.name ?? "Médico"}</Text>
          <Text style={[styles.profileSpecialty, { color: "#0D5BBF" }]}>
            {profile?.specialty ?? ""}
          </Text>
          {profile && (
            <Text style={[styles.profileCrm, { color: colors.muted }]}>
              CRM {profile.crm}/{profile.crmState}
            </Text>
          )}
        </View>
        <TouchableOpacity
          onPress={() => router.push("/settings" as any)}
          style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" }}
          activeOpacity={0.7}
        >
          <IconSymbol name="gear" size={20} color={colors.muted} />
        </TouchableOpacity>
      </View>

      {/* Convênios */}
      {insurances.length > 0 && (
        <View style={[styles.infoSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.infoSectionTitle, { color: colors.foreground }]}>Convênios aceitos</Text>
          <View style={styles.tagsContainer}>
            {insurances.map((ins) => (
              <View key={ins} style={styles.insTag}>
                <Text style={styles.insTagText}>{ins}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Contato */}
      {profile?.phone && (
        <View style={[styles.infoSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.infoSectionTitle, { color: colors.foreground }]}>Telefone</Text>
          <Text style={[styles.infoValue, { color: colors.muted }]}>{profile.phone}</Text>
        </View>
      )}

      {/* Bio */}
      {profile?.bio && (
        <View style={[styles.infoSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.infoSectionTitle, { color: colors.foreground }]}>Apresentação</Text>
          <Text style={[styles.infoValue, { color: colors.muted }]}>{profile.bio}</Text>
        </View>
      )}

      {/* Valores por Convênio */}
      <TouchableOpacity
        style={[styles.logoutBtn, { borderColor: colors.success, marginBottom: 12 }]}
        onPress={() => router.push("/doctor/insurance-fees" as any)}
        activeOpacity={0.8}
      >
        <Text style={[styles.logoutText, { color: colors.success }]}>💳 Valores por Convênio</Text>
      </TouchableOpacity>
      {/* Minhas Receitas */}
      <TouchableOpacity
        style={[styles.logoutBtn, { borderColor: "#16A34A", marginBottom: 12 }]}
        onPress={() => router.push("/doctor/my-revenues" as any)}
        activeOpacity={0.8}
      >
        <Text style={[styles.logoutText, { color: "#16A34A" }]}>📊 Minhas Receitas</Text>
      </TouchableOpacity>
      {/* Minha Assinatura — taxa e descontos */}
      <TouchableOpacity
        style={[styles.logoutBtn, { borderColor: "#7C3AED", marginBottom: 12 }]}
        onPress={() => router.push("/doctor/minha-assinatura" as any)}
        activeOpacity={0.8}
      >
        <Text style={[styles.logoutText, { color: "#7C3AED" }]}>🏷️ Minha Assinatura</Text>
      </TouchableOpacity>
      {/* MGM — Programa de Indicações */}
      <TouchableOpacity
        style={[styles.logoutBtn, { borderColor: colors.primary, marginBottom: 12 }]}
        onPress={() => router.push("/doctor/mgm-referral" as any)}
        activeOpacity={0.8}
      >
        <Text style={[styles.logoutText, { color: colors.primary }]}>💰 Programa de Indicações</Text>
      </TouchableOpacity>

      {/* Logout */}
      <TouchableOpacity
        style={[styles.logoutBtn, { borderColor: "#EF4444" }]}
        onPress={async () => {
          if (Platform.OS === "web") {
            if (window.confirm("Deseja sair da sua conta?")) {
              await logout();
              router.replace("/welcome" as any);
            }
          } else {
            Alert.alert("Sair", "Deseja sair da sua conta?", [
              { text: "Cancelar", style: "cancel" },
              { text: "Sair", style: "destructive", onPress: async () => { await logout(); router.replace("/welcome" as any); } },
            ]);
          }
        }}
        activeOpacity={0.8}
      >
        <Text style={styles.logoutText}>Sair da conta</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ─── Reports Tab ────────────────────────────────────────────────────────────

const PERIODS = [
  { label: "7 dias", value: 7 },
  { label: "30 dias", value: 30 },
  { label: "3 meses", value: 90 },
  { label: "Total", value: 3650 },
];

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  const colors = useColors();
  return (
    <View style={[repStyles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[repStyles.statValue, { color: color ?? colors.primary }]}>{value}</Text>
      <Text style={[repStyles.statLabel, { color: colors.foreground }]}>{label}</Text>
      {sub ? <Text style={[repStyles.statSub, { color: colors.muted }]}>{sub}</Text> : null}
    </View>
  );
}

function StarBar({ star, count, max }: { star: number; count: number; max: number }) {
  const colors = useColors();
  const pct = max > 0 ? (count / max) * 100 : 0;
  return (
    <View style={repStyles.starBarRow}>
      <Text style={[repStyles.starBarLabel, { color: colors.muted }]}>{star}★</Text>
      <View style={[repStyles.starBarTrack, { backgroundColor: colors.border }]}>
        <View style={[repStyles.starBarFill, { width: `${pct}%` as any, backgroundColor: "#F59E0B" }]} />
      </View>
      <Text style={[repStyles.starBarCount, { color: colors.muted }]}>{count}</Text>
    </View>
  );
}

function ReportsTab() {
  const colors = useColors();
  const { isWeb } = useScreenSize();
  const [period, setPeriod] = useState(30);
  const metricsQuery = trpc.doctor.getMetrics.useQuery({ periodDays: period });
  const m = metricsQuery.data;

  const maxStarCount = m ? Math.max(...(m.reviews.distribution.map((d) => d.count)), 1) : 1;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: isWeb ? 28 : 16, paddingBottom: 32, maxWidth: isWeb ? 900 : undefined, alignSelf: isWeb ? "center" as any : undefined, width: "100%" }}>
      {/* Period Filter */}
      <View style={repStyles.periodRow}>
        {PERIODS.map((p) => (
          <TouchableOpacity
            key={p.value}
            style={[repStyles.periodBtn, { backgroundColor: period === p.value ? colors.primary : colors.surface, borderColor: colors.border }]}
            onPress={() => setPeriod(p.value)}
            activeOpacity={0.7}
          >
            <Text style={[repStyles.periodBtnText, { color: period === p.value ? "#fff" : colors.foreground }]}>{p.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {metricsQuery.isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : !m ? (
        <Text style={[repStyles.emptyText, { color: colors.muted }]}>Sem dados disponíveis</Text>
      ) : (
        <>
          {/* Acquisition */}
          <Text style={[repStyles.sectionTitle, { color: colors.foreground }]}>Aquisição de Pacientes</Text>
          <View style={repStyles.statsRow}>
            <StatCard label="Total" value={m.patients.total} />
            <StatCard label="Via App" value={m.patients.viaApp} color="#10B981" />
            <StatCard label="Diretos" value={m.patients.direct} color="#6366F1" />
          </View>
          <View style={[repStyles.infoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={repStyles.infoRow}>
              <Text style={[repStyles.infoLabel, { color: colors.muted }]}>Solicitações recebidas</Text>
              <Text style={[repStyles.infoValue, { color: colors.foreground }]}>{m.requests.total}</Text>
            </View>
            <View style={repStyles.infoRow}>
              <Text style={[repStyles.infoLabel, { color: colors.muted }]}>Contatados</Text>
              <Text style={[repStyles.infoValue, { color: "#10B981" }]}>{m.requests.contacted}</Text>
            </View>
            <View style={repStyles.infoRow}>
              <Text style={[repStyles.infoLabel, { color: colors.muted }]}>Pendentes</Text>
              <Text style={[repStyles.infoValue, { color: "#F59E0B" }]}>{m.requests.pending}</Text>
            </View>
            <View style={repStyles.infoRow}>
              <Text style={[repStyles.infoLabel, { color: colors.muted }]}>Taxa de conversão</Text>
              <Text style={[repStyles.infoValue, { color: colors.primary }]}>{m.requests.conversionRate}%</Text>
            </View>
          </View>

          {/* Engagement */}
          <Text style={[repStyles.sectionTitle, { color: colors.foreground }]}>Engajamento Clínico</Text>
          <View style={repStyles.statsRow}>
            <StatCard label="Consultas" value={m.appointments.total} />
            <StatCard label="Realizadas" value={m.appointments.completed} color="#10B981" />
            <StatCard label="Canceladas" value={m.appointments.cancelled} color="#EF4444" />
          </View>
          <View style={[repStyles.infoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={repStyles.infoRow}>
              <Text style={[repStyles.infoLabel, { color: colors.muted }]}>Taxa de realização</Text>
              <Text style={[repStyles.infoValue, { color: "#10B981" }]}>{m.appointments.confirmationRate}%</Text>
            </View>
            <View style={repStyles.infoRow}>
              <Text style={[repStyles.infoLabel, { color: colors.muted }]}>Taxa de cancelamento</Text>
              <Text style={[repStyles.infoValue, { color: "#EF4444" }]}>{m.appointments.cancellationRate}%</Text>
            </View>
            <View style={repStyles.infoRow}>
              <Text style={[repStyles.infoLabel, { color: colors.muted }]}>Adesão média dos pacientes</Text>
              <Text style={[repStyles.infoValue, { color: m.adherence.average >= 70 ? "#10B981" : m.adherence.average >= 40 ? "#F59E0B" : "#EF4444" }]}>{m.adherence.average}%</Text>
            </View>
          </View>

          {/* Reviews */}
          <Text style={[repStyles.sectionTitle, { color: colors.foreground }]}>Avaliações</Text>
          <View style={[repStyles.reviewCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={repStyles.reviewHeader}>
              <Text style={[repStyles.reviewAvg, { color: "#F59E0B" }]}>{m.reviews.average.toFixed(1)} ★</Text>
              <Text style={[repStyles.reviewTotal, { color: colors.muted }]}>{m.reviews.count} avaliações</Text>
            </View>
            {m.reviews.distribution.slice().reverse().map((d) => (
              <StarBar key={d.star} star={d.star} count={d.count} max={maxStarCount} />
            ))}
          </View>
        </>
      )}
    </ScrollView>
  );
}

const repStyles = StyleSheet.create({
  periodRow: { flexDirection: "row", gap: 8, marginBottom: 20 },
  periodBtn: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: "center", borderWidth: 1 },
  periodBtnText: { fontSize: 12, fontWeight: "600" },
  sectionTitle: { fontSize: 16, fontWeight: "700", marginBottom: 12, marginTop: 8 },
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
  statCard: { flex: 1, borderRadius: 12, padding: 14, alignItems: "center", borderWidth: 1 },
  statValue: { fontSize: 26, fontWeight: "800" },
  statLabel: { fontSize: 11, fontWeight: "600", marginTop: 2, textAlign: "center" },
  statSub: { fontSize: 10, marginTop: 2 },
  infoCard: { borderRadius: 12, padding: 14, marginBottom: 20, borderWidth: 1, gap: 10 },
  infoRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  infoLabel: { fontSize: 13 },
  infoValue: { fontSize: 14, fontWeight: "700" },
  reviewCard: { borderRadius: 12, padding: 16, marginBottom: 20, borderWidth: 1 },
  reviewHeader: { flexDirection: "row", alignItems: "baseline", gap: 8, marginBottom: 14 },
  reviewAvg: { fontSize: 32, fontWeight: "800" },
  reviewTotal: { fontSize: 13 },
  starBarRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  starBarLabel: { width: 24, fontSize: 12, textAlign: "right" },
  starBarTrack: { flex: 1, height: 8, borderRadius: 4, overflow: "hidden" },
  starBarFill: { height: 8, borderRadius: 4 },
  starBarCount: { width: 24, fontSize: 12, textAlign: "left" },
  emptyText: { textAlign: "center", marginTop: 40, fontSize: 14 },
});

// ─── Requests Tab ────────────────────────────────────────────────────────────

function RequestsTab() {
  const colors = useColors();
  const { isWeb } = useScreenSize();
  const requestsQuery = trpc.reviews.listConsultationRequests.useQuery();
  const updateStatus = trpc.reviews.updateConsultationRequestStatus.useMutation({
    onSuccess: () => requestsQuery.refetch(),
  });

  const requests = requestsQuery.data ?? [];

  const handleCall = (phone: string) => {
    Linking.openURL(`tel:${phone.replace(/\D/g, "")}`);
  };

  const handleWhatsApp = (phone: string) => {
    const clean = phone.replace(/\D/g, "");
    Linking.openURL(`https://wa.me/55${clean}`);
  };

  const handleMarkContacted = (id: number) => {
    showConfirm(
      "Marcar como contatado?",
      "Isso indica que você já entrou em contato com o paciente.",
      () => updateStatus.mutate({ requestId: id, status: "contacted" })
    );
  };

  const handleDecline = (id: number) => {
    showConfirm(
      "Recusar solicitação?",
      "A solicitação será marcada como recusada.",
      () => updateStatus.mutate({ requestId: id, status: "declined" }),
      "Recusar",
      true
    );
  };

  const statusColor = (status: string) => {
    if (status === "contacted") return "#22C55E";
    if (status === "declined") return "#EF4444";
    return "#F59E0B";
  };

  const statusLabel = (status: string) => {
    if (status === "contacted") return "Contatado";
    if (status === "declined") return "Recusado";
    return "Pendente";
  };

   if (requestsQuery.isLoading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color="#0D5BBF" />
      </View>
    );
  }

  if (requestsQuery.isError) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32 }}>
        <Text style={{ fontSize: 36, marginBottom: 12 }}>📡</Text>
        <Text style={{ fontSize: 16, fontWeight: "700", color: "#11181C", marginBottom: 8, textAlign: "center" }}>Erro ao carregar solicitações</Text>
        <Text style={{ fontSize: 13, color: "#687076", textAlign: "center", marginBottom: 20 }}>Verifique sua conexão e tente novamente.</Text>
        <TouchableOpacity
          style={{ backgroundColor: "#0D5BBF", paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 }}
          onPress={() => requestsQuery.refetch()}
          activeOpacity={0.8}
        >
          <Text style={{ color: "#fff", fontWeight: "700" }}>Tentar novamente</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: isWeb ? 24 : 16, gap: 12, maxWidth: isWeb ? 800 : undefined, alignSelf: isWeb ? "center" as any : undefined, width: "100%" }}>
      <Text style={[reqStyles.sectionTitle, { color: colors.foreground }]}>Solicitações de Consulta</Text>
      {requests.length === 0 ? (
        <View style={[reqStyles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={{ fontSize: 36 }}>📋</Text>
          <Text style={[reqStyles.emptyTitle, { color: colors.foreground }]}>Nenhuma solicitação</Text>
          <Text style={[reqStyles.emptySubtitle, { color: colors.muted }]}>
            Quando pacientes solicitarem consulta pelo seu perfil, aparecerão aqui.
          </Text>
        </View>
      ) : (
        requests.map((req) => (
          <View key={req.id} style={[reqStyles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {/* Header */}
            <View style={reqStyles.cardHeader}>
              <View style={[reqStyles.avatar, { backgroundColor: "#0D5BBF22" }]}>
                <Text style={[reqStyles.avatarText, { color: "#0D5BBF" }]}>
                  {(req.patientName ?? "P").charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[reqStyles.patientName, { color: colors.foreground }]}>{req.patientName}</Text>
                <Text style={[reqStyles.date, { color: colors.muted }]}>
                  {new Date(req.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                </Text>
              </View>
              <View style={[reqStyles.statusBadge, { backgroundColor: statusColor(req.status) + "22" }]}>
                <Text style={[reqStyles.statusText, { color: statusColor(req.status) }]}>{statusLabel(req.status)}</Text>
              </View>
            </View>

            {/* Phone */}
            <View style={[reqStyles.phoneRow, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <IconSymbol name="phone.fill" size={14} color="#0D5BBF" />
              <Text style={[reqStyles.phoneText, { color: colors.foreground }]}>{req.phone}</Text>
            </View>

            {/* Message */}
            {req.message ? (
              <View style={[reqStyles.messageBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <Text style={[reqStyles.messageText, { color: colors.muted }]}>💬 {req.message}</Text>
              </View>
            ) : null}

            {/* Actions */}
            {req.status === "pending" ? (
              <View style={reqStyles.actionsRow}>
                <TouchableOpacity
                  style={[reqStyles.actionBtn, { backgroundColor: "#25D366" }]}
                  onPress={() => handleWhatsApp(req.phone)}
                  activeOpacity={0.85}
                >
                  <Text style={reqStyles.actionBtnText}>WhatsApp</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[reqStyles.actionBtn, { backgroundColor: "#0D5BBF" }]}
                  onPress={() => handleCall(req.phone)}
                  activeOpacity={0.85}
                >
                  <IconSymbol name="phone.fill" size={14} color="#fff" />
                  <Text style={reqStyles.actionBtnText}>Ligar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[reqStyles.actionBtn, { backgroundColor: "#22C55E" }]}
                  onPress={() => handleMarkContacted(req.id)}
                  activeOpacity={0.85}
                >
                  <Text style={reqStyles.actionBtnText}>Contatado ✓</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        ))
      )}
    </ScrollView>
  );
}

const reqStyles = StyleSheet.create({
  sectionTitle: { fontSize: 20, fontWeight: "800", marginBottom: 4 },
  emptyCard: { borderRadius: 16, borderWidth: 1, padding: 32, alignItems: "center", gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: "700" },
  emptySubtitle: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  card: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 12 },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 18, fontWeight: "700" },
  patientName: { fontSize: 15, fontWeight: "700" },
  date: { fontSize: 12, marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 12, fontWeight: "700" },
  phoneRow: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10 },
  phoneText: { fontSize: 15, fontWeight: "600" },
  messageBox: { borderRadius: 10, borderWidth: 1, padding: 12 },
  messageText: { fontSize: 14, lineHeight: 20 },
  actionsRow: { flexDirection: "row", gap: 8 },
  actionBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, borderRadius: 10 },
  actionBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  declineBtn: { borderWidth: 1, borderRadius: 10, paddingVertical: 10, alignItems: "center" },
  declineBtnText: { fontSize: 14, fontWeight: "600" },
});

// ─── Dashboard ────────────────────────────────────────────────────────────────

export default function DoctorDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>("patients");
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { isWeb, width } = useScreenSize();

  const tabs: { key: Tab; label: string; icon: any }[] = [
    { key: "patients", label: "Pacientes", icon: "person.2.fill" },
    { key: "agenda", label: "Agenda", icon: "calendar" },
    { key: "requests", label: "Solicitações", icon: "bell.fill" },
    { key: "reports", label: "Relatórios", icon: "chart.bar.fill" },
    { key: "profile", label: "Perfil", icon: "person.fill" },
  ];

  // ── Web / Desktop layout ──────────────────────────────────────────────────
  if (isWeb) {
    const sidebarWidth = width >= 1024 ? 220 : 72;
    const showLabels = width >= 1024;
    return (
      <View style={{ flex: 1, flexDirection: "row", backgroundColor: colors.background }}>
        {/* Sidebar */}
        <View style={[
          webStyles.sidebar,
          {
            width: sidebarWidth,
            paddingTop: insets.top + 12,
            backgroundColor: "#0D5BBF",
          }
        ]}>
          {/* Logo area */}
          <View style={webStyles.sidebarLogo}>
            <IconSymbol name="stethoscope" size={28} color="#fff" />
            {showLabels && (
              <View style={{ marginLeft: 10 }}>
                <Text style={webStyles.sidebarAppName}>MediAlert</Text>
                <Text style={webStyles.sidebarRole}>Painel Médico</Text>
              </View>
            )}
          </View>

          {/* Divider */}
          <View style={webStyles.sidebarDivider} />

          {/* Nav items */}
          <View style={{ flex: 1, gap: 4, paddingHorizontal: 8 }}>
            {tabs.map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <TouchableOpacity
                  key={tab.key}
                  style={[
                    webStyles.sidebarItem,
                    isActive && webStyles.sidebarItemActive,
                    !showLabels && { justifyContent: "center" },
                  ]}
                  onPress={() => setActiveTab(tab.key)}
                  activeOpacity={0.8}
                >
                  <IconSymbol
                    name={tab.icon}
                    size={20}
                    color={isActive ? "#0D5BBF" : "rgba(255,255,255,0.75)"}
                  />
                  {showLabels && (
                    <Text style={[webStyles.sidebarItemLabel, isActive && webStyles.sidebarItemLabelActive]}>
                      {tab.label}
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Bottom spacer */}
          <View style={{ height: insets.bottom + 16 }} />
        </View>

        {/* Main content */}
        <View style={{ flex: 1, flexDirection: "column" }}>
          {/* Top header bar */}
          <View style={[webStyles.topHeader, { paddingTop: insets.top > 0 ? insets.top : 16, borderBottomColor: colors.border, backgroundColor: colors.background, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }]}>
            <Text style={[webStyles.topHeaderTitle, { color: colors.foreground }]}>
              {tabs.find((t) => t.key === activeTab)?.label ?? "Painel Médico"}
            </Text>
            <NotificationBell
              onNavigateToRequests={() => setActiveTab("requests")}
              onNavigateToPatients={() => setActiveTab("patients")}
              size={22}
            />
          </View>
          {/* Content area */}
          <View style={{ flex: 1 }}>
            {activeTab === "patients" && <PatientsTab />}
            {activeTab === "agenda" && <AgendaTab />}
            {activeTab === "requests" && <RequestsTab />}
            {activeTab === "reports" && <ReportsTab />}
            {activeTab === "profile" && <ProfileTab />}
          </View>
        </View>
      </View>
    );
  }

  // ── Mobile layout (original) ──────────────────────────────────────────────
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Top Bar */}
      <View style={[styles.topBar, { paddingTop: insets.top + 8, backgroundColor: "#0D5BBF" }]}>
        <View style={styles.topBarLeft}>
          <IconSymbol name="stethoscope" size={22} color="#fff" />
          <Text style={styles.topBarTitle}>Painel Médico</Text>
        </View>
        <View style={{ paddingRight: 4 }}>
          <NotificationBell
            onNavigateToRequests={() => setActiveTab("requests")}
            onNavigateToPatients={() => setActiveTab("patients")}
            size={22}
          />
        </View>
      </View>
      {/* Content */}
      <View style={{ flex: 1 }}>
        {activeTab === "patients" && <PatientsTab />}
        {activeTab === "agenda" && <AgendaTab />}
        {activeTab === "requests" && <RequestsTab />}
        {activeTab === "reports" && <ReportsTab />}
        {activeTab === "profile" && <ProfileTab />}
      </View>
      {/* Bottom Tab Bar */}
      <View style={[styles.tabBar, { paddingBottom: insets.bottom + 8, backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={styles.tabItem}
            onPress={() => setActiveTab(tab.key)}
            activeOpacity={0.7}
          >
            <IconSymbol
              name={tab.icon}
              size={24}
              color={activeTab === tab.key ? "#0D5BBF" : colors.muted}
            />
            <Text style={[styles.tabLabel, { color: activeTab === tab.key ? "#0D5BBF" : colors.muted, fontWeight: activeTab === tab.key ? "700" : "400" }]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

// ─── Web Styles ───────────────────────────────────────────────────────────────
const webStyles = StyleSheet.create({
  sidebar: {
    flexDirection: "column",
    paddingBottom: 0,
  },
  sidebarLogo: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  sidebarAppName: {
    fontSize: 16,
    fontWeight: "800",
    color: "#fff",
    lineHeight: 20,
  },
  sidebarRole: {
    fontSize: 11,
    color: "rgba(255,255,255,0.65)",
    lineHeight: 14,
  },
  sidebarDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.15)",
    marginHorizontal: 16,
    marginBottom: 12,
  },
  sidebarItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderRadius: 10,
  },
  sidebarItemActive: {
    backgroundColor: "#fff",
  },
  sidebarItemLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "rgba(255,255,255,0.85)",
  },
  sidebarItemLabelActive: {
    color: "#0D5BBF",
    fontWeight: "700",
  },
  topHeader: {
    paddingHorizontal: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  topHeaderTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
});
const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  topBarLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  topBarTitle: { fontSize: 20, fontWeight: "800", color: "#fff" },
  tabBar: {
    flexDirection: "row",
    borderTopWidth: 0.5,
    paddingTop: 8,
  },
  tabItem: { flex: 1, alignItems: "center", gap: 4 },
  tabLabel: { fontSize: 11 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sectionTitle: { fontSize: 17, fontWeight: "700" },
  inviteBtn: {
    backgroundColor: "#0D5BBF",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  inviteBtnText: { color: "#fff", fontSize: 13, fontWeight: "600" },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: "700", textAlign: "center" },
  emptyDesc: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  emptyBtn: { backgroundColor: "#0D5BBF", paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, marginTop: 8 },
  emptyBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  patientCard: {
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
  },
  patientAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#EBF4FF",
    alignItems: "center",
    justifyContent: "center",
  },
  patientAvatarText: { fontSize: 20, fontWeight: "700", color: "#0D5BBF" },
  patientName: { fontSize: 16, fontWeight: "600" },
  patientEmail: { fontSize: 13 },
  apptCard: {
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  apptDateBadge: {
    width: 52,
    height: 52,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  apptDay: { fontSize: 20, fontWeight: "800", color: "#0D5BBF", lineHeight: 24 },
  apptMonth: { fontSize: 11, fontWeight: "600", color: "#0D5BBF" },
  apptPatient: { fontSize: 15, fontWeight: "600" },
  apptTime: { fontSize: 13 },
  apptNotes: { fontSize: 12 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 12, fontWeight: "600" },
  emptyCard: {
    borderRadius: 16,
    padding: 32,
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
  },
  emptyCardText: { fontSize: 15, fontWeight: "500" },
  profileCard: {
    borderRadius: 20,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    borderWidth: 1,
  },
  profileAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#EBF4FF",
    alignItems: "center",
    justifyContent: "center",
  },
  profileAvatarText: { fontSize: 28, fontWeight: "800", color: "#0D5BBF" },
  profileName: { fontSize: 18, fontWeight: "700" },
  profileSpecialty: { fontSize: 14, fontWeight: "600" },
  profileCrm: { fontSize: 13 },
  infoSection: {
    borderRadius: 16,
    padding: 16,
    gap: 10,
    borderWidth: 1,
  },
  infoSectionTitle: { fontSize: 14, fontWeight: "700" },
  infoValue: { fontSize: 15, lineHeight: 22 },
  tagsContainer: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  insTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#EBF4FF",
  },
  insTagText: { fontSize: 13, fontWeight: "500", color: "#0D5BBF" },
  logoutBtn: {
    borderWidth: 1.5,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  logoutText: { fontSize: 16, fontWeight: "600", color: "#EF4444" },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalCard: {
    borderRadius: 24,
    padding: 28,
    width: "100%",
    maxWidth: 380,
    alignItems: "center",
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  modalIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#EBF4FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  modalTitle: { fontSize: 20, fontWeight: "800", textAlign: "center" },
  modalDesc: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  codeBox: {
    backgroundColor: "#EBF4FF",
    borderRadius: 16,
    paddingHorizontal: 32,
    paddingVertical: 16,
    marginVertical: 4,
  },
  codeText: { fontSize: 36, fontWeight: "800", color: "#0D5BBF", letterSpacing: 8 },
  modalNote: { fontSize: 12, textAlign: "center" },
  modalCloseBtn: {
    backgroundColor: "#0D5BBF",
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 4,
  },
  modalCloseBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  // AddPatientModal
  modalContainer: { flex: 1 },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 0.5,
  },
  modalCancelText: { fontSize: 16 },
  modalSaveText: { fontSize: 16, fontWeight: "700", color: "#0D5BBF" },
  fieldLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 0.5, marginBottom: 6, marginTop: 16 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 2,
  },
  textArea: { height: 100, textAlignVertical: "top" },
  fieldError: { fontSize: 12, color: "#EF4444", marginTop: 4 },
  errorBanner: { backgroundColor: "#FEE2E2", borderRadius: 10, padding: 12, marginBottom: 12 },
  errorBannerText: { color: "#B91C1C", fontSize: 14 },
  // Pending patient modal
  pendingModalHeader: { flexDirection: "row", alignItems: "center", gap: 12, width: "100%", marginBottom: 4 },
  patientInfoBox: { width: "100%", borderRadius: 12, padding: 12, gap: 8, borderWidth: 1 },
  infoRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  infoLabel: { fontSize: 12, fontWeight: "600" },
  infoValue2: { fontSize: 13, fontWeight: "500", flexShrink: 1, textAlign: "right" },
  pendingCodeLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 1, alignSelf: "flex-start", marginTop: 4 },
  // Search & filter
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
    gap: 10,
    borderBottomWidth: 0.5,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
  },
  filterRow: {
    flexDirection: "row",
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
    backgroundColor: "transparent",
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 5,
  },
  filterChipActive: {
    backgroundColor: "#0D5BBF",
    borderColor: "#0D5BBF",
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748B",
  },
  filterChipTextActive: {
    color: "#fff",
  },
  // Filter badge (count)
  filterBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  filterBadgeActive: {
    backgroundColor: "#fff",
  },
  filterBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748B",
  },
  // Sort button
  sortBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  // Sort menu
  sortMenuCard: {
    position: "absolute",
    top: 120,
    right: 16,
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 8,
    minWidth: 220,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  sortMenuTitle: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  sortMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    marginHorizontal: 6,
  },
  sortMenuItemText: {
    fontSize: 15,
    fontWeight: "500",
  },
  // Appointment status button
  apptStatusBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  apptStatusBtnText: {
    fontSize: 12,
    fontWeight: "600",
  },
  // Weekly view
  weekDayCell: {
    width: "100%" as any,
    minHeight: 56,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingVertical: 6,
    gap: 4,
  },
  weekDotRow: {
    flexDirection: "row" as const,
    gap: 2,
    flexWrap: "wrap" as const,
    justifyContent: "center" as const,
  },
  weekDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  weekApptChip: {
    width: "100%" as any,
    borderRadius: 6,
    borderWidth: 1,
    padding: 4,
    alignItems: "center" as const,
  },
  saveBtn: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center" as const,
    marginTop: 8,
    marginBottom: 8,
  },
  saveBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700" as const,
  },
  monthCell: {
    flex: 1,
    aspectRatio: 0.85,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    padding: 2,
    marginHorizontal: 1,
  },
  monthCellDay: {
    fontSize: 13,
    lineHeight: 16,
  },
  monthDotRow: {
    flexDirection: "row",
    gap: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  monthDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  bottomSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 32,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 12,
  },
  bottomSheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center" as const,
    marginTop: 10,
    marginBottom: 4,
  },
});
