var LocalNotifications = require("./local-notifications-common");
var application = require("application"); // TODO unused

var pushHandler,
    pushManager;

(function() {
  if (!pushHandler) {
    pushHandler = Push.alloc().init();
    pushManager = PushManager.alloc().init();
  }
})();

// TODO pass the onNotificationReceived callback to this method as well
LocalNotifications.register = function (arg) {
  return new Promise(function (resolve, reject) {
    try {

      LocalNotifications.didRegisterUserNotificationSettingsObserver = LocalNotifications._addObserver("didRegisterUserNotificationSettings", function(result) {
        //NSNotificationCenter.defaultCenter().removeObserver(LocalNotifications.notificationReceivedObserver);
        //LocalNotifications.notificationReceivedObserver = undefined;
        //var notificationDetails = result.userInfo.objectForKey('message');
        console.log("------- received didRegisterUserNotificationSettings in JS: " + result);
        // invoke the callback here
        //success(token);
      });

      LocalNotifications.notificationReceivedObserver = LocalNotifications._addObserver("notificationReceived", function(result) {
        //NSNotificationCenter.defaultCenter().removeObserver(LocalNotifications.notificationReceivedObserver);
        //LocalNotifications.notificationReceivedObserver = undefined;
        var notificationDetails = result.userInfo.objectForKey('message');
        console.log("------- received notificationDetails in JS: " + notificationDetails);
        // invoke the callback here
        //success(token);
      });

      pushHandler.registerUserNotificationSettings({foo:'bar'});

      // call registerUserNotificationSettings
      //resolve(LocalNotifications._hasPermission());
    } catch (ex) {
      console.log("Error in LocalNotifications.hasPermission: " + ex);
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

LocalNotifications._addObserver = function(eventName, callback) {
  return NSNotificationCenter.defaultCenter().addObserverForNameObjectQueueUsingBlock(eventName, null, NSOperationQueue.mainQueue(), callback);
};

LocalNotifications._schedulePendingNotifications = function () {

  var pending = LocalNotifications.pendingNotifications;
  for (var n in pending) {
    // TODO this merge is untested, so check the log:
    console.log("---- options before merge: " + JSON.stringify(pending[n]));
    var options = LocalNotifications.merge(pending[n], LocalNotifications.defaults);
    console.log("---- options after merge: " + JSON.stringify(options));

    var notification = UILocalNotification.alloc().init();

    notification.fireDate = options.at ? options.at.getTime() : new Date().getTime();
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

    // TODO add these
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
      resolve(true);
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