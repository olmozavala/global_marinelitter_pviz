import React from 'react'
import './css/App.css'
import './css/Animations.css'
import * as d3 from "d3"
import ImageLayer from "ol/layer/Image"
import ImageCanvasSource from "ol/source/ImageCanvas"
import _ from "lodash"
import $ from 'jquery'
import { isMobile } from "react-device-detect"
import { OverlayTrigger, Tooltip } from "react-bootstrap"
import {Container, ButtonGroup,  Row, Col, Form}  from "react-bootstrap";

import {
    ArrowRight, CircleFill, Plus, Dash,
    PlayFill, PauseFill, Slash, SquareFill,
    SkipBackwardFill, SkipForwardFill,
    SkipEndFill, SkipStartFill,
} from 'react-bootstrap-icons'

import JSZip from "jszip"

const default_size = 15 // Font size
const particles_per_file = 200 // These MUST match with the number of particles per file
const STATUS = {
    loading: 0,
    decompressing: 1,
    paused: 2,
    playing: 3,
}

// How much transparency should we add
const TRAIL_SIZE = {
    1: .01, // Longest trail
    2: .02,
    3: .04,
    4: .15,
    5: .35  // Shortest trail
}

let PARTICLE_SIZES= {
    1: .5,
    2: 1,
    3: 2,
    4: 3,
    5: 4,
}
// Double the size of particles when we are in mobile
if(isMobile){
    for(let key of Object.keys(PARTICLE_SIZES)){
        PARTICLE_SIZES[key] *= 2
    }
}

// const PARTICLE_SIZE_TXT = {
//     1: 'Biggest ',
//     2: 'Bigger  ',
//     3: 'Default ',
//     4: 'Smaller ',
//     5: 'Smallest'
// }

// Modes in how to increase/decrease a variable
const MODES={
    increase:1,
    decrease:2
}

// var newImageData
// var rAF

const DRAW_LAST_DAYS = 0
const MAX_ANIMATION_SPEED = 45

class  ParticlesLayer extends React.Component {
    constructor(props) {
        super(props)

        // https://github.com/d3/d3-time-format
        this.dateFormat = d3.timeFormat("%B %e, %Y ")
        this.time_step = 0
        this.state = {
            speed_hz: 10,
            transparency_index: 3,
            status: STATUS.loading,
            particle_size_index: 3,
            selected_model: this.props.selected_model,
            canvas_layer: -1,
            loaded_files: 0,
            data: {},
            data_geo: null,
            extent: null,
            domain: null,
            ol_canvas_size: null,
            total_timesteps: {},
            index_by_country: {}, // it is an object that contains
            shape_type: true, // true for lines, false for dots
        }
        this.canvasWidth = 0
        this.canvasHeight = 0
        this.draw_until_day = true; // Used to redraw all the positions until current time
        // THis is repeated should go ina function
        $(".btn").attr("disabled", true)  // Enable all the buttons
        for(let file_number in _.range(0, this.props.selected_model.num_files)){
            let file_number_str = `${file_number < 10 ? '0' + file_number : file_number}`
            let url = `${this.props.url}/${this.props.selected_model.file}_${file_number_str}.txt`
            d3.text(url).then( (blob) => this.readOneZip(blob, file_number))
        }

        // Setting up d3 objects TODO somethings doesn't make sense here
        this.d3canvas = d3.select(document.createElement("canvas")).attr("id", "particle_canvas")
        if (this.d3canvas.empty()) {
            // console.log("Initializing canvas")
            this.d3canvas = d3.select(document.createElement("canvas")).attr("id", "particle_canvas")
            this.d3canvas.getContext('2d', { alpha: false })
        }
        this.ctx = this.d3canvas.node().getContext('2d')

        // this.getFeatures = this.getFeatures.bind(this)
        // this.drawParticles = this.drawParticles.bind(this)
        this.drawLines = this.drawLines.bind(this)
        this.canvasFunction = this.canvasFunction.bind(this)
        this.getIconColorSize = this.getIconColorSize.bind(this)
        this.getIconColorSizeBoostrap = this.getIconColorSizeBoostrap.bind(this)
        this.drawNextDay = this.drawNextDay.bind(this)
        this.changeShapeType = this.changeShapeType.bind(this)
        this.increaseSpeed = this.increaseSpeed.bind(this)
        this.decreaseSpeed = this.decreaseSpeed.bind(this)
        this.updateRange = this.updateRange.bind(this)
        this.increaseSize = this.increaseSize.bind(this)
        this.decreaseSize = this.decreaseSize.bind(this)
        this.updateAnimation = this.updateAnimation.bind(this)
        this.increaseTransparency = this.increaseTransparency.bind(this)
        this.readOneZip = this.readOneZip.bind(this)
        this.decreaseTransparency = this.decreaseTransparency.bind(this)
        this.playPause = this.playPause.bind(this)
        this.changeDayRange = this.changeDayRange.bind(this)
        this.readTwoUnzippedFile = this.readTwoUnzippedFile.bind(this)
        this.clearPreviousLoop = this.clearPreviousLoop.bind(this)
        this.nextDay = this.nextDay.bind(this)
        this.prevDay = this.prevDay.bind(this)
        this.displayCurrentDay = this.displayCurrentDay.bind(this)
        this.geoToCanvas = this.geoToCanvas.bind(this)
        // this.updateAllData = this.updateAllData.bind(this)
    }

