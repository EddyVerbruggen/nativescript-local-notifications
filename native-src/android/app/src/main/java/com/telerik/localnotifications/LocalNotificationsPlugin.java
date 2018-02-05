package com.telerik.localnotifications;

import android.util.Log;

import org.json.JSONObject;

public class LocalNotificationsPlugin {
    static final String TAG = "LocalNotifyPlugin";

    static boolean isActive = false;
    private static JSONObject cachedData;
    private static LocalNotificationsPluginListener onMessageReceivedCallback;

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
}



