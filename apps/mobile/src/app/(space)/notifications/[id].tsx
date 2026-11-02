import { useLocalSearchParams } from "expo-router";
import { NotificationDetailScreen } from "@/features/notifications/NotificationDetailScreen";

/** NOTIF-01 · One notification's details */
export default function NotificationDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <NotificationDetailScreen id={id} />;
}
