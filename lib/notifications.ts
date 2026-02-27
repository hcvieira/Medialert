import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { Medication } from "./storage";

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === "web") return false;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("medialert", {
      name: "Lembretes de Medicamentos",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#1A7FE8",
      sound: "default",
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  return finalStatus === "granted";
}

export async function scheduleMedicationNotifications(medication: Medication): Promise<void> {
  if (Platform.OS === "web") return;

  // Cancel existing notifications for this medication first
  await cancelMedicationNotifications(medication.id);

  for (const doseTime of medication.times) {
    const [hours, minutes] = doseTime.time.split(":").map(Number);

    await Notifications.scheduleNotificationAsync({
      identifier: `med-${medication.id}-${doseTime.id}`,
      content: {
        title: `💊 Hora do remédio!`,
        body: `${medication.name} — ${medication.dosage}`,
        data: { medicationId: medication.id, doseTimeId: doseTime.id },
        sound: "default",
        categoryIdentifier: "medication",
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: hours,
        minute: minutes,
        channelId: Platform.OS === "android" ? "medialert" : undefined,
      } as Notifications.DailyTriggerInput,
    });
  }
}

export async function cancelMedicationNotifications(medicationId: string): Promise<void> {
  if (Platform.OS === "web") return;

  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const toCancel = scheduled.filter((n) =>
    n.identifier.startsWith(`med-${medicationId}-`)
  );
  await Promise.all(toCancel.map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)));
}

/**
 * Schedule daily reminder notifications for server-prescribed medications.
 * Uses numeric medicationId (from server DB) instead of local string ID.
 */
export async function scheduleServerMedicationNotifications(
  medicationId: number,
  medicationName: string,
  dosage: string,
  times: string[]
): Promise<void> {
  if (Platform.OS === "web") return;

  // Cancel existing notifications for this server medication first
  await cancelServerMedicationNotifications(medicationId);

  for (const doseTime of times) {
    const [hours, minutes] = doseTime.split(":").map(Number);
    if (isNaN(hours) || isNaN(minutes)) continue;

    await Notifications.scheduleNotificationAsync({
      identifier: `server-med-${medicationId}-${doseTime.replace(":", "")}`,
      content: {
        title: `💊 Hora do remédio!`,
        body: `${medicationName} — ${dosage}`,
        data: { serverMedicationId: medicationId },
        sound: "default",
        categoryIdentifier: "medication",
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: hours,
        minute: minutes,
        channelId: Platform.OS === "android" ? "medialert" : undefined,
      } as Notifications.DailyTriggerInput,
    });
  }
}

export async function cancelServerMedicationNotifications(medicationId: number): Promise<void> {
  if (Platform.OS === "web") return;

  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const toCancel = scheduled.filter((n) =>
    n.identifier.startsWith(`server-med-${medicationId}-`)
  );
  await Promise.all(toCancel.map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)));
}

/**
 * Schedule appointment reminder notifications: 24h and 1h before.
 * appointmentId: numeric DB id
 * date: "YYYY-MM-DD", time: "HH:MM"
 * doctorName: name of the doctor for the notification body
 */
export async function scheduleAppointmentReminders(
  appointmentId: number,
  date: string,
  time: string,
  doctorName: string
): Promise<void> {
  if (Platform.OS === "web") return;

  // Cancel any existing reminders for this appointment first
  await cancelAppointmentReminders(appointmentId);

  const [year, month, day] = date.split("-").map(Number);
  const [hours, minutes] = time.split(":").map(Number);
  if ([year, month, day, hours, minutes].some(isNaN)) return;

  const apptDate = new Date(year, month - 1, day, hours, minutes, 0);
  const now = new Date();

  const remind24h = new Date(apptDate.getTime() - 24 * 60 * 60 * 1000);
  const remind1h = new Date(apptDate.getTime() - 60 * 60 * 1000);

  if (remind24h > now) {
    await Notifications.scheduleNotificationAsync({
      identifier: `appt-${appointmentId}-24h`,
      content: {
        title: "📅 Consulta amanhã",
        body: `Lembrete: consulta com Dr. ${doctorName} amanhã às ${time}`,
        data: { appointmentId, type: "appointment_reminder" },
        sound: "default",
        categoryIdentifier: "appointment",
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: remind24h,
        channelId: Platform.OS === "android" ? "medialert" : undefined,
      } as Notifications.DateTriggerInput,
    });
  }

  if (remind1h > now) {
    await Notifications.scheduleNotificationAsync({
      identifier: `appt-${appointmentId}-1h`,
      content: {
        title: "⏰ Consulta em 1 hora",
        body: `Sua consulta com Dr. ${doctorName} é às ${time}`,
        data: { appointmentId, type: "appointment_reminder" },
        sound: "default",
        categoryIdentifier: "appointment",
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: remind1h,
        channelId: Platform.OS === "android" ? "medialert" : undefined,
      } as Notifications.DateTriggerInput,
    });
  }
}

export async function cancelAppointmentReminders(appointmentId: number): Promise<void> {
  if (Platform.OS === "web") return;
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const toCancel = scheduled.filter((n) =>
    n.identifier.startsWith(`appt-${appointmentId}-`)
  );
  await Promise.all(toCancel.map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)));
}

export async function sendFamilyNotification(
  medicationName: string,
  takenAt: string
): Promise<void> {
  if (Platform.OS === "web") return;

  const time = new Date(takenAt).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  // Schedule an immediate notification to simulate family notification
  // In a real app, this would be a push notification sent via server
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "✅ Medicamento tomado",
      body: `${medicationName} foi tomado às ${time}`,
      data: { type: "family_notification" },
      sound: "default",
    },
    trigger: null, // immediate
  });
}
