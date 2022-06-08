import React from 'react';
import ReactDOM from 'react-dom';
import './css/index.css';
import './css/chardinjs.css'
import ParticleVizManager from './ParticleVizManager';
import * as serviceWorker from './serviceWorker';
import Card from "react-bootstrap/Card"
import introjpg from "./imgs/intro_logo.jpg"

import Map from "ol/Map";
import TileLayer from "ol/layer/Tile";
import View from "ol/View";
import './css/App.css';
import "bootstrap/dist/css/bootstrap.min.css"
import OSM from "ol/source/OSM";
import {House} from "react-bootstrap-icons";
import {Spinner} from "react-bootstrap";
import {chardinJs} from "./chardinjsoz";

// /FORMAT=image/png&HEIGHT=256&WIDTH=256&BBOX=-180.000005437,-89.900001526,180.0,83.627418516
let background_layer = new TileLayer({ source: new OSM() });

// This address indicates from where are we loading the binary files of the particles.
// let ip_address = "http://localhost/"
let ip_address = 'https://ozavala.coaps.fsu.edu/'
const tot_res = 9;
let resolutions = Array(tot_res);
for(let i=0; i < tot_res; i++){
    resolutions[i] = .36/(2**i);
}
// console.log("Resolutions: ", resolutions);


let map_view = new View({
        projection: 'EPSG:4326', //Equirectangular
        center: [0, 0],
        extent: [-180, -190, 180, 190],
        resolutions: resolutions,
        zoom: 1,
        moveTolerance: 400,
        // maxZoom: 8,
        // minZoom: 2
        // ---------- OR ----------------
        // projection: 'EPSG:3857', // Mercator
        // zoom: 4,
        // maxZoom: 8,
        // minZoom: 2
    })

// let ol_controls = [new Zoom(),
    // new FullScreen(),
    //                 ]

let ol_controls = []

let map = new Map({
    layers: [ background_layer ],
    target: 'map',
    view: map_view,
    controls: ol_controls
})

var intro_chardin = new chardinJs("body")

function PageSummary(){
    return (
        <div className="row p-0 m-0">
            <div className="col-xs-6 col-sm-4 col-md-3 col-lg-3  offset-sm-4 offset-md-4 offset-lg-4">
                <div id="intro_text" className=" mt-3" >
                    <Card style={{ width: '100%' }}>
                        <Card.Img variant="top" src={introjpg} />
                        <Card.Body>
                            <Card.Title>World's Ocean Litter</Card.Title>
                            <Card.Text>
                                This site provides a dynamic display of marine litter trajectories in the ocean
                                and statistics of the litter generated and received by each country.
                                Click
                                <button title="Help" className="m-1 btn btn-info btn-sm" onClick={() =>  {
                                    intro_chardin.stop()}
                                }>
                                    here
                                </button>
                                to continue and please wait for the site to load.
                                For details on the model go to
                                <a title="Home" className="btn ml-2 btn-info btn-sm"
                                   href="https://www.coaps.fsu.edu/our-expertise/global-model-for-marine-litter">
                                    <House/>
                                </a>.
                            </Card.Text>
                            <div className="h5 col-12 text-center loading-div" >
                                <Spinner animation="border" variant="info"/>
                                {" "} Loading ... <span className="loading_perc"> </span>
                            </div>
                        </Card.Body>
                    </Card>
                </div>
            </div>
        </div>)
}

ReactDOM.render(<span>
                    {/*ParticleVizManager contains all the maps and menus of the page*/}
                    <ParticleVizManager map={map} background_layer={background_layer} url={ip_address} chardin={intro_chardin}/>
                    {/*This part is the title and the dates*/}
                    <div className="container-fluid wl-title">
                        <div className="row p-0 m-0">
                            <div className="col-12 text-center">
                               <div id="main-title" className="display-4 mt-3"> World's Ocean Litter </div>
                            </div>
                        </div>
                        <div className="row p-0 m-0">
                            <div className="col-12 text-center">
                               <div id="dates-title" className="h4 mt-3"></div>
                            </div>
                        </div>
                        <div className="row p-0 m-0">
                            <div className="h5 col-12 text-center loading-div" >
                               <Spinner animation="border" variant="info"/>
                                {" "} Loading ... <span className="loading_perc"> </span>
                           </div>
                        </div>
                    </div>
                    {/*This is the page summary*/}
                    <PageSummary/>
                </span>,
    document.getElementById('root'));


// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
