var application = require("application");
var utils = require("utils/utils");
var LocalNotifications = require("./local-notifications-common");
var context = utils.ad.getApplicationContext();
LocalNotifications.addOnMessageReceivedCallback = function (callback) {
  return new Promise(function (resolve, reject) {
    try {
      // note that this is ONLY triggered when the user clicked the notification in the statusbar
      com.telerik.localnotifications.LocalNotificationsPlugin.setOnMessageReceivedCallback(
          new com.telerik.localnotifications.LocalNotificationsPluginListener({
            success: function(notification) {
              callback(JSON.parse(notification));
            }
          })
      );
      resolve();
    } catch (ex) {
      console.log("Error in LocalNotifications.addOnMessageReceivedCallback: " + ex);
      reject(ex);
    }
  });
};

LocalNotifications.schedule = function (arg) {
  return new Promise(function (resolve, reject) {
    try {
      var resources = context.getResources();

      for (var n in arg) {
        var options = LocalNotifications.merge(arg[n], LocalNotifications.defaults);

        // small icon
        if (options.smallIcon) {
          if (options.smallIcon.indexOf(utils.RESOURCE_PREFIX) === 0) {
            options.smallIcon = resources.getIdentifier(options.smallIcon.substr(utils.RESOURCE_PREFIX.length), 'drawable', context.getApplicationInfo().packageName);
          }
        }
        if (!options.smallIcon) {
          // look for an icon named ic_stat_notify.png
          options.smallIcon = resources.getIdentifier("ic_stat_notify", "drawable", context.getApplicationInfo().packageName);
        }
        if (!options.smallIcon) {
          // resort to the regular launcher icon
          options.smallIcon = context.getApplicationInfo().icon;
        }

        // large icon
        if (options.largeIcon) {
          if (options.largeIcon.indexOf(utils.RESOURCE_PREFIX) === 0) {
            options.largeIcon = resources.getIdentifier(options.largeIcon.substr(utils.RESOURCE_PREFIX.length), 'drawable', context.getApplicationInfo().packageName);
          }
        }
        if (!options.largeIcon) {
          // look for an icon named ic_notify.png
          options.largeIcon = resources.getIdentifier("ic_notify", "drawable", context.getApplicationInfo().packageName);
        }
        if (!options.largeIcon) {
          // resort to the regular launcher icon
          options.largeIcon = context.getApplicationInfo().icon;
        }
        if (options.largeIcon) {
          // options.largeIconDrawable = android.support.v4.content.ContextCompat.getDrawable(context, options.largeIcon).getBitmap();
          options.largeIconDrawable = android.graphics.BitmapFactory.decodeResource(context.getResources(), options.largeIcon);
        }

        options.atTime = options.at ? options.at.getTime() : new Date().getTime();

        if (options.sound === undefined || options.sound === "default") {
          options.sound = android.media.RingtoneManager.getDefaultUri(android.media.RingtoneManager.TYPE_NOTIFICATION).toString();
        }

        // TODO best move this to native lib so we can reuse it in the restorereceiver (dupe for now)
        var builder = new android.support.v4.app.NotificationCompat.Builder(context)
            .setDefaults(0)
            .setContentTitle(options.title)
            .setContentText(options.body)
            .setSmallIcon(options.smallIcon)
            .setLargeIcon(options.largeIconDrawable)
            .setAutoCancel(true) // removes the notification from the statusbar once tapped
            .setSound(options.sound === null ? null : android.net.Uri.parse(options.sound))
            .setNumber(options.badge)
            .setOngoing(options.ongoing)//sets the notification to ongoing if it's true.
            .setTicker(options.ticker || options.body);

        if(options.groupedMessages != null && Array.isArray(options.groupedMessages)){
            var inboxStyle = new android.support.v4.app.NotificationCompat.InboxStyle();
            var events = options.groupedMessages;
            (events.length > 5) ? events.splice(0, events.length - 5) : 0;

            // Sets a title for the Inbox in expanded layout
            inboxStyle.setBigContentTitle(options.title);
            for (var i=0; i < events.length; i++) {
                inboxStyle.addLine(events[i]);
            }
            options.groupSummary !== null ? inboxStyle.setSummaryText(options.groupSummary):0;
            builder.setGroup(options.group)
                .setStyle(inboxStyle)
        }

        // add the intent that handles the event when the notification is clicked (which should launch the app)
        var reqCode = new java.util.Random().nextInt();
        var clickIntent = new android.content.Intent(context, com.telerik.localnotifications.NotificationClickedActivity.class)
            .putExtra("pushBundle", JSON.stringify(options))
            .setFlags(android.content.Intent.FLAG_ACTIVITY_NO_HISTORY);

        var pendingContentIntent = android.app.PendingIntent.getActivity(context, reqCode, clickIntent, android.app.PendingIntent.FLAG_UPDATE_CURRENT);
        builder.setContentIntent(pendingContentIntent);

        // add the intent which schedules the notification
        var notificationIntent = new android.content.Intent(context, com.telerik.localnotifications.NotificationPublisher.class)
            .setAction("" + options.id)
            .putExtra(com.telerik.localnotifications.NotificationPublisher.NOTIFICATION_ID, options.id)
            .putExtra(com.telerik.localnotifications.NotificationPublisher.NOTIFICATION, builder.build());

        var pendingIntent = android.app.PendingIntent.getBroadcast(context, 0, notificationIntent, android.app.PendingIntent.FLAG_CANCEL_CURRENT);

        // configure when we'll show the event
        var alarmManager = utils.ad.getApplicationContext().getSystemService(android.content.Context.ALARM_SERVICE);

        var repeatInterval = LocalNotifications._getInterval(options.interval);
        options.repeatInterval = repeatInterval; // used when restoring the notification after a reboot

        if (repeatInterval > 0) {
          alarmManager.setRepeating(android.app.AlarmManager.RTC_WAKEUP, options.atTime, repeatInterval, pendingIntent);
        } else {
          alarmManager.set(android.app.AlarmManager.RTC_WAKEUP, options.atTime, pendingIntent);
        }

        LocalNotifications._persist(options);
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
};

/**
 * Persist notification info to the Android Shared Preferences.
 * This way we can later retrieve it to cancel it, or restore upon reboot.
 */
LocalNotifications._persist = function (options) {
  var sharedPreferences = LocalNotifications._getSharedPreferences();
  var sharedPreferencesEditor = sharedPreferences.edit();
  sharedPreferencesEditor.putString("" + options.id, JSON.stringify(options));
  sharedPreferencesEditor.apply();
};

LocalNotifications._unpersist = function (id) {
  var sharedPreferences = LocalNotifications._getSharedPreferences();
  var sharedPreferencesEditor = sharedPreferences.edit();
  sharedPreferencesEditor.remove("" + id);
  sharedPreferencesEditor.apply();
};

LocalNotifications._cancelById = function (id) {

  var notificationIntent = new android.content.Intent(context, com.telerik.localnotifications.NotificationPublisher.class)
      .setAction("" + id);

  var pendingIntent = android.app.PendingIntent.getBroadcast(context, 0, notificationIntent, 0);

  var alarmManager = context.getSystemService(android.content.Context.ALARM_SERVICE);
  alarmManager.cancel(pendingIntent);

  var notificationManager = context.getSystemService(android.content.Context.NOTIFICATION_SERVICE);
  notificationManager.cancel(id);

  LocalNotifications._unpersist(id);
};

LocalNotifications.cancel = function (id) {
  return new Promise(function (resolve, reject) {
    try {
      LocalNotifications._cancelById(id);
      resolve(true); // TODO can we do this like iOS?
    } catch (ex) {
      console.log("Error in LocalNotifications.cancel: " + ex);
      reject(ex);
    }
  });
};

LocalNotifications.cancelAll = function () {
  return new Promise(function (resolve, reject) {
    try {
      var sharedPreferences = LocalNotifications._getSharedPreferences();
      var keys = sharedPreferences.getAll().keySet();
      var iterator = keys.iterator();

      while (iterator.hasNext()) {
        LocalNotifications._cancelById(iterator.next());
      }

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

      var sharedPreferences = LocalNotifications._getSharedPreferences();
      var keys = sharedPreferences.getAll().keySet();

      var iterator = keys.iterator();
      while (iterator.hasNext()) {
        scheduledIds.push(iterator.next());
      }

      resolve(scheduledIds);
    } catch (ex) {
      console.log("Error in LocalNotifications.getScheduledIds: " + ex);
      reject(ex);
    }
  });
};

LocalNotifications.hasPermission = function (arg) {
  return new Promise(function (resolve, reject) {
    try {
      // nothing to do on this platform
      resolve(true);
    } catch (ex) {
      console.log("Error in LocalNotifications.hasPermission: " + ex);
      reject(ex);
    }
  });
};

LocalNotifications.requestPermission = function (arg) {
  return new Promise(function (resolve, reject) {
    try {
      // nothing to do on this platform
      resolve(true);
    } catch (ex) {
      console.log("Error in LocalNotifications.requestPermission: " + ex);
      reject(ex);
    }
  });
};

LocalNotifications._getSharedPreferences = function () {
  var PREF_KEY = com.telerik.localnotifications.NotificationRestoreReceiver.SHARED_PREFERENCES_KEY;
  return context.getSharedPreferences(PREF_KEY, android.content.Context.MODE_PRIVATE);
};

module.exports = LocalNotifications;
