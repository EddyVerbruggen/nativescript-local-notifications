var LocalNotifications = require("./local-notifications-common");

LocalNotifications._addObserver = function (eventName, callback) {
  return NSNotificationCenter.defaultCenter().addObserverForNameObjectQueueUsingBlock(eventName, null, NSOperationQueue.mainQueue(), callback);
};

var pendingReceivedNotifications = [],
    notificationHandler,
    notificationManager,
    receivedNotificationCallback = null;

(function () {
  // grab 'em here, store em in JS, and give them to the callback when addOnMessageReceivedCallback is wired
  LocalNotifications.notificationReceivedObserver = LocalNotifications._addObserver("notificationReceived", function (result) {
    var notificationDetails = JSON.parse(result.userInfo.objectForKey('message'));
    console.log("------- notificationReceivedObserver: " + notificationDetails);
    if (receivedNotificationCallback !== null) {
      receivedNotificationCallback(notificationDetails);
    } else {
      pendingReceivedNotifications.push(notificationDetails);
    }
  });

  notificationHandler = Notification.alloc().init();
  notificationManager = NotificationManager.alloc().init();
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
  var settings = UIApplication.sharedApplication().currentUserNotificationSettings();
  var types = UIUserNotificationTypeAlert | UIUserNotificationTypeBadge | UIUserNotificationTypeSound;
  return settings.types & types;
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
    NSNotificationCenter.defaultCenter().removeObserver(LocalNotifications.didRegisterUserNotificationSettingsObserver);
    LocalNotifications.didRegisterUserNotificationSettingsObserver = undefined;
    var granted = result.userInfo.objectForKey('message');
    callback(granted != "false");
  });

  var settings = UIApplication.sharedApplication().currentUserNotificationSettings();
  var types = settings.types | UIUserNotificationTypeAlert | UIUserNotificationTypeBadge | UIUserNotificationTypeSound;
  settings = UIUserNotificationSettings.settingsForTypesCategories(types, null);
  UIApplication.sharedApplication().registerUserNotificationSettings(settings);
};

LocalNotifications._schedulePendingNotifications = function () {

  var pending = LocalNotifications.pendingNotifications;
  for (var n in pending) {
    var options = LocalNotifications.merge(pending[n], LocalNotifications.defaults);

    var notification = UILocalNotification.alloc().init();
    notification.fireDate = options.at ? options.at : new Date();
    notification.alertTitle = options.title;
    notification.alertBody = options.body;
    notification.timeZone = NSTimeZone.defaultTimeZone();
    notification.applicationIconBadgeNumber = options.badge;

    // these are sent back to the plugin when a notification is received
    var userInfoDict = NSMutableDictionary.alloc().initWithCapacity(3);
    userInfoDict.setObjectForKey(options.id, "id");
    userInfoDict.setObjectForKey(options.title, "title");
    userInfoDict.setObjectForKey(options.body, "body");
    notification.userInfo = userInfoDict;

    // TODO add these after v1
    // notification.repeatInterval = 1;
    // notification.soundName = null;
    // notification.resumeApplicationInBackground = true;

    console.log("--- scheduling " + notification);
    UIApplication.sharedApplication().scheduleLocalNotification(notification);
  }
};

LocalNotifications.cancel = function (id) {
  return new Promise(function (resolve, reject) {
    try {
      var scheduled = UIApplication.sharedApplication().scheduledLocalNotifications;
      for (var i = 0, l = scheduled.count; i < l; i++) {
        var noti = scheduled.objectAtIndex(i);
        if (id == noti.userInfo.valueForKey("id")) {
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

LocalNotifications.cancelAll = function () {
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

LocalNotifications.getScheduledIds = function () {
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

module.exports = LocalNotifications;