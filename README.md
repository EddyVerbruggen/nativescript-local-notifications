# NativeScript Local Notifications Plugin

TODO all below

















































## Installation
From the command prompt go to your app's root folder and execute:
```
tns plugin add nativescript-admob
```

## Usage

If you want a quickstart, [clone our demo app](https://github.com/EddyVerbruggen/nativescript-admob-demo).

Here are the supported functions:

### function: createBanner
```js
  var admob = require("nativescript-admob");

  admob.createBanner({
      // if this 'view' property is not set, the banner is overlayed on the current top most view
      // view: ..,
      testing: true, // set to false to get actual banners
      size: size, // anything in admob.AD_SIZE, like admob.AD_SIZE.SMART_BANNER
      iosBannerId: "ca-app-pub-XXXXXX/YYYYYY", // add your own
      androidBannerId: "ca-app-pub-AAAAAAAA/BBBBBBB", // add your own
      // Android automatically adds the connected device as test device with testing:true, iOS does not
      iosTestDeviceIds: ["yourTestDeviceUDIDs", "canBeAddedHere"],
      margins: {
        // if both are set, top wins
        //top: 10
        bottom: 50
      }
    }).then(
        function() {
          console.log("admob createBanner done");
        },
        function(error) {
          console.log("admob createBanner error: " + error);
        }
  )
```

### function: hideBanner
NOTE: If you want to show a different banner than the one showing you don't need to call the `hide` function
since `show` will do that for you to prevent your app from crashing.

```js
  // the .then(.. bit is optional btw
  admob.hideBanner().then(
        function() {
          console.log("admob hideBanner done");
        },
        function(error) {
          console.log("admob hideBanner error: " + error);
        }
  )
```

### function: createInterstitial
To show a fullscreen banner you can use this function. Note that Interstitial banners need to be loaded before
they can be shown, but don't worry: this plugin will manage that transparently for you.

```js
  admob.createInterstitial({
      testing: true,
      iosInterstitialId: "ca-app-pub-XXXXXX/YYYYY2", // add your own
      androidInterstitialId: "ca-app-pub-AAAAAAAA/BBBBBB2", // add your own
      // Android automatically adds the connected device as test device with testing:true, iOS does not
      iosTestDeviceIds: ["ce97330130c9047ce0d4430d37d713b1"]
    }).then(
        function() {
          console.log("admob createInterstitial done");
        },
        function(error) {
          console.log("admob createInterstitial error: " + error);
        }
  )
```