# Chernobyl reactor game

*Automatically synced with your [v0.app](https://v0.app) deployments*

[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com/tim-caveys-projects/v0-chernobyl)
[![Built with v0](https://img.shields.io/badge/Built%20with-v0.app-black?style=for-the-badge)](https://v0.app/chat/eZ4dpLZrJcL)

## Overview

This repository will stay in sync with your deployed chats on [v0.app](https://v0.app).
Any changes you make to your deployed app will be automatically pushed to this repository from [v0.app](https://v0.app).

## Deployment

Your project is live at:

**[https://vercel.com/tim-caveys-projects/v0-chernobyl](https://vercel.com/tim-caveys-projects/v0-chernobyl)**

## Build your app

Continue building your app on:

**[https://v0.app/chat/eZ4dpLZrJcL](https://v0.app/chat/eZ4dpLZrJcL)**

## How It Works

1. Create and modify your project using [v0.app](https://v0.app)
2. Deploy your chats from the v0 interface
3. Changes are automatically pushed to this repository
4. Vercel deploys the latest version from this repository


FIXES TO MAKE:
 
- Get Gemini to redo the reactor image, as the current one is pixilated. Ask for it to match the metal style of the grey water pipes. When done, crop it, remove bg, add to github, pull into v0, replace import
- Improve turbine design and modal?
- Update designs to make sure the reactor image, 4 water pumps and turbine are all inside a container, and then use Absolute positioning to ensure consistent placement for all screensizes. The 2 lower water pumps could be rotated and on the bottom?
- Update water pump buttons so one pump (grey) and the other pump (blue) have JSX elements, but it has a "hidden" property that will change depending on the state of water pump on/off and power on/off, that way we avoid the image having to load when the user turns the pump on or off.
- Create a background image to go behind control rods, that matches the silver metal style of new reactor image 
- Get v0 to add a modal when the user selects 'start game' from landing page, which asks them to choose a dificulty: Easy, Hard. This is then saved in the game state for the start of the game
- Get v0 to change the clock so it times down to 0. If it gets to 0, the user wins.
- I need to then access the dificulty state in lots of places: 
- Game-events: I should save different values for easy vs hard and then use those variables to change power target range, number of control rods that get stuck, length of period they can be stuck, length of power cut
- Types: I should save different values for easy vs hard and then use those variables to change timer (15 minutes for easy, 30 minutes for hard), and power threshold (15% for easy, 10% for hard)
- Update control rod function so any insertion between 1-10% equals radioactivity inrease, and then 11-100% is radioactivity decrease
- Review events mechanics to make sure it's workign as expected. I'm not sure the random time between events is working as expected and it might be worth removing the random time interval, and just keeping which event happens random 
- Full review of all UI, checking wording, designs
- Consider changing name of game to "Hinkley"

MECHANIC ADJUSTMENT TWEAKS:

- Threshold for Xenon build up should be reduced to <= 50 radioactivity
- Control rods when fully inserted should be more powerful OR control rods in general should be a tiny bit more powerful
- Water pumps should be a tiny bit more powerful 
- The duration of control rod freezing should be shorter
- The proportion of power target changes should be higher
- High temp impact to radioactivity should be reduced
