import { Component } from "@angular/core";
import { LocalNotifications } from "nativescript-local-notifications";

@Component({
  selector: "ns-items",
  moduleId: module.id,
  templateUrl: "./items.component.html",
})
export class ItemsComponent {

  constructor() {
    LocalNotifications.addOnMessageReceivedCallback(notificationData => {
      console.log("Notification received: " + JSON.stringify(notificationData));
    });
  }

  schedule(): void {
    LocalNotifications.schedule(
        [{
          id: 5,
          thumbnail: true,
          title: 'Richard wants your input',
          body: '"Hey man, what do you think of the new design?" (swipe down to reply, or tap to open the app)',
          forceShowWhenInForeground: true,
          at: new Date(new Date().getTime() + 10 * 1000),
          actions: [
            {
              id: "input-richard",
              type: "input",
              title: "Tap here to reply",
              placeholder: "Type to reply..",
              submitLabel: "Reply",
              launch: true,
              editable: true,
              // choices: ["Red", "Yellow", "Green"] // TODO Android only, but yet to see it in action
            }
          ]
        }])
        .then(() => {
          alert({
            title: "Notification scheduled",
            message: "ID: 5",
            okButtonText: "OK, thanks"
          });
        })
        .catch(error => console.log("doScheduleId5WithInput error: " + error));
  }
}