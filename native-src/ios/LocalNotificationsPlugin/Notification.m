#import "Notification.h"
#import <UIKit/UIKit.h>
#import <UIKit/UIUserNotificationSettings.h>
#import <objc/runtime.h>

const NSString * badgeKey = @"badge";
const NSString * soundKey = @"sound";
const NSString * alertKey = @"alert";
//const NSString * didRegisterEventName = @"didRegisterForRemoteNotificationsWithDeviceToken";
const NSString * didRegisterUserNotificationsEventName = @"didRegisterUserNotificationSettings2";
//const NSString * didFailToRegisterEventName = @"didFailToRegisterForRemoteNotificationsWithError";
const NSString * notificationReceivedEventName = @"notificationReceived";
const NSString * setBadgeNumberEventName = @"setApplicationIconBadgeNumber";
// HUH!? Kan deze plugin ook al local notifications? Test in een project met de {N} push plugin!!
// -- ofwel, start een nieuw project met deze plugin en kijk wat ie doet
const NSString * didRegisterUserNotificationSettingsEventName = @"didRegisterUserNotificationSettings";
const NSString * failToRegisterUserNotificationSettingsEventName = @"failToRegisterUserNotificationSettings";

static char launchNotificationKey;

@implementation Notification

@synthesize notificationMessage;
@synthesize isInline;

+ (instancetype)sharedInstance
{
    static Notification *sharedInstance = nil;
    static dispatch_once_t onceToken;
    dispatch_once(&onceToken, ^{
        sharedInstance = [[Notification alloc] init];
    });
    return sharedInstance;
}

-(void)register:(NSMutableDictionary *)options
{
#if __IPHONE_OS_VERSION_MAX_ALLOWED >= 80000
    UIUserNotificationType UserNotificationTypes = UIUserNotificationTypeNone;
    if([self isTrue: badgeKey fromOptions: options]) UserNotificationTypes |= UIUserNotificationTypeBadge;
    if([self isTrue: soundKey fromOptions: options]) UserNotificationTypes |= UIUserNotificationTypeSound;
    if([self isTrue: alertKey fromOptions: options]) UserNotificationTypes |= UIUserNotificationTypeAlert;
#endif
    UIRemoteNotificationType notificationTypes = UIRemoteNotificationTypeNone;
    notificationTypes |= UIRemoteNotificationTypeNewsstandContentAvailability;
    
    if([self isTrue: badgeKey fromOptions: options]) notificationTypes |= UIRemoteNotificationTypeBadge;
    if([self isTrue: soundKey fromOptions: options]) notificationTypes |= UIRemoteNotificationTypeSound;
    if([self isTrue: alertKey fromOptions: options]) notificationTypes |= UIRemoteNotificationTypeAlert;

#if __IPHONE_OS_VERSION_MAX_ALLOWED >= 80000
    UserNotificationTypes |= UIUserNotificationActivationModeBackground;
#endif
    
    if (notificationTypes == UIRemoteNotificationTypeNone)
        NSLog(@"LocalNotificationsPlugin.register: Notification type is set to none");
    
    isInline = NO;
    
#if __IPHONE_OS_VERSION_MAX_ALLOWED >= 80000
    if ([[UIApplication sharedApplication]respondsToSelector:@selector(registerUserNotificationSettings:)]) {
        UIUserNotificationSettings *settings = [UIUserNotificationSettings settingsForTypes:UserNotificationTypes categories:nil];
        [[UIApplication sharedApplication] registerUserNotificationSettings:settings];
        [[UIApplication sharedApplication] registerForRemoteNotifications];
    } else {
        [[UIApplication sharedApplication] registerForRemoteNotificationTypes:notificationTypes];
    }
#else
    [[UIApplication sharedApplication] registerForRemoteNotificationTypes:notificationTypes];
#endif

    [self notificationReceived];
}

- (BOOL)isTrue:(NSString *)key fromOptions:(NSMutableDictionary *)options
{
    id arg = [options objectForKey:key];
    
    if([arg isKindOfClass:[NSString class]]) return [arg isEqualToString:@"true"];

    if([arg boolValue]) return true;
    
    return false;
}

