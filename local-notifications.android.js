var application = require("application");
var utils = require("utils/utils");
var LocalNotifications = require("./local-notifications-common");

// TODO nice for debuggin, but this should be passed in by the dev of course, like in the tns pushplugin
(function() {
  com.telerik.pushplugin.PushPlugin.setOnMessageReceivedCallback(
      new com.telerik.pushplugin.PushPluginListener(
          {
            success: function(notificationData) {
              console.log("------------- notification received! " + notificationData);
              var notification = JSON.parse(notificationData);
              console.log("------------- notification id received: " + notification.id);
            }
          })
  );
})();

LocalNotifications.schedule = function(arg) {
  return new Promise(function (resolve, reject) {
    try {
      var context = application.android.foregroundActivity;
      var defaultIcon = application.android.nativeApp.getApplicationInfo().icon;

      for (var n in arg) {
        var options = arg[n];
        var builder = new android.support.v4.app.NotificationCompat.Builder(context)
            .setDefaults(0)
            .setContentTitle(options.title || "") // mandatory
            .setContentText(options.body || "") // mandatory
            .setSmallIcon(defaultIcon) // mandatory
            .setAutoCancel(true) // removes the notification from the statusbar once tapped
          //.setNumber(2) // TODO badge
            .setTicker(options.ticker || options.body);

        // add the intent that handles the event when the notification is clicked (which should launch the app)
        var reqCode = new java.util.Random().nextInt();
        var clickIntent = new android.content.Intent(context, com.telerik.pushplugin.PushHandlerActivity.class) // TODO
          //.putExtra(Options.EXTRA, options.toString()) // TODO
            .putExtra("pushBundle", JSON.stringify(options)) // TODO
            .setFlags(android.content.Intent.FLAG_ACTIVITY_NO_HISTORY);

        var pendingContentIntent = android.app.PendingIntent.getActivity(context, reqCode, clickIntent, android.app.PendingIntent.FLAG_UPDATE_CURRENT);
        builder.setContentIntent(pendingContentIntent);


        // TODO this expanded mode works and is pretty awesome.. add properties one day
        /*
         var inboxStyle = new android.support.v4.app.NotificationCompat.InboxStyle();
         var events = [];
         events.push("a");
         events.push("b");
         events.push("c");
         // Sets a title for the Inbox in expanded layout
         inboxStyle.setBigContentTitle("Event tracker details:");
         for (var i=0; i < events.length; i++) {
         inboxStyle.addLine(events[i]);
         }
         builder.setStyle(inboxStyle);
         */

        /*
         var onReceiveCallback = function onReceiveCallback(ctx, intent) {
         console.log("---- in onReceiveCallback");
         //var newConnectionType = getConnectionType();
         //connectionTypeChangedCallback(newConnectionType);
         };
         application.android.registerBroadcastReceiver(android.net.ConnectivityManager.CONNECTIVITY_ACTION, onReceiveCallback);
         */

        var not = builder.build();

        // add the intent which schedules the notification
        var notificationIntent = new android.content.Intent(context, com.telerik.localnotifications.NotificationPublisher.class)
            .setAction(""+options.id)
            .putExtra(com.telerik.localnotifications.NotificationPublisher.NOTIFICATION_ID, options.id)
            .putExtra(com.telerik.localnotifications.NotificationPublisher.NOTIFICATION, not);

        var pendingIntent = android.app.PendingIntent.getBroadcast(context, 0, notificationIntent, android.app.PendingIntent.FLAG_UPDATE_CURRENT);

        // configure when we'll show the event
        var triggerTime = options.at ? options.at.getTime() : new Date().getTime();
        alarmManager = utils.ad.getApplicationContext().getSystemService(android.content.Context.ALARM_SERVICE);
        alarmManager.set(android.app.AlarmManager.RTC_WAKEUP, triggerTime, pendingIntent);

        // TODO persist, see https://github.com/katzer/cordova-plugin-local-notifications/blob/master/src/android/notification/Notification.java#L285
        //return new Notification(context, options, builder, triggerReceiver);
      }

      resolve();
    } catch (ex) {
      console.log("Error in LocalNotifications.schedule: " + ex);
      reject(ex);
    }
  });
};

module.exports = LocalNotifications;

/*
 module.exports = (function () {
 var app = require('application');
 var context = app.android.context;

 (function() {
 //debugger;
 // Hook on the application events
 com.telerik.pushplugin.PushLifecycleCallbacks.registerCallbacks(app.android.nativeApp);
 })();

 var pluginObject = {
 register: function (options, successCallback, errorCallback) {
 com.telerik.pushplugin.PushPlugin.register(context, options.senderID,
 //Success
 new com.telerik.pushplugin.PushPluginListener(
 {
 success: successCallback,
 error: errorCallback
 })
 );
 },
 unregister: function (onSuccessCallback, onErrorCallback, options) {
 com.telerik.pushplugin.PushPlugin.unregister(context, options.senderID, new com.telerik.pushplugin.PushPluginListener(
 {
 success: onSuccessCallback
 }
 ));
 },
 onMessageReceived: function (callback) {
 com.telerik.pushplugin.PushPlugin.setOnMessageReceivedCallback(
 new com.telerik.pushplugin.PushPluginListener(
 {
 success: callback
 })
 );
 },
 onTokenRefresh : function (callback) {
 com.telerik.pushplugin.PushPlugin.setOnTokenRefreshCallback(
 new com.telerik.pushplugin.PushPluginListener(
 {
 success: callback
 })
 );
 },
 areNotificationsEnabled : function (callback) {
 var bool = com.telerik.pushplugin.PushPlugin.areNotificationsEnabled();
 callback(bool);
 }
 };
 return pluginObject;
 })();
 */