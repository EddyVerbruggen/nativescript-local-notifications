declare namespace localNotifications {

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

        /**
         * One of second|minute|hour|day|week|month|quarter|year
         */
        interval?: string; // TODO add better TS support

        /**
         * On Android you can set a custom icon in the system tray.
         * Pass in 'res://filename.png' which lives in App_Resouces/Android/drawable folders.
         * If not passed, we look for a file named 'ic_stat_notify.png' in the App_Resources/Android/drawable folders.
         * Default: the app icon.
         */
        smallIcon?: string;

        /**
         * Same as 'smallIcon', but this one is shown when you expand the notification center.
         * The optional file we look for is not 'ic_stat_notify.png' but 'ic_notify.png'.
         */
        largeIcon?: string;

        /**
         * Set whether this is an "ongoing" notification.
         * Ongoing notifications cannot be dismissed by the user,
         * so your application or must take care of canceling them.
         *
         * Android only.
         * Default false.
         */
        ongoing?: boolean;

        /***
         * An array of messages to be displayed as a single notification using the inbox style
         * Note: the length of the array cannot be greater than five, in a situation where it
         * is, the array would be trimmed from the top
         *
         * Android only.
         */
        groupedMessages?:Array<string>


        /***
         * The summary of the grouped message (see #groupedMessage) when using the inbox style
         *
         * Android only.
         */
        groupSummary?:string;
    }

    export interface ReceivedNotification {
        id: number;
        title?: string;
        body?: string;
    }

    interface LocalNotifications {
        /**
         * On iOS you need to ask permission to schedule a notification.
         * You can have the `schedule` funtion do that for you automatically
         * (the notification will be scheduled in case the user granted permission),
         * or you can manually invoke `requestPermission` if that's your thing.
         */
        schedule(options: ScheduleOptions[]): Promise<any>;

        /**
         * Tapping a notification in the notification center will launch your app.
         * But what if you scheduled two notifications and you want to know which one the user tapped?
         *
         * Use this function to have a callback invoked when a notification was used to launch your app.
         * Note that on iOS it will even be triggered when your app is in the foreground and a notification is received.
         */
        addOnMessageReceivedCallback(onReceived: (data: ReceivedNotification) => void): Promise<any>;

        /**
         * Use when you want to know the id's of all notifications which have been scheduled.
         */
        getScheduledIds(): Promise<any>;

        /**
         * Cancels the 'id' passed in.
         * On iOS returns whether or not it was found (and cancelled).
         * On Android we always return true currently.
         */
        cancel(id: number): Promise<boolean>;

        /**
         * Use when you just want to cancel all previously scheduled notifications.
         */
        cancelAll(): Promise<any>;

        /**
         * On Android you don't need permission, but on iOS you do.
         * Android will simply return true.
         *
         * If the 'requestPermission' or 'schedule' functions previously ran
         * you may want to check whether or not the user granted permission.
         */
        hasPermission(): Promise<boolean>;

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
        requestPermission(): Promise<boolean>;
    }
}


declare var localNotifications: localNotifications.LocalNotifications;
export = localNotifications;