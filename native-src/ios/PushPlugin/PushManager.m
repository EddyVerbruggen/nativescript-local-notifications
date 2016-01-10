#import "PushManager.h"
#import <UIKit/UIApplication.h>
#import <objc/runtime.h>
#import "Push.h"

@implementation PushManager
/*__attribute__((constructor))
void myFunction() {
    @autoreleasepool {
        NSLog(@"stuff happened early");
    }
}*/

static IMP didRegisterOriginalMethod = NULL;
static IMP didRegisterUserOriginalMethod = NULL;
static IMP didFailOriginalMethod = NULL;
static IMP didReceiveOriginalMethod = NULL;
static IMP didReceiveLocalOriginalMethod = NULL;
static IMP didBecomeActiveOriginalMethod = NULL;
static IMP handleActionWithIdentifierRemoteOriginalMethod = NULL;
static IMP handleActionWithIdentifierLocalOriginalMethod = NULL;

+ (void)load {
    NSLog(@"----- load");
    [[NSNotificationCenter defaultCenter] addObserverForName:UIApplicationDidFinishLaunchingNotification object:nil queue:[NSOperationQueue mainQueue] usingBlock:^(NSNotification *note) {

        NSLog(@"---- UIApplicationDidFinishLaunchingNotification start");

        UIApplication *app = [UIApplication sharedApplication];
        id<UIApplicationDelegate> appDelegate = app.delegate;
        
        // didBecomeActive swizzle
        Method didBecomeActiveMethod = class_getInstanceMethod([PushManager class], @selector(my_applicationDidBecomeActive:));
        IMP didBecomeActiveImp = method_getImplementation(didBecomeActiveMethod);
        const char* didBecomeActiveTypes = method_getTypeEncoding(didBecomeActiveMethod);
        
        Method didBecomeActiveOriginal = class_getInstanceMethod(appDelegate.class, @selector(applicationDidBecomeActive:));
        if (didBecomeActiveOriginal) {
            didBecomeActiveOriginalMethod = method_getImplementation(didBecomeActiveOriginal);
            method_exchangeImplementations(didBecomeActiveOriginal, didBecomeActiveMethod);
        } else {
            class_addMethod(appDelegate.class, @selector(applicationDidBecomeActive:), didBecomeActiveImp, didBecomeActiveTypes);
        }
        
        // didRegisterUserNotificationSettings swizzle
        Method didRegisterUserMethod = class_getInstanceMethod([PushManager class], @selector(my_application:didRegisterUserNotificationSettings:));
        IMP didRegisterUserMethodImp = method_getImplementation(didRegisterUserMethod);
        const char* didRegisterUserTypes = method_getTypeEncoding(didRegisterUserMethod);
        
        Method didRegisterUserOriginal = class_getInstanceMethod(appDelegate.class, @selector(application:didRegisterUserNotificationSettings:));
        if (didRegisterUserOriginal) {
            didRegisterUserOriginalMethod = method_getImplementation(didRegisterUserOriginal);
            method_exchangeImplementations(didRegisterUserOriginal, didRegisterUserMethod);
        } else {
            class_addMethod(appDelegate.class, @selector(application:didRegisterUserNotificationSettings:), didRegisterUserMethodImp, didRegisterUserTypes);
        }
        
        // didRegisterForRemoteNotificationsWithDeviceToken swizzle
        Method didRegisterMethod = class_getInstanceMethod([PushManager class], @selector(my_application:didRegisterForRemoteNotificationsWithDeviceToken:));
        IMP didRegisterMethodImp = method_getImplementation(didRegisterMethod);
        const char* didRegisterTypes = method_getTypeEncoding(didRegisterMethod);
        
        Method didRegisterOriginal = class_getInstanceMethod(appDelegate.class, @selector(application:didRegisterForRemoteNotificationsWithDeviceToken:));
        if (didRegisterOriginal) {
            didRegisterOriginalMethod = method_getImplementation(didRegisterOriginal);
            method_exchangeImplementations(didRegisterOriginal, didRegisterMethod);
        } else {
            class_addMethod(appDelegate.class, @selector(application:didRegisterForRemoteNotificationsWithDeviceToken:), didRegisterMethodImp, didRegisterTypes);
        }
        
        // didFailToRegisterForRemoteNotificationsWithError swizzle
        Method didFailMethod = class_getInstanceMethod([PushManager class], @selector(my_application:didFailToRegisterForRemoteNotificationsWithError:));
        IMP didFailMethodImp = method_getImplementation(didFailMethod);
        const char* didFailTypes = method_getTypeEncoding(didFailMethod);
        
        Method didFailOriginal = class_getInstanceMethod(appDelegate.class, @selector(application:didFailToRegisterForRemoteNotificationsWithError:));
        if (didFailOriginal) {
            didFailOriginalMethod = method_getImplementation(didFailOriginal);
            method_exchangeImplementations(didFailOriginal, didFailMethod);
        } else {
            class_addMethod(appDelegate.class, @selector(application:didFailToRegisterForRemoteNotificationsWithError:), didFailMethodImp, didFailTypes);
        }
        
        // didReceiveRemoteNotification swizzle
        Method didReceiveMethod = class_getInstanceMethod([PushManager class], @selector(my_application:didReceiveRemoteNotification:));
        IMP didReceiveMethodImp = method_getImplementation(didReceiveMethod);
        const char* didReceiveTypes = method_getTypeEncoding(didReceiveMethod);
        
        Method didReceiveOriginal = class_getInstanceMethod(appDelegate.class, @selector(application:didReceiveRemoteNotification:));
        if (didReceiveOriginal) {
            didReceiveOriginalMethod = method_getImplementation(didReceiveOriginal);
            method_exchangeImplementations(didReceiveOriginal, didReceiveMethod);
        } else {
            class_addMethod(appDelegate.class, @selector(application:didReceiveRemoteNotification:), didReceiveMethodImp, didReceiveTypes);
        }
        
        // didReceiveLocalNotification swizzle
        Method didReceiveLocalMethod = class_getInstanceMethod([PushManager class], @selector(my_application:didReceiveLocalNotification:));
        IMP didReceiveLocalMethodImp = method_getImplementation(didReceiveLocalMethod);
        const char* didReceiveLocalTypes = method_getTypeEncoding(didReceiveLocalMethod);
        
        Method didReceiveLocalOriginal = class_getInstanceMethod(appDelegate.class, @selector(application:didReceiveLocalNotification:));
        if (didReceiveLocalOriginal) {
            didReceiveLocalOriginalMethod = method_getImplementation(didReceiveLocalOriginal);
            method_exchangeImplementations(didReceiveLocalOriginal, didReceiveLocalMethod);
        } else {
            class_addMethod(appDelegate.class, @selector(application:didReceiveLocalNotification:), didReceiveLocalMethodImp, didReceiveLocalTypes);
        }

    #if __IPHONE_OS_VERSION_MAX_ALLOWED >= 80000
        // handleActionWithIdentifier remote swizzle
        Method handleActionWithIdentifierRemoteMethod = class_getInstanceMethod([PushManager class], @selector(my_application:handleActionWithIdentifier:forRemoteNotification:completionHandler:));
        IMP handleActionWithIdentifierMethodRemoteImp = method_getImplementation(handleActionWithIdentifierRemoteMethod);
        const char* handleActionWithIdentifierTypesRemote = method_getTypeEncoding(handleActionWithIdentifierRemoteMethod);
        
        Method handleActionWithIdentifierRemoteOriginal = class_getInstanceMethod(appDelegate.class, @selector(application:handleActionWithIdentifier:forRemoteNotification:completionHandler:));
        if (handleActionWithIdentifierRemoteOriginal) {
            handleActionWithIdentifierRemoteOriginalMethod = method_getImplementation(handleActionWithIdentifierRemoteOriginal);
            method_exchangeImplementations(handleActionWithIdentifierRemoteOriginal, handleActionWithIdentifierRemoteMethod);
        } else {
            class_addMethod(appDelegate.class, @selector(application:handleActionWithIdentifier:forRemoteNotification:completionHandler:), handleActionWithIdentifierMethodRemoteImp, handleActionWithIdentifierTypesRemote);
        }

        // handleActionWithIdentifier local swizzle
        Method handleActionWithIdentifierLocalMethod = class_getInstanceMethod([PushManager class], @selector(my_application:handleActionWithIdentifier:forLocalNotification:completionHandler:));
        IMP handleActionWithIdentifierMethodLocalImp = method_getImplementation(handleActionWithIdentifierLocalMethod);
        const char* handleActionWithIdentifierTypesLocal = method_getTypeEncoding(handleActionWithIdentifierLocalMethod);
        
        Method handleActionWithIdentifierLocalOriginal = class_getInstanceMethod(appDelegate.class, @selector(application:handleActionWithIdentifier:forLocalNotification:completionHandler:));
        if (handleActionWithIdentifierLocalOriginal) {
            handleActionWithIdentifierLocalOriginalMethod = method_getImplementation(handleActionWithIdentifierLocalOriginal);
            method_exchangeImplementations(handleActionWithIdentifierLocalOriginal, handleActionWithIdentifierLocalMethod);
        } else {
            class_addMethod(appDelegate.class, @selector(application:handleActionWithIdentifier:forLocalNotification:completionHandler:), handleActionWithIdentifierMethodLocalImp, handleActionWithIdentifierTypesLocal);
        }
    #endif

        NSLog(@"---- UIApplicationDidFinishLaunchingNotification end");
    }];
    
}

