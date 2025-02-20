# Hidden video challenge

This is a challenge we faced recently. There's a setting on StreamYard called "Audio Avatars". If a user turns their camera off when that setting is on, we show an avatar image in the stream. But if the setting is off, we hide that user. This can be confusing for other users since they're not sure if the person left, or if they just turned their camera off. As a result, we added a notification that says when someone is hidden because their camera is off.

![hidden video notification](https://res.cloudinary.com/streamyard-dev/image/upload/v1603850115/github-images/hidden-video-notification.png)

We'll be implementing a similar notification on this example app. Here's what the solution should look like:

![hidden video solution](https://res.cloudinary.com/streamyard-dev/image/upload/v1603850115/github-images/hidden-video-solution.png)

Here's a [video](https://www.loom.com/share/c2f0a8e359cf4367ab7dece00b52b770) showing how the notification works now on StreamYard.

## Getting started

Install the dependencies
```shell
yarn install
```

Run webpack dev server
```shell
yarn start
```

You should be able to access the application at http://localhost:8080

## Your challenge

Add a notification for users that tells them which users are hidden because their camera is off. The message should change based on who is hidden. Use the following guidelines for the message:
- Only you are hidden -> "You are in the stream with audio only"
- You and one guest are hidden -> "You and 1 other are in the stream with audio only"
- You and multiple guests are hidden -> "You and {x} others are in the stream with audio only"
- Only 1 guest is hidden -> "{name} is in the stream with audio only"
- Multiple guests are hidden -> "{x} others are in the stream with audio only"

The notification should _not_ be visible all the time. It should only appear for a short amount of time right after someone turns off their camera. It should fade out about 5 seconds later. Every time someones camera is turned off, the notification should appear for another 5 seconds.