    /**
     * Reads a zip file and dispatches the correct function after unziping
     * @param blob
     */
    readOneZip(text, file_number) {
        /***
         * Reads the header file (txt). Then it reads the corresponding zip file
         */
        file_number = parseInt(file_number)
        let header_data = d3.csvParseRows(text, function(d) {
            return [d[0], d[1], parseInt(d[2]), parseInt(d[3])]
        });

        let file_number_str = `${file_number < 10 ? '0' + file_number : file_number}`
        let url = `${this.props.url}/${this.props.selected_model.file}_${file_number_str}.zip`
        // console.log("This is the url" + url)
        d3.blob(url).then((blob) => {
            let zip = new JSZip()
            zip.loadAsync(blob).then(function (zip) {
                // you now have every files contained in the loaded zip
                // console.log(`Received zip for file number ${file_number}:`, zip)
                for (let file in zip.files) {
                    let zipobj = zip.files[file]
                    return zipobj.async("arraybuffer")
                }
            }).then((binarydata) => {
                let buf_off = 0
                let data = {}
                for(let country of header_data){
                    let name = country[0].toLowerCase()
                    let continent = country[1]
                    let num_part = country[2]
                    let tot_timesteps = country[3]
                    data[name] = {}
                    data[name]["oceans"] = "NoOcean"
                    data[name]["continent"] = continent
                    let all_lat_country = new Float32Array(new Int16Array(binarydata, buf_off, num_part*tot_timesteps))
                    let all_lon_country = new Float32Array(new Int16Array(binarydata, buf_off+(num_part*tot_timesteps*2), num_part*tot_timesteps))
                    let lats_by_part = []
                    let lons_by_part = []
                    for(let cur_part=0; cur_part < num_part; cur_part++){
                        let cur_part_lats = _.range(tot_timesteps).map((i) =>  all_lat_country[cur_part*tot_timesteps + i]/100)
                        let cur_part_lons = _.range(tot_timesteps).map((i) =>  all_lon_country[cur_part*tot_timesteps + i]/100)
                        lats_by_part.push(cur_part_lats)
                        lons_by_part.push(cur_part_lons)
                    }
                    data[name]["lat_lon"] = [lats_by_part, lons_by_part]
                    buf_off += num_part*tot_timesteps*4
                }
                this.country_keys = {}
                this.readTwoUnzippedFile(data, this.props.selected_model.file, file_number)
            })
        })

    }

    readTwoUnzippedFile(data, name, file_number) {
        file_number = parseInt(file_number)
        let file_number_str = `${file_number < 10 ? '0' + file_number : file_number}`
        if(name === this.props.selected_model.file) {
            // console.log(`Uncompressed file received, file number: ${file_number} ....`)
            let th = 10  // Threshold used to decide if the particle is crossing from left to right of the screen

            // console.log("Reading final data!!!!!!! ", data)
            // let country_keys = Object.keys(data).map((name) => name.toLocaleLowerCase()) // fixing those particles that 'jump' the map
            let country_keys = Object.keys(data)
            let total_timesteps = data[country_keys[0]]["lat_lon"][0][0].length
            let loc_index_by_country = {}
            for (let cur_country_id = 0; cur_country_id < country_keys.length; cur_country_id++) {
                let this_country_idx = []
                let cur_country = data[country_keys[cur_country_id]]
                let tot_part = cur_country["lat_lon"][0].length
                for (let part_id = 0; part_id < tot_part; part_id++) {
                    for (let c_time = 0; c_time < total_timesteps - 1; c_time++) {
                        let lon = data[country_keys[cur_country_id]]["lat_lon"][1][part_id][c_time]
                        let nlon = data[country_keys[cur_country_id]]["lat_lon"][1][part_id][c_time + 1]

                        if ((lon !== 200) && (nlon !== 200)) {
                            if (((lon > th) && (nlon < -th)) || ((lon < -th) && (nlon > th))) {
                                // console.log(`This is added ${lon} and ${nlon} part ${part_id} time ${c_time}`)
                                data[country_keys[cur_country_id]]["lat_lon"][1][part_id][c_time] = 200
                            }
                        }
                    }
                    loc_index_by_country[cur_country_id] = this_country_idx
                }
            }

            this.country_keys = country_keys

            let global_index_by_country = this.state.index_by_country
            global_index_by_country[file_number_str] = loc_index_by_country

            let cur_state = this.state.status

            // Decide if we have loaded enough files to start the animation
            let wait_for = .8 // We will wait for this percentage of files to be loaded
            let files_to_load = parseInt(this.state.selected_model.num_files) * wait_for
            if (this.state.loaded_files >= files_to_load) {
                // console.log("Done reading and uncompressing all the files!!!!")
                cur_state = STATUS.playing
                $(".btn").attr("disabled", false)  // Enable all the buttons
                this.props.chardin.stop()
            }else{
                let perc = parseInt(100 * (this.state.loaded_files / files_to_load))
                $(".loading_perc").text(`${perc} %`)
            }

            let model_id = this.state.selected_model.id

            let current_data = this.state.data
            // Verify we have already read at least one file for this model
            let model_timesteps = this.state.total_timesteps
            // console.log("Model time steps:", this.state.total_timesteps)
            if(_.isUndefined(current_data[model_id])){
                current_data[model_id] = {}
                model_timesteps[model_id] = {}
                model_timesteps[model_id] = total_timesteps
            }else{
                model_timesteps[model_id] += total_timesteps
            }
            current_data[model_id][file_number] = data

            if(file_number === 0) {
                let country_names = this.country_keys.map((x) => x.toLowerCase().trim())
                let ocean_names = this.country_keys.map((x) => data[x]['oceans'])
                let continent_names = this.country_keys.map((x) => data[x]['continent'].trim())

                // console.log("\t Countries names: ", country_names)
                // console.log("\t Ocean names: ", ocean_names)
                // console.log("\t Continent names: ", continent_names)
                // console.log("\t Lats and lons: ", data["yemen"]["lat_lon"])
                let canv_lay = this.state.canvas_layer
                if (canv_lay === -1) {
                    canv_lay = new ImageLayer({
                        source: new ImageCanvasSource({
                            canvasFunction: this.canvasFunction
                        })
                    })
                    this.props.map.addLayer(canv_lay)
                }
                this.props.updateCountriesData(country_names, ocean_names, continent_names)
                this.setState({
                    canvas_layer: canv_lay,
                    data: {...current_data},
                    loaded_files: this.state.loaded_files + 1,
                    total_timesteps: {...model_timesteps},
                    status: cur_state,
                    index_by_country: global_index_by_country
                })
            }else{
                // console.log(`Loaded files:  ${this.state.loaded_files + 1}`)
                this.setState({
                    data: {...current_data},
                    loaded_files: this.state.loaded_files + 1,
                    total_timesteps: {...model_timesteps},
                    status: cur_state,
                    index_by_country: global_index_by_country
                })
            }
            // console.log("Done reading!")
        } // Check the received file comes from the current file we are looking at
    }

