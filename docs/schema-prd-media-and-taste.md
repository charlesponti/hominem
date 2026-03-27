# Media And Taste PRD

## Purpose

Define the requirements for persistent taste, catalog objects, and media activity history.

## Tables

- `app.music_artists`
- `app.music_albums`
- `app.music_tracks`
- `app.music_playlists`
- `app.music_playlist_tracks`
- `app.music_listens`
- `app.video_channels`
- `app.video_views`

## User Outcomes

Users must be able to:

- keep catalog objects they care about
- maintain ordered playlists
- preserve listening and viewing history
- connect media to moods, places, people, notes, journeys, and spaces

## Core Requirements

- catalog objects and user activity are separate concerns
- playlists are explicit ordered collections
- listens and views are event history, not summary counters

## Integrity Requirements

- playlist ordering must remain stable
- playlist membership duplication must be constrained
- media-provider identifiers must remain stable where imported

## Query Requirements

The system must support fast queries for:

- recent listens and views
- playlists with ordered track membership
- related catalog lookups
- taste queries grouped by tags, spaces, or time windows
