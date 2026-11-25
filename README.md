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

## Deployment and update preparation — verified 19 November 2026

The WEBSITES inventory (`WEBSITES/Info_Websites_Coaps.html`) identifies this
application. Live SSH inspection confirmed Apache on `ozavala.coaps.fsu.edu`
(146.201.220.35) serves `https://marinelitter.coaps.fsu.edu/` from
`/var/www/virtualhosts/marinelitter.coaps.fsu.edu`. The configuration is under
`/etc/httpd/conf.d/virtualhosts/`. The deployed React build is dated June 8,
2022. Its assets are owned by root; check deployment permissions before any
replacement. This inspection did not modify production or Apache settings.

The deployed source map confirms twelve selectable monthly releases from
2010, with fixed chunk counts. The app loads particle TXT headers and ZIP
archives from `https://ozavala.coaps.fsu.edu/data/`, using subdirectories `4/`
(desktop) and `6/` (mobile). Those map to
`/var/www/virtualhosts/ozavala.coaps.fsu.edu/data/` on the web server. The deployed
ZIP loader differs from the checked-out source, which has an uncompressed
binary-loading path. Reconcile the loader with generated products before
building; do not assume a current NetCDF can be copied directly into web data.

The map overlay is the ncWMS2 dataset `merged_five_years`, variable `histo`.
The live configuration at `/usr/share/tomcat/.ncWMS2/config.xml` points it at
`/Net/work/ozavala/WorldLitterOutput/histo/Merged.nc`. The client currently uses
an HTTP WMS URL despite the HTTPS site; use the available HTTPS proxy when
preparing the update. The statistics JSON and downloadable archive are separate
products under the web data directory, not computed by the browser.

The requested update covers animations, statistics, and maps. Preparation needs:

1. Join the RCC 2023–2025 extensions to the existing COAPS release histories,
   checking particle IDs and removing only the shared timestamp. The historical
   `7_Merge_Merged_Adding_New_Years.py` does not remove that duplicate itself.
2. Generate matching desktop/mobile ZIPs and TXT headers, derive actual chunk
   counts, and update the release catalog and date labels. The current local
   multi-file exporter has ZIP writing commented out and a hard-coded country
   index path; verify the index against the 32,300-particle ordering.
3. Regenerate the accumulation histogram with an explicit period and the
   documented weighting assumptions, then stage it as a separate ncWMS dataset.
4. Obtain the updated external country transport reports and confirm their
   period/scenario before regenerating statistics JSON and downloads. The
   inspected repository and COAPS report folders go through 2022; 2025 reports
   have not been located. Do not relabel older reports as 2025 results.
5. Test all three product families in a separate staging deployment before
   switching production assets and data together.

RCC inventory on November 19 found 191 of 192 expected monthly merged releases
for 2010–2025. June 2025 is missing: job 13351780 failed with NODE_FAIL in its
first segment, no completed segment files were found, and no replacement was
queued. This matters if the updated catalog includes all monthly releases;
the current site's twelve 2010 releases are a smaller selection. No additional
simulation was launched during this deployment inspection.

The recovered July 2021 extension was transferred with a matching SHA-256 to
`bfs-v12-mars.coaps.fsu.edu:/Net/work/ozavala/DATA/WorldLitterOutput/output_2025_from_HPC/UpToDec2025_YesWinds_YesDiffusion_NoUnbeaching_2021_07.nc`.
The other RCC outputs have not been transferred by this task.

The project's forcing archive at
`/nexsan/people/xbxu/HYCOM/GLBv0.08/2025c` ends at **2025-12-31 21:00**, verified
from the final NetCDF's time variable. No 2026 forcing directory was found in
that archive or in RCC's staged inputs. Variable attributes specify currents
plus 1% wind. The simulated endpoint of 2026-01-01 00:00 therefore includes
three hours of permitted time extrapolation, not a 2026 forcing record.

# Update to December 2025 (November 2026)

The site can now show the twelve 2010 releases followed to 2025-12-31 (one position every 3 days).

* **Data**: written by `4b_Export_Web_Binary_Extended.py` in the `ocean_litter` repository, from the
  2010-2022 and 2023-2025 trajectory files at COAPS. Files are in
  `/var/www/virtualhosts/ozavala.coaps.fsu.edu/data/{4,6}/UpToDec2025_YesWinds_YesDiffusion_NoUnbeaching_2010_MM_NN.{txt,zip}`
  (4 = desktop, 6 = mobile). The older `YesWinds_YesDiffusion_NoUnbeaching_2010_*` files used by the
  2022 build are still there. Working copy and log: `/Net/work/ozavala/DATA/WorldLitterOutput/web_export_2025`.
* **Releases**: `src/releases.json` is the manifest written by the exporter (file names, start and end
  dates, days per time step, number of files). Replace it when the data change; nothing else is hard-coded.
* **Servers**: `src/constants.js` (data server, ncWMS address and layer, particle folders).
* **Build**: `npm install`, then `npm run build` (production, uses `homepage` in `package.json`) or
  `PUBLIC_URL=<address> NODE_OPTIONS=--openssl-legacy-provider npx react-scripts build` for another
  address. Tested with Node 24. Keep `node_modules` and `build` outside Dropbox.
* **Review copy**: https://ozavala.coaps.fsu.edu/marine_litter_dev_2025/ (copied with rsync, no sudo).
  Production (`marinelitter.coaps.fsu.edu`) still serves the June 2022 build.
* **Known gap**: the litter concentration layer asks ncWMS for `merged_five_years/histo`, and that
  dataset is no longer configured on the ncWMS server (GetMap returns 404), so the layer is empty on
  both the old and the new build. It needs a new histogram (`5_MakeHistogramNcWMS.py`) and an ncWMS dataset.

### Particle density (24 November 2026)

The desktop site loads one particle in two (`data/2`, 16,980 particles, about
57 MB per release) and phones load one in four (`data/4`, 9,132 particles,
about 31 MB per release). Both values are in `src/constants.js`. Adding
`?particles=N` to the address loads another subsampling folder for testing;
`data/1` (all particles) holds only the January 2010 release.