-(id)init
{
    NSLog(@"---- pushmanager init");
    [[NSNotificationCenter defaultCenter] addObserver:self selector:@selector(createNotificationChecker:)
                                                 name:@"UIApplicationDidFinishLaunchingNotification" object:nil];
    return self;
}

- (void)createNotificationChecker:(NSNotification *)notification
{
    NSLog(@"---- checking for notification");
    NSLog(notification);
   if (notification)
    {
        NSDictionary *launchOptions = [notification userInfo];
        if (launchOptions)
            [Push sharedInstance].launchNotification = [launchOptions objectForKey: @"UIApplicationLaunchOptionsRemoteNotificationKey"];
    }
}

- (void)my_applicationDidBecomeActive:(UIApplication *)application
{
    NSLog(@"---- my_applicationDidBecomeActive");
    /*
    if (didBecomeActiveOriginalMethod) {
        NSLog(@"---- my_applicationDidBecomeActive, didBecomeActiveOriginalMethod");
        void (*originalImp)(id, SEL, UIApplication *) = didBecomeActiveOriginalMethod;
        originalImp(self, @selector(applicationDidBecomeActive:), application);
    }
    application.applicationIconBadgeNumber = 0;
    if ([Push sharedInstance].launchNotification) {
        NSLog(@"---- my_applicationDidBecomeActive, launchNotification");
        [Push sharedInstance].notificationMessage  = [Push sharedInstance].launchNotification;
        [Push sharedInstance].launchNotification = nil;
        [[Push sharedInstance] performSelectorOnMainThread:@selector(notificationReceived) withObject:[Push sharedInstance]  waitUntilDone:NO];
    }
     */
}

