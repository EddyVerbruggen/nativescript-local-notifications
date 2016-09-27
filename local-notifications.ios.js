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
  	var app = utils.ios.getter(UIApplication, UIApplication.alloc);
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
  
  var center = utils.ios.getter(UNUserNotificationCenter, UNUserNotificationCenter.currentNotificationCenter);
  center.requestAuthorizationWithOptionsCompletionHandler([1,2,4], function(d){});
  
};

LocalNotifications._schedulePendingNotifications = function () {
  var pending = LocalNotifications.pendingNotifications;
  for (var n in pending) {
    var options = LocalNotifications.merge(pending[n], LocalNotifications.defaults);
	
	// Notification Content
	var content = utils.ios.getter(UNMutableNotificationContent, UNMutableNotificationContent.alloc);
	content.init();

	content.title = options.title;
	content.body = options.body;

	if( options.sound === undefined || options.sound === "default" ){
		content.sound = UILocalNotificationDefaultSoundName;
	}
	
	content.badge = options.badge;

	// Notification Trigger
	var trigger_at = options.at ? options.at : new Date();

	var repeat = ( options.repeat === 0 ) ? false : true;
	
	if( options.trigger === "timeinterval" ){
		var trigger = UNTimeIntervalNotificationTrigger.triggerWithTimeIntervalRepeats(trigger_at, false);
	} else {
		var FormattedDate = NSDateComponents.new();
		FormattedDate.day = trigger_at.getUTCDate();
		FormattedDate.month = trigger_at.getUTCMonth()+1;
		FormattedDate.year = trigger_at.getUTCFullYear();
		FormattedDate.minute = trigger_at.getMinutes();
		FormattedDate.hour = trigger_at.getHours();
		FormattedDate.second = trigger_at.getSeconds();
		
		var trigger = UNCalendarNotificationTrigger.triggerWithDateMatchingComponentsRepeats(FormattedDate, repeat);
		
	}
	
	// Notification Request 
	var request = UNNotificationRequest.requestWithIdentifierContentTrigger(''+options.id+'', content, trigger);
	
	// Notification Center
	var center = utils.ios.getter(UNUserNotificationCenter, UNUserNotificationCenter.currentNotificationCenter);

	center.addNotificationRequestWithCompletionHandler(request, function(d){});

  }
};

LocalNotifications.cancel = function (id) {
  return new Promise(function (resolve, reject) {
    try {
	  var center = utils.ios.getter(UNUserNotificationCenter, UNUserNotificationCenter.currentNotificationCenter);
	  center.removePendingNotificationRequestsWithIdentifiers([id]);
      resolve(true);
    } catch (ex) {
      console.log("Error in LocalNotifications.cancel: " + ex);
      reject(ex);
    }
  });
};

LocalNotifications.cancelAll = function () {
  return new Promise(function (resolve, reject) {
    try {
	  var center = utils.ios.getter(UNUserNotificationCenter, UNUserNotificationCenter.currentNotificationCenter);
	  center.removeAllPendingNotificationRequests();
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
	  var center = utils.ios.getter(UNUserNotificationCenter, UNUserNotificationCenter.currentNotificationCenter);
	  var scheduledIds = [];
	  center.getPendingNotificationRequestsWithCompletionHandler(function(d){
		  for(var i = 0; i<d.count; i++){
			  scheduledIds.push(d[i].identifier);
		  }
		  resolve(scheduledIds);
	  });
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


module.exports = LocalNotifications;
