import { useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ActivityIndicator,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";

interface QRScannerModalProps {
  visible: boolean;
  onScan: (code: string) => void;
  onClose: () => void;
}

export function QRScannerModal({ visible, onScan, onClose }: QRScannerModalProps) {
  const colors = useColors();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  if (Platform.OS === "web") {
    return null; // QR scanner not supported on web
  }

  const handleBarCodeScanned = ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);

    // Extract code from deep link: medialert://invite/XXXXXX
    let code = data;
    const match = data.match(/medialert:\/\/invite\/([A-Z0-9]+)/i);
    if (match) {
      code = match[1].toUpperCase();
    } else {
      // Try to use raw data if it looks like a code (6-12 alphanumeric chars)
      const rawMatch = data.match(/^[A-Z0-9]{6,12}$/i);
      if (rawMatch) {
        code = data.toUpperCase();
      } else {
        setScanned(false);
        return; // Not a valid MediAlert QR code
      }
    }

    onScan(code);
    onClose();
  };

  const handleClose = () => {
    setScanned(false);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        {!permission ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : !permission.granted ? (
          <View style={[styles.center, { backgroundColor: colors.background }]}>
            <View style={[styles.permissionIcon, { backgroundColor: colors.primary + "20" }]}>
              <IconSymbol name="camera.fill" size={40} color={colors.primary} />
            </View>
            <Text style={[styles.permissionTitle, { color: colors.foreground }]}>
              Permissão de câmera necessária
            </Text>
            <Text style={[styles.permissionSubtitle, { color: colors.muted }]}>
              Para escanear o QR Code, precisamos acessar a câmera do seu dispositivo.
            </Text>
            <TouchableOpacity
              style={[styles.permissionBtn, { backgroundColor: colors.primary }]}
              onPress={requestPermission}
              activeOpacity={0.85}
            >
              <Text style={styles.permissionBtnText}>Permitir acesso à câmera</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleClose} activeOpacity={0.7} style={{ marginTop: 12 }}>
              <Text style={[styles.cancelText, { color: colors.muted }]}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <CameraView
              style={StyleSheet.absoluteFill}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
              onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
            />

            {/* Overlay */}
            <View style={styles.overlay}>
              {/* Top bar */}
              <View style={styles.topBar}>
                <TouchableOpacity
                  style={styles.closeBtn}
                  onPress={handleClose}
                  activeOpacity={0.7}
                >
                  <View style={styles.closeBtnInner}>
                    <IconSymbol name="xmark" size={18} color="#fff" />
                  </View>
                </TouchableOpacity>
                <Text style={styles.topTitle}>Escanear QR Code</Text>
                <View style={{ width: 40 }} />
              </View>

              {/* Viewfinder */}
              <View style={styles.viewfinderContainer}>
                <View style={styles.viewfinder}>
                  {/* Corner brackets */}
                  <View style={[styles.corner, styles.cornerTL]} />
                  <View style={[styles.corner, styles.cornerTR]} />
                  <View style={[styles.corner, styles.cornerBL]} />
                  <View style={[styles.corner, styles.cornerBR]} />
                </View>
              </View>

              {/* Bottom hint */}
              <View style={styles.bottomHint}>
                <Text style={styles.hintText}>
                  Aponte a câmera para o QR Code de convite do MediAlert
                </Text>
                {scanned && (
                  <TouchableOpacity
                    style={styles.rescanBtn}
                    onPress={() => setScanned(false)}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.rescanText}>Escanear novamente</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </>
        )}
      </View>
    </Modal>
  );
}

const CORNER_SIZE = 24;
const CORNER_THICKNESS = 3;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 16,
  },
  permissionIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  permissionTitle: { fontSize: 20, fontWeight: "700", textAlign: "center", lineHeight: 28 },
  permissionSubtitle: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  permissionBtn: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    marginTop: 8,
  },
  permissionBtnText: { fontSize: 15, fontWeight: "700", color: "#fff" },
  cancelText: { fontSize: 14 },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "space-between",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  closeBtn: {},
  closeBtnInner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  topTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: "#fff",
  },

  viewfinderContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  viewfinder: {
    width: 240,
    height: 240,
    position: "relative",
  },
  corner: {
    position: "absolute",
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderColor: "#fff",
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: CORNER_THICKNESS,
    borderLeftWidth: CORNER_THICKNESS,
    borderTopLeftRadius: 4,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: CORNER_THICKNESS,
    borderRightWidth: CORNER_THICKNESS,
    borderTopRightRadius: 4,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: CORNER_THICKNESS,
    borderLeftWidth: CORNER_THICKNESS,
    borderBottomLeftRadius: 4,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: CORNER_THICKNESS,
    borderRightWidth: CORNER_THICKNESS,
    borderBottomRightRadius: 4,
  },

  bottomHint: {
    paddingHorizontal: 32,
    paddingBottom: 60,
    paddingTop: 24,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    gap: 12,
  },
  hintText: {
    fontSize: 14,
    color: "rgba(255,255,255,0.85)",
    textAlign: "center",
    lineHeight: 20,
  },
  rescanBtn: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.4)",
  },
  rescanText: { fontSize: 14, fontWeight: "600", color: "#fff" },
});
