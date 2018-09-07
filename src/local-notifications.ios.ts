import * as utils from "tns-core-modules/utils/utils";
import * as fileSystemModule from "tns-core-modules/file-system";
import { fromUrl } from "tns-core-modules/image-source";
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
  private delegate: UNUserNotificationCenterDelegateImpl;

  constructor() {
    super();
    if (LocalNotificationsImpl.isUNUserNotificationCenterAvailable()) {
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

  private static guid() {
    // Not the best, but it will work. See https://stackoverflow.com/questions/105034/create-guid-uuid-in-javascript
    const s4 = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
    return `${ s4() }${ s4() }-${ s4() }-${ s4() }-${ s4() }-${ s4() }${ s4() }${ s4() }`;
  }

  private static getImageName(imageURL: string = "", extension: "png" | "jpeg" | "jpg" = "png"): [string, string] {
    const name: string = imageURL.split(/[\/\.]/).slice(-2, -1)[0] || LocalNotificationsImpl.guid();
    return [name, `${ name }.${ extension }`];
  }

  private static addObserver(eventName, callback): any {
    return NSNotificationCenter.defaultCenter.addObserverForNameObjectQueueUsingBlock(eventName, null, NSOperationQueue.mainQueue, callback);
  };

  private static getInterval(interval: ScheduleInterval): NSCalendarUnit {
    if (interval === "minute") {
      return NSCalendarUnit.CalendarUnitSecond;
    } else if (interval === "hour") {
      return NSCalendarUnit.CalendarUnitMinute | NSCalendarUnit.CalendarUnitSecond;
    } else if (interval === "day") {
      return NSCalendarUnit.CalendarUnitHour | NSCalendarUnit.CalendarUnitMinute | NSCalendarUnit.CalendarUnitSecond;
    } else if (interval === "week") {
      return NSCalendarUnit.CalendarUnitWeekday | NSCalendarUnit.CalendarUnitHour | NSCalendarUnit.CalendarUnitMinute | NSCalendarUnit.CalendarUnitSecond;
    } else if (interval === "month") {
      return NSCalendarUnit.CalendarUnitDay | NSCalendarUnit.CalendarUnitHour | NSCalendarUnit.CalendarUnitMinute | NSCalendarUnit.CalendarUnitSecond;
    } else if (interval === "year") {
      return NSCalendarUnit.CalendarUnitMonth | NSCalendarUnit.CalendarUnitDay | NSCalendarUnit.CalendarUnitHour | NSCalendarUnit.CalendarUnitMinute | NSCalendarUnit.CalendarUnitSecond;
    } else {
      return NSCalendarUnit.CalendarUnitYear | NSCalendarUnit.CalendarUnitMonth | NSCalendarUnit.CalendarUnitDay | NSCalendarUnit.CalendarUnitHour | NSCalendarUnit.CalendarUnitMinute | NSCalendarUnit.CalendarUnitSecond;
    }
  };

  private static getIntervalSeconds(interval: ScheduleInterval, ticks: number): number {
    if (!interval) {
      return ticks;
    } else if (interval === "second") {
      return ticks;
    } else if (interval === "minute") {
      return ticks * 60;
    } else if (interval === "hour") {
      return ticks * 60 * 60;
    } else if (interval === "day") {
      return ticks * 60 * 60 * 24;
    } else if (interval === "week") {
      return ticks * 60 * 60 * 24 * 7;
    } else if (interval === "month") {
      return ticks * 60 * 60 * 24 * 30.438;
    } else if (interval === "quarter") {
      return ticks * 60 * 60 * 24 * 91.313;
    } else if (interval === "year") {
      return ticks * 60 * 60 * 24 * 365;
    } else {
      return ticks;
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

      const {title, subtitle, body} = options;
      content.title = body || subtitle ? title : undefined;
      content.subtitle = body ? subtitle : undefined;
      // On iOS, a notification with no body won't show up, so the subtitle or title will be used in this case as body
      // instead. If none of them is set, we set it to ' ' and will show up as an empty line in the notification:
      content.body = body || subtitle || title || ' ';

      content.badge = options.badge;

      if (options.sound === undefined || options.sound === "default") {
        content.sound = UNNotificationSound.defaultSound();
      }
      const userInfoDict = new NSMutableDictionary({capacity: 1});
      userInfoDict.setObjectForKey(options.forceShowWhenInForeground, "forceShowWhenInForeground");
      content.userInfo = userInfoDict;

      // Notification trigger and repeat
      let trigger: UNNotificationTrigger;
      if (options.at) {
        const cal = LocalNotificationsImpl.calendarWithMondayAsFirstDay();
        const date = cal.componentsFromDate(LocalNotificationsImpl.getInterval(options.interval), options.at);
        date.timeZone = NSTimeZone.defaultTimeZone;
        trigger = UNCalendarNotificationTrigger.triggerWithDateMatchingComponentsRepeats(date, options.interval !== undefined);
      } else {
        trigger = UNTimeIntervalNotificationTrigger.triggerWithTimeIntervalRepeats(2, false);
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
          UNUserNotificationCenter.currentNotificationCenter().setNotificationCategories(categories.setByAddingObject(notificationCategory));
        });
      }

      if (!options.image) {
        UNUserNotificationCenter.currentNotificationCenter().addNotificationRequestWithCompletionHandler(
            UNNotificationRequest.requestWithIdentifierContentTrigger("" + options.id, content, trigger),
            (error: NSError) => error ? console.log(`Error scheduling notification (id ${options.id}): ${error.localizedDescription}`) : null);
      } else {
        fromUrl(options.image).then(image => {
          const [imageName, imageNameWithExtension] = LocalNotificationsImpl.getImageName(options.image, "png");
          const path: string = fileSystemModule.path.join(
              fileSystemModule.knownFolders.temp().path,
              imageNameWithExtension,
          );
          const saved = image.saveToFile(path, "png");
          if (saved || fileSystemModule.File.exists(path)) {
            try {
              content.attachments = NSArray.arrayWithObject<UNNotificationAttachment>(
                  UNNotificationAttachment.attachmentWithIdentifierURLOptionsError(
                      imageName,
                      NSURL.fileURLWithPath(path),
                      null
                  ));
            } catch (err) {
              console.log("Error adding image attachment - ignoring the image. Error: " + err);
              // Just fall back to a normal notification...
            }
          }
          UNUserNotificationCenter.currentNotificationCenter().addNotificationRequestWithCompletionHandler(
              UNNotificationRequest.requestWithIdentifierContentTrigger("" + options.id, content, trigger),
              (error: NSError) => error ? console.log(`Error scheduling notification (id ${options.id}): ${error.localizedDescription}`) : null);
        });
      }
    }
  }

  private static calendarWithMondayAsFirstDay(): NSCalendar {
    const cal = NSCalendar.alloc().initWithCalendarIdentifier(NSCalendarIdentifierISO8601);
    cal.firstWeekday = 2;
    cal.minimumDaysInFirstWeek = 1;
    return cal;
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
        for (const pendingReceivedNotification of this.pendingReceivedNotifications) {
          onReceived(pendingReceivedNotification);
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

  schedule(options: ScheduleOptions[]): Promise<void> {
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
  private receivedInForeground = false;

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
      foreground: this.receivedInForeground || UIApplication.sharedApplication.applicationState === UIApplicationState.Active,
      event,
      response
    });

    this.receivedInForeground = false;

    completionHandler();
  }

  /**
   * Called when the app is in the foreground.
   */
  userNotificationCenterWillPresentNotificationWithCompletionHandler(center: UNUserNotificationCenter, notification: UNNotification, completionHandler: (presentationOptions: UNNotificationPresentationOptions) => void): void {
    if (notification.request.trigger instanceof UNPushNotificationTrigger) {
      return;
    }

    this.receivedInForeground = true;

    if (notification.request.content.userInfo.valueForKey("forceShowWhenInForeground")) {
      completionHandler(UNNotificationPresentationOptions.Badge | UNNotificationPresentationOptions.Sound | UNNotificationPresentationOptions.Alert);
    } else {
      completionHandler(UNNotificationPresentationOptions.Badge | UNNotificationPresentationOptions.Sound);
    }
  }
}

const instance = new LocalNotificationsImpl();
export const LocalNotifications = instance;
