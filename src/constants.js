// Central configuration of the visualizer. Change servers and the displayed run here.

// Server that holds the particle files, country shapes and tables (folder /data)
// export const DATA_SERVER = "http://localhost/"
export const DATA_SERVER = "https://ozavala.coaps.fsu.edu/"

// ncWMS server with the litter concentration histograms.
// It must be https: browsers block http layers on an https page.
// export const WMS_URL = "http://localhost:8080/ncWMS2/wms"
export const WMS_URL = "https://ozavala.coaps.fsu.edu/ncWMS2/wms"
export const WMS_HISTOGRAM_LAYER = "merged_five_years/histo"

// Subsampling of the particles (name of the folder inside /data)
export const PARTICLES_FOLDER_DESKTOP = "2"
export const PARTICLES_FOLDER_MOBILE = "4"

// Time steps stored in each particle file when the release does not say it
export const DEFAULT_STEPS_PER_FILE = 200
