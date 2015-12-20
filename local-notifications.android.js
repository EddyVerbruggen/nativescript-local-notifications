var utils = require("utils/utils");
var application = require("application");
var frame = require("ui/frame");
var LocalNotifications = require("./local-notifications-common");

// TODO all below

admob._getBannerType = function(size) {
  if (size == admob.AD_SIZE.BANNER) {
    return com.google.android.gms.ads.AdSize.BANNER;
  } else if (size == admob.AD_SIZE.LARGE_BANNER) {
    return com.google.android.gms.ads.AdSize.LARGE_BANNER;
  } else if (size == admob.AD_SIZE.MEDIUM_RECTANGLE) {
    return com.google.android.gms.ads.AdSize.MEDIUM_RECTANGLE;
  } else if (size == admob.AD_SIZE.FULL_BANNER) {
    return com.google.android.gms.ads.AdSize.FULL_BANNER;
  } else if (size == admob.AD_SIZE.FLUID) {
    return com.google.android.gms.ads.AdSize.FLUID;
  } else if (size == admob.AD_SIZE.LEADERBOARD) {
    // doesn't seem to work on Android - using large instead
    //return com.google.android.gms.ads.AdSize.LEADERBOARD;
    return com.google.android.gms.ads.AdSize.LARGE_BANNER;
  } else if (size == admob.AD_SIZE.SKYSCRAPER) {
    return com.google.android.gms.ads.AdSize.WIDE_SKYSCRAPER;
  } else if (size == admob.AD_SIZE.SMART_BANNER) {
    return com.google.android.gms.ads.AdSize.SMART_BANNER;
  } else {
    return null;
  }
};

admob._md5 = function(input) {
  try {
    var digest = java.security.MessageDigest.getInstance("MD5");
    var bytes = [];
    for (var j = 0; j < input.length; ++j) {
      bytes.push(input.charCodeAt(j));
    }

    var s = new java.lang.String(input);
    digest.update(s.getBytes());
    var messageDigest = digest.digest();
    var hexString = "";
    for (var i = 0; i < messageDigest.length; i++) {
      var h = java.lang.Integer.toHexString(0xFF & messageDigest[i]);
      while (h.length < 2)
        h = "0" + h;
        hexString += h;
    }
    return hexString;

  } catch (noSuchAlgorithmException) {
    console.log("error generating md5: " + noSuchAlgorithmException);
    return null;
  }
};

admob._buildAdRequest = function (settings) {
  var builder = new com.google.android.gms.ads.AdRequest.Builder();
  if (settings.testing) {
    builder.addTestDevice(com.google.android.gms.ads.AdRequest.DEVICE_ID_EMULATOR);
    // This will request test ads on the emulator and device by passing this hashed device ID.
    var activity = application.android.foregroundActivity;
    var ANDROID_ID = android.provider.Settings.Secure.getString(activity.getContentResolver(), android.provider.Settings.Secure.ANDROID_ID);
    var deviceId = admob._md5(ANDROID_ID);
    if (deviceId != null) {
      deviceId = deviceId.toUpperCase();
      console.log("Treating this deviceId as testdevice: " + deviceId);
      builder.addTestDevice(deviceId);
    }
  }
  var bundle = new android.os.Bundle();
  bundle.putInt("nativescript", 1);
  var adextras = new com.google.android.gms.ads.mediation.admob.AdMobExtras(bundle);
  //builder = builder.addNetworkExtras(adextras);
  return builder.build();
};

admob.createBanner = function(arg) {
  return new Promise(function (resolve, reject) {
    try {
      // always close a previous opened banner
      if (admob.adView != null) {
        var parent = admob.adView.getParent();
        if (parent != null) {
          parent.removeView(admob.adView);
        }
      }
      var settings = admob.merge(arg, admob.defaults);
      var activity = application.android.foregroundActivity;
      admob.adView = new com.google.android.gms.ads.AdView(activity);
      admob.adView.setAdUnitId(settings.androidBannerId);
      var bannerType = admob._getBannerType(settings.size);
      admob.adView.setAdSize(bannerType);
      // TODO consider implementing events, after v1
      //admob.adView.setAdListener(new com.google.android.gms.ads.BannerListener());

      var ad = admob._buildAdRequest(settings);
      admob.adView.loadAd(ad);

      var topMostFrame = frame.topmost(),
          density = utils.layout.getDisplayDensity(),
          top = settings.margins.top * density,
          bottom = settings.margins.bottom * density;

      var relativeLayoutParams = new android.widget.RelativeLayout.LayoutParams(
          android.widget.RelativeLayout.LayoutParams.MATCH_PARENT,
          android.widget.RelativeLayout.LayoutParams.WRAP_CONTENT);

      if (bottom > -1) {
        relativeLayoutParams.bottomMargin = bottom;
        relativeLayoutParams.addRule(android.widget.RelativeLayout.ALIGN_PARENT_BOTTOM);
      } else {
        if (top > -1) {
          relativeLayoutParams.topMargin = top;
        }
        relativeLayoutParams.addRule(android.widget.RelativeLayout.ALIGN_PARENT_TOP);
      }

      var adViewLayout = new android.widget.RelativeLayout(activity);
      adViewLayout.addView(admob.adView, relativeLayoutParams);

      var relativeLayoutParamsOuter = new android.widget.RelativeLayout.LayoutParams(
          android.widget.RelativeLayout.LayoutParams.MATCH_PARENT,
          android.widget.RelativeLayout.LayoutParams.MATCH_PARENT);

      topMostFrame.currentPage.android.getParent().addView(adViewLayout, relativeLayoutParamsOuter);

      resolve();
    } catch (ex) {
      console.log("Error in admob.createBanner: " + ex);
      reject(ex);
    }
  });
};

admob.createInterstitial = function(arg) {
  return new Promise(function (resolve, reject) {
    try {
      var settings = admob.merge(arg, admob.defaults);
      var activity = application.android.foregroundActivity;
      admob.interstitialView = new com.google.android.gms.ads.InterstitialAd(activity);
      admob.interstitialView.setAdUnitId(settings.androidInterstitialId);

      // Interstitial ads must be loaded before they can be shown, so adding a listener
      var InterstitialAdListener = com.google.android.gms.ads.AdListener.extend({
        onAdLoaded: function () {
          admob.interstitialView.show();
          resolve();
        },
        onAdFailedToLoad: function (errorCode) {
          reject(errorCode);
        }
      });
      admob.interstitialView.setAdListener(new InterstitialAdListener());

      var ad = admob._buildAdRequest(settings);
      admob.interstitialView.loadAd(ad);
    } catch (ex) {
      console.log("Error in admob.createBanner: " + ex);
      reject(ex);
    }
  });
};

admob.hideBanner = function(arg) {
  return new Promise(function (resolve, reject) {
    try {
      if (admob.adView != null) {
        var parent = admob.adView.getParent();
        if (parent != null) {
          parent.removeView(admob.adView);
        }
        admob.adView = null;
      }
      resolve();
    } catch (ex) {
      console.log("Error in admob.hideBanner: " + ex);
      reject(ex);
    }
  });
};

module.exports = admob;