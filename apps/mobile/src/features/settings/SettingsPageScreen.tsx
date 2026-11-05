import { BirthdayPage, ChangeEmailPage, SignInMethodsPage } from "./pages/AccessPages";
import { AppText } from "@/components/ui/AppText";
import { SettingsPage } from "./components/SettingsList";
import {
  DeleteAccountPage,
  DevicesPage,
  EndSpacePage,
  ExportPage,
  ProfilePage,
} from "./pages/AccountPages";
import { ChatSettingsPage, HomeLayoutPage, LocationPage, MotionPage } from "./pages/ControlPages";
import { AboutPage, OfflinePage, PrivacyPage, TimePage } from "./pages/InfoPages";
import { WidgetGalleryPage } from "./pages/CharacterWidgets";
import { StatesBoardPage } from "./pages/Gallery";
import { HomeWidgetsPage } from "./pages/HomeWidgetsPage";
import { EmailLabPage, NotificationLabPage } from "./pages/Labs";
import {
  AppearancePage,
  NicknamesPage,
  NotificationsPage,
  PreviewsPage,
  QuietHoursPage,
  RemindersPage,
} from "./pages/PreferencePages";

/** SET-02 to SET-16 and the labs (NOTIF-02, EMAIL-01), by the page in the route. */
export function SettingsPageScreen({ page }: { page: string }) {
  switch (page) {
    case "home":
      return <HomeLayoutPage />;
    case "chat":
      return <ChatSettingsPage />;
    case "location":
      return <LocationPage />;
    case "motion":
      return <MotionPage />;
    case "profile":
      return <ProfilePage />;
    case "devices":
      return <DevicesPage />;
    case "sign-in-methods":
      return <SignInMethodsPage />;
    case "email":
      return <ChangeEmailPage />;
    case "birthday":
      return <BirthdayPage />;
    case "export":
      return <ExportPage />;
    case "end-space":
      return <EndSpacePage />;
    case "delete-account":
      return <DeleteAccountPage />;
    case "appearance":
      return <AppearancePage />;
    case "nicknames":
      return <NicknamesPage />;
    case "notifications":
      return <NotificationsPage />;
    case "quiet-hours":
      return <QuietHoursPage />;
    case "previews":
      return <PreviewsPage />;
    case "reminders":
      return <RemindersPage />;
    case "privacy":
      return <PrivacyPage />;
    case "time":
      return <TimePage />;
    case "offline":
      return <OfflinePage />;
    case "about":
      return <AboutPage />;
    case "notification-lab":
      return <NotificationLabPage />;
    case "widgets":
      return <WidgetGalleryPage />;
    case "home-widgets":
      return <HomeWidgetsPage />;
    case "states":
      return <StatesBoardPage />;
    case "email-lab":
      return <EmailLabPage />;
    default:
      return (
        <SettingsPage title="Settings">
          <AppText variant="callout" color="textSecondary">
            This page isn't here.
          </AppText>
        </SettingsPage>
      );
  }
}
