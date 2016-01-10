# Local Notifications lib for Android - for usage with the {N} Local Notifications plugin

### build
To build, from this folder run:

`ant clean && ant release && cp bin/classes.jar ../../platforms/android/libs/localnotifications.jar`

That will build and copy a `localnotifications.jar` file to the `platforms/android/libs` folder of this plugin.
You can drop that in your app by (re)installing this plugin.


### (re)install
Assuming the plugin is locally cloned next to your app's folder:

#### Install

`tns plugin add ../nativescript-local-notifications`

#### Reinstall:

`tns plugin remove nativescript-local-notifications && tns plugin add ../nativescript-local-notifications && tns platform remove android && tns platform add android`


### run
Then deploy to your device with `tns run android`
