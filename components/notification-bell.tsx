import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  Modal,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from "react-native";
import { trpc } from "@/lib/trpc";
import { useColors } from "@/hooks/use-colors";
import { MaterialIcons } from "@expo/vector-icons";

type Notification = {
  id: number;
  type: "consultation_request" | "new_review";
  title: string;
  body: string;
  referenceId: number | null;
  isRead: boolean;
  createdAt: Date | string;
};

function timeAgo(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return "agora";
  if (diff < 3600) return `${Math.floor(diff / 60)}min atrás`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h atrás`;
  return `${Math.floor(diff / 86400)}d atrás`;
}

interface NotificationBellProps {
  /** Called when user taps a consultation_request notification */
  onNavigateToRequests?: () => void;
  /** Called when user taps a new_review notification */
  onNavigateToPatients?: () => void;
  /** Icon size */
  size?: number;
}

export function NotificationBell({
  onNavigateToRequests,
  onNavigateToPatients,
  size = 24,
}: NotificationBellProps) {
  const colors = useColors();
  const [open, setOpen] = useState(false);
  const utils = trpc.useUtils();

  const { data: countData } = trpc.doctor.countUnreadNotifications.useQuery(undefined, {
    refetchInterval: 30_000, // poll every 30s
  });

  const { data: notifications = [] } = trpc.doctor.getNotifications.useQuery(undefined, {
    enabled: open,
  });

  const markRead = trpc.doctor.markNotificationRead.useMutation({
    onSuccess: () => {
      utils.doctor.countUnreadNotifications.invalidate();
      utils.doctor.getNotifications.invalidate();
    },
  });

  const markAllRead = trpc.doctor.markAllNotificationsRead.useMutation({
    onSuccess: () => {
      utils.doctor.countUnreadNotifications.invalidate();
      utils.doctor.getNotifications.invalidate();
    },
  });

  const unreadCount = countData?.count ?? 0;

  const handleOpen = useCallback(() => setOpen(true), []);
  const handleClose = useCallback(() => setOpen(false), []);

  const handleTapNotification = useCallback(
    (item: Notification) => {
      if (!item.isRead) {
        markRead.mutate({ id: item.id });
      }
      setOpen(false);
      if (item.type === "consultation_request") {
        onNavigateToRequests?.();
      } else {
        onNavigateToPatients?.();
      }
    },
    [markRead, onNavigateToRequests, onNavigateToPatients]
  );

  const handleMarkAllRead = useCallback(() => {
    markAllRead.mutate();
  }, [markAllRead]);

  const styles = StyleSheet.create({
    bellWrapper: {
      position: "relative",
      width: size + 12,
      height: size + 12,
      alignItems: "center",
      justifyContent: "center",
    },
    badge: {
      position: "absolute",
      top: 0,
      right: 0,
      minWidth: 16,
      height: 16,
      borderRadius: 8,
      backgroundColor: colors.error,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 3,
    },
    badgeText: {
      color: "#fff",
      fontSize: 10,
      fontWeight: "700",
      lineHeight: 14,
    },
    overlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.35)",
      justifyContent: "flex-start",
      alignItems: "flex-end",
    },
    dropdown: {
      marginTop: Platform.OS === "web" ? 56 : 80,
      marginRight: 12,
      width: 320,
      maxHeight: 420,
      backgroundColor: colors.surface,
      borderRadius: 16,
      overflow: "hidden",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 8,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerTitle: {
      fontSize: 15,
      fontWeight: "700",
      color: colors.foreground,
    },
    markAllBtn: {
      paddingVertical: 4,
      paddingHorizontal: 8,
    },
    markAllText: {
      fontSize: 12,
      color: colors.primary,
      fontWeight: "600",
    },
    notifItem: {
      flexDirection: "row",
      alignItems: "flex-start",
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      gap: 10,
    },
    notifUnread: {
      backgroundColor: colors.background,
    },
    iconCircle: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },
    notifContent: {
      flex: 1,
    },
    notifTitle: {
      fontSize: 13,
      fontWeight: "700",
      color: colors.foreground,
      lineHeight: 18,
    },
    notifBody: {
      fontSize: 12,
      color: colors.muted,
      lineHeight: 17,
      marginTop: 2,
    },
    notifTime: {
      fontSize: 11,
      color: colors.muted,
      marginTop: 4,
    },
    unreadDot: {
      width: 7,
      height: 7,
      borderRadius: 3.5,
      backgroundColor: colors.primary,
      marginTop: 5,
      flexShrink: 0,
    },
    emptyContainer: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 40,
      gap: 8,
    },
    emptyText: {
      fontSize: 14,
      color: colors.muted,
    },
  });

  const renderItem = ({ item }: { item: Notification }) => {
    const isRequest = item.type === "consultation_request";
    const iconName = isRequest ? "assignment" : "star";
    const iconBg = isRequest ? "#EBF4FF" : "#FFF9C4";
    const iconColor = isRequest ? colors.primary : "#F59E0B";

    return (
      <TouchableOpacity
        style={[styles.notifItem, !item.isRead && styles.notifUnread]}
        onPress={() => handleTapNotification(item)}
        activeOpacity={0.7}
      >
        <View style={[styles.iconCircle, { backgroundColor: iconBg }]}>
          <MaterialIcons name={iconName as any} size={18} color={iconColor} />
        </View>
        <View style={styles.notifContent}>
          <Text style={styles.notifTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.notifBody} numberOfLines={2}>
            {item.body}
          </Text>
          <Text style={styles.notifTime}>{timeAgo(item.createdAt)}</Text>
        </View>
        {!item.isRead && <View style={styles.unreadDot} />}
      </TouchableOpacity>
    );
  };

  return (
    <>
      <Pressable style={styles.bellWrapper} onPress={handleOpen}>
        <MaterialIcons name="notifications" size={size} color={colors.foreground} />
        {unreadCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {unreadCount > 99 ? "99+" : unreadCount}
            </Text>
          </View>
        )}
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={handleClose}
      >
        <Pressable style={styles.overlay} onPress={handleClose}>
          <Pressable style={styles.dropdown} onPress={(e) => e.stopPropagation()}>
            <View style={styles.header}>
              <Text style={styles.headerTitle}>
                Notificações{unreadCount > 0 ? ` (${unreadCount})` : ""}
              </Text>
              {unreadCount > 0 && (
                <TouchableOpacity style={styles.markAllBtn} onPress={handleMarkAllRead}>
                  <Text style={styles.markAllText}>Marcar todas como lidas</Text>
                </TouchableOpacity>
              )}
            </View>
            {notifications.length === 0 ? (
              <View style={styles.emptyContainer}>
                <MaterialIcons name="notifications-none" size={36} color={colors.muted} />
                <Text style={styles.emptyText}>Nenhuma notificação</Text>
              </View>
            ) : (
              <FlatList
                data={notifications as Notification[]}
                keyExtractor={(item) => String(item.id)}
                renderItem={renderItem}
                showsVerticalScrollIndicator={false}
              />
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
