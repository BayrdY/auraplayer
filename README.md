# AuraPlayer

AuraPlayer is a desktop music player built with Electron, featuring a custom Spotify-like UI. It functions as a wrapper for the YouTube IFrame API, utilizing local JSON storage for metadata and playlist management to bypass external API rate limits. 

This project was developed strictly for educational purposes and as a UI/UX portfolio piece.

## Technical Architecture

* **Frontend:** Vanilla HTML, CSS (Glassmorphism UI), and JavaScript.
* **Backend/Framework:** Electron.js (Node.js integration).
* **Data Layer:** Static `db.json` file for track metadata storage.
* **Media Engine:** YouTube IFrame API.
* **IPC Communication:** ContextBridge with `nodeIntegration: false` for secure renderer-main process messaging.

## Features

* **Custom Frameless UI:** Replaces default OS window controls with a custom drag-region and CSS-based controls.
* **Zero-API Quota Design:** Uses a pre-scraped local JSON database instead of live YouTube Data API queries.
* **Deep Linking:** Implements a custom `auraplayer://` protocol handler for sharing custom playlists locally.
* **Multilingual Support:** UI localization for Turkish, English, German, French, Spanish, and Russian.
* **Crossfade Simulation:** Basic volume-ramping logic between two hidden YouTube IFrames.

## Disclaimer & Legal

AuraPlayer is a proof-of-concept. It does not host any audio files or bypass DRM. Media playback relies on the official YouTube embedded player. This repository contains only the application shell and logic; it does not distribute copyrighted material.

## Installation

1. Download the latest executable from the Releases page.
2. Run the installer.
