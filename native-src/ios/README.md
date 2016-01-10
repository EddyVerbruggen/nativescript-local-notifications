# Push Plugin for iOS

This is the native java code for push notifications for the iOS platform, which is designed to be easily used in NativeScript.

# Build

The project has a manual build step that is building both for simulator and real device and then produces a universal .framework from the two versions.

The output folder is the same as the default build folder for the project (right click the .framework file -> Show in finder) and is called iphoneos-universal.

# API

## PushManager.m

The PushManager class is used to swizzle the default event callbacks, that are needed to handle push notifications functionality. If you already have a callback attached for those events, they will be called before the actual implementation in the plugin. 

## Push.m

- Register - use to subscribe the device for Push Notifications. The options object is a dictionary that is specified in the docs and contains the registration settings.

> -(void)register:(NSMutableDictionary *)options

- Unregister - use to unsubscribe from Push Notifications

> - (void)unregister
 
- areNotificationsEnabled - returns true/false if the notifications are enabled/disabled for the current device

> - (void)areNotificationsEnabled

- didRegisterForRemoteNotificationsWithDeviceToken - called if the registration for push notifications was successfull. It will return the device token as a result

> - (void)didRegisterForRemoteNotificationsWithDeviceToken:(NSData *)deviceToken

- didFailToRegisterForRemoteNotificationsWithError - called when an error occurs during registration for push notifications.

> - (void)didFailToRegisterForRemoteNotificationsWithError:(NSError *)error

- notificationReceived - called when a new push notifications is received

> - (void)notificationReceived

- setApplicationIconBadgeNumber - used to set a specific number for the application badge. The options object must contain a key "@badge" with an int value

> - (void)setApplicationIconBadgeNumber:(NSMutableDictionary *)options

- registerUserNotificationSettings - used to register the device for interactive push notifications

> - (void)registerUserNotificationSettings:(NSDictionary*)options
