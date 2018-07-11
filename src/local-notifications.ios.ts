import * as utils from "tns-core-modules/utils/utils";
import {
  LocalNotificationsApi,
  LocalNotificationsCommon,
  ReceivedNotification,
  ScheduleInterval,
  ScheduleOptions
} from "./local-notifications-common";

declare const Notification, NotificationManager: any;

export class LocalNotificationsImpl extends LocalNotificationsCommon implements LocalNotificationsApi {

  private static didRegisterUserNotificationSettingsObserver: any;
  private notificationReceivedObserver: any;
  private pendingReceivedNotifications: Array<ReceivedNotification> = [];
  private receivedNotificationCallback: (data: ReceivedNotification) => void;
  private notificationHandler: any;
  private notificationManager: any;

  constructor() {
    super();
    // grab 'em here, store 'em in JS, and give them to the callback when addOnMessageReceivedCallback is wired
    this.notificationReceivedObserver = LocalNotificationsImpl.addObserver("notificationReceived", result => {
      const notificationDetails = JSON.parse(result.userInfo.objectForKey("message"));
      if (this.receivedNotificationCallback) {
        this.receivedNotificationCallback(notificationDetails);
      } else {
        this.pendingReceivedNotifications.push(notificationDetails);
      }
    });

    // TODO these are from out own native lib.. would be nice if we can remove it entirely
    this.notificationHandler = Notification.new();
    this.notificationManager = NotificationManager.new();
  }

  private static hasPermission(): boolean {
    const settings = UIApplication.sharedApplication.currentUserNotificationSettings;
    const types = UIUserNotificationType.Alert | UIUserNotificationType.Badge | UIUserNotificationType.Sound;
    return (settings.types & types) > 0;
  }

  private static addObserver(eventName, callback): any {
    return NSNotificationCenter.defaultCenter.addObserverForNameObjectQueueUsingBlock(eventName, null, NSOperationQueue.mainQueue, callback);
  };

  private static getInterval(interval: ScheduleInterval): NSCalendarUnit {
    if (!interval) {
      return NSCalendarUnit.CalendarUnitEra;
    } else if (interval === "second") {
      return NSCalendarUnit.CalendarUnitSecond;
    } else if (interval === "minute") {
      return NSCalendarUnit.CalendarUnitMinute;
    } else if (interval === "hour") {
      return NSCalendarUnit.CalendarUnitHour;
    } else if (interval === "day") {
      return NSCalendarUnit.CalendarUnitDay;
    } else if (interval === "week") {
      return NSCalendarUnit.CalendarUnitWeekOfYear;
    } else if (interval === "month") {
      return NSCalendarUnit.CalendarUnitMonth;
    } else if (interval === "quarter") {
      return NSCalendarUnit.CalendarUnitQuarter;
    } else if (interval === "year") {
      return NSCalendarUnit.CalendarUnitYear;
    } else {
      return NSCalendarUnit.CalendarUnitEra;
    }
  };

  private static schedulePendingNotifications(pending: ScheduleOptions[]): void {
    for (const n in pending) {
      const options = LocalNotificationsImpl.merge(pending[n], LocalNotificationsImpl.defaults);

      const notification = UILocalNotification.new();
      notification.fireDate = options.at ? options.at : new Date();
      notification.alertTitle = options.title;
      notification.alertBody = options.body;

      notification.timeZone = utils.ios.getter(NSTimeZone, NSTimeZone.defaultTimeZone);
      notification.applicationIconBadgeNumber = options.badge;

      // these are sent back to the plugin when a notification is received
      const userInfoDict = NSMutableDictionary.alloc().initWithCapacity(4);
      userInfoDict.setObjectForKey(options.id, "id");
      userInfoDict.setObjectForKey(options.title, "title");
      userInfoDict.setObjectForKey(options.body, "body");
      userInfoDict.setObjectForKey(options.interval, "interval");
      notification.userInfo = userInfoDict;

      switch (options.sound) {
        case null:
        case false:
          break;
        case undefined:
        case "default":
          notification.soundName = UILocalNotificationDefaultSoundName;
          break;
        default:
          notification.soundName = options.sound;
          break;
      }

      if (options.interval !== 0) {
        notification.repeatInterval = LocalNotificationsImpl.getInterval(options.interval);
      }

      // TODO add these after v1
      // notification.soundName = custom..;
      // notification.resumeApplicationInBackground = true;

      UIApplication.sharedApplication.scheduleLocalNotification(notification);
    }
  }

