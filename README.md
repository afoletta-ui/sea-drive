# Sea Drive multiplayer (free setup)

What's in here
- public/index.html : the game (same as the one in Claude, plus the online bits)
- server.js         : tiny Node server. Serves the game, shows other players, owns the land blocks
- package.json      : one dependency (ws)

The Claude page can't connect to your server, so people play from YOUR server's web address instead.

## 1. Try it on your own computer (2 minutes)
1. Install Node.js (nodejs.org, the LTS version).
2. Open a terminal in this folder and run:
       npm install
       npm start
3. Open http://localhost:3000 in two browser tabs. You'll see each other.
   Friends on the same wifi can use http://YOUR-COMPUTER-IP:3000

## 2. Put it online for free (Render.com)
1. Make a free GitHub account, create a new repository, and upload everything in this folder
   (github.com > New repository > "uploading an existing file"). Don't upload node_modules.
2. Make a free account at render.com and click New > Web Service > connect that repository.
3. Use these settings:
       Runtime: Node
       Build command: npm install
       Start command: npm start
       Instance type: Free
4. Click Deploy. In a minute or two you get an address like https://sea-drive.onrender.com
   Send that link to your friends. That's it.

Free tier notes
- It goes to sleep after about 15 minutes with nobody on it. The next visitor waits ~1 minute for it to wake.
- Render's free disk is wiped when it sleeps or redeploys, so land blocks would be forgotten.
  Fix (also free): keep the land in Upstash Redis.
  1. Make a free database at upstash.com (Redis).
  2. Copy its REST URL and REST token.
  3. In Render > your service > Environment, add:
         UPSTASH_REDIS_REST_URL   = (the REST URL)
         UPSTASH_REDIS_REST_TOKEN = (the REST token)
  4. Redeploy. Land ownership now survives sleeping.

## How it works (so you know what to expect)
- Everyone shares one ocean view of each other (boats and walkers) and one row of land blocks.
- Land blocks are 40 m x 40 m, side by side, starting 50 m inland. The server decides who owns each one,
  so two people can't buy the same block. Owned blocks get a fence in the owner's colour with their name.
  Other players can't walk through your fence.
- Money, rods, engines, esky and the fish book are saved in each player's own browser (not on the server).
  That means a tech-savvy player could cheat their own money. Fine for friends; tell me if you want it
  locked down on the server.
- Fish and tuna busts are still different for each player.
