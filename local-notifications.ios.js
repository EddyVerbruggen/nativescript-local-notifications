var LocalNotifications = require("./local-notifications-common");
var utils = require("utils/utils");

LocalNotifications._addObserver = function (eventName, callback) {
  var notiCenter = utils.ios.getter(NSNotificationCenter, NSNotificationCenter.defaultCenter);
  var queue = utils.ios.getter(NSOperationQueue, NSOperationQueue.mainQueue);
  return notiCenter.addObserverForNameObjectQueueUsingBlock(eventName, null, queue, callback);
};

var pendingReceivedNotifications = [],
    notificationHandler,
    notificationManager,
    receivedNotificationCallback = null;

(function () {
  // grab 'em here, store em in JS, and give them to the callback when addOnMessageReceivedCallback is wired
  LocalNotifications.notificationReceivedObserver = LocalNotifications._addObserver("notificationReceived", function (result) {
    var notificationDetails = JSON.parse(result.userInfo.objectForKey('message'));
    if (receivedNotificationCallback !== null) {
      receivedNotificationCallback(notificationDetails);
    } else {
      pendingReceivedNotifications.push(notificationDetails);
    }
  });

  notificationHandler = Notification.new();
  notificationManager = NotificationManager.new();
})();

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
};

LocalNotifications._schedulePendingNotifications = function () {

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

    if (options.sound === undefined || options.sound === "default") {
      notification.soundName = UILocalNotificationDefaultSoundName;
    }

    if (options.interval !== 0) {
      notification.repeatInterval = LocalNotifications._getInterval(options.interval);
    }

    // TODO add these after v1
    // notification.soundName = custom..;
    // notification.resumeApplicationInBackground = true;

    var app = utils.ios.getter(UIApplication, UIApplication.sharedApplication);
    app.scheduleLocalNotification(notification);
    
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