- (void)my_application:(UIApplication *)application didRegisterUserNotificationSettings:(UIUserNotificationSettings *)notificationSettings {
    if (didRegisterOriginalMethod) {
        void (*originalImp)(id, SEL, UIApplication *, NSData *) = didRegisterOriginalMethod;
        originalImp(self, @selector(application:didRegisterUserNotificationSettings:), application, notificationSettings);
    }
    NSLog(@"%@", notificationSettings);
    [[Push sharedInstance] didRegisterUserNotificationSettings:notificationSettings];
}

- (void)my_application:(UIApplication *)application didRegisterForRemoteNotificationsWithDeviceToken:(NSData *)deviceToken {
   if (didRegisterOriginalMethod) {
        void (*originalImp)(id, SEL, UIApplication *, NSData *) = didRegisterOriginalMethod;
        originalImp(self, @selector(application:didRegisterForRemoteNotificationsWithDeviceToken:), application, deviceToken);
    }
    NSLog(@"%@", deviceToken);
    [[Push sharedInstance] didRegisterForRemoteNotificationsWithDeviceToken:deviceToken];
}

- (void)my_application:(UIApplication *)application didReceiveRemoteNotification:(NSDictionary *)userInfo {
    NSLog(@"---- didReceiveRemoteNotification");
    if (didReceiveOriginalMethod) {
        void (*originalImp)(id, SEL, UIApplication *, NSDictionary *) = didReceiveOriginalMethod;
        originalImp(self, @selector(application:didReceiveRemoteNotification:), application, userInfo);
    }
    
    UIApplicationState appState = UIApplicationStateActive;
    if ([application respondsToSelector:@selector(applicationState)]) {
        appState = application.applicationState;
    }
    
    if (appState == UIApplicationStateActive) {
        [Push sharedInstance].notificationMessage = userInfo;
        [Push sharedInstance].isInline = YES;
        [[Push sharedInstance] notificationReceived];        
    } else {
        [Push sharedInstance].launchNotification = userInfo;
    }
}

