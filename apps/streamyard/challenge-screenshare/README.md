# Screenshare challenge

This is a challenge we faced recently. When a user shares their screen, we wanted to show an icon button in the top right corner of the video. But by default, the icon was floating in space!

See [this video](https://www.loom.com/share/f4da1b3543b042c18d57677831c6607a) for a full explanation of the problem and your challenge.

## Getting started

Install the dependencies
```shell
bun install
```

Run webpack dev server
```shell
bun run start
```

You should be able to access the application at http://localhost:8080

## Your challenge

Update the src/Stream.js file to achieve the behavior explained in the video.

You shouldn't need to edit any other files, but you may want to play around with the `containerHeight` and `containerWidth` props in the src/index.js file to test your component. The Stream.js should be able to handle various container sizes/aspect ratios.

The Stream.js component is currently set up to use hooks, but you're welcome to switch it to a class component if you prefer!

## How to submit your solution

- Don't fork this repo or create a pull request as that would make your solution public for others to see!
- When you're done, create a new private github gist with the content of your Stream.js file and send us the link.
