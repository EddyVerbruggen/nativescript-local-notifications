var LocalNotifications = {};

LocalNotifications.defaults = {
  id: 0,
  title: '',
  body: '',
  badge: 0,
  repeat: 0,
  trigger: '' // Defaults to UNCalendarNotificationTrigger unless if its set to 'timeinterval'
};

LocalNotifications.merge = function merge(obj1, obj2) { // Our merge function
  var result = {}; // return result
  for (var i in obj1) {      // for every property in obj1
    if ((i in obj2) && (typeof obj1[i] === "object") && (i !== null)) {
      result[i] = merge(obj1[i], obj2[i]); // if it's an object, merge
    } else {
      result[i] = obj1[i]; // add it to result
    }
  }
  for (i in obj2) { // add the remaining properties from object 2
    if (i in result) { //conflict
      continue;
    }
    result[i] = obj2[i];
  }
  return result;
};

module.exports = LocalNotifications;
