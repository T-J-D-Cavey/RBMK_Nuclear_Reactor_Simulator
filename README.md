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
- Test adding background picture for game page
- AZ5 button changes when I hover but doesn't change back after moving mouse away
- "lastEventTime: 900" in initiral game state are other bits of starting state is correctly changed somewhere when hard mode is selected, try and find out where

MECHANIC CHANGES:

- Review all mechnics that use flat change values and consider making them proportional to the thing they are affected by, similar to how steam is worked out. That way everything is more exponential
- Consider increasing affect all all factors, maintani balance but ensuring things move out of balance faster

OPTION NEW FUNCTIONALITY:

- change turbine modal so there is the option to power pumps. If on, the number of pumps that are powered is based on power station power geneartion.
