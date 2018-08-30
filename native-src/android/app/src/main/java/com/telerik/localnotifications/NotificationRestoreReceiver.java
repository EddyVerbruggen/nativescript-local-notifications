package com.telerik.localnotifications;

import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.support.v4.app.NotificationCompat;
import android.support.v4.app.NotificationCompat.Builder;
import android.util.Log;

import java.util.Date;
import java.util.Iterator;
import java.util.Map;
import java.util.Random;
import java.util.Set;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import static android.app.PendingIntent.FLAG_UPDATE_CURRENT;

/**
 * Notifications need to be restored when the device is rebooted,
 * that's what's this class is for.
 */
public class NotificationRestoreReceiver extends BroadcastReceiver {

  static final String TAG = "NotifyRestoreReceiver";

  public static final String SHARED_PREFERENCES_KEY = "LocalNotificationsPlugin";

  // To generate unique request codes
  private static final Random RANDOM = new Random();

  @Override
  public void onReceive(Context context, Intent intent) {
    final SharedPreferences sharedPreferences = context.getSharedPreferences(SHARED_PREFERENCES_KEY, Context.MODE_PRIVATE);
    final Set notificationOptions = sharedPreferences.getAll().entrySet();

    final Iterator<Map.Entry> iterator = notificationOptions.iterator();
    while (iterator.hasNext()) {
      final Map.Entry item = iterator.next();
      final String notificationString = (String) item.getValue();
      Log.e(TAG, "Will restore previously scheduled notification: " + notificationString);
      try {
        final JSONObject options = new JSONObject(notificationString);
        scheduleNotification(options, context);
      } catch (Throwable t) {
        Log.e(TAG, "Notification scheduling error: " + t.getMessage());
        t.printStackTrace();
      }
    }
  }

  static void scheduleNotification(JSONObject options, Context context) throws JSONException {
    Bitmap largeIconDrawable = null;

    if (options.has("largeIcon")) {
      largeIconDrawable = BitmapFactory.decodeResource(context.getResources(), options.getInt("largeIcon"));
    }

    final String channelId = "myChannelId"; // package scoped, so no need to add it ourselves

    Builder builder;
    if (android.os.Build.VERSION.SDK_INT >= 26) {
      builder = new Builder(context, channelId);
    } else {
      builder = new Builder(context);
    }

    builder
        .setDefaults(0)
        .setContentTitle(options.optString("title"))
        .setContentText(options.optString("body"))
        .setSmallIcon(options.optInt("smallIcon"))
        .setLargeIcon(largeIconDrawable)
        .setAutoCancel(true) // removes the notification from the statusbar once tapped
        .setNumber(options.optInt("badge"))
        .setOngoing(options.optBoolean("ongoing"))
        .setPriority(options.optBoolean("forceShowWhenInForeground") ? 1 : 0)
        .setTicker(options.optString("ticker", options.optString("body")));

    // TODO sound preference is not doing anything
//    builder.setSound(options.has("sound") ? Uri.parse("android.resource://" + context.getPackageName() + "/raw/" + options.getString("sound")) : Uri.parse("android.resource://" + context.getPackageName() + "/raw/notify"))
    if (options.has("sound")) {
      builder.setSound(android.media.RingtoneManager.getDefaultUri(android.media.RingtoneManager.TYPE_NOTIFICATION));
    }

    // set channel for Android 8+
    if (android.os.Build.VERSION.SDK_INT >= 26) {
      final NotificationManager notificationManager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
      if (notificationManager != null && notificationManager.getNotificationChannel(channelId) == null) {
        notificationManager.createNotificationChannel(new NotificationChannel(
            channelId,
            options.has("channel") ? options.optString("channel") : "Channel",
            NotificationManager.IMPORTANCE_HIGH));
      }
    }

    applyGroup(options, builder);
    applyActions(options, context, builder);
//    applyDeleteReceiver(options, context, builder);
    applyContentReceiver(options, context, builder);

    // set big text style (adds an 'expansion arrow' to the notification)
    if (options.optBoolean("bigTextStyle")) {
      final NotificationCompat.BigTextStyle bigTextStyle = new NotificationCompat.BigTextStyle();
      bigTextStyle.setBigContentTitle(options.optString("title"));
      bigTextStyle.bigText(options.optString("body"));
      builder.setStyle(bigTextStyle);
    }

    final Notification notification = builder.build();

    // add the intent which schedules the notification
    final Intent notificationIntent = new Intent(context, NotificationPublisher.class)
        .setAction(options.getString("id"))
        .putExtra(NotificationPublisher.PUSH_BUNDLE, options.toString())
        .putExtra(NotificationPublisher.NOTIFICATION_ID, options.optInt("id"))
        .putExtra(NotificationPublisher.SOUND, options.optString("sound"))
        .putExtra(NotificationPublisher.NOTIFICATION, notification);

    final PendingIntent pendingIntent = PendingIntent.getBroadcast(context, 0, notificationIntent, PendingIntent.FLAG_CANCEL_CURRENT);

    // configure when we'll show the event
    long triggerTime = options.getLong("atTime");
    long interval = options.optLong("repeatInterval", 0); // in ms
    final boolean isRepeating = interval > 0;
    final Date triggerDate = new Date(triggerTime);
    final boolean wasInThePast = new Date().after(triggerDate);
    final AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);