- (void)didRegisterUserNotificationSettings:(UIUserNotificationSettings *)notificationSettings
{
    NSLog(@"------ didRegisterUserNotificationSettings");

    
    
    NSMutableDictionary *results = [NSMutableDictionary dictionary];

//#if !TARGET_IPHONE_SIMULATOR
    // Get Bundle Info for Remote Registration (handy if you have more than one app)
    [results setValue:[[[NSBundle mainBundle] infoDictionary] objectForKey:@"CFBundleDisplayName"] forKey:@"appName"];
    [results setValue:[[[NSBundle mainBundle] infoDictionary] objectForKey:@"CFBundleVersion"] forKey:@"appVersion"];
    
    /*
    // Check what Notifications the user has turned on.  We registered for all three, but they may have manually disabled some or all of them.
    NSUInteger rntypes = [[UIApplication sharedApplication] enabledRemoteNotificationTypes];
    
    // Set the defaults to disabled unless we find otherwise...
    NSString *pushBadge = @"disabled";
    NSString *pushAlert = @"disabled";
    NSString *pushSound = @"disabled";
    
    // Check what Registered Types are turned on. This is a bit tricky since if two are enabled, and one is off, it will return a number 2... not telling you which
    // one is actually disabled. So we are literally checking to see if rnTypes matches what is turned on, instead of by number. The "tricky" part is that the
    // single notification types will only match if they are the ONLY one enabled.  Likewise, when we are checking for a pair of notifications, it will only be
    // true if those two notifications are on.  This is why the code is written this way
    if(rntypes & UIRemoteNotificationTypeBadge){
        pushBadge = @"enabled";
    }
    if(rntypes & UIRemoteNotificationTypeAlert) {
        pushAlert = @"enabled";
    }
    if(rntypes & UIRemoteNotificationTypeSound) {
        pushSound = @"enabled";
    }
    
    [results setValue:pushBadge forKey:@"pushBadge"];
    [results setValue:pushAlert forKey:@"pushAlert"];
    [results setValue:pushSound forKey:@"pushSound"];
    
    // Get the users Device Model, Display Name, Token & Version Number
    UIDevice *dev = [UIDevice currentDevice];
    [results setValue:dev.name forKey:@"deviceName"];
    [results setValue:dev.model forKey:@"deviceModel"];
    [results setValue:dev.systemVersion forKey:@"deviceSystemVersion"];
    */
    [self success:didRegisterUserNotificationsEventName WithMessage:[NSString stringWithFormat:@"%@", @"nice"]];
//#endif
}


/*
- (void)didRegisterForRemoteNotificationsWithDeviceToken:(NSData *)deviceToken
{
    NSMutableDictionary *results = [NSMutableDictionary dictionary];
    NSString *token = [[[[deviceToken description] stringByReplacingOccurrencesOfString:@"<"withString:@""]
                        stringByReplacingOccurrencesOfString:@">" withString:@""]
                       stringByReplacingOccurrencesOfString: @" " withString: @""];
    [results setValue:token forKey:@"deviceToken"];
    
#if !TARGET_IPHONE_SIMULATOR
    // Get Bundle Info for Remote Registration (handy if you have more than one app)
    [results setValue:[[[NSBundle mainBundle] infoDictionary] objectForKey:@"CFBundleDisplayName"] forKey:@"appName"];
    [results setValue:[[[NSBundle mainBundle] infoDictionary] objectForKey:@"CFBundleVersion"] forKey:@"appVersion"];
    
    // Check what Notifications the user has turned on.  We registered for all three, but they may have manually disabled some or all of them.
    NSUInteger rntypes = [[UIApplication sharedApplication] enabledRemoteNotificationTypes];
    
    // Set the defaults to disabled unless we find otherwise...
    NSString *pushBadge = @"disabled";
    NSString *pushAlert = @"disabled";
    NSString *pushSound = @"disabled";
    
    // Check what Registered Types are turned on. This is a bit tricky since if two are enabled, and one is off, it will return a number 2... not telling you which
    // one is actually disabled. So we are literally checking to see if rnTypes matches what is turned on, instead of by number. The "tricky" part is that the
    // single notification types will only match if they are the ONLY one enabled.  Likewise, when we are checking for a pair of notifications, it will only be
    // true if those two notifications are on.  This is why the code is written this way
    if(rntypes & UIRemoteNotificationTypeBadge){
        pushBadge = @"enabled";
    }
    if(rntypes & UIRemoteNotificationTypeAlert) {
        pushAlert = @"enabled";
    }
    if(rntypes & UIRemoteNotificationTypeSound) {
        pushSound = @"enabled";
    }
    
    [results setValue:pushBadge forKey:@"pushBadge"];
    [results setValue:pushAlert forKey:@"pushAlert"];
    [results setValue:pushSound forKey:@"pushSound"];
    
    // Get the users Device Model, Display Name, Token & Version Number
    UIDevice *dev = [UIDevice currentDevice];
    [results setValue:dev.name forKey:@"deviceName"];
    [results setValue:dev.model forKey:@"deviceModel"];
    [results setValue:dev.systemVersion forKey:@"deviceSystemVersion"];
    
    [self success:didRegisterEventName WithMessage:[NSString stringWithFormat:@"%@", token]];
#endif
}

- (void)didFailToRegisterForRemoteNotificationsWithError:(NSError *)error
{
    [self fail:didFailToRegisterEventName WithMessage:@"" withError:error];
}
 */

