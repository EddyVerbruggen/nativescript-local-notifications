import * as utils from "tns-core-modules/utils/utils";
import {
  LocalNotificationsCommon,
  LocalNotificationsApi,
  ReceivedNotification,
  ScheduleOptions,
  ScheduleInterval, SchedulePriority
} from "./local-notifications-common";

declare const android, com: any;

export class LocalNotificationsImpl extends LocalNotificationsCommon implements LocalNotificationsApi {

  private static getInterval(interval: ScheduleInterval): number {
    if (!interval) {
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
    } else if (interval === "quarter") {
      return android.app.AlarmManager.INTERVAL_HOUR * 2190;
    } else if (interval === "year") {
      return android.app.AlarmManager.INTERVAL_DAY * 365; // same here
    } else {
      return 0;
    }
  }

  private static getPriority(priority: SchedulePriority): number {
    if (!priority) {
      return 0; // default
    } else if (priority === "min") {
      return -2;
    } else if (priority === "low") {
      return -1;
    } else if (priority === "high") {
      return 1;
    } else if (priority === "max") {
      return 2;
    } else {
      return 0; // default
    }
  }

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
    options.largeIconDrawable = null;
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
        const sharedPreferences = LocalNotificationsImpl.getSharedPreferences();
        const keys = sharedPreferences.getAll().keySet();
        const iterator = keys.iterator();

        while (iterator.hasNext()) {
          const cancelMe = iterator.next();
          console.log(">> canceling " + cancelMe);
          LocalNotificationsImpl.cancelById(cancelMe);
        }

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

