import { Color } from "tns-core-modules/color/color";
import * as utils from "tns-core-modules/utils/utils";
import * as imageSource from "tns-core-modules/image-source";
import {
  LocalNotificationsCommon,
  LocalNotificationsApi,
  ReceivedNotification,
  ScheduleOptions,
  ScheduleInterval,
} from "./local-notifications-common";

declare const android, com: any;

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
    } else if (interval === "quarter") {
      return android.app.AlarmManager.INTERVAL_HOUR * 2190;
    } else if (interval === "year") {
      return android.app.AlarmManager.INTERVAL_DAY * 365; // same here
    } else {
      return 0;
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

  private static getIcon(context: any,
    resources: any,
    iconLocation: string,
    defaultIcon: string,
    asDrawable: boolean = false,
  ): string {
    const packageName: string = context.getApplicationInfo().packageName;

    const icon = iconLocation
      && iconLocation.indexOf(utils.RESOURCE_PREFIX) === 0
      && resources.getIdentifier(iconLocation.substr(utils.RESOURCE_PREFIX.length), "drawable", packageName)
      || resources.getIdentifier(defaultIcon, "drawable", packageName)
      || context.getApplicationInfo().icon;

    return asDrawable ? (icon ? android.graphics.BitmapFactory.decodeResource(resources, icon) : null) : icon;
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
    return new Promise(async (resolve, reject) => {
      try {
        const context = utils.ad.getApplicationContext();
        const resources = context.getResources();

        for (var n in scheduleOptions) {
          const options = LocalNotificationsImpl.merge(scheduleOptions[n], LocalNotificationsImpl.defaults);

          if (LocalNotificationsImpl.IS_GTE_LOLLIPOP) {
            options.smallIcon = LocalNotificationsImpl.getIcon(context, resources, options.smallSilhouetteIcon, "ic_stat_notify_silhouette");
            options.largeIconDrawable = LocalNotificationsImpl.getIcon(context, resources, options.largeSilhouetteIcon, "ic_notify_silhouette", true);
          } else {
            options.smallIcon = LocalNotificationsImpl.getIcon(context, resources, options.smallIcon, "ic_stat_notify");
            options.largeIconDrawable = LocalNotificationsImpl.getIcon(context, resources, options.largeIcon, "ic_notify", true);
          }

          options.atTime = options.at ? options.at.getTime() : new Date().getTime();
          options.color = options.color.android;

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
              .setColor(options.color)
              .setOngoing(options.ongoing)
              .setTicker(options.ticker || options.body)
              .setPriority(options.forceShowWhenInForeground ? 1 : 0); // 0 = default, 1 = high

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

          if ([
            options.groupedMessages,
            options.bigTextStyle,
            options.image
          ].filter(Boolean).length > 1) {
            console.warn('Multiple notification styles found. Only one will be used.');
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
          } else if (options.bigTextStyle) {
            const bigTextStyle = new android.support.v4.app.NotificationCompat.BigTextStyle();

            bigTextStyle.bigText(options.body);
            bigTextStyle.setBigContentTitle(options.title);
            builder.setStyle(bigTextStyle);
          } else if (options.image) {
            try {
              const bigPictureStyle = new android.support.v4.app.NotificationCompat.BigPictureStyle();

              bigPictureStyle.bigPicture((await imageSource.fromUrl(options.image)).android);
              bigPictureStyle.setBigContentTitle(options.title);
              builder.setStyle(bigPictureStyle);
            } catch(err) {
              // Just create a normal notification instead...
            }
          }

          // Add the intent that handles the event when the notification is clicked (which should launch the app):

          const reqCode = new java.util.Random().nextInt();
          const clickIntent = new android.content.Intent(context, com.telerik.localnotifications.NotificationClickedActivity.class)
              .putExtra("pushBundle", JSON.stringify(options))
              .setFlags(android.content.Intent.FLAG_ACTIVITY_NO_HISTORY);

          const pendingContentIntent = android.app.PendingIntent.getActivity(context, reqCode, clickIntent, android.app.PendingIntent.FLAG_UPDATE_CURRENT);
          builder.setContentIntent(pendingContentIntent);

          const notification = builder.build();

          if (useDefaultSound) {
            notification.defaults |= android.app.Notification.DEFAULT_SOUND;
          }

          // options.repeatInterval is used when restoring the notification after a reboot:
          const repeatInterval = options.repeatInterval = LocalNotificationsImpl.getInterval(options.interval);

          if (repeatInterval > 0 || options.at) {
            // Create the intent that schedules the notification:

            const notificationIntent = new android.content.Intent(context, com.telerik.localnotifications.NotificationPublisher.class)
                .setAction("" + options.id)
                .putExtra(com.telerik.localnotifications.NotificationPublisher.NOTIFICATION_ID, options.id)
                .putExtra(com.telerik.localnotifications.NotificationPublisher.NOTIFICATION, notification);

            /*

            Hello there! If you are taking a look at this, chances are you tried to create a delayed/recurrent
            notification with an image and got a TransactionTooLargeException.

            Well, as you can see, in order to create those, we are creating a notification instance, adding that to an
            Intent and resolving it using an Alarm when the time comes. The problem with that is that the Bitmap
            of your image is also inside that notification object, which is inside the Intent... See where I'm going?

            So, what's wrong? Well, you can't put a big Bitmap inside an Intent, so in order to fix that you should add
            just the options object to the intent and create the notification on the native side, in
            NotificationPublisher.java, which should end up looking similar to NotificationrestoreReceiver.java.

            Yes... My condolences. Don't look at me like that...

            */

            const pendingIntent = android.app.PendingIntent.getBroadcast(context, 0, notificationIntent, android.app.PendingIntent.FLAG_CANCEL_CURRENT);

            // Configure when we'll show the event:
            const alarmManager = utils.ad.getApplicationContext().getSystemService(android.content.Context.ALARM_SERVICE);

            if (repeatInterval > 0) {
              alarmManager.setRepeating(android.app.AlarmManager.RTC_WAKEUP, options.atTime, repeatInterval, pendingIntent);
            } else {
              alarmManager.set(android.app.AlarmManager.RTC_WAKEUP, options.atTime, pendingIntent);
            }
          } else {
            context.getSystemService(android.content.Context.NOTIFICATION_SERVICE).notify(options.id, notification);
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