    /**
     * Transforms geographic into window
     * @param lon
     * @param lat
     * @returns {number[]}
     */
    geoToCanvas(lon, lat) {
        let nlon = ((lon - this.state.extent[0]) / this.state.domain[0]) * this.state.ol_canvas_size[0]
        let nlat = this.state.ol_canvas_size[1] - (((lat - this.state.extent[1]) / this.state.domain[1]) * this.state.ol_canvas_size[1])
        return [parseInt(nlon), parseInt(nlat)]
    }


    canvasFunction(extent, resolution, pixelRatio, size, projection) {
        // console.log(`Canvas Function Extent:${extent}, Res:${resolution}, Size:${size} projection:`, projection)

        this.canvasWidth = size[0]
        this.canvasHeight = size[1]
        this.draw_until_day = true; // Used to redraw all the positions until current time

        this.d3canvas.attr('width', this.canvasWidth).attr('height', this.canvasHeight)
        // this.ctx = this.d3canvas.node().getContext('2d')
        this.ctx.lineCap = 'round'; // butt, round, square

        this.show_west_map = false
        this.show_east_map = false
        if (extent[0] < -180) {
            // console.log('Showing west map....')
            this.show_west_map = true
        }
        if (extent[2] > 180) {
            // console.log('Showing east map....')
            this.show_east_map = true
        }

        if (!_.isUndefined(this.state.data)) {
            let domain = [Math.abs(extent[2] - extent[0]), Math.abs(extent[3] - extent[1])]
            let new_status = this.state.status
            if ((this.state.status === STATUS.decompressing) && (this.state.loaded_files >= this.state.selected_model.num_files - 1)) {
                new_status = STATUS.playing
            }

            this.setState({
                extent: extent,
                domain: domain,
                ol_canvas_size: size,
                status: new_status,
                // data_geo: data_geo
            })
        }

        return this.d3canvas.node()
    }

    clearPreviousLoop() {
        if (!_.isUndefined(this.interval)) {
            cancelAnimationFrame(this.interval)
        }
    }

    /**
     * Updates the animation with the current frame rate
     */
    updateAnimation() {
        this.clearPreviousLoop()
        // Verify the update was caused by the parent component and we have updated
        // the file to read.
        if (this.state.selected_model !== this.props.selected_model) {
            if(_.isUndefined(this.state.data[this.props.selected_model.id])){
                $(".btn").attr("disabled", true)  // Enable all the buttons
                // In this case is a new file, we need to reset almost everything
                this.time_step= 0
                this.setState({
                    loaded_files: 0,
                    selected_model: this.props.selected_model,
                    status: STATUS.loading,
                })
                // ========================= This was for the single file version =============================
                for(let file_number in _.range(0, this.props.selected_model.num_files)){
                    let file_number_str = `${file_number < 10 ? '0' + file_number : file_number}`
                    let url = `${this.props.url}/${this.props.selected_model.file}_${file_number_str}.txt`
                    d3.text(url).then( (blob) => this.readOneZip(blob, file_number))
                }
                $(".loading_perc").text("0 %")
                $(".loading-div").show() // Show the loading
            }else{ // In this case the file was loaded previously, not much to do
                this.time_step= 0
                this.setState({
                    selected_model: this.props.selected_model,
                    cur_state: STATUS.playing
                })
            }
        } else { // The update is within the same file
            if ((this.state.status === STATUS.loading) || (this.state.status === STATUS.decompressing)) {
                $(".loading-div").show() // In this case we are still loading something
            }else{
                $(".loading-div").hide() // Hide the loading
                // $(".btn").attr("disabled", false)  // Enable all the buttons
                let canvas = this.d3canvas.node()
                if (this.state.status === STATUS.playing) {
                    if (!_.isNull(canvas)) {
                        // this.interval = setInterval(() => this.drawNextDay(), (1.0 / this.state.speed_hz) * 1000)
                        this.time = Date.now()
                        this.interval = requestAnimationFrame( this.drawNextDay )
                    }
                }
                if (this.state.status === STATUS.paused) {
                    if (!_.isNull(canvas)) {
                        this.drawNextDay()
                    }
                }
            }
        }
    }