  schedule(scheduleOptions: ScheduleOptions[]): Promise<any> {
    return new Promise((resolve, reject) => {
      try {
        const context = utils.ad.getApplicationContext();
        const resources = context.getResources();

        for (var n in scheduleOptions) {
          const options = LocalNotificationsImpl.merge(scheduleOptions[n], LocalNotificationsImpl.defaults);

          // small icon
          if (options.smallIcon) {
            if (options.smallIcon.indexOf(utils.RESOURCE_PREFIX) === 0) {
              options.smallIcon = resources.getIdentifier(options.smallIcon.substr(utils.RESOURCE_PREFIX.length), 'drawable', context.getApplicationInfo().packageName);
            }
          }
          if (!options.smallIcon) {
            // look for an icon named ic_stat_notify.png
            options.smallIcon = resources.getIdentifier("ic_stat_notify", "drawable", context.getApplicationInfo().packageName);
          }
          if (!options.smallIcon) {
            // resort to the regular launcher icon
            options.smallIcon = context.getApplicationInfo().icon;
          }

          // large icon
          if (options.largeIcon) {
            if (options.largeIcon.indexOf(utils.RESOURCE_PREFIX) === 0) {
              options.largeIcon = resources.getIdentifier(options.largeIcon.substr(utils.RESOURCE_PREFIX.length), 'drawable', context.getApplicationInfo().packageName);
            }
          }
          if (!options.largeIcon) {
            // look for an icon named ic_notify.png
            options.largeIcon = resources.getIdentifier("ic_notify", "drawable", context.getApplicationInfo().packageName);
          }
          if (!options.largeIcon) {
            // resort to the regular launcher icon
            options.largeIcon = context.getApplicationInfo().icon;
          }
          if (options.largeIcon) {
            // options.largeIconDrawable = android.support.v4.content.ContextCompat.getDrawable(context, options.largeIcon).getBitmap();
            options.largeIconDrawable = android.graphics.BitmapFactory.decodeResource(context.getResources(), options.largeIcon);
          }

          options.atTime = options.at ? options.at.getTime() : new Date().getTime();

          // custom sounds do not currently work, so using the default in all cases except when set to null
          const useDefaultSound = options.sound !== null;

          /*
          switch (options.sound) {
            case null:
            case false:
              options.sound = null;
              break;
            case undefined:
            case "default":
              options.sound = android.media.RingtoneManager.getDefaultUri(android.media.RingtoneManager.TYPE_NOTIFICATION).toString();
              break;
            default:
              options.sound = null;
            //   const res = context.getResources();
            //   const identifier = res.getIdentifier(options.sound, "raw", context.getApplicationInfo().packageName);
            //   options.sound = android.net.Uri.parse("android.resource://" + context.getApplicationInfo().packageName + identifier);
          }
          */

          // TODO best move this to native lib so we can reuse it in the restorereceiver (dupe for now)
          const builder = new android.support.v4.app.NotificationCompat.Builder(context)
              .setDefaults(0) // IIRC this is deprecated, can prolly remove it without trouble
              .setContentTitle(options.title)
              .setContentText(options.body)
              .setSmallIcon(options.smallIcon)
              .setLargeIcon(options.largeIconDrawable)
              .setAutoCancel(true) // removes the notification from the statusbar once tapped
              // .setSound(options.sound)
              .setNumber(options.badge)
              .setOngoing(options.ongoing)
              .setTicker(options.ticker || options.body)
              .setPriority(LocalNotificationsImpl.getPriority(options.priority));

          if (android.os.Build.VERSION.SDK_INT >= 26 && builder.setChannelId) {
            const channelId = "myChannelId"; // package scoped, so no need to add it ourselves
            const notificationManager = context.getSystemService(android.content.Context.NOTIFICATION_SERVICE);
            if (notificationManager && notificationManager.getNotificationChannel) {
              let notificationChannel = notificationManager.getNotificationChannel(channelId);
              if (notificationChannel === null) {
                // for 'importance' (expose one day as plugin property), see https://developer.android.com/reference/android/app/NotificationManager.html
                notificationChannel = new android.app.NotificationChannel(channelId, options.channel, android.app.NotificationManager.IMPORTANCE_HIGH);
                notificationManager.createNotificationChannel(notificationChannel);
              }
              builder.setChannelId(channelId);
            }
          }

          if (options.groupedMessages !== null && Array.isArray(options.groupedMessages)) {
            const inboxStyle = new android.support.v4.app.NotificationCompat.InboxStyle();
            const events = options.groupedMessages;
            (events.length > 5) ? events.splice(0, events.length - 5) : 0;

            // Sets a title for the Inbox in expanded layout
            inboxStyle.setBigContentTitle(options.title);
            for (var i = 0; i < events.length; i++) {
              inboxStyle.addLine(events[i]);
            }
            options.groupSummary !== null ? inboxStyle.setSummaryText(options.groupSummary) : 0;
            builder
                .setGroup(options.group)
                .setStyle(inboxStyle)
          }

          // add the intent that handles the event when the notification is clicked (which should launch the app)
          const reqCode = new java.util.Random().nextInt();
          const clickIntent = new android.content.Intent(context, com.telerik.localnotifications.NotificationClickedActivity.class)
              .putExtra("pushBundle", JSON.stringify(options))
              .setFlags(android.content.Intent.FLAG_ACTIVITY_NO_HISTORY);

          const pendingContentIntent = android.app.PendingIntent.getActivity(context, reqCode, clickIntent, android.app.PendingIntent.FLAG_UPDATE_CURRENT);
          builder.setContentIntent(pendingContentIntent);

          // set big text style (adds an 'expansion arrow' to the notification)
          if (options.bigTextStyle) {
            const bigTextStyle = new android.support.v4.app.NotificationCompat.BigTextStyle();
            bigTextStyle.setBigContentTitle(options.title);
            bigTextStyle.bigText(options.body);
            builder.setStyle(bigTextStyle);
          }

          const notification = builder.build();

          if (useDefaultSound) {
            notification.defaults |= android.app.Notification.DEFAULT_SOUND;
          }

          // add the intent which schedules the notification
          const notificationIntent = new android.content.Intent(context, com.telerik.localnotifications.NotificationPublisher.class)
              .setAction("" + options.id)
              .putExtra(com.telerik.localnotifications.NotificationPublisher.NOTIFICATION_ID, options.id)
              .putExtra(com.telerik.localnotifications.NotificationPublisher.NOTIFICATION, notification);

          const pendingIntent = android.app.PendingIntent.getBroadcast(context, 0, notificationIntent, android.app.PendingIntent.FLAG_CANCEL_CURRENT);

          // configure when we'll show the event
          const alarmManager = utils.ad.getApplicationContext().getSystemService(android.content.Context.ALARM_SERVICE);

          const repeatInterval = LocalNotificationsImpl.getInterval(options.interval);
          options.repeatInterval = repeatInterval; // used when restoring the notification after a reboot

          if (repeatInterval > 0) {
            alarmManager.setRepeating(android.app.AlarmManager.RTC_WAKEUP, options.atTime, repeatInterval, pendingIntent);
          } else {
            if (options.at) {
              alarmManager.set(android.app.AlarmManager.RTC_WAKEUP, options.atTime, pendingIntent);
            } else {
              const notiManager = context.getSystemService(android.content.Context.NOTIFICATION_SERVICE);
              notiManager.notify(options.id, notification);
            }
          }
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
