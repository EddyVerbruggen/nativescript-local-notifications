import "./bundle-config";
import * as application from "tns-core-modules/application";

// add this so for iOS 10+ we can do some wiring
require ("nativescript-local-notifications");

application.run({moduleName: "app-root"});