// NOTE: to update the framework in the demo app, copy the built fwk to the /lib/iOS folder, then simply run the project
- (void)notificationReceived
{
    if (self.notificationMessage)
    {
       NSMutableString *jsonStr = [NSMutableString stringWithString:@"{"];
        
        if (self.notificationMessage.userInfo != nil) {
            [self parseDictionary:self.notificationMessage.userInfo intoJSON:jsonStr];
        }

        if (isInline) {
            [jsonStr appendFormat:@"\"foreground\":true"];
            isInline = NO;
        } else {
            [jsonStr appendFormat:@"\"foreground\":false"];
        }
        
        [jsonStr appendString:@"}"];
        NSLog(@"----- notificationReceived, has notificationMessage 3: %@", jsonStr);
        [self success:notificationReceivedEventName WithMessage:jsonStr];
        self.notificationMessage = nil;
    }
    if (self.launchNotification)
    {
        NSLog(@"----- notificationReceived, has launchNotification!");
    }
}

-(void)parseDictionary:(NSDictionary *)inDictionary intoJSON:(NSMutableString *)jsonString
{
    NSArray         *keys = [inDictionary allKeys];
    NSString        *key;
    
    for (key in keys)
    {
        id thisObject = [inDictionary objectForKey:key];
        
        if ([thisObject isKindOfClass:[NSDictionary class]])
            [self parseDictionary:thisObject intoJSON:jsonString];
        else if ([thisObject isKindOfClass:[NSString class]])
            [jsonString appendFormat:@"\"%@\":\"%@\",",
             key,
             [[[[inDictionary objectForKey:key]
                stringByReplacingOccurrencesOfString:@"\\" withString:@"\\\\"]
               stringByReplacingOccurrencesOfString:@"\"" withString:@"\\\""]
              stringByReplacingOccurrencesOfString:@"\n" withString:@"\\n"]];
        else {
            [jsonString appendFormat:@"\"%@\":\"%@\",", key, [inDictionary objectForKey:key]];
        }
    }
}

- (void)setApplicationIconBadgeNumber:(NSMutableDictionary *)options
{
    int badge = [[options objectForKey:badgeKey] intValue] ?: 0;
    
    [[UIApplication sharedApplication] setApplicationIconBadgeNumber:badge];
    
    [self success:setBadgeNumberEventName WithMessage:[NSString stringWithFormat:@"app badge count set to %d", badge]];
}

