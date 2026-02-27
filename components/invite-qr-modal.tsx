import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Share,
  Platform,
} from "react-native";
import QRCode from "react-native-qrcode-svg";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";

interface InviteQRModalProps {
  visible: boolean;
  code: string;
  /** "patient" = familiar gerou para o paciente inserir
   *  "caregiver" = paciente gerou para o familiar inserir */
  codeType: "patient" | "caregiver";
  onClose: () => void;
  onGenerateNew: () => void;
}

export function InviteQRModal({
  visible,
  code,
  codeType,
  onClose,
  onGenerateNew,
}: InviteQRModalProps) {
  const colors = useColors();

  const shareMessage =
    codeType === "patient"
      ? `Use o código ${code} no MediAlert para que eu possa acompanhar seus medicamentos. Abra o app, vá em "Familiares" e insira o código ou escaneie o QR Code.`
      : `Use o código ${code} no MediAlert para acompanhar meus medicamentos. Abra o app, vá em "Familiares" e insira o código ou escaneie o QR Code.`;

  const handleShare = async () => {
    try {
      await Share.share({ message: shareMessage, title: "Código de convite MediAlert" });
    } catch {}
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {/* Handle */}
          <View style={[styles.handle, { backgroundColor: colors.border }]} />

          {/* Close button */}
          <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
            <View style={[styles.closeBtnInner, { backgroundColor: colors.border + "80" }]}>
              <IconSymbol name="xmark" size={14} color={colors.muted} />
            </View>
          </TouchableOpacity>

          {/* Title */}
          <Text style={[styles.title, { color: colors.foreground }]}>
            {codeType === "patient" ? "Convite para paciente" : "Convite para familiar"}
          </Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>
            {codeType === "patient"
              ? "Compartilhe o QR Code ou o código com o paciente"
              : "Compartilhe o QR Code ou o código com seu familiar"}
          </Text>

          {/* QR Code */}
          <View style={[styles.qrContainer, { backgroundColor: "#fff", borderColor: colors.border }]}>
            <QRCode
              value={`medialert://invite/${code}`}
              size={200}
              color="#0D5BBF"
              backgroundColor="#ffffff"
            />
          </View>

          {/* Code badge */}
          <View style={[styles.codeBadge, { backgroundColor: "#EBF4FF", borderColor: "#0D5BBF40" }]}>
            <Text style={styles.codeText}>{code}</Text>
          </View>
          <Text style={[styles.codeHint, { color: colors.muted }]}>
            Código de uso único · Válido por 24 horas
          </Text>

          {/* Actions */}
          <TouchableOpacity
            style={[styles.shareBtn, { backgroundColor: colors.primary }]}
            onPress={handleShare}
            activeOpacity={0.85}
          >
            <IconSymbol name="square.and.arrow.up" size={18} color="#fff" />
            <Text style={styles.shareBtnText}>Compartilhar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.ghostBtn, { borderColor: colors.border }]}
            onPress={onGenerateNew}
            activeOpacity={0.7}
          >
            <Text style={[styles.ghostBtnText, { color: colors.muted }]}>Gerar novo código</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 12,
    alignItems: "center",
    gap: 12,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: 8,
  },
  closeBtn: {
    position: "absolute",
    top: 16,
    right: 20,
  },
  closeBtnInner: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    lineHeight: 28,
    textAlign: "center",
    marginTop: 4,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
  },
  qrContainer: {
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    marginVertical: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  codeBadge: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  codeText: {
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: 6,
    color: "#0D5BBF",
    lineHeight: 34,
  },
  codeHint: {
    fontSize: 12,
    textAlign: "center",
    lineHeight: 16,
  },
  shareBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    width: "100%",
    marginTop: 4,
  },
  shareBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
  },
  ghostBtn: {
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    width: "100%",
    alignItems: "center",
  },
  ghostBtnText: { fontSize: 14 },
});
