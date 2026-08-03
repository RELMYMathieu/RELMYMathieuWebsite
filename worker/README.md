# relmy-now-playing

Utility worker to display what song I'm listening to using the Spotify Web API.

To deploy:

```bash
cd worker && npx wrangler deploy
```

## Regenerating the token

The refresh token dies 6 months after it has been authorized, and refreshing doesn't extend that. When it dies the music display stops working and the `np` command on the website says the token expired. Redo this:

**1.** Open with own client id, approve, copy `code` out of the address bar. The landing page will be nil, normal.

```bash
https://accounts.spotify.com/authorize?client_id=CLIENT_ID&response_type=code&redirect_uri=http%3A%2F%2F127.0.0.1%3A8888%2Fcallback&scope=user-read-currently-playing%20user-read-recently-played
```

**2.** Trade it for a refresh token.

```bash
curl -X POST https://accounts.spotify.com/api/token -u "CLIENT_ID:CLIENT_SECRET" -d grant_type=authorization_code -d code=THE_CODE -d redirect_uri=http://127.0.0.1:8888/callback
```

**3.** Store it and redeploy.

```bash
cd worker && npx wrangler secret put SPOTIFY_REFRESH_TOKEN && npx wrangler deploy
```

## Notes to self

- Web API needs Premium on the account.
- Free tier is 100k requests/day. Site polls every 30s per visible tab, and the worker caches 15s so Spotify itself gets polled far less than that.