    /**
     * Draws a single day of litter using D3
     */
    drawNextDay() {
        let ctime = Date.now()
        // Verify is time to draw the next frame
        if( (ctime - this.time) > (1000/this.state.speed_hz)) {
            // console.log(`${(ctime - this.time)}  ${(1000/this.state.speed_hz)}`)
            this.time = ctime
            let canvas = this.d3canvas.node()
            this.displayCurrentDay()
            let cur_date = this.time_step
            let to_date = this.time_step
            if (this.draw_until_day) {
                cur_date = this.time_step = Math.max(this.time_step - DRAW_LAST_DAYS, 1)
                this.draw_until_day = false
            }
            // Here we draw from the current date up to 'to_date'. Normally is should only be one day
            for (; cur_date <= to_date; cur_date++) {
                if (cur_date === 0) {
                    // Clear the canvas if it is the first date of the animation
                    this.ctx.clearRect(0, 0, canvas.width, canvas.height)
                } else {
                    // Make previous frame a little bit transparent
                    var prev = this.ctx.globalCompositeOperation
                    this.ctx.globalCompositeOperation = "destination-out"
                    this.ctx.fillStyle = `rgba(255, 255, 255, ${TRAIL_SIZE[this.state.transparency_index]})`
                    this.ctx.fillRect(0, 0, canvas.width, canvas.height)
                    this.ctx.globalCompositeOperation = prev
                    this.ctx.fill()
                }
                // Draw next frame
                if (this.state.shape_type) {
                    this.drawLines(cur_date)
                } else {
                    this.drawParticles(cur_date)
                }
            }// for

            if (this.state.status === STATUS.playing) {
                this.time_step = cur_date % this.state.total_timesteps[this.state.selected_model.id]
            }
        }
        cancelAnimationFrame(this.interval)
        if (this.state.status === STATUS.playing) {
            this.interval =  requestAnimationFrame( this.drawNextDay )
        }
    }

    /**
     * Draws the particles for a single day. It iterates over different countries
     * @param ctx Context of the canvas object to use
     */
    drawParticles(cur_date) {
        let square_size = parseInt(PARTICLE_SIZES[this.state.particle_size_index] + 1)
        this.ctx.lineWidth = square_size
        let model_id = this.state.selected_model.id
        let available_files = Object.keys(this.state.data[model_id])
        let file_number = (Math.floor(this.time_step / particles_per_file)).toString()
        let file_number_str = `${file_number < 10 ? '0' + file_number : file_number}`

        cur_date = cur_date % particles_per_file

        // console.log(`Drawing lines time step: ${cur_date} file number: ${file_number}   (global ${this.state.time_step})`)
        if (available_files.includes(file_number)) {
            for (let cur_country_id = 0; cur_country_id < this.country_keys.length; cur_country_id++) {
                this.ctx.beginPath()
                // Retreive all the information from the first available file
                this.ctx.fillStyle = this.props.colors_by_country[this.country_keys[cur_country_id].toLowerCase()]
                // this.ctx.strokeStyle = 'black'
                let country_start = this.state.data[model_id][file_number][this.country_keys[cur_country_id]]
                let tot_part = country_start["lat_lon"][0].length
                // console.log(`local global ${local_global_cur_time} global end ${global_end_time} c_time ${c_time} next_time ${next_time}` )
                let oldpos = [0, 0]
                for (let part_id = 0; part_id < tot_part; part_id++) {
                    if (this.state.index_by_country[file_number_str]) {
                        let clon = country_start["lat_lon"][1][part_id][cur_date]
                        let clat = country_start["lat_lon"][0][part_id][cur_date]
                        if (clon !== 200) {
                            if ((clon >= this.state.extent[0]) && (clon <= this.state.extent[2])) {
                                oldpos = this.geoToCanvas(clon, clat)
                                this.ctx.fillRect(oldpos[0], oldpos[1], square_size, square_size)
                            }
                            // Draw the particles on the additional map on the east
                            if (this.show_east_map) {
                                let tlon = clon + 360
                                if (tlon >= this.state.extent[0]) {
                                    oldpos = this.geoToCanvas(tlon, clat)
                                    this.ctx.fillRect(oldpos[0], oldpos[1], square_size, square_size)
                                }
                            }
                            // Draw the particles on the additional map on the west
                            if (this.show_west_map){
                                let tlon = clon - 360
                                if (tlon >= this.state.extent[0]) {
                                    oldpos = this.geoToCanvas(tlon, clat)
                                    this.ctx.fillRect(oldpos[0], oldpos[1], square_size, square_size)
                                }
                            }
                        }
                    }
                }
                this.ctx.stroke()
                this.ctx.closePath()
            }
        }
        this.props.map.render()
    }

