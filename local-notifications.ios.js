var LocalNotifications = require("./local-notifications-common");
var utils = require("utils/utils");

var didRegisterUserNotificationSettingsObserver = null;
var notificationReceivedObserver = null;
var notificationOptions = null;
var delegate = null;

LocalNotifications._addObserver = function (eventName, callback) {
    var notiCenter = utils.ios.getter(NSNotificationCenter, NSNotificationCenter.defaultCenter);
    var queue = utils.ios.getter(NSOperationQueue, NSOperationQueue.mainQueue);
    return notiCenter.addObserverForNameObjectQueueUsingBlock(eventName, null, queue, callback);
};

var pendingReceivedNotifications = [],
    notificationHandler,
    notificationManager,
    receivedNotificationCallback = null;

function isUNUserNotificationCenterAvailable () {
    try {
        // available since iOS 10
        return !!UNUserNotificationCenter;
    } catch (ignore) {
        return false;
    }
}

(function () {

    if (isUNUserNotificationCenterAvailable()) {
        // TODO if the delegate is only for getting the msg details, consider moving it to the native lib (so no wiring is required in app.js)
        delegate = UNUserNotificationCenterDelegate.prototype;
        UNUserNotificationCenter.currentNotificationCenter().delegate = delegate;

    } else {
        // grab 'em here, store 'em in JS, and give them to the callback when addOnMessageReceivedCallback is wired
        notificationReceivedObserver = LocalNotifications._addObserver("notificationReceived", result => {
            const notificationDetails = JSON.parse(result.userInfo.objectForKey("message"));
            LocalNotifications.addOrProcessNotification(notificationDetails);
        });
        notificationHandler = Notification.new();
        notificationManager = NotificationManager.new();
    }



})();


LocalNotifications.addOrProcessNotification = function (notificationDetails) {
    if (receivedNotificationCallback) {
        receivedNotificationCallback(notificationDetails);
    } else {
        pendingReceivedNotifications.push(notificationDetails);
    }
}

LocalNotifications._schedulePendingNotifications= function () {
    if (isUNUserNotificationCenterAvailable()) {
        LocalNotifications._schedulePendingNotificationsNew();
    } else {
        LocalNotifications._schedulePendingNotificationsLegacy();
    }
}

LocalNotifications._schedulePendingNotificationsLegacy = function () {

    var pending = LocalNotifications.pendingNotifications;
    for (var n in pending) {
        var options = LocalNotifications.merge(pending[n], LocalNotifications.defaults);

        var notification = UILocalNotification.alloc().init();
        notification.fireDate = options.at ? options.at : new Date();
        notification.alertTitle = options.title;
        notification.alertBody = options.body;

        notification.timeZone = utils.ios.getter(NSTimeZone, NSTimeZone.defaultTimeZone);
        notification.applicationIconBadgeNumber = options.badge;

        // these are sent back to the plugin when a notification is received
        var userInfoDict = NSMutableDictionary.alloc().initWithCapacity(4);
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
            notification.repeatInterval = LocalNotifications._getInterval(options.interval);
        }

        // TODO add these after v1
        // notification.soundName = custom..;
        // notification.resumeApplicationInBackground = true;

        var app = utils.ios.getter(UIApplication, UIApplication.sharedApplication);
        app.scheduleLocalNotification(notification);

    }
};


LocalNotifications._schedulePendingNotificationsNew = function () {
    var pending = LocalNotifications.pendingNotifications;
    for (const n in pending) {
        var options = LocalNotifications.merge(pending[n], LocalNotifications.defaults);

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
        content.forceShowWhenInForeground = true;

        // content.setValueForKey(options.forceShowWhenInForeground, "shouldAlwaysAlertWhileAppIsForeground");
        // Notification trigger and repeat
        const trigger_at = options.at ? options.at : new Date();

        // TODO
        // const repeats = options.repeat !== 0;
        const repeats = options.interval !== undefined;

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
        }

        // actions
        if (options.actions) {
            let categoryIdentifier = "CATEGORY";
            const actions= [];

            options.actions.forEach(action => {
                categoryIdentifier += ("_" + action.id);

                let notificationActionOptions = UNNotificationActionOptionNone;

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
                categoryIdentifier, actions, [], UNNotificationCategoryOptions.CustomDismissAction);

            content.categoryIdentifier = categoryIdentifier;

            UNUserNotificationCenter.currentNotificationCenter().getNotificationCategoriesWithCompletionHandler((categories) => {
                UNUserNotificationCenter.currentNotificationCenter().setNotificationCategories(categories.setByAddingObject(notificationCategory));
                // UNUserNotificationCenter.currentNotificationCenter().setNotificationCategories(NSSet.setWithObject(notificationCategory));
            });
        }

        // Notification Request
        const request = UNNotificationRequest.requestWithIdentifierContentTrigger("" + options.id, content, trigger);
        UNUserNotificationCenter.currentNotificationCenter().addNotificationRequestWithCompletionHandler(request, (error) => {
            if (error) {
                console.log("Error scheduling notification (id " + options.id + "): " + error.localizedDescription);
            }
        });
        // Add the request
        UNUserNotificationCenterDelegate.prototype.userNotificationCenterWillPresentNotificationWithCompletionHandler(UNUserNotificationCenter.currentNotificationCenter(),
            UNNotification.new(), UNUserNotificationCenter.currentNotificationCenter().getDeliveredNotificationsWithCompletionHandler());



    }
}








LocalNotifications.addOnMessageReceivedCallback = function (callback) {
    return new Promise(function (resolve, reject) {
        try {
            receivedNotificationCallback = callback;
            for (var p in pendingReceivedNotifications) {
                callback(pendingReceivedNotifications[p]);
            }
            pendingReceivedNotifications = [];

            resolve(true);
        } catch (ex) {
            console.log("Error in LocalNotifications.addOnMessageReceivedCallback: " + ex);
            reject(ex);
        }
    });
};

