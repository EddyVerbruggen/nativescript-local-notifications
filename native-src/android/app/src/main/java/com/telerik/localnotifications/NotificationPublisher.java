package com.telerik.localnotifications;

import android.annotation.SuppressLint;
import android.app.Notification;
import android.app.NotificationManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.util.Log;

import org.json.JSONException;
import org.json.JSONObject;

import static com.telerik.localnotifications.NotificationRestoreReceiver.SHARED_PREFERENCES_KEY;
import static com.telerik.localnotifications.NotificationRestoreReceiver.TAG;

public class NotificationPublisher extends BroadcastReceiver {

  public static String NOTIFICATION_ID = "notification-id";
  public static String NOTIFICATION = "notification";
  public static String SOUND = "sound";
  public static String PUSH_BUNDLE = "pushBundle";

  public void onReceive(Context context, Intent intent) {
    final Notification notification = intent.getParcelableExtra(NOTIFICATION);
    if (notification != null) {
      //notification.sound = Uri.parse("android.resource://" + context.getPackageName() + "/raw/" + notification.sound);
      final int id = intent.getIntExtra(NOTIFICATION_ID, 0);
      ((NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE)).notify(id, notification);
      removeNotificationIfNotRepeating("" + id, context);
    }
  }

  @SuppressLint("ApplySharedPref")
  private void removeNotificationIfNotRepeating(final String id, final Context context) {
    final SharedPreferences sharedPreferences = context.getSharedPreferences(SHARED_PREFERENCES_KEY, Context.MODE_PRIVATE);

    boolean isRepeating = false;
    String notificationString = (String)sharedPreferences.getAll().get(id);
    try {
      final JSONObject notificationOptions = new JSONObject(notificationString);
      isRepeating = notificationOptions.optInt("repeatInterval", 0) > 0;
    } catch (JSONException e) {
      Log.d(TAG, "NotificationPublisher.onReceive removeNotificationIfNotRepeating error", e);
    }

    if (!isRepeating) {
      final SharedPreferences.Editor sharedPreferencesEditor = sharedPreferences.edit();
      sharedPreferencesEditor.remove("" + id).apply();
    }
  }
}