    drawLines(cur_date) {
        // console.log(`DrawLines: ${this.state.speed_hz}`)
        this.ctx.lineWidth = PARTICLE_SIZES[this.state.particle_size_index]
        let model_id = this.state.selected_model.id
        let available_files = Object.keys(this.state.data[model_id])
        let file_number = (Math.floor(this.time_step / particles_per_file)).toString()
        let file_number_str = `${file_number < 10 ? '0' + file_number : file_number}`

        let clon = 0
        let clat = 0
        let nlon = 0
        let nlat = 0

        let tlon = 0
        let tnlon = 0

        cur_date = cur_date % particles_per_file

        // console.log(`Drawing lines time step: ${cur_date} file number: ${file_number}   (global ${this.state.time_step})`)
        if (available_files.includes(file_number)) {
            if (this.state.index_by_country[file_number_str]) {
                for (let cur_country_id = 0; cur_country_id < this.country_keys.length; cur_country_id++) {
                    this.ctx.beginPath()
                    // Retreive all the information from the first available file
                    this.ctx.strokeStyle = this.props.colors_by_country[this.country_keys[cur_country_id].toLowerCase()]
                    // this.ctx.strokeStyle = 'black'
                    let country_start = this.state.data[model_id][file_number][this.country_keys[cur_country_id]]

                    let tot_part = country_start["lat_lon"][0].length
                    // console.log(`local global ${local_global_cur_time} global end ${global_end_time} c_time ${c_time} next_time ${next_time}` )
                    let oldpos = [0, 0]
                    let newpos = [0, 0]

                    for (let part_id = 0; part_id < tot_part; part_id++) {
                        clon = country_start["lat_lon"][1][part_id][cur_date]
                        clat = country_start["lat_lon"][0][part_id][cur_date]
                        nlon = country_start["lat_lon"][1][part_id][cur_date + 1]
                        nlat = country_start["lat_lon"][0][part_id][cur_date + 1]

                        if ((clon !== 200) && (nlon !== 200)) {
                            if ((clon >= this.state.extent[0]) && (clon <= this.state.extent[2])) {
                                oldpos = this.geoToCanvas(clon, clat)
                                newpos = this.geoToCanvas(nlon, nlat)
                                this.ctx.moveTo(oldpos[0], oldpos[1])
                                this.ctx.lineTo(newpos[0], newpos[1])
                            }
                            // Draw the particles on the additional map on the east
                            if (this.show_east_map) {
                                tlon = clon + 360
                                tnlon = nlon + 360
                                if ((tlon >= this.state.extent[0]) && (tnlon <= this.state.extent[2])) {
                                    oldpos = this.geoToCanvas(tlon, clat)
                                    newpos = this.geoToCanvas(tnlon, nlat)
                                    this.ctx.moveTo(oldpos[0], oldpos[1])
                                    this.ctx.lineTo(newpos[0], newpos[1])
                                }
                            }
                            // Draw the particles on the additional map on the west
                            if (this.show_west_map){
                                tlon = clon - 360
                                tnlon = nlon - 360
                                if ((tlon >= this.state.extent[0]) && (tnlon <= this.state.extent[2])) {
                                    oldpos = this.geoToCanvas(tlon, clat)
                                    newpos = this.geoToCanvas(tnlon, nlat)
                                    this.ctx.moveTo(oldpos[0], oldpos[1])
                                    this.ctx.lineTo(newpos[0], newpos[1])
                                }
                            }
                        }
                    }
                this.ctx.stroke()
                this.ctx.closePath()
                }
            }
        }
        this.props.map.render()
    }

    componentDidMount() {
        this.updateAnimation()
    }

    componentDidUpdate(prevProps, prevState, snapshot) {
        this.updateAnimation()
    }

    /**
     * Generic function to update a variable (size, speed)
     * @param old_value
     * @param mode
     * @param amount
     * @returns {*}
     */
    updateValue(old_value, mode, amount = 1) {
        let new_value = old_value
        if (mode === MODES.increase) {
            if (old_value >= 1) {
                new_value += amount
            } else {
                new_value *= 2
            }
        } else {
            if ((old_value - amount) > 0) {
                new_value -= amount
            } else {
                new_value /= 2
            }
        }
        return new_value
    }

    increaseSpeed(e) {
        let new_speed = this.updateValue(this.state.speed_hz, MODES.increase, 5)
        this.setState({
            speed_hz: new_speed
        })
        e.preventDefault()
    }

    decreaseSpeed(e) {
        let new_speed = this.updateValue(this.state.speed_hz, MODES.decrease, 5)
        this.setState({
            speed_hz: new_speed
        })
        e.preventDefault()
    }

    increaseSize(e) {
        let new_size = this.updateValue(this.state.particle_size_index, MODES.increase)
        this.setState({
            particle_size_index: new_size
        })
        e.preventDefault()
    }

    decreaseSize(e) {
        let new_size = this.updateValue(this.state.particle_size_index, MODES.decrease)
        this.setState({
            particle_size_index: new_size
        })
        e.preventDefault()
    }

    increaseTransparency(e) {
        let new_trans = this.state.transparency_index
        if (new_trans < (Object.keys(TRAIL_SIZE).length)) {
            new_trans += 1
        }
        this.setState({
            transparency_index: new_trans
        })
        e.preventDefault()
    }

    decreaseTransparency(e) {
        let new_trans = this.state.transparency_index
        if (new_trans > 0) {
            new_trans -= 1
        }
        this.setState({
            transparency_index: new_trans
        })
        e.preventDefault()
    }

    playPause(e) {
        e.preventDefault()
        if (this.state.status === STATUS.playing) {
            this.setState({
                status: STATUS.paused
            })
        } else {
            this.setState({
                status: STATUS.playing
            })
        }
        this.updateRange()
    }

    changeDayRange(e) {
        // e.preventDefault()
        let cur_time_step = parseInt(e.target.value)
        this.time_step = cur_time_step
        console.log(this.time_step)
        let canvas = this.d3canvas.node()
        this.ctx.clearRect(0, 0, canvas.width, canvas.height)
        this.drawNextDay()
        this.updateRange()
    }