LocalNotifications.hasPermission = function (arg) {
    return new Promise(function (resolve, reject) {
        try {
            resolve(LocalNotifications._hasPermission());
        } catch (ex) {
            console.log("Error in LocalNotifications.hasPermission: " + ex);
            reject(ex);
        }
    });
};

LocalNotifications._hasPermission = function () {
    var app = utils.ios.getter(UIApplication, UIApplication.sharedApplication);
    var settings = utils.ios.getter(app, app.currentUserNotificationSettings);
    var types = UIUserNotificationTypeAlert | UIUserNotificationTypeBadge | UIUserNotificationTypeSound;
    return (settings.types & types) > 0;
};

LocalNotifications.requestPermission = function (arg) {
    return new Promise(function (resolve, reject) {
        try {
            LocalNotifications._requestPermission(function(granted) {
                resolve(granted);
            });
        } catch (ex) {
            console.log("Error in LocalNotifications.requestPermission: " + ex);
            reject(ex);
        }
    });
};

LocalNotifications._requestPermission = function (callback) {

    if (isUNUserNotificationCenterAvailable()) {
        // iOS >= 10
        const center = UNUserNotificationCenter.currentNotificationCenter();
        center.requestAuthorizationWithOptionsCompletionHandler(
            UNAuthorizationOptions.Alert | UNAuthorizationOptions.Badge | UNAuthorizationOptions.Sound,
            (granted, error) => callback(granted));

    }else {

        LocalNotifications.didRegisterUserNotificationSettingsObserver = LocalNotifications._addObserver("didRegisterUserNotificationSettings", function (result) {
            var notiCenter = utils.ios.getter(NSNotificationCenter, NSNotificationCenter.defaultCenter);
            notiCenter.removeObserver(LocalNotifications.didRegisterUserNotificationSettingsObserver);
            LocalNotifications.didRegisterUserNotificationSettingsObserver = undefined;
            var granted = result.userInfo.objectForKey('message');
            callback(granted != "false");
        });

        var app = utils.ios.getter(UIApplication, UIApplication.sharedApplication);
        var settings = utils.ios.getter(app, app.currentUserNotificationSettings);
        var types = settings.types | UIUserNotificationTypeAlert | UIUserNotificationTypeBadge | UIUserNotificationTypeSound;
        settings = UIUserNotificationSettings.settingsForTypesCategories(types, null);
        app.registerUserNotificationSettings(settings);
    }
};


LocalNotifications.cancel = function (id) {
    return new Promise(function (resolve, reject) {
        try {
            var app = utils.ios.getter(UIApplication, UIApplication.sharedApplication);
            var scheduled = app.scheduledLocalNotifications;
            for (var i = 0, l = scheduled.count; i < l; i++) {
                var noti = scheduled.objectAtIndex(i);
                if (id == noti.userInfo.valueForKey("id")) {
                    app.cancelLocalNotification(noti);
                    resolve(true);
                    return;
                }
            }
            resolve(false);
        } catch (ex) {
            console.log("Error in LocalNotifications.cancel: " + ex);
            reject(ex);
        }
    });
};

LocalNotifications.cancelAll = function () {
    return new Promise(function (resolve, reject) {
        try {
            var app = utils.ios.getter(UIApplication, UIApplication.sharedApplication);
            app.cancelAllLocalNotifications();
            app.applicationIconBadgeNumber = 0;
            resolve();
        } catch (ex) {
            console.log("Error in LocalNotifications.cancelAll: " + ex);
            reject(ex);
        }
    });
};

LocalNotifications.getScheduledIds = function () {
    return new Promise(function (resolve, reject) {
        try {
            var app = utils.ios.getter(UIApplication, UIApplication.sharedApplication);
            var scheduledIds = [];
            var scheduled = app.scheduledLocalNotifications;
            for (var i = 0, l = scheduled.count; i < l; i++) {
                var noti = scheduled.objectAtIndex(i);
                scheduledIds.push(noti.userInfo.valueForKey("id"));
            }
            resolve(scheduledIds);
        } catch (ex) {
            console.log("Error in LocalNotifications.getScheduledIds: " + ex);
            reject(ex);
        }
    });
};

LocalNotifications.schedule = function (arg) {
    return new Promise(function (resolve, reject) {
        try {
            LocalNotifications.pendingNotifications = arg;

            if (!LocalNotifications._hasPermission()) {
                LocalNotifications._requestPermission(function() {
                    LocalNotifications._schedulePendingNotifications();
                });
            } else {
                LocalNotifications._schedulePendingNotifications();
            }

            resolve();
        } catch (ex) {
            console.log("Error in LocalNotifications.schedule: " + ex);
            reject(ex);
        }
    });
};

LocalNotifications._getInterval = function(interval) {
    if (interval === null || interval === "") {
        return NSCalendarUnitEra;
    } else if (interval === "second") {
        return NSCalendarUnitSecond;
    } else if (interval === "minute") {
        return NSCalendarUnitMinute;
    } else if (interval === "hour") {
        return NSCalendarUnitHour;
    } else if (interval === "day") {
        return NSCalendarUnitDay;
    } else if (interval === "week") {
        return NSCalendarUnitWeekOfYear;
    } else if (interval === "month") {
        return NSCalendarUnitMonth;
    } else if (interval === "quarter") {
        return NSCalendarUnitQuarter;
    } else if (interval === "year") {
        return NSCalendarUnitYear;
    } else {
        return NSCalendarUnitEra;
    }
};

module.exports = LocalNotifications;