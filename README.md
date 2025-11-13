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
 
- get v0 to fix: on the control rod modal, 
- Get v0 to fix: There is a bug relating to the opening of the water-pumps-modal, turbine-modal and control-rods modal on small screens like a mobile phone. If I open one of these modals, the UI behind the modal becomes slightly squashed and to the right. When the modal is closed, the UI then jumps back into its original position. This creates a jittery, glitchy effect. I want everything behind the modal to be unmoved, no changes to width or anything. The result should be a seamless opening and closing of the modals without any changes. 
- Get v0 to implement: add a modal when the user selects 'start game' from the landing page, which asks them to choose a dificulty: Easy or Hard. This is then saved in the game state for the start of the game. 
- Get v0 to implement: Add a 'dificultyIsHard' property to the game state, and set that to true if the user chooses hard, and set it to false if the user chooses easy. 
- Get v0 to implement: change the clock so it times down to 0. If it gets to 0, the user wins. This will need a new component similar to the game over page, but instead of 'game over' it's a 'success' page
- I need to then access the dificulty state in lots of places: 
- Game-events: I should save different values for easy vs hard and then use those variables to change power target range, number of control rods that get stuck, length of period they can be stuck, length of power cut
- Types: I should save different values for easy vs hard and then use those variables to change timer (15 minutes for easy, 30 minutes for hard), and power threshold (15% for easy, 10% for hard)
- Update control rod function so any insertion between 1-10% equals radioactivity inrease, and then 11-100% is radioactivity decrease
- Review events mechanics to make sure it's workign as expected. I'm not sure the random time between events is working as expected and it might be worth removing the random time interval, and just keeping which event happens random 
- Full review of all UI, checking wording, designs
- Consider changing name of game to "Hinkley"
