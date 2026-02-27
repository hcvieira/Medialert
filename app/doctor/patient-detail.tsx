import { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
  Image,
  Linking,
  Platform,
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
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { DateInput, isoToDisplay } from "@/components/date-input";
import { TimeInput } from "@/components/time-input";
import { WeeklyAdherenceChart } from "@/components/weekly-adherence-chart";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";

const TIMES_OPTIONS: Record<string, string[]> = {
  "1x ao dia": ["08:00"],
  "2x ao dia": ["08:00", "20:00"],
  "3x ao dia": ["08:00", "14:00", "20:00"],
  "4x ao dia": ["08:00", "12:00", "16:00", "20:00"],
};

const MED_COLORS = ["#3B82F6", "#0D5BBF", "#8B5CF6", "#EC4899", "#EF4444", "#F59E0B", "#10B981"];

type DetailTab = "ficha" | "medicamentos" | "consultas" | "notas";

export default function PatientDetailScreen() {
  const { patientId, linkId, patientName } = useLocalSearchParams<{
    patientId: string;
    linkId: string;
    patientName: string;
  }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const pid = Number(patientId);
  const lid = Number(linkId);

  const [activeTab, setActiveTab] = useState<DetailTab>("ficha");
  const [showPrescribeModal, setShowPrescribeModal] = useState(false);
  const [showApptModal, setShowApptModal] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  // Queries
  const medsQuery = trpc.doctor.getPatientMedications.useQuery({ patientId: pid }, { enabled: pid > 0 });
  const allMedsQuery = trpc.doctor.getAllPatientMedications.useQuery({ patientId: pid }, { enabled: pid > 0 });
  const apptQuery = trpc.appointments.listForDoctor.useQuery();
  // For pending patients (pid=0), pass linkId so backend can fetch personal info from doctor_patients
  const historyQuery = trpc.doctor.getPatientHistory.useQuery(
    { patientId: pid, linkId: pid === 0 ? lid : undefined },
    { enabled: pid > 0 || lid > 0 }
  );
  const notesQuery = trpc.clinicalNotes.list.useQuery({ patientId: pid }, { enabled: pid > 0 });
  const adherenceQuery = trpc.doctor.getAdherenceReport.useQuery({ patientId: pid }, { enabled: pid > 0 });
  const weeklyAdherenceQuery = trpc.doctor.getWeeklyAdherence.useQuery({ patientId: pid }, { enabled: pid > 0 });
  const auditLogQuery = trpc.doctor.getPatientAuditLog.useQuery({ linkId: lid }, { enabled: lid > 0 });
  const doctorProfileQuery = trpc.doctor.getProfile.useQuery(undefined, { staleTime: 60_000 });
  const doctorAddress = (doctorProfileQuery.data as any)?.address ?? "";
  const utils = trpc.useUtils();

  const invalidateMeds = () => {
    utils.doctor.getPatientMedications.invalidate({ patientId: pid });
    utils.doctor.getAllPatientMedications.invalidate({ patientId: pid });
    utils.doctor.getAdherenceReport.invalidate({ patientId: pid });
    utils.doctor.getWeeklyAdherence.invalidate({ patientId: pid });
    // Also invalidate patient-side queries so the patient sees the change immediately
    utils.medications.listMine.invalidate();
    utils.medications.listMyDosesToday.invalidate();
  };

  // Build medication color map for chart
  const medColorMap: Record<number, string> = {};
  for (const m of medsQuery.data ?? []) {
    medColorMap[m.id] = m.color ?? "#0D5BBF";
  }

  // Mutations
  const prescribe = trpc.doctor.prescribeMedication.useMutation();
  const createAppt = trpc.appointments.create.useMutation();
  const addNote = trpc.clinicalNotes.add.useMutation();
  const updateInfo = trpc.doctor.updatePatientInfo.useMutation();
  const updatePrescription = trpc.doctor.updatePrescription.useMutation({
    onSuccess: () => { invalidateMeds(); setShowEditMedModal(false); },
  });
  const cancelPrescription = trpc.doctor.cancelPrescription.useMutation({
    onSuccess: () => invalidateMeds(),
  });
  const reactivatePrescription = trpc.doctor.reactivatePrescription.useMutation({
    onSuccess: () => invalidateMeds(),
  });
  const exportPDF = trpc.doctor.exportPatientPDF.useMutation();
  const [exportLoading, setExportLoading] = useState(false);
  const [patientPhotoUrl, setPatientPhotoUrl] = useState<string | null>(null);

  // Sync photo from history
  useEffect(() => {
    const photoUrl = (historyQuery.data as any)?.patientPhotoUrl;
    if (photoUrl) setPatientPhotoUrl(photoUrl);
  }, [(historyQuery.data as any)?.patientPhotoUrl]);

  const uploadPatientPhoto = trpc.doctor.uploadPatientPhoto.useMutation({
    onSuccess: (data) => setPatientPhotoUrl(data.url ?? null),
  });

  const handlePickPatientPhoto = () => {
    const buttons: any[] = [
      {
        text: "Câmera",
        onPress: async () => {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== "granted") { showAlert("Permissão necessária", "Permita o acesso à câmera."); return; }
          const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.7, base64: true });
          if (!result.canceled && result.assets[0].base64) {
            const asset = result.assets[0];
            await uploadPatientPhoto.mutateAsync({ linkId: lid, base64: asset.base64!, mimeType: asset.mimeType ?? "image/jpeg" });
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
            await uploadPatientPhoto.mutateAsync({ linkId: lid, base64: asset.base64!, mimeType: asset.mimeType ?? "image/jpeg" });
          }
        },
      },
    ];
    if (patientPhotoUrl) {
      buttons.push({
        text: "Remover foto",
        style: "destructive" as const,
        onPress: () => {
          showConfirm(
            "Remover foto",
            "Tem certeza que deseja remover a foto do paciente?",
            () => uploadPatientPhoto.mutateAsync({ linkId: lid, base64: null, mimeType: "" }),
            "Remover",
            true
          );
        },
      });
    }
    buttons.push({ text: "Cancelar", style: "cancel" });
    if (Platform.OS === "web") {
      showAlert("Foto do paciente", "Use a versão mobile para alterar a foto do paciente.");
    } else {
      Alert.alert("Foto do paciente", "Escolha a origem da foto", buttons);
    }
  };

  const handleExportPDF = async () => {
    if (exportLoading) return;
    setExportLoading(true);
    try {
      const result = await exportPDF.mutateAsync({ patientId: pid, linkId: pid === 0 ? lid : undefined });
      // Open the generated HTML file in browser
      const { Linking } = await import("react-native");
      await Linking.openURL(result.url);
    } catch (e: any) {
      showAlert("Erro", e.message ?? "Não foi possível exportar a ficha.");
    } finally {
      setExportLoading(false);
    }
  };

  // Edit prescription state
  const [showEditMedModal, setShowEditMedModal] = useState(false);
  const [editMedId, setEditMedId] = useState<number | null>(null);
  const [editMedName, setEditMedName] = useState("");
  const [editMedDosage, setEditMedDosage] = useState("");
  const [editMedNotes, setEditMedNotes] = useState("");
  const [editMedTimes, setEditMedTimes] = useState<string[]>(["08:00"]);

  const openEditMed = (med: { id: number; name: string; dosage: string; notes: string | null; times: { time: string }[] }) => {
    setEditMedId(med.id);
    setEditMedName(med.name);
    setEditMedDosage(med.dosage);
    setEditMedNotes(med.notes ?? "");
    setEditMedTimes(med.times.map(t => t.time));
    setShowEditMedModal(true);
  };

  const handleUpdatePrescription = async () => {
    if (!editMedId) return;
    const validTimes = editMedTimes.filter(t => /^\d{2}:\d{2}$/.test(t));
    if (validTimes.length === 0) { showAlert("Erro", "Adicione pelo menos um horário válido (HH:MM)"); return; }
    await updatePrescription.mutateAsync({ medicationId: editMedId, patientId: pid, name: editMedName, dosage: editMedDosage, notes: editMedNotes || undefined, times: validTimes });
  };

  const handleCancelPrescription = (medId: number, medName: string) => {
    showConfirm(
      "Cancelar prescrição",
      `Deseja desativar "${medName}"? O paciente não receberá mais lembretes deste medicamento.`,
      () => cancelPrescription.mutate({ medicationId: medId, patientId: pid }),
      "Sim, cancelar",
      true
    );
  };

  // Prescribe form
  const [medName, setMedName] = useState("");
  const [medDosage, setMedDosage] = useState("");
  const [medColor, setMedColor] = useState(MED_COLORS[1]);
  const [medNotes, setMedNotes] = useState("");
  const [medFreq, setMedFreq] = useState("2x ao dia");
  const [useCustomTimes, setUseCustomTimes] = useState(false);
  const [customTimes, setCustomTimes] = useState<string[]>(["08:00"]);
  const [medErrors, setMedErrors] = useState<Record<string, string>>({});

  const getEffectiveTimes = () => useCustomTimes ? customTimes.filter(t => /^\d{2}:\d{2}$/.test(t)) : (TIMES_OPTIONS[medFreq] ?? ["08:00"]);

  const addCustomTime = () => setCustomTimes(prev => [...prev, "08:00"]);
  const removeCustomTime = (idx: number) => setCustomTimes(prev => prev.filter((_, i) => i !== idx));
  const updateCustomTime = (idx: number, val: string) => setCustomTimes(prev => prev.map((t, i) => i === idx ? val : t));

  // Appointment form
  const [apptDate, setApptDate] = useState(""); // DD/MM/AAAA (display)
  const [apptDateISO, setApptDateISO] = useState(""); // AAAA-MM-DD (backend)
  const [apptTime, setApptTime] = useState("");
  const [apptInsurance, setApptInsurance] = useState("");
  const [apptLocation, setApptLocation] = useState("");
  const [apptLocationEdited, setApptLocationEdited] = useState(false); // tracks if user manually edited
  const [apptNotes, setApptNotes] = useState("");
  const [apptErrors, setApptErrors] = useState<Record<string, string>>({}); 

  // Note form
  const [noteText, setNoteText] = useState("");

  // Edit patient info
  const history = historyQuery.data;
  const [editForm, setEditForm] = useState({
    patientName: "",
    patientPhone: "",
    patientBirthDate: "",
    patientInsurancePlan: "",
    patientNotes: "",
  });

  const openEditModal = useCallback(() => {
    const rawBirthDate = history?.patientBirthDate ?? "";
    // Se vier no formato ISO (AAAA-MM-DD), converter para DD/MM/AAAA para exibição
    const displayBirthDate = rawBirthDate.match(/^\d{4}-\d{2}-\d{2}$/) ? isoToDisplay(rawBirthDate) : rawBirthDate;
    setEditForm({
      patientName: history?.patientName ?? patientName ?? "",
      patientPhone: history?.patientPhone ?? "",
      patientBirthDate: displayBirthDate,
      patientInsurancePlan: history?.patientInsurancePlan ?? "",
      patientNotes: history?.patientNotes ?? "",
    });
    setShowEditModal(true);
  }, [history, patientName]);

  const handlePrescribe = async () => {
    const errors: Record<string, string> = {};
    if (!medName.trim()) errors.name = "Nome do medicamento é obrigatório";
    if (!medDosage.trim()) errors.dosage = "Dosagem é obrigatória";
    const effectiveTimes = getEffectiveTimes();
    if (effectiveTimes.length === 0) errors.times = "Adicione pelo menos um horário válido (HH:MM)";
    setMedErrors(errors);
    if (Object.keys(errors).length > 0) return;
    try {
      await prescribe.mutateAsync({
        patientId: pid,
        name: medName.trim(),
        dosage: medDosage.trim(),
        color: medColor,
        notes: medNotes.trim() || undefined,
        times: effectiveTimes,
      });
      utils.doctor.getPatientMedications.invalidate({ patientId: pid });
      setShowPrescribeModal(false);
      setMedName(""); setMedDosage(""); setMedNotes(""); setUseCustomTimes(false); setCustomTimes(["08:00"]);
      showAlert("✅ Sucesso", `${medName} foi prescrito.`);
    } catch (e: any) {
      showAlert("Erro", e.message ?? "Não foi possível prescrever.");
    }
  };

  const handleCreateAppt = async () => {
    const errors: Record<string, string> = {};
    if (!apptDateISO.match(/^\d{4}-\d{2}-\d{2}$/)) errors.date = "Data inválida (ex: 28/02/2026)";
    if (!apptTime.match(/^\d{2}:\d{2}$/)) errors.time = "Hora inválida (HH:MM)";
    setApptErrors(errors);
    if (Object.keys(errors).length > 0) return;
    try {
      await createAppt.mutateAsync({
        patientId: pid,
        date: apptDateISO,
        time: apptTime,
        insurance: apptInsurance.trim() || undefined,
        location: apptLocation.trim() || undefined,
        notes: apptNotes.trim() || undefined,
      });
      utils.appointments.listForDoctor.invalidate();
      setShowApptModal(false);
      setApptDate(""); setApptDateISO(""); setApptTime(""); setApptInsurance(""); setApptLocation(""); setApptNotes(""); setApptLocationEdited(false);
      showAlert("✅ Consulta agendada", `Marcada para ${apptDate} às ${apptTime}.`);
    } catch (e: any) {
      showAlert("Erro", e.message ?? "Não foi possível agendar.");
    }
  };

  const handleAddNote = async () => {
    if (!noteText.trim()) return;
    try {
      await addNote.mutateAsync({ patientId: pid, note: noteText.trim() });
      utils.clinicalNotes.list.invalidate({ patientId: pid });
      setNoteText("");
      setShowNoteModal(false);
    } catch (e: any) {
      showAlert("Erro", e.message ?? "Não foi possível salvar a nota.");
    }
  };

  const handleSaveEdit = async () => {
    try {
      // Converter data de nascimento de DD/MM/AAAA para AAAA-MM-DD antes de salvar
      const birthRaw = editForm.patientBirthDate;
      let birthISO = birthRaw;
      if (birthRaw.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
        const [dd, mm, yyyy] = birthRaw.split("/");
        birthISO = `${yyyy}-${mm}-${dd}`;
      }
      await updateInfo.mutateAsync({ linkId: lid, ...editForm, patientBirthDate: birthISO || undefined });
      utils.doctor.getPatientHistory.invalidate({ patientId: pid });
      setShowEditModal(false);
    } catch (e: any) {
      showAlert("Erro", e.message ?? "Não foi possível salvar.");
    }
  };

  const today = new Date().toISOString().split("T")[0];
  const allAppts = (apptQuery.data ?? []).filter((a) => a.patientId === pid);
  const upcomingAppts = allAppts.filter((a) => a.date >= today && a.status !== "cancelled");
  const pastAppts = allAppts.filter((a) => a.date < today || a.status === "cancelled");

  const displayName = history?.patientName ?? patientName ?? "Paciente";
  const initials = displayName.split(" ").slice(0, 2).map((n: string) => n[0]).join("").toUpperCase();

  const TABS: { key: DetailTab; label: string; icon: any }[] = [
    { key: "ficha", label: "Ficha", icon: "person.fill" },
    { key: "medicamentos", label: "Remédios", icon: "pill.fill" },
    { key: "consultas", label: "Consultas", icon: "calendar" },
    { key: "notas", label: "Notas", icon: "note.text" },
  ];

  const isPending = pid === 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace("/(tabs)" as any);
            }
          }}
          style={styles.backBtn}
        >
          <IconSymbol name="arrow.left" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <TouchableOpacity onPress={handlePickPatientPhoto} style={styles.headerAvatar} activeOpacity={0.8}>
            {patientPhotoUrl
              ? <Image source={{ uri: patientPhotoUrl }} style={styles.headerAvatarImg} />
              : <Text style={styles.headerAvatarText}>{initials}</Text>}
            {uploadPatientPhoto.isPending && (
              <View style={styles.headerAvatarOverlay}>
                <ActivityIndicator size="small" color="#fff" />
              </View>
            )}
            {!patientPhotoUrl && !uploadPatientPhoto.isPending && (
              <View style={styles.headerAvatarCameraIcon}>
                <IconSymbol name="camera.fill" size={10} color="#fff" />
              </View>
            )}
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerName} numberOfLines={1}>{displayName}</Text>
            <Text style={styles.headerSub}>
              {history?.patientInsurancePlan ? history.patientInsurancePlan : "Paciente"}
            </Text>
          </View>
        </View>
        <TouchableOpacity onPress={openEditModal} style={styles.editBtn}>
          <IconSymbol name="pencil" size={18} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleExportPDF}
          style={[styles.editBtn, { marginLeft: 4, backgroundColor: exportLoading ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.15)" }]}
          disabled={exportLoading}
        >
          {exportLoading
            ? <ActivityIndicator size="small" color="#fff" />
            : <IconSymbol name="square.and.arrow.up" size={18} color="#fff" />}
        </TouchableOpacity>
      </View>

      {/* Pending Banner */}
      {isPending && (
        <View style={styles.pendingBanner}>
          <Text style={styles.pendingBannerText}>⏳ Convite pendente — paciente ainda não vinculou a conta</Text>
        </View>
      )}

      {/* Action Buttons */}
      {!isPending && <View style={[styles.actionsRow, { backgroundColor: "#0D5BBF" }]}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => setShowPrescribeModal(true)} activeOpacity={0.85}>
          <IconSymbol name="pill.fill" size={18} color="#fff" />
          <Text style={styles.actionBtnText}>Prescrever</Text>
        </TouchableOpacity>
        <View style={styles.actionDivider} />
        <TouchableOpacity style={styles.actionBtn} onPress={() => setShowApptModal(true)} activeOpacity={0.85}>
          <IconSymbol name="calendar.badge.plus" size={18} color="#fff" />
          <Text style={styles.actionBtnText}>Agendar consulta</Text>
        </TouchableOpacity>
        <View style={styles.actionDivider} />
        <TouchableOpacity style={styles.actionBtn} onPress={() => setShowNoteModal(true)} activeOpacity={0.85}>
          <IconSymbol name="note.text.badge.plus" size={18} color="#fff" />
          <Text style={styles.actionBtnText}>Nota clínica</Text>
        </TouchableOpacity>
      </View>}

      {/* Tab Bar */}
      <View style={[styles.tabBar, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tabItem, activeTab === tab.key && styles.tabItemActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <IconSymbol name={tab.icon} size={18} color={activeTab === tab.key ? "#0D5BBF" : colors.muted} />
            <Text style={[styles.tabLabel, { color: activeTab === tab.key ? "#0D5BBF" : colors.muted }]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 48 }}>
        {/* ── FICHA ── */}
        {activeTab === "ficha" && (
          <View style={{ gap: 14 }}>
            {historyQuery.isLoading ? (
              <ActivityIndicator color="#0D5BBF" style={{ marginTop: 32 }} />
            ) : (
              <>
                <InfoCard title="Dados Pessoais" colors={colors}>
                  <InfoRow label="Nome" value={history?.patientName ?? patientName ?? "—"} colors={colors} />
                  <InfoRow label="Data de nascimento" value={history?.patientBirthDate ?? "—"} colors={colors} />
                  <InfoRow label="Telefone" value={history?.patientPhone ?? "—"} colors={colors} />
                  <InfoRow label="Plano de saúde" value={history?.patientInsurancePlan ?? "—"} colors={colors} />
                </InfoCard>

                {history?.patientNotes ? (
                  <InfoCard title="Observações iniciais" colors={colors}>
                    <Text style={[styles.noteText, { color: colors.foreground }]}>{history.patientNotes}</Text>
                  </InfoCard>
                ) : null}

                <InfoCard title="Resumo" colors={colors}>
                  <InfoRow label="Medicamentos ativos" value={String(medsQuery.data?.length ?? 0)} colors={colors} />
                  <InfoRow label="Consultas agendadas" value={String(upcomingAppts.length)} colors={colors} />
                  <InfoRow label="Notas clínicas" value={String(notesQuery.data?.length ?? 0)} colors={colors} />
                </InfoCard>

                {/* Audit Log */}
                {(auditLogQuery.data ?? []).length > 0 && (
                  <InfoCard title="Histórico de alterações" colors={colors}>
                    {(auditLogQuery.data ?? []).map((entry) => (
                      <View key={entry.id} style={styles.auditRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.auditField, { color: colors.foreground }]}>{entry.field}</Text>
                          <Text style={[styles.auditChange, { color: colors.muted }]}>
                            {entry.oldValue ? `"${entry.oldValue}" → ` : ""}"{entry.newValue ?? "removido"}"
                          </Text>
                        </View>
                        <Text style={[styles.auditDate, { color: colors.muted }]}>
                          {new Date(entry.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" })}
                        </Text>
                      </View>
                    ))}
                  </InfoCard>
                )}
              </>
            )}
          </View>
        )}

        {/* ── MEDICAMENTOS ── */}
        {activeTab === "medicamentos" && (
          <View style={{ gap: 12 }}>
            {/* Adherence Report */}
            {adherenceQuery.data && (
              <View style={[styles.adherenceCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.adherenceTitle, { color: colors.foreground }]}>Adesão ao tratamento</Text>
                <View style={styles.adherenceRow}>
                  <AdherenceStat label="Últimos 7 dias" data={adherenceQuery.data.last7} />
                  <View style={[styles.adherenceDivider, { backgroundColor: colors.border }]} />
                  <AdherenceStat label="Últimos 30 dias" data={adherenceQuery.data.last30} />
                </View>
                {adherenceQuery.data.byMedication.length > 0 && (
                  <View style={{ marginTop: 12, gap: 6 }}>
                    <Text style={[styles.adherenceSubtitle, { color: colors.muted }]}>Por medicamento (30 dias)</Text>
                    {adherenceQuery.data.byMedication.map((m) => (
                      <View key={m.medicationId} style={styles.adherenceMedRow}>
                        <Text style={[styles.adherenceMedName, { color: colors.foreground }]} numberOfLines={1}>{m.name}</Text>
                        <View style={styles.adherenceBarBg}>
                          <View style={[styles.adherenceBarFill, { width: `${m.pct}%` as any, backgroundColor: m.pct >= 80 ? "#16A34A" : m.pct >= 50 ? "#F59E0B" : "#EF4444" }]} />
                        </View>
                        <Text style={[styles.adherencePct, { color: m.pct >= 80 ? "#16A34A" : m.pct >= 50 ? "#F59E0B" : "#EF4444" }]}>{m.pct}%</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* Weekly adherence chart */}
            {weeklyAdherenceQuery.data && weeklyAdherenceQuery.data.medications.length > 0 && (
              <WeeklyAdherenceChart
                data={weeklyAdherenceQuery.data}
                medColors={medColorMap}
              />
            )}

            {/* Active medications */}
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              Medicamentos ativos ({medsQuery.data?.length ?? 0})
            </Text>
            {medsQuery.isLoading ? (
              <ActivityIndicator color="#0D5BBF" style={{ marginTop: 16 }} />
            ) : (medsQuery.data ?? []).length === 0 ? (
              <EmptyCard text="Nenhum medicamento ativo" colors={colors} />
            ) : (
              (medsQuery.data ?? []).map((med) => {
                // Find missed doses count from adherence data
                const adherenceMed = adherenceQuery.data?.byMedication.find(m => m.medicationId === med.id);
                const missedLast7 = adherenceMed?.missedLast7 ?? 0;
                return (
                  <View key={med.id} style={[styles.medCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <View style={[styles.medDot, { backgroundColor: med.color }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.medName, { color: colors.foreground }]}>{med.name}</Text>
                      <Text style={[styles.medDosage, { color: colors.muted }]}>{med.dosage}</Text>
                      <Text style={[styles.medTimes, { color: colors.muted }]}>
                        {med.times.map((t) => t.time).join(" · ")}
                      </Text>
                      {missedLast7 > 0 && (
                        <Text style={styles.missedBadge}>
                          ⚠️ {missedLast7} dose{missedLast7 > 1 ? "s" : ""} perdida{missedLast7 > 1 ? "s" : ""} (7 dias)
                        </Text>
                      )}
                    </View>
                    <View style={{ alignItems: "flex-end", gap: 6 }}>
                      <View style={[styles.statusBadge, { backgroundColor: "#DCFCE720" }]}>
                        <Text style={[styles.statusText, { color: "#16A34A" }]}>Ativo</Text>
                      </View>
                      <View style={{ flexDirection: "row", gap: 8 }}>
                        <TouchableOpacity onPress={() => openEditMed(med)} style={styles.medActionBtn}>
                          <IconSymbol name="pencil" size={14} color="#0D5BBF" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleCancelPrescription(med.id, med.name)} style={[styles.medActionBtn, { borderColor: "#EF4444" }]}>
                          <IconSymbol name="xmark" size={14} color="#EF4444" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                );
              })
            )}

            {/* Medication history (inactive) */}
            {(() => {
              const inactiveMeds = (allMedsQuery.data ?? []).filter(m => !m.active);
              if (inactiveMeds.length === 0) return null;
              return (
                <View style={{ gap: 10, marginTop: 8 }}>
                  <Text style={[styles.sectionTitle, { color: colors.muted }]}>Histórico ({inactiveMeds.length})</Text>
                  {inactiveMeds.map((med) => {
                    const canceledDate = med.canceledAt
                      ? new Date(med.canceledAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })
                      : null;
                    return (
                      <View key={med.id} style={[styles.medCard, { backgroundColor: colors.surface, borderColor: colors.border, opacity: 0.75 }]}>
                        <View style={[styles.medDot, { backgroundColor: med.color }]} />
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.medName, { color: colors.muted }]}>{med.name}</Text>
                          <Text style={[styles.medDosage, { color: colors.muted }]}>{med.dosage}</Text>
                          <Text style={[styles.medTimes, { color: colors.muted }]}>
                            {med.times.map((t) => t.time).join(" · ")}
                          </Text>
                          {canceledDate && (
                            <Text style={styles.canceledAtText}>Cancelado em {canceledDate}</Text>
                          )}
                        </View>
                        <View style={{ alignItems: "flex-end", gap: 8 }}>
                          <View style={[styles.statusBadge, { backgroundColor: "#F1F5F920" }]}>
                            <Text style={[styles.statusText, { color: "#94A3B8" }]}>Inativo</Text>
                          </View>
                          <TouchableOpacity
                            style={styles.reactivateBtn}
                            onPress={() => showConfirm(
                              "Reativar medicamento",
                              `Deseja reativar "${med.name}"?`,
                              () => reactivatePrescription.mutate({ medicationId: med.id, patientId: pid }),
                              "Reativar"
                            )}
                          >
                            <Text style={styles.reactivateBtnText}>Reativar</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })}
                </View>
              );
            })()}
          </View>
        )}

        {/* ── CONSULTAS ── */}
        {activeTab === "consultas" && (
          <View style={{ gap: 16 }}>
            {upcomingAppts.length > 0 && (
              <View style={{ gap: 10 }}>
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Próximas consultas</Text>
                {upcomingAppts.map((a) => <ApptCard key={a.id} appt={a} colors={colors} />)}
              </View>
            )}
            {pastAppts.length > 0 && (
              <View style={{ gap: 10 }}>
                <Text style={[styles.sectionTitle, { color: colors.muted }]}>Histórico</Text>
                {pastAppts.map((a) => <ApptCard key={a.id} appt={a} colors={colors} past />)}
              </View>
            )}
            {allAppts.length === 0 && (
              <EmptyCard text="Nenhuma consulta registrada" colors={colors} />
            )}
          </View>
        )}

        {/* ── NOTAS CLÍNICAS ── */}
        {activeTab === "notas" && (
          <View style={{ gap: 12 }}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              Notas clínicas ({notesQuery.data?.length ?? 0})
            </Text>
            {notesQuery.isLoading ? (
              <ActivityIndicator color="#0D5BBF" style={{ marginTop: 16 }} />
            ) : (notesQuery.data ?? []).length === 0 ? (
              <EmptyCard text="Nenhuma nota registrada ainda" colors={colors} />
            ) : (
              (notesQuery.data ?? []).map((note) => (
                <View key={note.id} style={[styles.noteCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Text style={[styles.noteDate, { color: colors.muted }]}>
                    {new Date(note.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </Text>
                  <Text style={[styles.noteText, { color: colors.foreground }]}>{note.note}</Text>
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>

      {/* ── Prescribe Modal ── */}
      <Modal visible={showPrescribeModal} transparent animationType="slide" onRequestClose={() => setShowPrescribeModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>Prescrever medicamento</Text>
              <TouchableOpacity onPress={() => setShowPrescribeModal(false)}>
                <IconSymbol name="xmark" size={22} color={colors.muted} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={{ gap: 14 }}>
                <FieldGroup label="Nome do medicamento *" error={medErrors.name}>
                  <TextInput style={[styles.input, { backgroundColor: colors.surface, color: colors.foreground, borderColor: medErrors.name ? "#EF4444" : colors.border }]} value={medName} onChangeText={setMedName} placeholder="Ex: Losartana" placeholderTextColor={colors.muted} />
                </FieldGroup>
                <FieldGroup label="Dosagem *" error={medErrors.dosage}>
                  <TextInput style={[styles.input, { backgroundColor: colors.surface, color: colors.foreground, borderColor: medErrors.dosage ? "#EF4444" : colors.border }]} value={medDosage} onChangeText={setMedDosage} placeholder="Ex: 50mg - 1 comprimido" placeholderTextColor={colors.muted} />
                </FieldGroup>
                <FieldGroup label="Frequência" error={medErrors.times}>
                  {/* Toggle: pre-set vs custom */}
                  <View style={styles.freqRow}>
                    <TouchableOpacity
                      style={[styles.freqBtn, !useCustomTimes && styles.freqBtnSelected]}
                      onPress={() => setUseCustomTimes(false)}
                    >
                      <Text style={[styles.freqBtnText, !useCustomTimes && styles.freqBtnTextSelected]}>Padrão</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.freqBtn, useCustomTimes && styles.freqBtnSelected]}
                      onPress={() => setUseCustomTimes(true)}
                    >
                      <Text style={[styles.freqBtnText, useCustomTimes && styles.freqBtnTextSelected]}>Personalizado</Text>
                    </TouchableOpacity>
                  </View>

                  {!useCustomTimes ? (
                    <View style={[styles.freqRow, { marginTop: 8 }]}>
                      {Object.keys(TIMES_OPTIONS).map((f) => (
                        <TouchableOpacity key={f} style={[styles.freqBtn, medFreq === f && styles.freqBtnSelected]} onPress={() => setMedFreq(f)}>
                          <Text style={[styles.freqBtnText, medFreq === f && styles.freqBtnTextSelected]}>{f}</Text>
                        </TouchableOpacity>
                      ))}
                      {/* Preview dos horários */}
                      <View style={styles.timesPreview}>
                        {(TIMES_OPTIONS[medFreq] ?? []).map((t, i) => (
                          <View key={i} style={styles.timeChip}>
                            <Text style={styles.timeChipText}>{t}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  ) : (
                    <View style={{ marginTop: 8, gap: 8 }}>
                      {customTimes.map((t, idx) => (
                        <View key={idx} style={styles.customTimeRow}>
                          <TimeInput
                            style={[styles.customTimeInput, { backgroundColor: colors.surface, color: colors.foreground, borderColor: colors.border }]}
                            value={t}
                            onChangeText={(v) => updateCustomTime(idx, v)}
                            placeholderTextColor={colors.muted}
                            returnKeyType="done"
                          />
                          {customTimes.length > 1 && (
                            <TouchableOpacity style={styles.removeTimeBtn} onPress={() => removeCustomTime(idx)}>
                              <IconSymbol name="xmark" size={16} color="#EF4444" />
                            </TouchableOpacity>
                          )}
                        </View>
                      ))}
                      <TouchableOpacity style={styles.addTimeBtn} onPress={addCustomTime}>
                        <IconSymbol name="plus" size={16} color="#0D5BBF" />
                        <Text style={styles.addTimeBtnText}>Adicionar horário</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </FieldGroup>
                <FieldGroup label="Cor">
                  <View style={styles.colorRow}>
                    {MED_COLORS.map((c) => (
                      <TouchableOpacity key={c} style={[styles.colorDot, { backgroundColor: c }, medColor === c && styles.colorDotSelected]} onPress={() => setMedColor(c)} />
                    ))}
                  </View>
                </FieldGroup>
                <FieldGroup label="Observações">
                  <TextInput style={[styles.input, styles.textArea, { backgroundColor: colors.surface, color: colors.foreground, borderColor: colors.border }]} value={medNotes} onChangeText={setMedNotes} placeholder="Instruções adicionais..." placeholderTextColor={colors.muted} multiline numberOfLines={3} textAlignVertical="top" />
                </FieldGroup>
                <TouchableOpacity style={[styles.saveBtn, prescribe.isPending && { opacity: 0.6 }]} onPress={handlePrescribe} disabled={prescribe.isPending} activeOpacity={0.85}>
                  {prescribe.isPending ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Prescrever</Text>}
                </TouchableOpacity>
                <View style={{ height: 20 }} />
              </View>
            </ScrollView>
          </View>
        </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Appointment Modal ── */}
      <Modal visible={showApptModal} transparent animationType="slide" onRequestClose={() => setShowApptModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, { backgroundColor: colors.background }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.foreground }]}>Agendar consulta</Text>
                <TouchableOpacity onPress={() => setShowApptModal(false)}>
                  <IconSymbol name="xmark" size={22} color={colors.muted} />
                </TouchableOpacity>
              </View>
              <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 440 }}>
                <View style={{ gap: 14 }}>
                  <FieldGroup label="Data *" error={apptErrors.date}>
                    <DateInput
                      style={[styles.input, { backgroundColor: colors.surface, color: colors.foreground, borderColor: apptErrors.date ? "#EF4444" : colors.border }]}
                      value={apptDate}
                      onChangeText={setApptDate}
                      onChangeISO={setApptDateISO}
                      placeholderTextColor={colors.muted}
                      returnKeyType="next"
                    />
                  </FieldGroup>
                  <FieldGroup label="Horário *" error={apptErrors.time}>
                    <TimeInput style={[styles.input, { backgroundColor: colors.surface, color: colors.foreground, borderColor: apptErrors.time ? "#EF4444" : colors.border }]} value={apptTime} onChangeText={setApptTime} placeholderTextColor={colors.muted} returnKeyType="next" />
                  </FieldGroup>
                  <FieldGroup label="Convênio">
                    <TextInput style={[styles.input, { backgroundColor: colors.surface, color: colors.foreground, borderColor: colors.border }]} value={apptInsurance} onChangeText={setApptInsurance} placeholder="Ex: Unimed, Particular..." placeholderTextColor={colors.muted} returnKeyType="next" />
                  </FieldGroup>
                  <FieldGroup label="Local / Endereço">
                    {/* Show doctor's address as pre-filled suggestion */}
                    {doctorAddress && !apptLocationEdited && apptLocation === "" && (
                      <View style={{ marginBottom: 6, flexDirection: "row", alignItems: "center", gap: 8 }}>
                        <TouchableOpacity
                          style={[{ backgroundColor: "#EBF4FF", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, flex: 1, flexDirection: "row", alignItems: "center", gap: 6 }]}
                          onPress={() => { setApptLocation(doctorAddress); setApptLocationEdited(false); }}
                          activeOpacity={0.75}
                        >
                          <IconSymbol name="mappin.circle.fill" size={16} color="#0D5BBF" />
                          <Text style={{ color: "#0D5BBF", fontSize: 13, fontWeight: "600", flex: 1 }} numberOfLines={1}>{doctorAddress}</Text>
                          <Text style={{ color: "#0D5BBF", fontSize: 11 }}>Usar</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <TextInput
                        style={[styles.input, { backgroundColor: colors.surface, color: colors.foreground, borderColor: colors.border, flex: 1 }]}
                        value={apptLocation}
                        onChangeText={(t) => { setApptLocation(t); setApptLocationEdited(true); }}
                        placeholder="Ex: Rua das Flores, 123 — Sala 45"
                        placeholderTextColor={colors.muted}
                        returnKeyType="next"
                      />
                      {apptLocation !== "" && (
                        <TouchableOpacity
                          onPress={() => { setApptLocation(""); setApptLocationEdited(false); }}
                          style={{ padding: 4 }}
                        >
                          <IconSymbol name="xmark.circle.fill" size={20} color={colors.muted} />
                        </TouchableOpacity>
                      )}
                    </View>
                  </FieldGroup>
                  <FieldGroup label="Observações">
                    <TextInput style={[styles.input, styles.textArea, { backgroundColor: colors.surface, color: colors.foreground, borderColor: colors.border }]} value={apptNotes} onChangeText={setApptNotes} placeholder="Ex: Trazer exames anteriores..." placeholderTextColor={colors.muted} multiline numberOfLines={3} textAlignVertical="top" />
                  </FieldGroup>
                  <TouchableOpacity style={[styles.saveBtn, { backgroundColor: "#0A8F5C" }, createAppt.isPending && { opacity: 0.6 }]} onPress={handleCreateAppt} disabled={createAppt.isPending} activeOpacity={0.85}>
                    {createAppt.isPending ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Agendar consulta</Text>}
                  </TouchableOpacity>
                  <View style={{ height: 16 }} />
                </View>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Note Modal ── */}
      <Modal visible={showNoteModal} transparent animationType="slide" onRequestClose={() => setShowNoteModal(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, { backgroundColor: colors.background }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.foreground }]}>Nova nota clínica</Text>
                <TouchableOpacity onPress={() => setShowNoteModal(false)}>
                  <IconSymbol name="xmark" size={22} color={colors.muted} />
                </TouchableOpacity>
              </View>
              <View style={{ gap: 14 }}>
                <TextInput
                  style={[styles.input, styles.noteInput, { backgroundColor: colors.surface, color: colors.foreground, borderColor: colors.border }]}
                  value={noteText}
                  onChangeText={setNoteText}
                  placeholder="Registre observações, diagnósticos, evolução do paciente..."
                  placeholderTextColor={colors.muted}
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                />
                <TouchableOpacity style={[styles.saveBtn, addNote.isPending && { opacity: 0.6 }]} onPress={handleAddNote} disabled={addNote.isPending} activeOpacity={0.85}>
                  {addNote.isPending ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Salvar nota</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Edit Prescription Modal ── */}
      <Modal visible={showEditMedModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowEditMedModal(false)}>
        <View style={[styles.editContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.editHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setShowEditMedModal(false)}>
              <Text style={[styles.editCancelText, { color: colors.muted }]}>Cancelar</Text>
            </TouchableOpacity>
            <Text style={[styles.editTitle, { color: colors.foreground }]}>Editar prescrição</Text>
            <TouchableOpacity onPress={handleUpdatePrescription} disabled={updatePrescription.isPending}>
              {updatePrescription.isPending ? <ActivityIndicator size="small" color="#0D5BBF" /> : <Text style={styles.editSaveText}>Salvar</Text>}
            </TouchableOpacity>
          </View>
          <ScrollView style={{ flex: 1, padding: 20 }} keyboardShouldPersistTaps="handled">
            <FieldLabel label="NOME DO MEDICAMENTO" colors={colors} />
            <TextInput
              style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.surface, marginBottom: 14 }]}
              value={editMedName} onChangeText={setEditMedName}
              placeholder="Ex: Losartana" placeholderTextColor={colors.muted}
            />
            <FieldLabel label="DOSAGEM" colors={colors} />
            <TextInput
              style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.surface, marginBottom: 14 }]}
              value={editMedDosage} onChangeText={setEditMedDosage}
              placeholder="Ex: 50mg - 1 comprimido" placeholderTextColor={colors.muted}
            />
            <FieldLabel label="HORÁRIOS (HH:MM)" colors={colors} />
            <View style={{ gap: 8, marginBottom: 14 }}>
              {editMedTimes.map((t, idx) => (
                <View key={idx} style={styles.customTimeRow}>
                  <TimeInput
                    style={[styles.customTimeInput, { backgroundColor: colors.surface, color: colors.foreground, borderColor: colors.border }]}
                    value={t}
                    onChangeText={(v) => setEditMedTimes(prev => prev.map((x, i) => i === idx ? v : x))}
                    placeholderTextColor={colors.muted}
                    returnKeyType="done"
                  />
                  {editMedTimes.length > 1 && (
                    <TouchableOpacity style={styles.removeTimeBtn} onPress={() => setEditMedTimes(prev => prev.filter((_, i) => i !== idx))}>
                      <IconSymbol name="xmark" size={16} color="#EF4444" />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
              <TouchableOpacity style={styles.addTimeBtn} onPress={() => setEditMedTimes(prev => [...prev, "08:00"])}>
                <IconSymbol name="plus" size={16} color="#0D5BBF" />
                <Text style={styles.addTimeBtnText}>Adicionar horário</Text>
              </TouchableOpacity>
            </View>
            <FieldLabel label="OBSERVAÇÕES" colors={colors} />
            <TextInput
              style={[styles.input, styles.textArea, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.surface }]}
              value={editMedNotes} onChangeText={setEditMedNotes}
              placeholder="Instruções adicionais..." placeholderTextColor={colors.muted}
              multiline numberOfLines={3} textAlignVertical="top"
            />
            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </Modal>

      {/* ── Edit Patient Modal ── */}
      <Modal visible={showEditModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowEditModal(false)}>
        <View style={[styles.editContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.editHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setShowEditModal(false)}>
              <Text style={[styles.editCancelText, { color: colors.muted }]}>Cancelar</Text>
            </TouchableOpacity>
            <Text style={[styles.editTitle, { color: colors.foreground }]}>Editar ficha</Text>
            <TouchableOpacity onPress={handleSaveEdit} disabled={updateInfo.isPending}>
              {updateInfo.isPending ? <ActivityIndicator size="small" color="#0D5BBF" /> : <Text style={styles.editSaveText}>Salvar</Text>}
            </TouchableOpacity>
          </View>
          <ScrollView style={{ flex: 1, padding: 20 }} keyboardShouldPersistTaps="handled">
            <FieldLabel label="NOME COMPLETO" colors={colors} />
            <TextInput style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.surface }]} value={editForm.patientName} onChangeText={(v) => setEditForm((f) => ({ ...f, patientName: v }))} placeholder="Nome do paciente" placeholderTextColor={colors.muted} />
            <FieldLabel label="TELEFONE" colors={colors} />
            <TextInput style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.surface }]} value={editForm.patientPhone} onChangeText={(v) => setEditForm((f) => ({ ...f, patientPhone: v }))} placeholder="(11) 99999-9999" placeholderTextColor={colors.muted} keyboardType="phone-pad" />
            <FieldLabel label="DATA DE NASCIMENTO" colors={colors} />
            <DateInput style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.surface }]} value={editForm.patientBirthDate} onChangeText={(v) => setEditForm((f) => ({ ...f, patientBirthDate: v }))} placeholderTextColor={colors.muted} />
            <FieldLabel label="PLANO DE SAÚDE" colors={colors} />
            <TextInput style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.surface }]} value={editForm.patientInsurancePlan} onChangeText={(v) => setEditForm((f) => ({ ...f, patientInsurancePlan: v }))} placeholder="Ex: Unimed, Bradesco Saúde..." placeholderTextColor={colors.muted} />
            <FieldLabel label="OBSERVAÇÕES" colors={colors} />
            <TextInput style={[styles.input, styles.textArea, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.surface }]} value={editForm.patientNotes} onChangeText={(v) => setEditForm((f) => ({ ...f, patientNotes: v }))} placeholder="Histórico relevante, alergias, condições..." placeholderTextColor={colors.muted} multiline numberOfLines={4} textAlignVertical="top" />
            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

// ── Sub-components ──

function InfoCard({ title, children, colors }: { title: string; children: React.ReactNode; colors: any }) {
  return (
    <View style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[styles.infoCardTitle, { color: colors.foreground }]}>{title}</Text>
      <View style={{ gap: 10 }}>{children}</View>
    </View>
  );
}

function InfoRow({ label, value, colors }: { label: string; value: string; colors: any }) {
  return (
    <View style={styles.infoRow}>
      <Text style={[styles.infoLabel, { color: colors.muted }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: colors.foreground }]}>{value}</Text>
    </View>
  );
}

function ApptCard({ appt, colors, past }: { appt: any; colors: any; past?: boolean }) {
  const day = appt.date.split("-")[2];
  const month = new Date(appt.date + "T12:00:00").toLocaleDateString("pt-BR", { month: "short" }).replace(".", "").toUpperCase();
  const statusColor = appt.status === "confirmed" ? "#16A34A" : appt.status === "cancelled" ? "#94A3B8" : "#CA8A04";
  const statusLabel = appt.status === "confirmed" ? "Confirmada" : appt.status === "cancelled" ? "Cancelada" : "Agendada";
  return (
    <View style={[styles.apptCard, { backgroundColor: colors.surface, borderColor: colors.border, opacity: past ? 0.7 : 1 }]}>
      <View style={[styles.apptDateBadge, { backgroundColor: past ? colors.border : "#EBF4FF" }]}>
        <Text style={[styles.apptDay, { color: past ? colors.muted : "#0D5BBF" }]}>{day}</Text>
        <Text style={[styles.apptMonth, { color: past ? colors.muted : "#0D5BBF" }]}>{month}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.apptTime, { color: colors.foreground }]}>{appt.time}</Text>
        {appt.insurance ? <Text style={[styles.apptInsurance, { color: colors.muted }]}>{appt.insurance}</Text> : null}
        {appt.location ? (
          <TouchableOpacity
            onPress={() => {
              const encoded = encodeURIComponent(appt.location);
              const url = Platform.OS === "ios" ? `maps:?q=${encoded}` : `geo:0,0?q=${encoded}`;
              Linking.canOpenURL(url).then((can) => {
                Linking.openURL(can ? url : `https://maps.google.com/?q=${encoded}`);
              });
            }}
            activeOpacity={0.7}
          >
            <Text style={[styles.apptNotes, { color: "#0D5BBF" }]} numberOfLines={1}>📍 {appt.location}</Text>
          </TouchableOpacity>
        ) : null}
        {appt.notes ? <Text style={[styles.apptNotes, { color: colors.muted }]} numberOfLines={1}>{appt.notes}</Text> : null}
      </View>
      <View style={[styles.statusBadge, { backgroundColor: statusColor + "20" }]}>
        <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
      </View>
    </View>
  );
}

