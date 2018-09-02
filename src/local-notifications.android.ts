import * as utils from "tns-core-modules/utils/utils";
import * as app from "tns-core-modules/application";
import {
  LocalNotificationsCommon,
  LocalNotificationsApi,
  ReceivedNotification,
  ScheduleOptions,
  ScheduleInterval
} from "./local-notifications-common";

declare const android, com: any;

(() => {
  const registerLifecycleEvents = () => {
    com.telerik.localnotifications.LifecycleCallbacks.registerCallbacks(app.android.nativeApp);
  };

  // Hook on the application events
  if (app.android.nativeApp) {
    registerLifecycleEvents();
  } else {
    app.on(app.launchEvent, registerLifecycleEvents);
  }
})();

export class LocalNotificationsImpl extends LocalNotificationsCommon implements LocalNotificationsApi {

  private static IS_GTE_LOLLIPOP: boolean = android.os.Build.VERSION.SDK_INT >= 21;

  private static getInterval(interval: ScheduleInterval): number {
    if (interval === undefined) {
      return 0;
    } else if (interval === "second") {
      return 1000; // it's in ms
    } else if (interval === "minute") {
      return android.app.AlarmManager.INTERVAL_FIFTEEN_MINUTES / 15;
    } else if (interval === "hour") {
      return android.app.AlarmManager.INTERVAL_HOUR;
    } else if (interval === "day") {
      return android.app.AlarmManager.INTERVAL_DAY;
    } else if (interval === "week") {
      return android.app.AlarmManager.INTERVAL_DAY * 7;
    } else if (interval === "month") {
      return android.app.AlarmManager.INTERVAL_DAY * 31; // well that's almost accurate
    } else if (interval === "year") {
      return android.app.AlarmManager.INTERVAL_DAY * 365; // same here
    } else {
      return 0;
    }
  }

  private static getIcon(context: any /* android.content.Context */, resources: any, iconLocation?: string): string {
    const packageName: string = context.getApplicationInfo().packageName;
    return iconLocation
        && iconLocation.indexOf(utils.RESOURCE_PREFIX) === 0
        && resources.getIdentifier(iconLocation.substr(utils.RESOURCE_PREFIX.length), "drawable", packageName)
        || (LocalNotificationsImpl.IS_GTE_LOLLIPOP && resources.getIdentifier("ic_stat_notify_silhouette", "drawable", packageName))
        || resources.getIdentifier("ic_stat_notify", "drawable", packageName)
        || context.getApplicationInfo().icon;
  };

  private static cancelById(id): void {
    const context = utils.ad.getApplicationContext();
    const notificationIntent = new android.content.Intent(context, com.telerik.localnotifications.NotificationPublisher.class).setAction("" + id);
    const pendingIntent = android.app.PendingIntent.getBroadcast(context, 0, notificationIntent, 0);
    const alarmManager = context.getSystemService(android.content.Context.ALARM_SERVICE);
    alarmManager.cancel(pendingIntent);
    const notificationManager = context.getSystemService(android.content.Context.NOTIFICATION_SERVICE);
    notificationManager.cancel(id);
    LocalNotificationsImpl.unpersist(id);
  };

  /**
   * Persist notification info to the Android Shared Preferences.
   * This way we can later retrieve it to cancel it, or restore upon reboot.
   */
  private static persist(options): void {
    const sharedPreferences = LocalNotificationsImpl.getSharedPreferences();
    const sharedPreferencesEditor = sharedPreferences.edit();
    sharedPreferencesEditor.putString("" + options.id, JSON.stringify(options));
    sharedPreferencesEditor.apply();
  };

  private static unpersist(id): void {
    const sharedPreferences = LocalNotificationsImpl.getSharedPreferences();
    const sharedPreferencesEditor = sharedPreferences.edit();
    sharedPreferencesEditor.remove("" + id);
    sharedPreferencesEditor.commit();
  };

  private static getSharedPreferences(): any {
    const PREF_KEY = "LocalNotificationsPlugin";
    return utils.ad.getApplicationContext().getSharedPreferences(PREF_KEY, android.content.Context.MODE_PRIVATE);
  };

