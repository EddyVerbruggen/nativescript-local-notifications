# NativeScript Local Notifications Plugin

[![NPM version][npm-image]][npm-url]
[![Downloads][downloads-image]][npm-url]
[![Twitter Follow][twitter-image]][twitter-url]

[npm-image]:http://img.shields.io/npm/v/nativescript-local-notifications.svg
[npm-url]:https://npmjs.org/package/nativescript-local-notifications
[downloads-image]:http://img.shields.io/npm/dm/nativescript-local-notifications.svg
[twitter-image]:https://img.shields.io/twitter/follow/eddyverbruggen.svg?style=social&label=Follow%20me
[twitter-url]:https://twitter.com/eddyverbruggen

The Local Notifications plugin allows your app to show notifications when the app is not running.
Just like remote push notifications, but a few orders of magnitude easier to set up.

## Installation
From the command prompt go to your app's root folder and execute:
```bash
tns plugin add nativescript-local-notifications
```

#### TypeScript support
And do yourself a favor by adding TypeScript support to your nativeScript app:

```bash
tns install typescript
```

Now you can import the plugin as an object into your `.ts` file as follows:

```typescript
import * as LocalNotifications from "nativescript-local-notifications";

// then use it as:
LocalNotifications.hasPermission()
```

## Demo app (XML)
If you want a quickstart, [clone our demo app](https://github.com/EddyVerbruggen/nativescript-local-notifications-demo).


## Demo app (Angular)
This plugin is part of the [plugin showcase app](https://github.com/EddyVerbruggen/nativescript-pluginshowcase/tree/master/app/feedback) I built using Angular.

### schedule
On iOS you need to ask permission to schedule a notification.
You can have the `schedule` funtion do that for you automatically (the notification will be scheduled in case the user granted permission),
or you can manually invoke `requestPermission` if that's your thing.

You can pass several options to this function, everything is optional:

|option|description|
|------|-----------|
|`id`     |A number so you can easily distinguish your notifications. Default 0.|
|`title`  |The title which is shown in the statusbar. Default empty.|
|`subtitle`  |Shown below the title. Default empty. iOS >= 10 only. Available since plugin version 3.0.0.|
|`body`   |The text below the title. Default empty.|
|`groupedMessages`| An array of atmost 5 messages that would be displayed using android's notification [inboxStyle](https://developer.android.com/reference/android/app/Notification.InboxStyle.html). Note: The array would be trimed from the top if the messages exceed five. Default not set |
|`groupSummary`| An [inboxStyle](https://developer.android.com/reference/android/app/Notification.InboxStyle.html) notification summary. Default empty|
|`ticker` |On Android you can show a different text in the statusbar, instead of the `body`. Default not set, so `body` is used.|
|`at`     |A JavaScript Date object indicating when the notification should be shown. Default no set (the notification will be shown immediately).|
|`badge`  |On iOS (and some Android devices) you see a number on top of the app icon. On most Android devices you'll see this number in the notification center. Default not set (0).|
|`sound`  |Notification sound. For custom notification sound (iOS only), copy the file to `App_Resources/iOS`. Set this to "default" (or do not set at all) in order to use default OS sound. Set this to `null` to suppress sound.|
|`interval` |Set to one of `second minute hour day week month quarter year` if you want a recurring notification.|
|`smallIcon` | Custom icon to show in the system tray on Android, which lives in App_Resouces/Android/drawable folders. Example: 'res://filename.png'. Defaults to 'res://ic_stat_notify.png' or the app icon if not present. Android < Lollipop (21) only. |
|`smallSilhouetteIcon` | Same as 'smallIcon' but for Android >= Lollipop (21). Should be an alpha-only image. Defaults to 'res://ic_stat_notify_silhouette.png' or the app icon if not present. |
|`largeIcon` | Custom icon to show in the notification center on Android, which lives in App_Resouces/Android/drawable folders. Example: 'res://filename.png'. Defaults to 'res://ic_notify.png' or the app icon if not present. Android only < Lollipop (21). |
|`largeSilhouetteIcon` | Same as 'largeIcon' but for Android >= Lollipop (21).  Should be an alpha-only image. Defaults to 'res://ic_notify_silhouette.png' or the app icon if not present. |
|`color` | Custom color for the notification icon and title that will be applied when the notification center is expanded. Android >= Lollipop (21) only. |
|`ongoing` |Default is (`false`). Set whether this is an `ongoing` notification. Ongoing notifications cannot be dismissed by the user, so your application must take care of canceling them. (**Android Only**) |
|`image` | Expandable notification image. |
|`channel` |Default is (`Channel`). Set the channel name for Android API >= 26, which is shown when the user longpresses a  notification. (**Android Only**) |
|`forceShowWhenInForeground` |Default is `false`. Set to `true` to always show the notification. Note that on iOS < 10 this is ignored (the notification is not shown), and on newer Androids it's currently ignored as well (the notification always shows, per platform default). |
|`actions` |Add an array of `NotificationAction` objects (see below) to add buttons or text input to a notification. |

#### `NotificationAction`

|option|description|
|------|-----------|
|`id`     |An id so you can easily distinguish your actions.|
|`type`   |Either `button` or `input`.|
|`title`  |The label for `type` = `button`.|
|`launch` |Launch the app when the action completes.|
|`submitLabel` |The submit button label for `type` = `input`.|
|`placeholder` |The placeholder text for `type` = `input`.|


```js
  LocalNotifications.schedule([{
    id: 1,
    title: 'The title',
    body: 'Recurs every minute until cancelled',
    ticker: 'The ticker',
    badge: 1,
    groupedMessages:["The first", "Second", "Keep going", "one more..", "OK Stop"], //android only
    groupSummary:"Summary of the grouped messages above", //android only
    ongoing: true, // makes the notification ongoing (Android only)
    smallIcon: 'res://heart',
    interval: 'minute',
    channel: 'My Channel', // default: 'Channel'
    sound: "customsound-ios.wav", // falls back to the default sound on Android
    at: new Date(new Date().getTime() + (10 * 1000)) // 10 seconds from now
  }]).then(() => {
    console.log("Notification scheduled!");
  }, (error) => {
    console.log(`Scheduling error: ${ error }`);
  })
```

### Notification icons

You might want to take a look at [Known Issues](#transactiontoolargeexception-failed-binder-transaction) as some affect the notification icons.


#### Spec for `options.smallIcon` / `options.smallSilhouetteIcon`

These options default to `res://ic_stat_notify.png` and `res://ic_stat_notify_silhouette.png` respectively or the app icon if not present.

`options.largeSilhouetteIcon` should be an alpha-only image and will be used in Android >= Lollipop (21).

[These](https://developer.android.com/guide/practices/ui_guidelines/icon_design_status_bar.html) are the official size guidelines for them:

| Density qualifier | px | dpi
| ------- | ------- | ---
|    ldpi | 18 × 18 | 120
|    mdpi | 24 × 24 | 160
|    hdpi | 36 × 36 | 240
|   xhdpi | 48 × 48 | 320
|  xxhdpi | 72 × 72 | 480
| xxxhdpi | 96 × 96 | 640 aprox.


#### Spec for `options.largeIcon` / `options.largeSilhouetteIcon`

These options default to `res://ic_notify.png` and `res://ic_notify_silhouette.png` respectively or the app icon if not present.

`options.largeSilhouetteIcon` should be an alpha-only image and will be used in Android >= Lollipop (21).

Unfortunately it seems like there's no official guide for these. Anyways there's a [dimen](https://github.com/android/platform_frameworks_base/blob/2d5dbba/core/res/res/values/dimens.xml#L181) that's telling us the dp size which we can translate to the following spec:

| Density qualifier | px | dpi
| --------- | --------- | ---
|      ldpi |   48 × 48 | 120
|      mdpi |   64 × 64 | 160
|      hdpi |   96 × 96 | 240
|     xhdpi | 128 × 128 | 320
|    xxhdpi | 192 × 192 | 480
| xxxhdpi * | 256 × 256 | 640 aprox.

__* Might break your App. See [Known Issues](#transactiontoolargeexception-failed-binder-transaction).__

__Source:__ [Density Qualifier Docs](https://developer.android.com/guide/topics/resources/providing-resources.html#DensityQualifier)

### addOnMessageReceivedCallback
Tapping a notification in the notification center will launch your app.
But what if you scheduled two notifications and you want to know which one the user tapped?

Use this function to have a callback invoked when a notification was used to launch your app.
Note that on iOS it will even be triggered when your app is in the foreground and a notification is received.

```js
LocalNotifications.addOnMessageReceivedCallback((notification) => {
  console.log("ID: " + notification.id);
  console.log("Title: " + notification.title);
  console.log("Body: " + notification.body);
}).then(() => {
  console.log("Listener added");
})
```

### getScheduledIds
If you want to know the ID's of all notifications which have been scheduled, do this:

Note that all functions have an error handler as well (see `schedule`), but to keep things readable we won't repeat ourselves.

```js
LocalNotifications.getScheduledIds().then((ids) => {
  console.log("ID's: " + ids);
})
```

### cancel
If you want to cancel a previously scheduled notification (and you know its ID), you can cancel it:

```js
LocalNotifications.cancel(5 /* the ID */).then((foundAndCanceled) => {
  if (foundAndCanceled) {
    console.log("OK, it's gone!");
  } else {
    console.log("No ID 5 was scheduled");
  }
});
```

### cancelAll
If you just want to cancel all previously scheduled notifications, do this:

```js
LocalNotifications.cancelAll();
```

### requestPermission
On Android you don't need permission, but on iOS you do. Android will simply return true.

If the `requestPermission` or `schedule` function previously ran the user has already been prompted to grant permission.
If the user granted permission this function returns `true`, but if he denied permission this function will return `false`,
since an iOS can only request permission once. In which case the user needs to go to the iOS settings app and manually
enable permissions for your app.

```js
LocalNotifications.requestPermission().then((granted) => {
  console.log("Permission granted? " + granted);
});
```

### hasPermission
On Android you don't need permission, but on iOS you do. Android will simply return true.

If the `requestPermission` or `schedule` functions previously ran you may want to check whether or not the user granted permission:

```js
LocalNotifications.hasPermission().then((granted) => {
  console.log("Permission granted? " + granted);
});
```

## Troubleshooting

### Help, my Android app is restarted
When your app is launched from a notification you may notice the app is not continuing from when you
put it in the background. To fix that, open `app/App_Resources/AndroidManifest.xml` and change the
`launchMode` of the NativeScript activity. For instance:

```xml
<activity android:launchMode="singleTop" />
```


## Known Issues

### `TransactionTooLargeException` / `!!! FAILED BINDER TRANSACTION !!!`

Due to the way the code in this plugin is organised on Android an [`Intent`](https://developer.android.com/reference/android/content/Intent) with a [`Bundle`](https://developer.android.com/reference/android/os/Bundle) containing a [`Notification`](https://developer.android.com/reference/android/app/Notification) is created everytime a delayed (`options.interval`) or recurrent notification (`option.at`) is created.

Before version `3.0.0`, this `Intent` will also be created (but not used) even if none of those 2 options are set.

The problem with this is that the notification will contain 2 properties that are [`Bitmap`s](https://developer.android.com/reference/android/graphics/Bitmap):

- `option.largeIcon` / `option.largeSilhouetteIcon`.
- `options.image`.

...and if these `Bitmap`s are too big, you will get a `TransactionTooLargeException` / `!!! FAILED BINDER TRANSACTION !!!` exception/error on the console/logcat and Local Notifications will fail silently:

    !!! FAILED BINDER TRANSACTION !!! (parcel size = 1435376)

The correct way to fix this would be to create the `Notification` objects inside `NotificationPublisher`, which is the `BroadcastReceiver` that is notified when it's time to show a delayed/recurrent notification, but that involves a major rewrite of this plugin.

These are your options until that happens:

- Fix the plugin yourself and open a PR.
- Avoid using `option.interval` or `option.at` in conjunction with `options.image`, `option.largeIcon`, `option.largeSilhouetteIcon`.
- Avoid using `option.interval` or `option.at` in conjunction with `options.image` but use `option.largeIcon` and/or `option.largeSilhouetteIcon`, as long as you don't provide a `xxxhdpi` icon and stick to the sizes specified in the tables above.


### Notifications look different after a reboot on Android

Note that after a reboot the notification icons are not restored but fall back to the default (application icon). This is a known issue and can be fixed in a future version.

Also, notifications with grouped messages or images in Android will fall back to a normal (text-only) notification.