    if (wasInThePast && !isRepeating) {
      alarmManager.cancel(pendingIntent);
      ((NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE)).cancel(options.getInt("id"));
      // let's clean this one up then
      final SharedPreferences sharedPreferences = context.getSharedPreferences(SHARED_PREFERENCES_KEY, Context.MODE_PRIVATE);
      sharedPreferences.edit().remove(options.getString("id")).apply();
    } else {
      // schedule
      if (isRepeating) {
        alarmManager.setRepeating(AlarmManager.RTC_WAKEUP, triggerTime, interval, pendingIntent);
      } else {
        alarmManager.set(AlarmManager.RTC_WAKEUP, triggerTime, pendingIntent);
      }
    }
  }

  /*
   * Add the intent that handles the delete event (which is fired when the X or 'clear all'
   * was pressed in the notification center).
  private static void applyDeleteReceiver(JSONObject options, Context context, Builder builder) throws JSONException {
    final Intent intent = new Intent(context, ClearReceiver.class)
        .setAction(options.getString("id"));

    final PendingIntent deleteIntent = PendingIntent.getBroadcast(context, RANDOM.nextInt(), intent, FLAG_UPDATE_CURRENT);
    builder.setDeleteIntent(deleteIntent);
  }
   */

  //

  /**
   * Add the intent that handles the event when the notification is clicked (which should launch the app).
   */
  private static void applyContentReceiver(JSONObject options, Context context, Builder builder) throws JSONException {
    final Intent intent = new Intent(context, NotificationClickedReceiver.class)
        .putExtra(NotificationPublisher.PUSH_BUNDLE, options.toString())
        .putExtra(NotificationPublisher.NOTIFICATION_ID, options.getString("id"))
        .putExtra(Action.EXTRA_ID, Action.CLICK_ACTION_ID)
        .putExtra("NOTIFICATION_LAUNCH", options.optBoolean("launch", true))
        .setFlags(Intent.FLAG_ACTIVITY_NO_HISTORY);

    final PendingIntent pendingContentIntent = PendingIntent.getService(context, RANDOM.nextInt(), intent, FLAG_UPDATE_CURRENT);
    builder.setContentIntent(pendingContentIntent);
  }

  private static void applyGroup(JSONObject options, NotificationCompat.Builder builder) throws JSONException {
    JSONArray groupedMessages = options.optJSONArray("groupedMessages");
    if (groupedMessages == null) {
      return;
    }

    final NotificationCompat.InboxStyle inboxStyle = new NotificationCompat.InboxStyle();

    // Sets a title for the Inbox in expanded layout
    inboxStyle.setBigContentTitle(options.getString("title"));
    for (int i = 0; i < Math.min(groupedMessages.length(), 5); i++) {
      inboxStyle.addLine(groupedMessages.getString(i));
    }
    inboxStyle.setSummaryText(options.optString("groupSummary", null));

    builder
        .setGroup("myGroup") // TODO not sure this needs to be configurable
        .setStyle(inboxStyle);
  }

  private static void applyActions(JSONObject options, Context context, NotificationCompat.Builder builder) throws JSONException {
    Action[] actions = getActions(options, context);

    if (actions == null || actions.length == 0) {
      return;
    }

    NotificationCompat.Action.Builder btn;
    for (Action action : actions) {
      btn = new NotificationCompat.Action.Builder(
          action.getIcon(),
          action.getTitle(),
          getPendingIntentForAction(options, context, action));

      if (action.isWithInput()) {
        Log.d(TAG, "applyActions, isWithInput");
        btn.addRemoteInput(action.getInput());
      } else {
        Log.d(TAG, "applyActions, not isWithInput");
      }

      builder.addAction(btn.build());
    }
  }

  private static Action[] getActions(JSONObject options, Context context) {
    Object value = options.opt("actions");
    String groupId = null;
    JSONArray actions = null;
    ActionGroup group = null;

    if (value instanceof String) {
      groupId = (String) value;
    } else if (value instanceof JSONArray) {
      actions = (JSONArray) value;
    }

    if (groupId != null) {
      group = ActionGroup.lookup(groupId);
    } else if (actions != null && actions.length() > 0) {
      group = ActionGroup.parse(context, actions);
    }

    return (group != null) ? group.getActions() : null;
  }

  private static PendingIntent getPendingIntentForAction(JSONObject options, Context context, Action action) throws JSONException {
    Log.d(TAG, "getPendingIntentForAction action.id " + action.getId() + ", action.isLaunchingApp(): " + action.isLaunchingApp());
    Intent intent = new Intent(context, NotificationClickedReceiver.class)
        .putExtra(NotificationPublisher.PUSH_BUNDLE, options.toString())
        .putExtra(NotificationPublisher.NOTIFICATION_ID, options.getString("id"))
        .putExtra(Action.EXTRA_ID, action.getId())
        // TODO see https://github.com/katzer/cordova-plugin-local-notifications/blob/ca1374325bb27ec983332d55dcb6975d929bca4b/src/android/notification/Builder.java#L396
        .putExtra("NOTIFICATION_LAUNCH", action.isLaunchingApp())
        .setFlags(Intent.FLAG_ACTIVITY_NO_HISTORY);

//    if (extras != null) {
//      intent.putExtras(extras);
//    }

    int reqCode = RANDOM.nextInt();

    return PendingIntent.getService(context, reqCode, intent, FLAG_UPDATE_CURRENT);
  }
}
