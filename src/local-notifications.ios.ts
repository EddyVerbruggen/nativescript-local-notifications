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
  notificationOptions: Map<string, ScheduleOptions> = new Map();

  private delegate: UNUserNotificationCenterDelegateImpl;

  constructor() {
    super();
    // TODO make sure that if we require this in both app/main.js and main-view-model.js, this only runs once
    console.log("LocalNotifications constructor @ " + new Date().getTime());

    if (LocalNotificationsImpl.isUNUserNotificationCenterAvailable()) {
      // TODO if the delegate is only for getting the msg details, consider moving it to the native lib (so no wiring is required in app.js)
      this.delegate = UNUserNotificationCenterDelegateImpl.initWithOwner(new WeakRef(this));
      UNUserNotificationCenter.currentNotificationCenter().delegate = this.delegate;

    } else {
      // grab 'em here, store 'em in JS, and give them to the callback when addOnMessageReceivedCallback is wired
      this.notificationReceivedObserver = LocalNotificationsImpl.addObserver("notificationReceived", result => {
        const notificationDetails = JSON.parse(result.userInfo.objectForKey("message"));
        this.addOrProcessNotification(notificationDetails);
      });

      this.notificationHandler = Notification.new();
      this.notificationManager = NotificationManager.new();
    }
  }

  static isUNUserNotificationCenterAvailable(): boolean {
    try {
      // available since iOS 10
      return !!UNUserNotificationCenter;
    } catch (ignore) {
      return false;
    }
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
    if (LocalNotificationsImpl.isUNUserNotificationCenterAvailable()) {
      LocalNotificationsImpl.schedulePendingNotificationsNew(pending);
    } else {
      LocalNotificationsImpl.schedulePendingNotificationsLegacy(pending);
    }
  }

  private static schedulePendingNotificationsNew(pending: ScheduleOptions[]): void {
    for (const n in pending) {
      const options: ScheduleOptions = LocalNotificationsImpl.merge(pending[n], LocalNotificationsImpl.defaults);

      // Notification content
      const content = UNMutableNotificationContent.new();
      content.title = options.title;
      content.subtitle = options.subtitle;
      content.body = options.body;
      if (options.sound === undefined || options.sound === "default") {
        content.sound = UNNotificationSound.defaultSound();
      }
      content.badge = options.badge;

      const userInfoDict = new NSMutableDictionary({capacity: 1}); // .alloc().initWithCapacity(1);
      userInfoDict.setObjectForKey(options.forceShowWhenInForeground, "forceShowWhenInForeground");
      content.userInfo = userInfoDict;

      // content.setValueForKey(options.forceShowWhenInForeground, "shouldAlwaysAlertWhileAppIsForeground");

      // Notification trigger and repeat
      const trigger_at = options.at ? options.at : new Date();

      // TODO
      // const repeats = options.repeat !== 0;
      const repeats = options.interval !== undefined;
      console.log(">> repeats: " + repeats);

      let trigger;
      if (options.trigger === "timeInterval") { // TODO see https://github.com/katzer/cordova-plugin-local-notifications/blob/6d1b27f1e9d8e2198fd1ea6e9032419295690c47/www/local-notification.js#L706
        // trigger = UNTimeIntervalNotificationTrigger.triggerWithTimeIntervalRepeats(trigger_at, repeats);
      } else {
        const FormattedDate = NSDateComponents.new();
        FormattedDate.day = trigger_at.getUTCDate();
        FormattedDate.month = trigger_at.getUTCMonth() + 1;
        FormattedDate.year = trigger_at.getUTCFullYear();
        FormattedDate.minute = trigger_at.getMinutes();
        FormattedDate.hour = trigger_at.getHours();
        FormattedDate.second = trigger_at.getSeconds();
        trigger = UNCalendarNotificationTrigger.triggerWithDateMatchingComponentsRepeats(FormattedDate, repeats);
        console.log(">> trigger: " + trigger);
      }

      // actions
      if (options.actions) {
        let categoryIdentifier = "CATEGORY";
        const actions: Array<UNNotificationAction> = [];

        options.actions.forEach(action => {
          categoryIdentifier += ("_" + action.id);

          let notificationActionOptions: UNNotificationActionOptions = UNNotificationActionOptionNone;

          if (action.launch) {
            notificationActionOptions = UNNotificationActionOptions.Foreground;
          }

          if (action.type === "input") {
            actions.push(UNTextInputNotificationAction.actionWithIdentifierTitleOptionsTextInputButtonTitleTextInputPlaceholder(
                "" + action.id,
                action.title,
                notificationActionOptions,
                action.submitLabel || "Submit",
                action.placeholder));

          } else if (action.type === "button") {
            actions.push(UNNotificationAction.actionWithIdentifierTitleOptions(
                "" + action.id,
                action.title,
                notificationActionOptions));

          } else {
            console.log("Unsupported action type: " + action.type);
          }

        });
        const notificationCategory = UNNotificationCategory.categoryWithIdentifierActionsIntentIdentifiersOptions(
            categoryIdentifier,
            <any>actions,
            <any>[],
            UNNotificationCategoryOptions.CustomDismissAction);

        content.categoryIdentifier = categoryIdentifier;

        UNUserNotificationCenter.currentNotificationCenter().getNotificationCategoriesWithCompletionHandler((categories: NSSet<UNNotificationCategory>) => {
          console.log({categories});
          UNUserNotificationCenter.currentNotificationCenter().setNotificationCategories(categories.setByAddingObject(notificationCategory));
          // UNUserNotificationCenter.currentNotificationCenter().setNotificationCategories(NSSet.setWithObject(notificationCategory));
        });
      }

      // Notification Request
      const request = UNNotificationRequest.requestWithIdentifierContentTrigger("" + options.id, content, trigger);

      // Add the request
      UNUserNotificationCenter.currentNotificationCenter().addNotificationRequestWithCompletionHandler(request, (error: NSError) => {
        if (error) {
          console.log("Error scheduling notification (id " + options.id + "): " + error.localizedDescription);
        }
      });
    }
  }

  private static schedulePendingNotificationsLegacy(pending: ScheduleOptions[]): void {
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
      // TODO is there a subtitle?
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

      if (options.interval !== undefined) {
        notification.repeatInterval = LocalNotificationsImpl.getInterval(options.interval);
      }

      // TODO add these after v1
      // notification.soundName = custom..;
      // notification.resumeApplicationInBackground = true;

      UIApplication.sharedApplication.scheduleLocalNotification(notification);
    }
  }

  addOrProcessNotification(notificationDetails: ReceivedNotification): void {
    if (this.receivedNotificationCallback) {
      this.receivedNotificationCallback(notificationDetails);
    } else {
      this.pendingReceivedNotifications.push(notificationDetails);
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
      if (LocalNotificationsImpl.isUNUserNotificationCenterAvailable()) {
        // iOS >= 10
        const center = UNUserNotificationCenter.currentNotificationCenter();
        center.requestAuthorizationWithOptionsCompletionHandler(
            UNAuthorizationOptions.Alert | UNAuthorizationOptions.Badge | UNAuthorizationOptions.Sound,
            (granted: boolean, error: NSError) => resolve(granted));

      } else {
        // iOS < 10
        LocalNotificationsImpl.didRegisterUserNotificationSettingsObserver = LocalNotificationsImpl.addObserver("didRegisterUserNotificationSettings", result => {
          NSNotificationCenter.defaultCenter.removeObserver(LocalNotificationsImpl.didRegisterUserNotificationSettingsObserver);
          LocalNotificationsImpl.didRegisterUserNotificationSettingsObserver = undefined;
          const granted = result.userInfo.objectForKey("message");
          resolve(granted != "false");
        });

        const types = UIApplication.sharedApplication.currentUserNotificationSettings.types | UIUserNotificationType.Alert | UIUserNotificationType.Badge | UIUserNotificationType.Sound;
        const settings = UIUserNotificationSettings.settingsForTypesCategories(types, null);
        UIApplication.sharedApplication.registerUserNotificationSettings(settings);
      }
    });
  }

  addOnMessageReceivedCallback(onReceived: (data: ReceivedNotification) => void): Promise<any> {
    return new Promise((resolve, reject) => {
      try {
        this.receivedNotificationCallback = onReceived;
        for (let p in this.pendingReceivedNotifications) {
          console.log("notificationDetails p: " + JSON.parse(p));
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
        if (LocalNotificationsImpl.isUNUserNotificationCenterAvailable()) {
          console.log(id);
          console.log(typeof id);
          UNUserNotificationCenter.currentNotificationCenter().removePendingNotificationRequestsWithIdentifiers(<any>["" + id]);
          resolve(true);

        } else {
          const scheduled = UIApplication.sharedApplication.scheduledLocalNotifications;
          for (let i = 0, l = scheduled.count; i < l; i++) {
            const noti = scheduled.objectAtIndex(i);
            if (id == noti.userInfo.valueForKey("id")) {
              UIApplication.sharedApplication.cancelLocalNotification(noti);
              resolve(true);
              return;
            }
          }
          resolve(false);
        }
      } catch (ex) {
        console.log("Error in LocalNotifications.cancel: " + ex);
        reject(ex);
      }
    });
  }

  cancelAll(): Promise<any> {
    return new Promise((resolve, reject) => {
      try {
        if (LocalNotificationsImpl.isUNUserNotificationCenterAvailable()) {
          UNUserNotificationCenter.currentNotificationCenter().removeAllPendingNotificationRequests();
        } else {
          UIApplication.sharedApplication.cancelAllLocalNotifications();
        }
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

        if (LocalNotificationsImpl.isUNUserNotificationCenterAvailable()) {
          UNUserNotificationCenter.currentNotificationCenter().getPendingNotificationRequestsWithCompletionHandler((notRequests: NSArray<UNNotificationRequest>) => {
            for (let i = 0; i < notRequests.count; i++) {
              scheduledIds.push(notRequests[i].identifier);
            }
            resolve(scheduledIds);
          });

        } else {
          const scheduled = UIApplication.sharedApplication.scheduledLocalNotifications;
          for (let i = 0, l = scheduled.count; i < l; i++) {
            scheduledIds.push(scheduled.objectAtIndex(i).userInfo.valueForKey("id"));
          }
          resolve(scheduledIds);
        }

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
          this.requestPermission().then(granted => {
            if (granted) {
              LocalNotificationsImpl.schedulePendingNotifications(options);
              resolve();
            }
          });
        } else {
          LocalNotificationsImpl.schedulePendingNotifications(options);
          resolve();
        }
      } catch (ex) {
        console.log("Error in LocalNotifications.schedule: " + ex);
        reject(ex);
      }
    });
  }
}

