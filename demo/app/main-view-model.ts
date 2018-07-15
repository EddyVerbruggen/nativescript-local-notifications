import { Observable } from "tns-core-modules/data/observable";
import { alert } from "tns-core-modules/ui/dialogs";
import { LocalNotifications } from "nativescript-local-notifications";

export class HelloWorldModel extends Observable {

  public notification: string;

  constructor() {
    super();
    LocalNotifications.addOnMessageReceivedCallback(notificationData => {
      console.log("Notification received: " + JSON.stringify(notificationData));
      this.set("notification", "Notification received: " + JSON.stringify(notificationData));
    });
  }

  public doCheckHasPermission(): void {
    LocalNotifications.hasPermission()
        .then(granted => {
          alert({
            title: "Permission granted?",
            message: granted ? "YES" : "NO",
            okButtonText: "OK"
          });
        });
  };

  public doRequestPermission(): void {
    LocalNotifications.requestPermission()
        .then(granted => {
          alert({
            title: "Permission granted?",
            message: granted ? "YES" : "NO",
            okButtonText: "OK"
          });
        });
  }

  public doScheduleWithButtons(): void {
    LocalNotifications.schedule(
        [{
          id: 1,
          title: 'THE TITLE',
          subtitle: 'The subtitle',
          body: 'The big body. The big body. The big body. The big body. The big body. The big body. The big body. The big body.',
          bigTextStyle: true, // Adds an 'expansion arrow' to the notification (Android only)
          sound: "customsound",
          forceShowWhenInForeground: true,
          channel: "My Awesome Channel",
          ticker: 'Special ticker text (Android only)',
          at: new Date(new Date().getTime() + (10 * 1000)),
          actions: [
            {
              id: "yes",
              type: "button",
              title: "Yes (and launch app)",
              launch: true
            },
            {
              id: "no",
              type: "button",
              title: "No",
              launch: false
            }
          ]
        }])
        .then(() => {
          alert({
            title: "Notification scheduled",
            message: "ID: 1",
            okButtonText: "OK, thanks"
          });
        })
        .catch(error => console.log("doSchedule error: " + error))
  };

  public doScheduleNoSound(): void {
    LocalNotifications.schedule(
        [{
          id: 2,
          title: 'Hi',
          forceShowWhenInForeground: false, // default
          body: 'I\'m soundless',
          sound: null,
          at: new Date(new Date().getTime() + 10 * 1000)
        }])
        .then(() => {
          alert({
            title: "Notification scheduled",
            message: 'ID: 2',
            okButtonText: "OK, thanks"
          });
        })
        .catch(error => console.log("doScheduleSilent error: " + error));
  }

  public doScheduleAndSetBadgeNumber(): void {
    LocalNotifications.schedule(
        [{
          id: 3,
          title: 'Hi',
          body: 'You should see a \'3\' somewhere',
          at: new Date(new Date().getTime() + 10 * 1000),
          badge: 3
        }])
        .then(() => {
          alert({
            title: "Notification scheduled",
            message: 'ID: 3',
            okButtonText: "OK, thanks"
          });
        })
        .catch(error => console.log("doScheduleAndSetBadgeNumber error: " + error));
  }

  public doScheduleId4WithCustomIcon(): void {
    LocalNotifications.schedule(
        [{
          id: 4,
          title: 'Custom icon',
          body: 'Check it out!',
          smallIcon: 'res://launcher_icon_arrow',
          largeIcon: 'res://ic_notify', // although this is the default fallback as well ;)
          at: new Date(new Date().getTime() + 10 * 1000),
        }])
        .then(() => {
          alert({
            title: "Notification scheduled",
            message: 'ID: 4',
            okButtonText: "OK, thanks"
          });
        })
        .catch(error => console.log("doScheduleId4WithCustomIcon error: " + error));
  }


  public doScheduleId5WithInput(): void {
    LocalNotifications.schedule(
        [{
          id: 5,
          title: 'Richard wants your input',
          body: '"Hey man, what do you think of the new design?" (swipe down to reply, or tap to open the app)',
          forceShowWhenInForeground: true,
          at: new Date(new Date().getTime() + 10 * 1000),
          actions: [
            {
              id: "input-richard",
              type: "input",
              placeholder: "Type to reply..",
              submitLabel: "Reply",
              launch: false
            }
          ]
        }])
        .then(() => {
          alert({
            title: "Notification scheduled",
            message: 'ID: 5',
            okButtonText: "OK, thanks"
          });
        })
        .catch(error => console.log("doScheduleId5WithInput error: " + error));
  }

  public doScheduleEveryMinute(): void {
    LocalNotifications.schedule(
        [{
          id: 6,
          title: 'Every minute!',
          interval: 'minute', // some constant
          body: 'I\'m repeating until cancelled',
          forceShowWhenInForeground: true,
          at: new Date(new Date().getTime() + 10 * 1000)
        }])
        .then(() => {
          alert({
            title: "Notification scheduled",
            message: 'ID: 6, repeating',
            okButtonText: "OK, thanks"
          });
        })
        .catch(error => console.log("doScheduleEveryMinute error: " + error));
  }

  public doGetScheduledIds(): void {
    LocalNotifications.getScheduledIds()
        .then(ids => {
          alert({
            title: "Scheduled ID's",
            message: 'ID\'s: ' + ids,
            okButtonText: "Sweet!"
          });
        })
        .catch(error => console.log("doGetScheduledIds error: " + error));
  }

  public doCancelAll(): void {
    LocalNotifications.cancelAll()
        .then(() => {
          alert({
            title: "All canceled",
            okButtonText: "Awesome!"
          });
        })
        .catch(error => console.log("doCancelAll error: " + error));
  }

  public doCancelId6(): void {
    LocalNotifications.cancel(6)
        .then(foundAndCanceled => {
          if (foundAndCanceled) {
            alert({
              title: "ID 6 canceled",
              okButtonText: "OK, coolness"
            });
          } else {
            alert({
              title: "No ID 6 was scheduled",
              okButtonText: "OK, woops"
            });
          }
        })
        .catch(error => console.log("doCancelId6 error: " + error));
  }
}