    updateRange(){
        this.setState({
                time_step: this.time_step
        })
    }

    nextDay(e) {
        e.preventDefault()
        this.time_step = Math.min(this.time_step + 1, this.state.total_timesteps[this.state.selected_model.id])
        this.drawNextDay(this.d3canvas.node())
        this.updateRange()
    }

    prevDay(e) {
        e.preventDefault()
        this.draw_until_day = true
        this.time_step = Math.max(this.time_step - 1, 1)
        let canvas = this.d3canvas.node()
        this.ctx.clearRect(0, 0, canvas.width, canvas.height)
        this.drawNextDay()
        this.updateRange()
    }

    /**
     * This function is used to change icon and color sizes
     * @param value
     * @param inv
     * @param color
     * @returns {string}
     */
    getIconColorSize(value, inv = false, color = false) {
        if (inv) {
            value = 6 - value
        }

        if (color) {
            if (value === 5) {
                return "darkred"
            } else {
                return "black"
            }

        } else {
            switch (value) {
                case 5:
                    return "lg"
                case 4:
                    return "lg"
                case 3:
                    return "1x"
                case 2:
                    return "sm"
                case 1:
                    return "xs"
                default:
                    return "1x"
            }

        }
    }

    getIconColorSizeBoostrap(value, inv = false, color = false) {
        if (inv) {
            value = 6 - value
        }

        if (color) {
            if (value === 5) {
                return "darkred"
            } else {
                return "black"
            }

        } else {
            switch (value) {
                case 5:
                    return 24
                case 4:
                    return 22
                case 3:
                    return 20
                case 2:
                    return 18
                case 1:
                    return 16
                default:
                    return 20
            }

        }
    }

    /**
     * Draws the date in the 'title' div. Everytime
     */
    displayCurrentDay() {
        let start_date = this.state.selected_model.start_date
        let title = d3.select("#dates-title")
        let cur_date = new Date(start_date.getTime() + this.time_step * 24 * 3600000)
        title.text(this.dateFormat(cur_date))
    }

    changeShapeType(){
        this.setState({
            shape_type: !(this.state.shape_type)
        })
    }