function EmptyCard({ text, colors }: { text: string; colors: any }) {
  return (
    <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[styles.emptyCardText, { color: colors.muted }]}>{text}</Text>
    </View>
  );
}

function FieldGroup({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.fieldGroupLabel}>{label}</Text>
      {children}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

function FieldLabel({ label, colors }: { label: string; colors: any }) {
  return <Text style={[styles.fieldLabelSmall, { color: colors.muted }]}>{label}</Text>;
}

function AdherenceStat({ label, data }: { label: string; data: { taken: number; total: number; pct: number } }) {
  const color = data.pct >= 80 ? "#16A34A" : data.pct >= 50 ? "#F59E0B" : data.total === 0 ? "#94A3B8" : "#EF4444";
  return (
    <View style={{ flex: 1, alignItems: "center", gap: 4 }}>
      <Text style={{ fontSize: 28, fontWeight: "800", color }}>{data.total === 0 ? "—" : `${data.pct}%`}</Text>
      <Text style={{ fontSize: 11, color: "#94A3B8", textAlign: "center" }}>{label}</Text>
      {data.total > 0 && <Text style={{ fontSize: 11, color: "#94A3B8" }}>{data.taken}/{data.total} doses</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#0D5BBF",
  },
  backBtn: { padding: 4 },
  editBtn: { padding: 4 },
  headerInfo: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12 },
  headerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerAvatarText: { fontSize: 18, fontWeight: "800", color: "#fff" },
  headerAvatarImg: { width: 44, height: 44, borderRadius: 22 },
  headerAvatarOverlay: {
    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
    borderRadius: 22, backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center", justifyContent: "center",
  },
  headerAvatarCameraIcon: {
    position: "absolute", bottom: 0, right: 0,
    backgroundColor: "rgba(0,0,0,0.5)", borderRadius: 8,
    padding: 2,
  },
  headerName: { fontSize: 17, fontWeight: "700", color: "#fff" },
  headerSub: { fontSize: 12, color: "rgba(255,255,255,0.75)" },
  actionsRow: {
    flexDirection: "row",
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
  },
  actionBtnText: { color: "#fff", fontWeight: "600", fontSize: 12 },
  actionDivider: { width: 0.5, backgroundColor: "rgba(255,255,255,0.3)", marginVertical: 8 },
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    gap: 3,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabItemActive: { borderBottomColor: "#0D5BBF" },
  tabLabel: { fontSize: 11, fontWeight: "600" },
  sectionTitle: { fontSize: 16, fontWeight: "700" },
  infoCard: {
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 1,
  },
  infoCardTitle: { fontSize: 13, fontWeight: "700", letterSpacing: 0.3 },
  infoRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  infoLabel: { fontSize: 13, flex: 1 },
  infoValue: { fontSize: 13, fontWeight: "600", flex: 2, textAlign: "right" },
  emptyCard: {
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
  },
  emptyCardText: { fontSize: 14, fontWeight: "500" },
  medCard: {
    borderRadius: 14,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
  },
  medDot: { width: 12, height: 12, borderRadius: 6 },
  medName: { fontSize: 15, fontWeight: "600" },
  medDosage: { fontSize: 13 },
  medTimes: { fontSize: 12, marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 12, fontWeight: "600" },
  apptCard: {
    borderRadius: 14,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
  },
  apptDateBadge: {
    width: 48,
    height: 48,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  apptDay: { fontSize: 18, fontWeight: "800", lineHeight: 22 },
  apptMonth: { fontSize: 10, fontWeight: "600" },
  apptTime: { fontSize: 15, fontWeight: "600" },
  apptInsurance: { fontSize: 13 },
  apptNotes: { fontSize: 12 },
  noteCard: {
    borderRadius: 14,
    padding: 14,
    gap: 6,
    borderWidth: 1,
  },
  noteDate: { fontSize: 12 },
  noteText: { fontSize: 14, lineHeight: 20 },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: "85%",
    gap: 16,
  },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  modalTitle: { fontSize: 18, fontWeight: "800" },
  input: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  textArea: { height: 90, paddingTop: 14 },
  noteInput: { height: 140, paddingTop: 14 },
  errorText: { fontSize: 12, color: "#EF4444" },
  freqRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  freqBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
    backgroundColor: "#F8FAFC",
  },
  freqBtnSelected: { backgroundColor: "#0D5BBF", borderColor: "#0D5BBF" },
  freqBtnText: { fontSize: 13, fontWeight: "500", color: "#475569" },
  freqBtnTextSelected: { color: "#fff" },
  colorRow: { flexDirection: "row", gap: 12 },
  colorDot: { width: 32, height: 32, borderRadius: 16 },
  colorDotSelected: { borderWidth: 3, borderColor: "#0D5BBF" },
  saveBtn: {
    backgroundColor: "#0D5BBF",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
  },
  saveBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  fieldGroupLabel: { fontSize: 14, fontWeight: "600", color: "#374151" },
  fieldLabelSmall: { fontSize: 11, fontWeight: "700", letterSpacing: 0.5, marginBottom: 6, marginTop: 14 },
  // Edit modal
  editContainer: { flex: 1 },
  editHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 0.5,
  },
  editCancelText: { fontSize: 16 },
  editTitle: { fontSize: 17, fontWeight: "700" },
  editSaveText: { fontSize: 16, fontWeight: "700", color: "#0D5BBF" },
  pendingBanner: {
    backgroundColor: "#FEF9C3",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#FDE68A",
  },
  pendingBannerText: { fontSize: 13, fontWeight: "600", color: "#92400E", textAlign: "center" },
  timesPreview: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8, width: "100%" },
  timeChip: { backgroundColor: "#EBF4FF", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  timeChipText: { fontSize: 13, fontWeight: "600", color: "#0D5BBF" },
  customTimeRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  customTimeInput: { flex: 1, borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16 },
  removeTimeBtn: { padding: 8, borderRadius: 8, backgroundColor: "#FEE2E2" },
  addTimeBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 10, paddingHorizontal: 4 },
  addTimeBtnText: { fontSize: 14, fontWeight: "600", color: "#0D5BBF" },
  // Adherence report
  adherenceCard: { borderRadius: 16, padding: 16, borderWidth: 1 },
  adherenceTitle: { fontSize: 15, fontWeight: "700", marginBottom: 12 },
  adherenceRow: { flexDirection: "row", alignItems: "center" },
  adherenceDivider: { width: 1, height: 48, marginHorizontal: 12 },
  adherenceSubtitle: { fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 },
  adherenceMedRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  adherenceMedName: { fontSize: 13, fontWeight: "500", width: 110 },
  adherenceBarBg: { flex: 1, height: 8, borderRadius: 4, backgroundColor: "#E5E7EB", overflow: "hidden" },
  adherenceBarFill: { height: 8, borderRadius: 4 },
  adherencePct: { fontSize: 13, fontWeight: "700", width: 36, textAlign: "right" },
  // Med action buttons
  medActionBtn: { width: 28, height: 28, borderRadius: 8, borderWidth: 1.5, borderColor: "#0D5BBF", alignItems: "center", justifyContent: "center" },
  // Missed doses badge
  missedBadge: { fontSize: 12, fontWeight: "600", color: "#D97706", marginTop: 4 },
  // Reactivate button
  reactivateBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1.5, borderColor: "#16A34A" },
  reactivateBtnText: { fontSize: 12, fontWeight: "600", color: "#16A34A" },
  // Canceled at text
  canceledAtText: { fontSize: 11, color: "#94A3B8", marginTop: 2 },
  auditRow: { flexDirection: "row", alignItems: "flex-start", paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: "#E5E7EB" },
  auditField: { fontSize: 13, fontWeight: "600", marginBottom: 2 },
  auditChange: { fontSize: 12, lineHeight: 18 },
  auditDate: { fontSize: 11, marginLeft: 8, marginTop: 2 },
});
