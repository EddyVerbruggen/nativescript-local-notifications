# NativeScript Local Notifications Plugin

The Local Notifications plugin allows your app to show notifications when the app is not running.
Just like remote push notifications, but a few orders of magnitude easier to set up.

## Installation
From the command prompt go to your app's root folder and execute:
```
tns plugin add nativescript-local-notifications
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
|`ticker` |On Android you can show a different text in the statusbar, instead of the `body`. Default not set, so `body` is used.|
|`at`     |A JavaScript Date object indicating when the notification should be shown. Default 'now'.|
|`badge`  |On iOS (and some Android devices) you see a number on top of the app icon. On most Android devices you'll see this number in the notification center. Default not set (0).|
|`sound`  |Currently this is only used on Android where you can set this to `null` to suppress the sound. Default 'the default notification sound'.|

```js
  LocalNotifications.schedule([{
    id: 1,
    title: 'The title',
    body: 'The body',
    ticker: 'The ticker',
    badge: 1,
    sound: null, // suppress sound on Android
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
- Scheduling repeating notifications (daily, weekly, etc)
- [Custom Notification sounds](https://github.com/EddyVerbruggen/nativescript-local-notifications/issues/3)
- Interactive Notifications on iOS
