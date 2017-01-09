# NativeScript Local Notifications Plugin

> Requires NativeScript 2.3.0+ (because of iOS 10 compatibility), so upgrade if you're rocking a lower spec: `npm install -g nativescript`.

The Local Notifications plugin allows your app to show notifications when the app is not running.
Just like remote push notifications, but a few orders of magnitude easier to set up.

## Installation
From the command prompt go to your app's root folder and execute:
```
tns plugin add nativescript-local-notifications
```

#### TypeScript support
And do yourself a favor by adding TypeScript support to your nativeScript app:

````
tns install typescript
```

Now you can import the plugin as an object into your `.ts` file as follows:

```js
import * as LocalNotifications from "nativescript-local-notifications";

// .. then use it as:
LocalNotifications.hasPermission()..
```

## Usage

If you want a quickstart, [clone our demo app](https://github.com/EddyVerbruggen/nativescript-local-notifications-demo).

### schedule
On iOS you need to ask permission to schedule a notification.
You can have the `schedule` funtion do that for you automatically (the notification will be scheduled in case the user granted permission),
or you can manually invoke `requestPermission` if that's your thing.

You can pass several options to this function, everything is optional:

|option|description|
|------|-----------|
|`id`     |A number so you can easily distinguish your notifications. Default 0.|
|`title`  |The title which is shown in the statusbar. Default empty.|
|`body`   |The text below the title. Default empty.|
|`groupedMessages`| An array of atmost 5 messages that would be displayed using android's notification [inboxStyle](https://developer.android.com/reference/android/app/Notification.InboxStyle.html). Note: The array would be trimed from the top if the messages exceed five. Default not set |
|`groupSummary`| An [inboxStyle](https://developer.android.com/reference/android/app/Notification.InboxStyle.html) notification summary. Default empty|
|`ticker` |On Android you can show a different text in the statusbar, instead of the `body`. Default not set, so `body` is used.|
|`at`     |A JavaScript Date object indicating when the notification should be shown. Default 'now'.|
|`badge`  |On iOS (and some Android devices) you see a number on top of the app icon. On most Android devices you'll see this number in the notification center. Default not set (0).|
|`sound`  |Set this to `null` to suppress the default sound.|
|`interval` |Set to one of `second minute hour day week month quarter year` if you want a recurring notification.|
|`smallIcon` |On Android you can set a custom icon in the system tray. Pass in 'res://filename.png' which lives in App_Resouces/Android/drawable folders. If not passed, we look for a file named 'ic_stat_notify.png' in the App_Resources/Android/drawable folders. Default: the app icon.|
|`largeIcon` |Same as `smallIcon`, but this one is shown when you expand the notification center. The optional file we look for is not 'ic_stat_notify.png' but 'ic_notify.png'.|
|`ongoing` |Default is (`false`). Set whether this is an `ongoing` notification. Ongoing notifications cannot be dismissed by the user, so your application must take care of canceling them.(**Android Only**) |

Note that after a reboot the `smallIcon` and `largeIcon` are not restored but fall back to the default (app icon). This is a known issue and can be fixed in a future version.

```js
  LocalNotifications.schedule([{
    id: 1,
    title: 'The title',
    body: 'Recurs every minute until cancelled',
    ticker: 'The ticker',
    badge: 1,
    groupedMessages:["The first", "Second", "Keep going", "one more..", "OK Stop"] //android only
    groupSummary:"Summary of the grouped messages above" //android only
    ongoing: true, // makes the notification ongoing (Android only)
    smallIcon: 'res://heart.png',
    interval: 'minute',
    sound: null, // suppress the default sound
    at: new Date(new Date().getTime() + (10 * 1000)) // 10 seconds from now
  }]).then(
      function() {
        console.log("Notification scheduled");
      },
      function(error) {
        console.log("scheduling error: " + error);
      }
  )
```

### addOnMessageReceivedCallback
Tapping a notification in the notification center will launch your app.
But what if you scheduled two notifications and you want to know which one the user tapped?

Use this function to have a callback invoked when a notification was used to launch your app.
Note that on iOS it will even be triggered when your app is in the foreground and a notification is received.

```js
  LocalNotifications.addOnMessageReceivedCallback(
      function (notification) {
        console.log("ID: " + notification.id);
        console.log("Title: " + notification.title);
        console.log("Body: " + notification.body);
      }
  ).then(
      function() {
        console.log("Listener added");
      }
  )
```

### getScheduledIds
If you want to know the ID's of all notifications which have been scheduled, do this:

Note that all functions have an error handler as well (see `schedule`), but to keep things readable we won't repeat ourselves.

```js
  LocalNotifications.getScheduledIds().then(
      function(ids) {
        console.log("ID's: " + ids);
      }
  )
```

### cancel
If you want to cancel a previously scheduled notification (and you know its ID), you can cancel it:

```js
  LocalNotifications.cancel(5 /* the ID */).then(
      function(foundAndCanceled) {
          if (foundAndCanceled) {
            console.log("OK, it's gone!");
          } else {
            console.log("No ID 5 was scheduled");
          }
      }
  )
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
  LocalNotifications.requestPermission().then(
      function(granted) {
        console.log("Permission granted? " + granted);
      }
  )
```

### hasPermission
On Android you don't need permission, but on iOS you do. Android will simply return true.

If the `requestPermission` or `schedule` functions previously ran you may want to check whether or not the user granted permission:

```js
  LocalNotifications.hasPermission().then(
      function(granted) {
        console.log("Permission granted? " + granted);
      }
  )
```

## Future work
Let us know what you need by opening a Github issue.

We're thinking about adding support for things like:
- [Custom Notification sounds](https://github.com/EddyVerbruggen/nativescript-local-notifications/issues/3)
- Interactive Notifications on iOS
