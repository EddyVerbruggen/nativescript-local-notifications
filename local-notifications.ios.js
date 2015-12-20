var LocalNotifications = require("./local-notifications-common");
var application = require("application"); // TODO unused

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
  var settings = UIApplication.sharedApplication().currentUserNotificationSettings();
  var types = UIUserNotificationTypeAlert | UIUserNotificationTypeBadge | UIUserNotificationTypeSound;
  return settings.types & types;
};

LocalNotifications.requestPermission = function (arg) {
  return new Promise(function (resolve, reject) {
    try {
      resolve(LocalNotifications._requestPermission());
    } catch (ex) {
      console.log("Error in LocalNotifications.requestPermission: " + ex);
      reject(ex);
    }
  });
};

LocalNotifications._requestPermission = function () {
  var settings = UIApplication.sharedApplication().currentUserNotificationSettings();
  var types = settings.types | UIUserNotificationTypeAlert | UIUserNotificationTypeBadge | UIUserNotificationTypeSound;
  settings = UIUserNotificationSettings.settingsForTypesCategories(types, null);
  UIApplication.sharedApplication().registerUserNotificationSettings(settings);
};

LocalNotifications._schedulePendingNotifications = function () {
  var pending = LocalNotifications.pendingNotifications;
  for (var n in pending) {
    var options = pending[n];
    console.log("options: " + options);
    console.log(JSON.stringify(options));

    var notification = UILocalNotification.alloc().init();

    notification.fireDate = options.at;
    notification.alertTitle = options.title;
    notification.alertBody = options.body;
    notification.timeZone = NSTimeZone.defaultTimeZone();
    notification.applicationIconBadgeNumber = options.badgeNumber;

    // store the id
    var userInfoDict = NSMutableDictionary.alloc().initWithCapacity(1);
    userInfoDict.setObjectForKey(options.id, "id");
    notification.userInfo = userInfoDict;

    // TODO add these
    // notification.repeatInterval = 1;
    // notification.soundName = null;
    // notification.resumeApplicationInBackground = true;

    console.log("--- scheduling " + notification);
    UIApplication.sharedApplication().scheduleLocalNotification(notification);
  }
};

LocalNotifications.cancel = function (arg) {
  return new Promise(function (resolve, reject) {
    try {
      var scheduled = UIApplication.sharedApplication().scheduledLocalNotifications;
      for (var i = 0, l = scheduled.count; i < l; i++) {
        var noti = scheduled.objectAtIndex(i);
        if (arg == noti.userInfo.valueForKey("id")) {
          UIApplication.sharedApplication().cancelLocalNotification(noti);
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

LocalNotifications.cancelAll = function (arg) {
  return new Promise(function (resolve, reject) {
    try {
      UIApplication.sharedApplication().cancelAllLocalNotifications();
      UIApplication.sharedApplication().applicationIconBadgeNumber = 0;
      resolve();
    } catch (ex) {
      console.log("Error in LocalNotifications.cancelAll: " + ex);
      reject(ex);
    }
  });
};

LocalNotifications.getScheduledIds = function (arg) {
  return new Promise(function (resolve, reject) {
    try {
      var scheduledIds = [];
      var scheduled = UIApplication.sharedApplication().scheduledLocalNotifications;
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
      console.log("arg: " + JSON.stringify(arg));
      LocalNotifications.pendingNotifications = arg;

      if (!LocalNotifications._hasPermission()) {
        LocalNotifications._requestPermission();
        reject("No permission yet, we asked it now");
      } else {
        LocalNotifications._schedulePendingNotifications(); // TODO pass in (resolve, reject)
      }
      resolve();
    } catch (ex) {
      console.log("Error in LocalNotifications.schedule: " + ex);
      reject(ex);
    }
  });
};

module.exports = LocalNotifications;