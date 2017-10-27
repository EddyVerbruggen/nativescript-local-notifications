package com.telerik.localnotifications;

import android.app.Notification;
import android.app.NotificationManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import static android.R.attr.data;

public class NotificationPublisher extends BroadcastReceiver {

  public static String NOTIFICATION_ID = "notification-id";
  public static String NOTIFICATION = "notification";
  public static String SOUND = "sound";

  public void onReceive(Context context, Intent intent) {
    final Notification notification = intent.getParcelableExtra(NOTIFICATION);
    if (notification != null) {
      Uri d_sound = Uri.parse((String) ("android.resource://" + context.getPackageName() + "/raw/" + notification.sound));
      notification.sound = d_sound;
      final int id = intent.getIntExtra(NOTIFICATION_ID, 0);
      ((NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE)).notify(id, notification);
    }
  }
}
