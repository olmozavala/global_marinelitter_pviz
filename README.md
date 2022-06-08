# Install 
npm install --save parcel-bundler

## Files
### Index.js
First file. It defines the following:
* Default background layer
* Ip address that indicates from where are the binary files and 
tables being loaded. 
* Zoom resolutions for the map

### ParticleVizManager.js
This file manages most of the application.
It defines:
* wms_url -> From were are we reading the histograms (ncWMS)
* Colors for each continent
* Number of files in each month selection

### ParticlesLayer.js
File in charge of displaying the particles
* Trail size options
* Particle size options
* Default font size 
* Particles per file 
* How many previous days to draw when the animation is updated
* Maximum animation speed


# Folder paths
**Development** server at `ozavala.coaps.fsu.edu/var/www/virtualhosts/ozavala.coaps.fsu.edu`
**Production** server at `ozavala.coaps.fsu.edu/var/www/virtualhosts/marinelitter.coaps.fsu.edu`
**ncWMS2** server at `ozavala.coaps.fsu.edu/var/lib/tomcat/ncWMS2`
**Data** /sh Net/work/ozavala/WorldLitterOutput/

## Update DEVELOPMENT server
Dev server at `/var/www/virtualhosts/ozavala.coaps.fsu.edu/` 
You can use `sshweb` from wolf and `cdweb` at ozavalaweb to go to the proper location.

0. Edit `package.json` with the dev home page of  `http://ozavala.coaps.fsu.edu/marine_litter_dev/`
    and run `npm run-script build`
1. Run `clear_dev.sh` on the server.
2. Run `copyscript.sh` from local.
3. Run `done_dev.sh` on server.

## Update PRODUCTION server
Production server at `/var/www/virtualhosts/marinelitter.coaps.fsu.edu/` 
You can use `sshweb` from wolf and `cdweb` at ozavalaweb. Then you have to move to the production folder one 
branch above.

1. Run `clear_production.sh` on the server.
2. Run `copyscript.sh` from local.
3. Run `done_production.sh` on server.