class UNUserNotificationCenterDelegateImpl extends NSObject implements UNUserNotificationCenterDelegate {
  public static ObjCProtocols = [];

  private _owner: WeakRef<LocalNotificationsImpl>;

  public static new(): UNUserNotificationCenterDelegateImpl {
    try {
      UNUserNotificationCenterDelegateImpl.ObjCProtocols.push(UNUserNotificationCenterDelegate);
    } catch (ignore) {
    }
    return <UNUserNotificationCenterDelegateImpl>super.new();
  }

  public static initWithOwner(owner: WeakRef<LocalNotificationsImpl>): UNUserNotificationCenterDelegateImpl {
    const delegate = <UNUserNotificationCenterDelegateImpl>UNUserNotificationCenterDelegateImpl.new();
    delegate._owner = owner;
    return delegate;
  }

  /**
   * Called when the app was opened by a notification.
   */
  userNotificationCenterDidReceiveNotificationResponseWithCompletionHandler(center: UNUserNotificationCenter, notificationResponse: UNNotificationResponse, completionHandler: () => void): void {
    const request = notificationResponse.notification.request,
        notificationContent = request.content,
        action = notificationResponse.actionIdentifier;

    // let's ignore dismiss actions
    if (action === UNNotificationDismissActionIdentifier) {
      completionHandler();
      return;
    }

    let event = "default";
    if (action !== UNNotificationDefaultActionIdentifier) {
      event = notificationResponse instanceof UNTextInputNotificationResponse ? "input" : "button";
    }

    let response = notificationResponse.actionIdentifier;
    if (response === UNNotificationDefaultActionIdentifier) {
      response = undefined;
    } else if (notificationResponse instanceof UNTextInputNotificationResponse) {
      response = (<UNTextInputNotificationResponse>notificationResponse).userText;
    }

    this._owner.get().addOrProcessNotification({
      id: +request.identifier,
      title: notificationContent.title,
      body: notificationContent.body,
      event,
      response
    });

    completionHandler();
  }

  /**
   * Called when the app is in the foreground.
   */
  userNotificationCenterWillPresentNotificationWithCompletionHandler(center: UNUserNotificationCenter, notification: UNNotification, completionHandler: (presentationOptions: UNNotificationPresentationOptions) => void): void {
    if (notification.request.trigger instanceof UNPushNotificationTrigger) {
      return;
    }

    if (notification.request.content.userInfo.valueForKey("forceShowWhenInForeground")) {
      completionHandler(UNNotificationPresentationOptions.Badge | UNNotificationPresentationOptions.Sound | UNNotificationPresentationOptions.Alert);
    } else {
      completionHandler(UNNotificationPresentationOptions.Badge | UNNotificationPresentationOptions.Sound);
    }
  }
}

export const LocalNotifications = new LocalNotificationsImpl();
