# Local Notifications Plugin library for NativeScript iOS apps

This is the native iOS for the Telerik NativeScript Local Notifications plugin.
Not really useful for usage outside this plugin.

## Build

The project has a manual build step that is building both for simulator and real device and then produces a universal .framework from the two versions.

The output folder is the same as the default build folder for the project (right click the .framework file -> Show in finder) and is called iphoneos-universal.

Tip: To update the framework in your demo app, copy the built fwk to the /lib/iOS folder, then simply run the project.