package com.telerik.localnotifications;

import android.content.Context;
import android.content.Intent;
import android.os.Bundle;

import android.content.BroadcastReceiver;
import android.support.annotation.Nullable;

import org.json.JSONObject;

public class NotificationClearedReceiver extends BroadcastReceiver {
  private static String TAG = "NotificationClickedActivity";

  // Hold a reference to the intent to handle.
  private Intent intent;

  /**
   * Called when the notification is cleared from the notification center.
   *
   * @param context Application context
   * @param intent  Received intent with notification ID
   */
  @Override
  public void onReceive(Context context, @Nullable Intent intent) {
    this.intent = intent;

    if (intent == null) {
      return;
    }

    Bundle bundle = intent.getExtras();

    if (bundle == null) {
      return;
    }

    onClear(context, bundle);
  }

  public void onClear (Context context, Bundle bundle) {
    final int id = bundle.getInt(NotificationPublisher.NOTIFICATION_ID);
    final JSONObject opts = Store.get(context, id);

    if (opts.optInt("repeatInterval", 0) > 0) {
      // Remove the persisted notification data if it's not repeating:
      Store.remove(context, id);
    }

    LocalNotificationsPlugin.executeOnMessageClearedCallback(opts);
  }

}