  hasPermission(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      try {
        resolve(LocalNotificationsImpl.hasPermission());
      } catch (ex) {
        console.log("Error in LocalNotifications.hasPermission: " + ex);
        reject(ex);
      }
    });
  }

  requestPermission(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      LocalNotificationsImpl.didRegisterUserNotificationSettingsObserver = LocalNotificationsImpl.addObserver("didRegisterUserNotificationSettings", result => {
        NSNotificationCenter.defaultCenter.removeObserver(LocalNotificationsImpl.didRegisterUserNotificationSettingsObserver);
        LocalNotificationsImpl.didRegisterUserNotificationSettingsObserver = undefined;
        const granted = result.userInfo.objectForKey("message");
        resolve(granted != "false");
      });

      const types = UIApplication.sharedApplication.currentUserNotificationSettings.types | UIUserNotificationType.Alert | UIUserNotificationType.Badge | UIUserNotificationType.Sound;
      const settings = UIUserNotificationSettings.settingsForTypesCategories(types, null);
      UIApplication.sharedApplication.registerUserNotificationSettings(settings);
    });
  }

  addOnMessageReceivedCallback(onReceived: (data: ReceivedNotification) => void): Promise<any> {
    return new Promise((resolve, reject) => {
      try {
        this.receivedNotificationCallback = onReceived;
        for (let p in this.pendingReceivedNotifications) {
          onReceived(this.pendingReceivedNotifications[p]);
        }
        this.pendingReceivedNotifications = [];

        resolve(true);
      } catch (ex) {
        console.log("Error in LocalNotifications.addOnMessageReceivedCallback: " + ex);
        reject(ex);
      }
    });
  }

  cancel(id: number): Promise<boolean> {
    return new Promise((resolve, reject) => {
      try {
        const scheduled = UIApplication.sharedApplication.scheduledLocalNotifications;
        for (let i = 0, l = scheduled.count; i < l; i++) {
          const noti = scheduled.objectAtIndex(i);
          if (id == noti.userInfo.valueForKey("id")) {
            UIApplication.sharedApplication.cancelLocalNotification(noti);
            console.log("Canceled");
            resolve(true);
            return;
          }
        }
        console.log("Not canceled"); // just checking if this runs regardless (TODO remove after test)
        resolve(false);
      } catch (ex) {
        console.log("Error in LocalNotifications.cancel: " + ex);
        reject(ex);
      }
    });
  }

  cancelAll(): Promise<any> {
    return new Promise((resolve, reject) => {
      try {
        UIApplication.sharedApplication.cancelAllLocalNotifications();
        UIApplication.sharedApplication.applicationIconBadgeNumber = 0;
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
        const scheduled = UIApplication.sharedApplication.scheduledLocalNotifications;
        for (let i = 0, l = scheduled.count; i < l; i++) {
          scheduledIds.push(scheduled.objectAtIndex(i).userInfo.valueForKey("id"));
        }
        resolve(scheduledIds);
      } catch (ex) {
        console.log("Error in LocalNotifications.getScheduledIds: " + ex);
        reject(ex);
      }
    });
  }

  schedule(options: ScheduleOptions[]): Promise<any> {
    return new Promise((resolve, reject) => {
      try {
        if (!LocalNotificationsImpl.hasPermission()) {
          this.requestPermission().then(granted => granted && LocalNotificationsImpl.schedulePendingNotifications(options));
        } else {
          LocalNotificationsImpl.schedulePendingNotifications(options);
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
