declare module "nativescript-local-notifications" {

    /**
     * The options object passed into the schedule function.
     */
    export interface ScheduleOptions {
      /**
       * A number so you can easily distinguish your notifications.
       * Default 0.
       */
      id?: number;

      /**
       * The title which is shown in the statusbar.
       * Default empty.
       */
      title?: string;

      /**
       * The text below the title.
       * Default empty.
       */
      body?: string;

      /**
       * On Android you can show a different text in the statusbar, instead of the 'body'.
       * Default not set, so `body` is used.
       */
      ticker?: string;

      /**
       * A JavaScript Date object indicating when the notification should be shown.
       * Default 'now'.
       */
      at?: Date;

      /**
       * On iOS (and some Android devices) you see a number on top of the app icon. On most Android devices you'll see this number in the notification center.
       * Default not set (0).
       */
      badge?: number;

      /**
       * Currently this is only used on Android where you can set this to 'null' to suppress the sound.
       * Default 'the default notification sound'.
       */
      sound?: string;
    }

    export interface ReceivedNotification {
      id: number;
      title?: string;
      body?: string;
    }

    /**
     * On iOS you need to ask permission to schedule a notification.
     * You can have the `schedule` funtion do that for you automatically
     * (the notification will be scheduled in case the user granted permission),
     * or you can manually invoke `requestPermission` if that's your thing.
     */
    export function schedule(options: ScheduleOptions[]): Promise<any>;

    /**
     * Tapping a notification in the notification center will launch your app.
     * But what if you scheduled two notifications and you want to know which one the user tapped?
     * 
     * Use this function to have a callback invoked when a notification was used to launch your app.
     * Note that on iOS it will even be triggered when your app is in the foreground and a notification is received.
     */
    export function addOnMessageReceivedCallback(onReceived: (data: ReceivedNotification) => void): Promise<any>;

    /**
     * Use when you want to know the id's of all notifications which have been scheduled.
     */
    export function getScheduledIds(): Promise<any>;

    /**
     * Cancels the 'id' passed in.
     * On iOS returns whether or not it was found (and cancelled).
     * On Android we always return true currently.
     */
    export function cancel(id: number): Promise<boolean>;

    /**
     * Use when you just want to cancel all previously scheduled notifications.
     */
    export function cancelAll(): Promise<any>;

    /**
     * On Android you don't need permission, but on iOS you do.
     * Android will simply return true.
     * 
     * If the 'requestPermission' or 'schedule' functions previously ran
     * you may want to check whether or not the user granted permission.
     */
    export function hasPermission(): Promise<boolean>;

    /**
     * On Android you don't need permission, but on iOS you do.
     * Android will simply return true.
     * 
     * If the 'requestPermission' or 'schedule' function previously ran
     * the user has already been prompted to grant permission.
     * 
     * If the user granted permission this function returns true,
     * but if he denied permission this function will return false
     * since an iOS can only request permission once. In which case the user needs
     * to go to the iOS settings app and manually enable permissions for your app.
     */
    export function requestPermission(): Promise<boolean>;
}