- (void)my_application:(UIApplication *)application didFailToRegisterForRemoteNotificationsWithError:(NSError *)error {
    if (didFailOriginalMethod) {
        void (*originalImp)(id, SEL, UIApplication *, NSError *) = didFailOriginalMethod;
        originalImp(self, @selector(application:didFailToRegisterForRemoteNotificationsWithError:), application, error);
    }
    NSLog(@"--- Error (didFailToRegisterForRemoteNotificationsWithError)");
    [[Push sharedInstance] didFailToRegisterForRemoteNotificationsWithError:error];
}

- (void)my_application:(UIApplication *) application handleActionWithIdentifier: (NSString *) identifier forRemoteNotification: (NSDictionary *) notification completionHandler: (void (^)()) completionHandler {
    
    NSLog(@"---- handle action with identifier (forRemoteNotification)");
    
    NSMutableDictionary *mutableNotification = [notification mutableCopy];
    
    [mutableNotification setObject:identifier forKey:@"identifier"];
    if (application.applicationState == UIApplicationStateActive) {
        [Push sharedInstance].notificationMessage = mutableNotification;
        [Push sharedInstance].isInline = YES;
        [[Push sharedInstance] notificationReceived];
    } else {
        [Push sharedInstance].notificationMessage = mutableNotification;
        [[Push sharedInstance] performSelectorOnMainThread:@selector(notificationReceived) withObject:[Push sharedInstance] waitUntilDone:NO];
    }
    
    if (handleActionWithIdentifierRemoteOriginalMethod) {
        void (*originalImp)(id, SEL, UIApplication *, NSString *, NSDictionary *, void(^)()) = handleActionWithIdentifierRemoteOriginalMethod;
        originalImp(self, @selector(application:handleActionWithIdentifier:forRemoteNotification:completionHandler:), application, identifier, notification, completionHandler);
    } else {
        completionHandler();
    }
}

- (void)my_application:(UIApplication *)application didReceiveLocalNotification:(UILocalNotification *)notification {
    NSLog(@"---- didReceiveLocalNotification");
    if (didReceiveLocalOriginalMethod) {
        NSLog(@"---- didReceiveLocalNotification, didReceiveLocalOriginalMethod");
        void (*originalImp)(id, SEL, UIApplication *, UILocalNotification *) = didReceiveOriginalMethod;
        originalImp(self, @selector(application:didReceiveLocalNotification:), application, notification);
    }
    
    UIApplicationState appState = UIApplicationStateActive;
    if ([application respondsToSelector:@selector(applicationState)]) {
        appState = application.applicationState;
        NSLog(@"---- didReceiveLocalNotification, appState");
    }
    
    if (appState == UIApplicationStateActive) {
        NSLog(@"---- didReceiveLocalNotification, UIApplicationStateActive");
        [Push sharedInstance].notificationMessage = notification;
        [Push sharedInstance].isInline = YES;
        [[Push sharedInstance] notificationReceived];
    } else {
        NSLog(@"---- didReceiveLocalNotification, NOT UIApplicationStateActive, notification:");
        NSLog(notification.userInfo);
//        NSLog([notification.userInfo objectForKey:@"message"]);
        [Push sharedInstance].launchNotification = notification;
        [Push sharedInstance].notificationMessage = notification;
    }
}

- (void)my_application:(UIApplication *) application handleActionWithIdentifier: (NSString *) identifier forLocalNotification: (UILocalNotification *) notification completionHandler: (void (^)()) completionHandler {
    
    NSLog(@"---- handle action with identifier (forLocalNotification)");
    
//    NSMutableDictionary *mutableNotification = [notification mutableCopy];
    
//    [mutableNotification setObject:identifier forKey:@"identifier"];
    if (application.applicationState == UIApplicationStateActive) {
        [Push sharedInstance].notificationMessage = notification;
        [Push sharedInstance].isInline = YES;
        [[Push sharedInstance] notificationReceived];
    } else {
        [Push sharedInstance].notificationMessage = notification;
        [[Push sharedInstance] performSelectorOnMainThread:@selector(notificationReceived) withObject:[Push sharedInstance] waitUntilDone:NO];
    }
    
    if (handleActionWithIdentifierLocalOriginalMethod) {
        void (*originalImp)(id, SEL, UIApplication *, NSString *, UILocalNotification *, void(^)()) = handleActionWithIdentifierLocalOriginalMethod;
        originalImp(self, @selector(application:handleActionWithIdentifier:forLocalNotification:completionHandler:), application, identifier, notification, completionHandler);
    } else {
        completionHandler();
    }
}

@end
