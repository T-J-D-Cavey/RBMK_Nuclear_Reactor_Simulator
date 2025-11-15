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
 
- Full review of all UI, checking wording, designs
- Remove warning border affects from performance readout
- On hard, power target range needs reducing slightly
- Add a 'numberofPowerCuts' state and a 'numberOfRodFailures' state and set them to 0. Whenever there is a power cut or rod seizure event, add 1 to the value. Then adjust event logic so it checks if roll <33 && numberofPowerCuts is < whatever value for easy / hard, then initiate power cut, else if roll <33 && numberofRodFailues is < whatever value for easy / hard, initiate rod falue, else initiate power target change. I think for easy, 1 power cut and 2 control rod failures is good. For hard, 2 power cuts and 3 control rod failues. We can then increase the duration of powercut and rod failues
- fix control rod modal so 100% insertion doesn't cause neighbour elements to move sideways, it's related to margin I think
- Test adding background picture for game page
- AZ5 button changes when I hover but doesn't change back after moving mouse away

OPTIONAL MECHANIC CHANGES:

- Review all mechnics that use flat change values and consider making them proportional to the thing they are affected by, similar to how steam is worked out. That way everything is more exponential
- Consider increasing affect all all factors, maintani balance but ensuring things move out of balance faster
