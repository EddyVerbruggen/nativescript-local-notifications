package com.telerik.localnotifications;

import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.support.v4.app.NotificationCompat.Builder;
import android.util.Log;

import java.util.Date;
import java.util.Iterator;
import java.util.Map;
import java.util.Set;

import org.json.JSONException;
import org.json.JSONObject;

/**
 * Notifications need to be restored when the device is rebooted,
 * that's what's this class is for.
 */
public class NotificationRestoreReceiver extends BroadcastReceiver {

  static final String TAG = "NotificationRestoreReceiver";

  @Override
  public void onReceive(Context context, Intent intent) {
    final SharedPreferences sharedPreferences = context.getSharedPreferences("LocalNotificationsPlugin", Context.MODE_PRIVATE);
    final Set notificationOptions = sharedPreferences.getAll().entrySet();

    Iterator<Map.Entry> iterator = notificationOptions.iterator();
    while (iterator.hasNext()) {
      Map.Entry item = iterator.next();
      String notificationId = (String) item.getKey();
      String notificationString = (String) item.getValue();
      try {
        JSONObject options = new JSONObject(notificationString);

        final Builder builder = new Builder(context)
            .setDefaults(0)
            .setContentTitle(options.optString("title"))
            .setContentText(options.optString("body"))
            .setSmallIcon(options.optInt("icon"))
            .setAutoCancel(true)
            .setSound(options.has("sound") ? Uri.parse(options.getString("sound")) : null)
            .setNumber(options.optInt("badge"))
            .setTicker(options.optString("ticker"));

        // add the intent that handles the event when the notification is clicked (which should launch the app)
        final Intent clickIntent = new Intent(context, NotificationClickedActivity.class)
            .putExtra("pushBundle", notificationString)
            .setFlags(Intent.FLAG_ACTIVITY_NO_HISTORY);

        final PendingIntent pendingContentIntent = PendingIntent.getActivity(context, options.optInt("id")+100, clickIntent, PendingIntent.FLAG_UPDATE_CURRENT);
        builder.setContentIntent(pendingContentIntent);

        final Notification notification = builder.build();

        // add the intent which schedules the notification
        final Intent notificationIntent = new Intent(context, NotificationPublisher.class)
            .setAction(options.getString("id"))
            .putExtra(com.telerik.localnotifications.NotificationPublisher.NOTIFICATION_ID, options.optInt("id"))
            .putExtra(com.telerik.localnotifications.NotificationPublisher.NOTIFICATION, notification);

        final PendingIntent pendingIntent = PendingIntent.getBroadcast(context, options.optInt("id")+200, notificationIntent, PendingIntent.FLAG_CANCEL_CURRENT);

        // configure when we'll show the event
        long triggerTime = options.getLong("atTime");
        final Date triggerDate = new Date(triggerTime);
        final boolean wasInThePast = new Date().after(triggerDate);
        final AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (wasInThePast) {
          Log.d(TAG, "------------------------ cancel notification: " + options);
          alarmManager.cancel(pendingIntent);
          ((NotificationManager)context.getSystemService(Context.NOTIFICATION_SERVICE)).cancel(options.getInt("id"));
          // TODO 'unpersist' would be nice
        } else {
          // schedule
          Log.d(TAG, "------------------------ schedule notification: " + options);
          alarmManager.set(AlarmManager.RTC_WAKEUP, triggerTime, pendingIntent);
        }
      } catch (JSONException e) {
        e.printStackTrace();
      }
    }
  }
}
