    render() {
        if(isMobile ||  window.innerWidth <= 1200){
            return (
                <Container fluid>
                    <Row>
                        {/*---- Train size---------*/}
                        <Col xs={6}> <span className={"mt-1"}>Trail size</span> </Col>
                        <Col xs={6}>
                            <span style={{display: "inline-block", width: "25px"}}>
                             <ArrowRight
                                 size={this.getIconColorSizeBoostrap(this.state.transparency_index, true)}/>
                            </span>
                             <button className="btn btn-info btn-sm " onClick={this.increaseTransparency}
                                     title="Decrease litter trail"
                                     disabled={this.state.transparency_index === (Object.keys(TRAIL_SIZE).length) ||
                                     this.state.status === STATUS.loading || this.state.status === STATUS.decompressing}>
                             <Dash size={default_size}/>
                             </button>
                            {" "}
                            <button className="btn btn-info btn-sm" onClick={this.decreaseTransparency}
                                    title="Increase litter trail"
                                    disabled={this.state.transparency_index === 1 ||
                                    this.state.status === STATUS.loading || this.state.status === STATUS.decompressing}>
                                             <Plus size={default_size}/>
                                             </button>
                        </Col>
                    </Row>
                    <Row className={"mt-1"}>
                        {/*---- Particle size ---------*/}
                        <Col xs={6}><span>Particle size</span></Col>
                        <Col xs={6}>
                             <span style={{display: "inline-block", width: "25px"}}>
                             <CircleFill
                                 size={this.getIconColorSizeBoostrap(this.state.particle_size_index, false)}/>
                             </span>
                             <button className="btn btn-info btn-sm" onClick={this.decreaseSize}
                                     title="Decrease litter size"
                                     disabled={this.state.particle_size_index === 1 || this.state.status === STATUS.loading || this.state.status === STATUS.decompressing}>
                             <Dash size={default_size}/>
                             </button>
                            {" "}
                            <button className="btn btn-info btn-sm" onClick={this.increaseSize}
                                    title="Increase litter size"
                                    disabled={this.state.particle_size_index === (Object.keys(PARTICLE_SIZES).length) || this.state.status === STATUS.loading || this.state.status === STATUS.decompressing}>
                                     <Plus size={default_size}/>
                             </button>
                        </Col>
                    </Row>
                    <Row>
                        {/*---- Range Current day ------------*/}
                        <Col xs={6}><span>Select date</span></Col>
                        <Col xs={6}>
                            <span id="date_range" className="navbar-brand mt-1"
                                  data-position="bottom">
                                         <Form.Control type="range"
                                                       className="range-ml"
                                                       title="Date selection"
                                                       onChange={this.changeDayRange}
                                                       value={this.time_step}
                                                       min="0" max={(this.state.status === STATUS.loading ||
                                             this.state.status === STATUS.decompressing) ? 0 :
                                             this.state.total_timesteps[this.state.selected_model.id] - 2}
                                                       custom />
                            </span>
                        </Col>
                    </Row>
                    <Row>
                        <Col xs={5}><span>Animation controls</span></Col>
                        <Col xs={7}>
                            {/*---- Animation controls --------*/}
                             <ButtonGroup>
                             {/*---- Decrease speed --------*/}
                                 <OverlayTrigger
                                     placement="bottom"
                                     delay={{show: 1, hide: 1}}
                                     overlay={(props) => (
                                         <Tooltip id="tooltip_dspeed" {...props}> Decrease animation
                                             speed </Tooltip>)}>
                             <button className="btn btn-info btn-sm" type="button"
                                     onClick={this.decreaseSpeed}
                                     disabled={this.state.speed_hz <= .6}>
                             {/*disabled={(this.state.status !== STATUS.playing) || (this.state.speed_hz <= .6)}>*/}
                                 <SkipBackwardFill size={default_size}/>
                             </button>
                             </OverlayTrigger>
                                 {/*---- Previous day --------*/}
                                 <OverlayTrigger
                                     placement="bottom"
                                     delay={{show: 1, hide: 1}}
                                     overlay={(props) => (
                                         <Tooltip id="tooltip_pday" {...props}> Previous time
                                             step</Tooltip>)}>
                             <button id="pt" className="btn btn-info btn-sm" type="button"
                                     onClick={this.prevDay}>
                             {/*disabled={this.state.status !== STATUS.paused}>*/}
                                 <SkipStartFill size={default_size}/>
                             </button>
                             </OverlayTrigger>
                                 {/*---- Play/Pause--------*/}
                                 <OverlayTrigger
                                     placement="bottom"
                                     delay={{show: 1, hide: 1}}
                                     overlay={(props) => (
                                         <Tooltip id="tooltip_ppause" {...props}> Play/Pause </Tooltip>)}>
                             <button className="btn btn-info btn-sm"
                                     onClick={this.playPause}>
                             {/*disabled={this.state.status === STATUS.loading || this.state.status === STATUS.decompressing}>*/}
                                 {this.state.status === STATUS.playing ?
                                     <PauseFill size={default_size}/> :
                                     <PlayFill size={default_size}/>}
                             </button>
                             </OverlayTrigger>
                                 {/*---- Next day--------*/}
                                 <OverlayTrigger
                                     placement="bottom"
                                     delay={{show: 1, hide: 1}}
                                     overlay={(props) => (
                                         <Tooltip id="tooltip_nday" {...props}> Next time step </Tooltip>)}>
                             <button id="nt" className="btn btn-info btn-sm" onClick={this.nextDay}>
                             {/*disabled={this.state.status !== STATUS.paused}>*/}
                                 <SkipEndFill size={default_size}/>
                             </button>
                             </OverlayTrigger>
                                 {/*---- Increase speed --------*/}
                                 <OverlayTrigger
                                     placement="bottom"
                                     delay={{show: 1, hide: 1}}
                                     overlay={(props) => (
                                         <Tooltip id="tooltip_inc_speed" {...props}> Increase animation
                                             speed</Tooltip>)}>
                             <button className="btn btn-info btn-sm" onClick={this.increaseSpeed}
                                     disabled={this.state.speed_hz >= MAX_ANIMATION_SPEED}>
                             {/*disabled={(this.state.status !== STATUS.playing) || (this.state.speed_hz >= MAX_ANIMATION_SPEED)}>*/}
                                 <SkipForwardFill size={default_size}/>
                             </button>
                             </OverlayTrigger>
                             </ButtonGroup>
                        </Col>
                    </Row>
                    {/*<Row>*/}
                    {/*    <Col xs={12}>*/}
                    {/*        /!*---- Shape selection---------*!/*/}
                    {/*        <Button variant="info" size={"sm"} className={"m-1"}*/}
                    {/*                 onClick={this.changeShapeType}*/}
                    {/*                 disabled={this.state.status === STATUS.loading || this.state.status === STATUS.decompressing}>*/}
                    {/*                     {this.state.shape_type ?*/}
                    {/*                         <Slash size={default_size}/>*/}
                    {/*                         :*/}
                    {/*                         <SquareFill size={default_size}/>*/}
                    {/*                     }*/}
                    {/*             </Button>*/}
                    {/*    </Col>*/}
                    {/*</Row>*/}
                </Container>

            )
        }else {
            this.props.chardin.refresh()
            return (
                <span className="mt-1">
                                         {/*---- Transparency ---------*/}
                    <span className="navbar-brand col-auto viz-control" data-intro={"Litter trail length"} data-position={"bottom"}>
                                         <span style={{display: "inline-block", width: "25px"}}>
                                         <ArrowRight
                                             size={this.getIconColorSizeBoostrap(this.state.transparency_index, true)}/>
                                         </span>
                                         <button className="btn btn-info btn-sm " onClick={this.increaseTransparency}
                                                 title="Decrease litter trail"
                                                 disabled={this.state.transparency_index === (Object.keys(TRAIL_SIZE).length) ||
                                                 this.state.status === STATUS.loading || this.state.status === STATUS.decompressing}>
                                         <Dash size={default_size}/>
                                         </button>
                        {" "}
                        <button className="btn btn-info btn-sm" onClick={this.decreaseTransparency}
                                title="Increase litter trail"
                                disabled={this.state.transparency_index === 1 ||
                                this.state.status === STATUS.loading || this.state.status === STATUS.decompressing}>
                                         <Plus size={default_size}/>
                                         </button>
                                         </span>
                    {/*---- Particle size ---------*/}
                    <span className="navbar-brand col-auto viz-control" data-intro={"Litter size"} data-position={"bottom"}>
                                         <span style={{display: "inline-block", width: "25px"}}>
                                         <CircleFill
                                             size={this.getIconColorSizeBoostrap(this.state.particle_size_index, false)}/>
                                         </span>
                                         <button className="btn btn-info btn-sm" onClick={this.decreaseSize}
                                                 title="Decrease litter size"
                                                 disabled={this.state.particle_size_index === 1 || this.state.status === STATUS.loading || this.state.status === STATUS.decompressing}>
                                         <Dash size={default_size}/>
                                         </button>
                        {" "}
                        <button className="btn btn-info btn-sm" onClick={this.increaseSize}
                                title="Increase litter size"
                                disabled={this.state.particle_size_index === (Object.keys(PARTICLE_SIZES).length) || this.state.status === STATUS.loading || this.state.status === STATUS.decompressing}>
                                         <Plus size={default_size}/>
                                         </button>
                                         </span>
                    {/*---- Shape selection---------*/}
                    <span className="navbar-brand col-auto" data-intro={"Litter shape"} data-position={"bottom"}>
                                         <button className={`btn btn-sm btn-info d-md-none d-lg-inline `}
                                                 onClick={this.changeShapeType}
                                                 title="Shape selection"
                                                 disabled={this.state.status === STATUS.loading || this.state.status === STATUS.decompressing}>
                                         {this.state.shape_type ?
                                             <Slash size={default_size}/>
                                             :
                                             <SquareFill size={default_size}/>
                                         }
                                         </button>
                                         </span>
                    {/*---- Range Current day ------------*/}
                    <span id="date_range" className="navbar-brand m-1 range-ml" data-intro="Day selection" data-position="bottom">
                        <span className={"mt-5"}>
                             <Form.Control type="range"
                                           title="Date selection"
                                           onChange={this.changeDayRange}
                                           value={this.time_step}
                                           min="0" max={(this.state.status === STATUS.loading ||
                                 this.state.status === STATUS.decompressing) ? 0 :
                                 this.state.total_timesteps[this.state.selected_model.id] - 2}
                                           custom
                                           disabled={this.state.status === STATUS.loading}/>
                       </span>
                     </span>

                    {/*---- Animation controls --------*/}
                    <span className="navbar-brand col-auto anim-controls" data-intro="Animation controls" data-position="bottom">
                                         <ButtonGroup>
                                         {/*---- Decrease speed --------*/}
                                             <OverlayTrigger
                                                 placement="bottom"
                                                 delay={{show: 1, hide: 1}}
                                                 overlay={(props) => (
                                                     <Tooltip id="tooltip_dspeed" {...props}> Decrease animation
                                                         speed </Tooltip>)}>
                                         <button className="btn btn-info btn-sm" type="button"
                                                 onClick={this.decreaseSpeed}
                                                 disabled={this.state.speed_hz <= .6}>
                                         {/*disabled={(this.state.status !== STATUS.playing) || (this.state.speed_hz <= .6)}>*/}
                                             <SkipBackwardFill size={default_size}/>
                                         </button>
                                         </OverlayTrigger>
                                             {/*---- Previous day --------*/}
                                             <OverlayTrigger
                                                 placement="bottom"
                                                 delay={{show: 1, hide: 1}}
                                                 overlay={(props) => (
                                                     <Tooltip id="tooltip_pday" {...props}> Previous time
                                                         step</Tooltip>)}>
                                         <button id="pt" className="btn btn-info btn-sm" type="button"
                                                 onClick={this.prevDay}>
                                         {/*disabled={this.state.status !== STATUS.paused}>*/}
                                             <SkipStartFill size={default_size}/>
                                         </button>
                                         </OverlayTrigger>
                                             {/*---- Play/Pause--------*/}
                                             <OverlayTrigger
                                                 placement="bottom"
                                                 delay={{show: 1, hide: 1}}
                                                 overlay={(props) => (
                                                     <Tooltip id="tooltip_ppause" {...props}> Play/Pause </Tooltip>)}>
                                         <button className="btn btn-info btn-sm"
                                                 onClick={this.playPause}>
                                         {/*disabled={this.state.status === STATUS.loading || this.state.status === STATUS.decompressing}>*/}
                                             {this.state.status === STATUS.playing ?
                                                 <PauseFill size={default_size}/> :
                                                 <PlayFill size={default_size}/>}
                                         </button>
                                         </OverlayTrigger>
                                             {/*---- Next day--------*/}
                                             <OverlayTrigger
                                                 placement="bottom"
                                                 delay={{show: 1, hide: 1}}
                                                 overlay={(props) => (
                                                     <Tooltip id="tooltip_nday" {...props}> Next time step </Tooltip>)}>
                                         <button id="nt" className="btn btn-info btn-sm" onClick={this.nextDay}>
                                         {/*disabled={this.state.status !== STATUS.paused}>*/}
                                             <SkipEndFill size={default_size}/>
                                         </button>
                                         </OverlayTrigger>
                                             {/*---- Increase speed --------*/}
                                             <OverlayTrigger
                                                 placement="bottom"
                                                 delay={{show: 1, hide: 1}}
                                                 overlay={(props) => (
                                                     <Tooltip id="tooltip_inc_speed" {...props}> Increase animation
                                                         speed</Tooltip>)}>
                                         <button className="btn btn-info btn-sm" onClick={this.increaseSpeed}
                                                 disabled={this.state.speed_hz >= MAX_ANIMATION_SPEED}>
                                         {/*disabled={(this.state.status !== STATUS.playing) || (this.state.speed_hz >= MAX_ANIMATION_SPEED)}>*/}
                                             <SkipForwardFill size={default_size}/>
                                         </button>
                                         </OverlayTrigger>
                                         </ButtonGroup>
                                         </span>
                                         </span>
            )
        }
    }
}

export default ParticlesLayer
