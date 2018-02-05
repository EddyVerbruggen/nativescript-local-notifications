package com.telerik.localnotifications;

import android.annotation.SuppressLint;
import android.app.Notification;
import android.app.NotificationManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;

import static com.telerik.localnotifications.NotificationRestoreReceiver.SHARED_PREFERENCES_KEY;

public class NotificationPublisher extends BroadcastReceiver {

  public static String NOTIFICATION_ID = "notification-id";
  public static String NOTIFICATION = "notification";
  public static String SOUND = "sound";

  public void onReceive(Context context, Intent intent) {
    final Notification notification = intent.getParcelableExtra(NOTIFICATION);
    if (notification != null) {
      notification.sound = Uri.parse("android.resource://" + context.getPackageName() + "/raw/" + notification.sound);
      final int id = intent.getIntExtra(NOTIFICATION_ID, 0);
      ((NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE)).notify(id, notification);
      removeNotification("" + id, context);
    }
  }

  @SuppressLint("ApplySharedPref")
  private void removeNotification(final String id, final Context context) {
    final SharedPreferences sharedPreferences = context.getSharedPreferences(SHARED_PREFERENCES_KEY, Context.MODE_PRIVATE);
    final SharedPreferences.Editor sharedPreferencesEditor = sharedPreferences.edit();
    sharedPreferencesEditor.remove("" + id);
    sharedPreferencesEditor.commit();
  }
}