  hasPermission(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      try {
        // nothing to do on this platform
        resolve(true);
      } catch (ex) {
        console.log("Error in LocalNotifications.hasPermission: " + ex);
        reject(ex);
      }
    });
  }

  requestPermission(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      try {
        // nothing to do on this platform
        resolve(true);
      } catch (ex) {
        console.log("Error in LocalNotifications.requestPermission: " + ex);
        reject(ex);
      }
    });
  }

  addOnMessageReceivedCallback(onReceived: (data: ReceivedNotification) => void): Promise<any> {
    return new Promise((resolve, reject) => {
      try {
        // note that this is ONLY triggered when the user clicked the notification in the statusbar
        com.telerik.localnotifications.LocalNotificationsPlugin.setOnMessageReceivedCallback(
            new com.telerik.localnotifications.LocalNotificationsPluginListener({
              success: notification => {
                onReceived(JSON.parse(notification));
              }
            })
        );
        resolve();
      } catch (ex) {
        console.log("Error in LocalNotifications.addOnMessageReceivedCallback: " + ex);
        reject(ex);
      }
    });
  }

  cancel(id: number): Promise<boolean> {
    return new Promise((resolve, reject) => {
      try {
        LocalNotificationsImpl.cancelById(id);
        resolve(true);
      } catch (ex) {
        console.log("Error in LocalNotifications.cancel: " + ex);
        reject(ex);
      }
    });
  }

  cancelAll(): Promise<any> {
    return new Promise((resolve, reject) => {
      try {
        const context = utils.ad.getApplicationContext();

        // if (android.os.Build.VERSION.SDK_INT >= 26) {
        //   const notificationManager = context.getSystemService(android.content.Context.NOTIFICATION_SERVICE);
        //   console.log(">> >= 26, getActiveNotifications: " + notificationManager.getActiveNotifications());
        // } else {
        //   console.log(">> < 26, StatusBarNotification[0]: " + new android.service.notification.StatusBarNotification[0]);
        // }

        const sharedPreferences = LocalNotificationsImpl.getSharedPreferences();
        const keys = sharedPreferences.getAll().keySet();
        const iterator = keys.iterator();

        while (iterator.hasNext()) {
          const cancelMe = iterator.next();
          LocalNotificationsImpl.cancelById(cancelMe);
        }

        android.support.v4.app.NotificationManagerCompat.from(context).cancelAll();
        resolve();
      } catch (ex) {
        console.log("Error in LocalNotifications.cancelAll: " + ex);
        reject(ex);
      }
    });
  }

  getScheduledIds(): Promise<any> {
    return new Promise((resolve, reject) => {
      try {
        const scheduledIds = [];

        const sharedPreferences = LocalNotificationsImpl.getSharedPreferences();
        const keys = sharedPreferences.getAll().keySet();

        const iterator = keys.iterator();
        while (iterator.hasNext()) {
          scheduledIds.push(iterator.next());
        }

        resolve(scheduledIds);
      } catch (ex) {
        console.log("Error in LocalNotifications.getScheduledIds: " + ex);
        reject(ex);
      }
    });
  }

  schedule(scheduleOptions: ScheduleOptions[]): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const context = utils.ad.getApplicationContext();
        const resources = context.getResources();

        for (let n in scheduleOptions) {
          const options = LocalNotificationsImpl.merge(scheduleOptions[n], LocalNotificationsImpl.defaults);

          options.icon = LocalNotificationsImpl.getIcon(
              context,
              resources,
              LocalNotificationsImpl.IS_GTE_LOLLIPOP && options.silhouetteIcon || options.icon);

          options.atTime = options.at ? options.at.getTime() : new Date().getTime();

          // used when restoring the notification after a reboot
          options.repeatInterval = LocalNotificationsImpl.getInterval(options.interval);

          if (options.color) {
            options.color = options.color.android;
          }

          com.telerik.localnotifications.LocalNotificationsPlugin.scheduleNotification(
              new org.json.JSONObject(JSON.stringify(options)),
              context);

          LocalNotificationsImpl.persist(options);
        }

        resolve();
      } catch (ex) {
        console.log("Error in LocalNotifications.schedule: " + ex);
        reject(ex);
      }
    });
  }
}

export const LocalNotifications = new LocalNotificationsImpl();
