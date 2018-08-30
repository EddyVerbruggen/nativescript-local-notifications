package com.telerik.localnotifications;

import android.app.IntentService;
import android.app.NotificationManager;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.support.annotation.Nullable;
import android.support.v4.app.RemoteInput;
import android.util.Log;

import org.json.JSONException;
import org.json.JSONObject;

import static com.telerik.localnotifications.Action.CLICK_ACTION_ID;
import static com.telerik.localnotifications.Action.EXTRA_ID;

/**
 * IntentService which is an entry point, whenever a notification from the bar is tapped and executed.
 * The activity fires, notifies the callback.
 */
public class NotificationClickedReceiver extends IntentService {
  private static String TAG = "NotificationClickedActivity";

  // Hold a reference to the intent to handle.
  private Intent intent;

  public NotificationClickedReceiver() {
    super("NotificationClickedReceiver");
  }

  @Override
  protected void onHandleIntent(@Nullable Intent intent) {
    this.intent = intent;

    if (intent == null) {
      return;
    }

    Bundle bundle = intent.getExtras();

    if (bundle == null) {
      return;
    }

    try {
      onClick(bundle);
    } catch (JSONException e) {
      Log.e(TAG, e.getMessage(), e);
    }
  }

  private void onClick(Bundle bundle) throws JSONException {
    final String action = getAction();
    final JSONObject data = processPushBundle(); // note that for the non-default action this will be empty

    boolean isAppActive = LocalNotificationsPlugin.isActive;
    boolean doLaunch = intent.getBooleanExtra("NOTIFICATION_LAUNCH", true);

    if (!isAppActive && doLaunch) {
      forceMainActivityReload();
    }

    if (setTextInput(action, data)) {
      data.put("event", "input");
    } else if (!CLICK_ACTION_ID.equals(action)) {
      data.put("event", "button");
      data.put("response", action);
    } else {
      data.put("event", "default");
    }
    data.put("foreground", isAppActive);

    LocalNotificationsPlugin.executeOnMessageReceivedCallback(data);

    // clear the notification from the tray (unless it's marker as ongoing/sticky)
    if (data.has("id") && !data.optBoolean("ongoing", false)) {
      NotificationManager mgr = (NotificationManager) getApplicationContext().getSystemService(Context.NOTIFICATION_SERVICE);
      mgr.cancel(data.getInt("id"));
    }
  }

  private boolean setTextInput(String action, JSONObject data) throws JSONException {
    Bundle input = RemoteInput.getResultsFromIntent(intent);
    if (input != null) {
      data.put("response", input.getCharSequence(action));
      return true;
    }
    return false;
  }

  private String getAction() {
    return intent == null || intent.getExtras() == null ? null : intent.getExtras().getString(EXTRA_ID, CLICK_ACTION_ID);
  }

  /**
   * Takes the pushBundle extras from the intent,
   * and sends it through to the LocalNotificationsPlugin for processing.
   */
  private JSONObject processPushBundle() {
    Bundle extras = intent.getExtras();
    JSONObject options = new JSONObject();

    if (extras != null) {
      String data = extras.getString(NotificationPublisher.PUSH_BUNDLE);
      if (data != null) {
        try {
          options = new JSONObject(data);
//                options.put("foreground", false);
//                options.put("coldstart", !isPluginActive);

          boolean doLaunch = intent.getBooleanExtra("launch", true);
          Log.d(TAG, "doLaunch = " + doLaunch);

        } catch (JSONException e) {
          e.printStackTrace();
        }
      }
    }
    return options;
  }

  private void forceMainActivityReload() {
    PackageManager pm = getPackageManager();
    Intent launchIntent = pm.getLaunchIntentForPackage(getApplicationContext().getPackageName());
    Log.d(TAG, "starting activity for package: " + getApplicationContext().getPackageName());
    launchIntent.addFlags(Intent.FLAG_ACTIVITY_REORDER_TO_FRONT | Intent.FLAG_ACTIVITY_SINGLE_TOP);
    startActivity(launchIntent);
  }
}