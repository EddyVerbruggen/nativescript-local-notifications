package com.telerik.localnotifications;

import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.os.AsyncTask;
import android.util.Log;

import java.io.FileNotFoundException;
import java.io.IOException;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;

import static com.telerik.localnotifications.NotificationRestoreReceiver.TAG;

class DownloadFileFromUrl extends AsyncTask<String, Void, Bitmap> {

  private String imageUrl;
  private double maxImageSideLength;

  DownloadFileFromUrl(final String imageUrl, final double maxImageSideLength) {
    super();
    this.imageUrl = imageUrl;
    this.maxImageSideLength = maxImageSideLength;
  }

  @Override
  protected Bitmap doInBackground(String... strings) {

    try {
      InputStream is;

      HttpURLConnection connection;
      URL url = new URL(this.imageUrl);
      connection = (HttpURLConnection) url.openConnection();
      connection.setDoInput(true);
      connection.connect();
      is = connection.getInputStream();

      BitmapFactory.Options opts = new BitmapFactory.Options();
      opts.inJustDecodeBounds = true; // saves memory
      BitmapFactory.decodeStream(is, null, opts);

      // scale the image
      double scaleFactor = Math.min(maxImageSideLength / opts.outWidth, maxImageSideLength / opts.outHeight);

      if (scaleFactor < 1) {
        opts.inDensity = 10000;
        opts.inTargetDensity = (int) ((float) opts.inDensity * scaleFactor);
      }
      opts.inJustDecodeBounds = false;

      try {
        is.close();
      } catch (IOException e) {
        Log.e(TAG, e.getMessage(), e);
      }

      try {
        connection = (HttpURLConnection) url.openConnection();
        connection.setDoInput(true);
        connection.connect();
        is = connection.getInputStream();
      } catch (FileNotFoundException e) {
        Log.e(TAG, e.getMessage(), e);
        return null;
      }

      Bitmap bitmap = BitmapFactory.decodeStream(is, null, opts);
//      Log.d(TAG, "Result bytecount: " + bitmap.getByteCount());

      try {
        is.close();
      } catch (IOException e) {
        Log.d(TAG, e.getMessage(), e);
      }

      return bitmap;
    } catch (IOException e) {
      Log.d(TAG, e.getMessage(), e);
    }

    return null;
  }
}
