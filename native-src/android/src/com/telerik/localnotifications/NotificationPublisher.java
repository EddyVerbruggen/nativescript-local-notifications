package com.telerik.localnotifications;

import android.app.Notification;
import android.app.NotificationManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

public class NotificationPublisher extends BroadcastReceiver {

  public static String NOTIFICATION_ID = "notification-id";
  public static String NOTIFICATION = "notification";

  public void onReceive(Context context, Intent intent) {
    final Notification notification = intent.getParcelableExtra(NOTIFICATION);
    final int id = intent.getIntExtra(NOTIFICATION_ID, 0);
    ((NotificationManager)context.getSystemService(Context.NOTIFICATION_SERVICE)).notify(id, notification);
  }
}