- (void)registerUserNotificationSettings:(NSDictionary*)options
{
    NSLog(@"--- in registerUserNotificationSettings");

#if __IPHONE_OS_VERSION_MAX_ALLOWED >= 80000
    if (![[UIApplication sharedApplication]respondsToSelector:@selector(registerUserNotificationSettings:)]) {
        [self success:didRegisterUserNotificationSettingsEventName WithMessage:[NSString stringWithFormat:@"%@", @"user notifications not supported for this ios version."]];
        return;
    }
    
    /*
    NSArray *categories = [options objectForKey:@"categories"];
    if (categories == nil) {
        [self fail:failToRegisterUserNotificationSettingsEventName WithMessage:@"No categories specified" withError:nil];
        return;
    }
    NSMutableArray *nsCategories = [[NSMutableArray alloc] initWithCapacity:[categories count]];
    
    for (NSDictionary *category in categories) {
        // ** 1. create the actions for this category
        NSMutableArray *nsActionsForDefaultContext = [[NSMutableArray alloc] initWithCapacity:4];
        NSArray *actionsForDefaultContext = [category objectForKey:@"actionsForDefaultContext"];
        if (actionsForDefaultContext == nil) {
            [self fail:failToRegisterUserNotificationSettingsEventName WithMessage:@"Category doesn't contain actionsForDefaultContext" withError:nil];
            return;
        }
        if (![self createNotificationAction:category actions:actionsForDefaultContext nsActions:nsActionsForDefaultContext]) {
            return;
        }
        
        NSMutableArray *nsActionsForMinimalContext = [[NSMutableArray alloc] initWithCapacity:2];
        NSArray *actionsForMinimalContext = [category objectForKey:@"actionsForMinimalContext"];
        if (actionsForMinimalContext == nil) {
            [self fail:failToRegisterUserNotificationSettingsEventName WithMessage:@"Category doesn't contain actionsForMinimalContext" withError:nil];
            return;
        }
        if (![self createNotificationAction:category actions:actionsForMinimalContext nsActions:nsActionsForMinimalContext]) {
            return;
        }
        
        // ** 2. create the category
        UIMutableUserNotificationCategory *nsCategory = [[UIMutableUserNotificationCategory alloc] init];
        // Identifier to include in your push payload and local notification
        NSString *identifier = [category objectForKey:@"identifier"];
        if (identifier == nil) {
            [self fail:failToRegisterUserNotificationSettingsEventName WithMessage:@"Category doesn't contain identifier" withError:nil];
            return;
        }
        nsCategory.identifier = identifier;
        // Add the actions to the category and set the action context
        [nsCategory setActions:nsActionsForDefaultContext forContext:UIUserNotificationActionContextDefault];
        // Set the actions to present in a minimal context
        [nsCategory setActions:nsActionsForMinimalContext forContext:UIUserNotificationActionContextMinimal];
        [nsCategories addObject:nsCategory];
    }
    
    // ** 3. Determine the notification types
    NSArray *types = [options objectForKey:@"types"];
    if (types == nil) {
        [self fail:failToRegisterUserNotificationSettingsEventName WithMessage:@"No types specified" withError:nil];
        return;
    }
    UIUserNotificationType nsTypes = UIUserNotificationTypeNone;
    for (NSString *type in types) {
        if ([type isEqualToString:badgeKey]) {
            nsTypes |= UIUserNotificationTypeBadge;
        } else if ([type isEqualToString:alertKey]) {
            nsTypes |= UIUserNotificationTypeAlert;
        } else if ([type isEqualToString:soundKey]) {
            nsTypes |= UIUserNotificationTypeSound;
        } else {
            [self fail:failToRegisterUserNotificationSettingsEventName WithMessage:[NSString stringWithFormat:@"Unsupported type: %@, use one of badge, alert, sound", type] withError:nil];
        }
    }
    
    // ** 4. Register the notification categories
    NSSet *nsCategorySet = [NSSet setWithArray:nsCategories];
    
    
    UIUserNotificationSettings *settings = [UIUserNotificationSettings settingsForTypes:nsTypes categories:nsCategorySet];
    [[UIApplication sharedApplication] registerUserNotificationSettings:settings];
     
     */
    
    UIUserNotificationSettings *settings = [[UIApplication sharedApplication] currentUserNotificationSettings];
    UIUserNotificationType types = settings.types|UIUserNotificationTypeAlert|UIUserNotificationTypeBadge|UIUserNotificationTypeSound;
    settings = [UIUserNotificationSettings settingsForTypes:types categories:nil];
    [[UIApplication sharedApplication] registerUserNotificationSettings:settings];
    
#endif
    [self success:didRegisterUserNotificationSettingsEventName WithMessage:[NSString stringWithFormat:@"%@", @"user notifications registered!"]];

//    [self checkPendingNotification];
}

