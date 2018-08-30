import "./bundle-config";
import * as application from "tns-core-modules/application";

// Add this so for iOS 10+ we can do some wiring (set the iOS UNUserNotificationCenter delegate, to be precise).
// Not needed if your app loads the plugin on startup anyway.
// You'll know you need this if on iOS 10+ notifications are not received by your app.
require ("nativescript-local-notifications");

application.run({moduleName: "app-root"});
