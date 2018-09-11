package com.telerik.localnotifications;

import android.content.Context;
import android.util.Log;

import org.json.JSONObject;

public class LocalNotificationsPlugin {
  static final String TAG = "LocalNotifyPlugin";

  static boolean isActive = false;
  private static JSONObject cachedData; // TODO: This should be an array!
  private static JSONObject clearedCachedData;
  private static LocalNotificationsPluginListener onMessageReceivedCallback;
  private static LocalNotificationsPluginListener onMessageClearedCallback;

  /**
   * Set the on message received callback
   *
   * @param callbacks
   */
  public static void setOnMessageReceivedCallback(LocalNotificationsPluginListener callbacks) {
    onMessageReceivedCallback = callbacks;

    if (cachedData != null) {
      executeOnMessageReceivedCallback(cachedData);
      cachedData = null;
    }
  }

  /**
   * Execute the onMessageReceivedCallback with the data passed.
   * In case the callback is not present, cache the data;
   *
   * @param data
   */
  public static void executeOnMessageReceivedCallback(JSONObject data) {
    if (onMessageReceivedCallback != null) {
      Log.d(TAG, "Sending message to client");
      onMessageReceivedCallback.success(data);
    } else {
      Log.d(TAG, "No callback function - caching the data for later retrieval.");
      cachedData = data;
    }
  }

  /**
   * Set the on message cleared callback
   *
   * @param callbacks
   */
  public static void setOnMessageClearedCallback(LocalNotificationsPluginListener callbacks) {
    onMessageClearedCallback = callbacks;

    if (clearedCachedData != null) {
      executeOnMessageClearedCallback(clearedCachedData);
      clearedCachedData = null;
    }
  }

  /**
   * Execute the onMessageClearedCallback with the data passed.
   * In case the callback is not present, cache the data;
   *
   * @param data
   */
  public static void executeOnMessageClearedCallback(JSONObject data) {
    if (onMessageClearedCallback != null) {
      Log.d(TAG, "Sending message to client");
      onMessageClearedCallback.success(data);
    } else {
      Log.d(TAG, "No callback function - caching the data for later retrieval.");
      clearedCachedData = data;
    }
  }

  public static void scheduleNotification(JSONObject options, Context context) throws Exception {
    // Persist the options so that we can access them later to:
    // - Restore a notification after reboot.
    // - Create a notification after an alarm triggers (for recurrent or scheduled notifications).
    // - Pass them back to the notification clicked or notification cleared callbacks.
    //
    // This way we don't need to pass them around as extras in the Intents.

    // TODO: Maybe return notification ID?

    Store.save(context, options);

    // Display or schedule the notification, depending on the options:

    NotificationRestoreReceiver.scheduleNotification(options, context);
  }
}



