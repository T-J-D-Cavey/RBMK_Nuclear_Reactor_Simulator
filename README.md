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
 
- modals are still causing page to shift. There seems to be something causing width to be more than 100% on small screens. Might need to consider reducing width of reactor image
- the red border radius glow on alets only has glow internally, it should glow inside and outside
- power cuts are happening too often, something is wrong with event logic
- game over screen: stats read 'time survived' but it shoudl be 'time remaining'
- edit rod calculation function so that it checks if rod value was at 0 before and now is higher than 0. If it is, add 20 radiation, 20 reactor temp, 10 steam, -10 Xenon. This might need adding a proprty to the rods object "wasInsertedFromZero" Boolean 
- Reduce earliest time till first event from 1 minute to 30 seconds 
- Full review of all UI, checking wording, designs
- Consider changing name of game to "Hinkley"
