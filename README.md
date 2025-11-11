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
 
- Update event logic to events are more frequent, power changes are more common, followed by control rods getting stuck, and make it so that all control rods are stuck at once, not just 1 at a time, and the least common is power cut
- Update control rod function so any insertion between 1-10% equals radioactivity inrease, and then 11-100% is radioactivity decrease
- Get v0 to fix control rod modal: it won't work on mobible screens, I think it's because it was changes to only allow click and drag. The modal control rods are still too thick especially the % boxes. They can be at the bottom
- Get v0 to adjust appearance of water pump modal so the on off switches are taps and not the modern slider buttons they currently are. I might want to pass it an image of a tab to help
- Draw a reactor shape, get Gemini to then create a modal of it and then pass it to v0 to create
- Draw a turbine, get Gemini to then create a modal of it and then pass it to v0 to create
- Get v0 to update turbine modal 
- Get v0 to fix warning lights, on small screens they aren't perfect circles
- Get v0 to make the warning panals hideable, as they take up a lot of space on mobile screens. 
-