/*
-(void)checkPendingNotification {
    if (notificationMessage) {
        NSLog(@"--- in checkPendingNotification, notificationMessage");
        [self notificationReceived];
    } else if (self.launchNotification) {
        NSLog(@"--- in checkPendingNotification, launchNotification");
        notificationMessage = self.launchNotification;
        [self notificationReceived];
    } else {
        NSLog(@"--- in checkPendingNotification, nothing");
    }
}
*/

#if __IPHONE_OS_VERSION_MAX_ALLOWED >= 80000
- (BOOL)createNotificationAction:(NSDictionary *)category
                         actions:(NSArray *) actions
                       nsActions:(NSMutableArray *)nsActions
{
    for (NSDictionary *action in actions) {
        UIMutableUserNotificationAction *nsAction = [[UIMutableUserNotificationAction alloc] init];
        // Define an ID string to be passed back to your app when you handle the action
        NSString *identifier = [action objectForKey:@"identifier"];
        if (identifier == nil) {
            [self fail:failToRegisterUserNotificationSettingsEventName WithMessage:@"Action doesn't contain identifier" withError:nil];
            return NO;
        }
        nsAction.identifier = identifier;
        // Localized text displayed in the action button
        NSString *title = [action objectForKey:@"title"];
        if (title == nil) {
            [self fail:failToRegisterUserNotificationSettingsEventName WithMessage:@"Action doesn't contain title" withError:nil];
            return NO;
        }
        nsAction.title = title;
        // If you need to show UI, choose foreground (background gives your app a few seconds to run)
        BOOL isForeground = [@"foreground" isEqualToString:[action objectForKey:@"activationMode"]];
        nsAction.activationMode = isForeground ? UIUserNotificationActivationModeForeground : UIUserNotificationActivationModeBackground;
        // Destructive actions display in red
        BOOL isDestructive = [[action objectForKey:@"destructive"] isEqual:[NSNumber numberWithBool:YES]];
        nsAction.destructive = isDestructive;
        // Set whether the action requires the user to authenticate
        BOOL isAuthRequired = [[action objectForKey:@"authenticationRequired"] isEqual:[NSNumber numberWithBool:YES]];
        nsAction.authenticationRequired = isAuthRequired;
        [nsActions addObject:nsAction];
    }
    return YES;
}
#endif

-(void)success:(NSString *)eventName WithDictionary:(NSMutableDictionary *)userInfo
{
    [[NSNotificationCenter defaultCenter]
     postNotificationName:eventName
     object:self userInfo:userInfo];
}

-(void)success:(NSString *)eventName WithMessage:(NSString *)message
{
    NSMutableDictionary *userInfo = [NSMutableDictionary dictionary];
    [userInfo setValue:message forKey:@"message"];
    [[NSNotificationCenter defaultCenter] postNotificationName:eventName object:self userInfo:userInfo];
}

-(void)fail:(NSString *)eventName WithMessage:(NSString *)message withError:(NSError *)error
{
    NSMutableDictionary *userInfo = [NSMutableDictionary dictionary];
    NSString *errorMessage = (error) ? [NSString stringWithFormat:@"%@ - %@", message, [error localizedDescription]] : message;
    [userInfo setValue:errorMessage forKey:@"message"];
    
    [[NSNotificationCenter defaultCenter]
     postNotificationName:eventName
     object:self userInfo:userInfo];
}

- (NSMutableArray *)launchNotification
{
    return objc_getAssociatedObject(self, &launchNotificationKey);
}

- (void)setLaunchNotification:(UILocalNotification *)notification
{
    NSLog(@"---- setLaunchNotification");
    objc_setAssociatedObject(self, &launchNotificationKey, notification, OBJC_ASSOCIATION_RETAIN_NONATOMIC);
}

- (void)dealloc
{
    NSLog(@"---- dealloc, nilling launchNotification");
    self.launchNotification	= nil;
}

@end
