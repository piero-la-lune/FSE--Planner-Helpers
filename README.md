# Helper scripts for FSE Planner

## Installation

Download current repository, and run `npm install` (you must have `npm` installed).

## Commands

### `node area.js`

Compute FSE landing zones from a FSE Planner `icaodata.json` file.

Mandatory parameters:

* `-i` FSE Planner icaodata.json file
* `-o` Output file


### `node msfs.js`

Compute MSFS airports within each FSE airport landing zone

You first need to load MSFS assets with Little Navmap, then export table `airport`
from Little Navmap MSFS SQLite database to a CSV file

Mandatory parameters:

* `-f` CSV file (export from Little Navmap)
* `-i` FSE Planner icaodata-with-zones.json file
* `-o` Output icaodata-with-zones.json file
* `-m` Output msfs.json file


### `node canifly.js`

Transform an FSE Planner `icaodata-with-zones.json` file to a Can I Fly There file

* `-i` FSE Planner icaodata.json file
* `-o` Output file


### `node fbo.js`

Compute the list of unbuilt FBOs.

* `-i` FSE Planner icaodata.json file
* `-o` Output .json file
* `-u` FSE Server username
* `-p` FSE Server password


### `node planes.js`

Get the list of all FSE plane models in JSON file.

* `-o` Output .json file
* `-k` FSE datafeed user key


## License

FSE Planner and its helpers are open source software licensed as [MIT](https://github.com/piero-la-lune/FSE-Planner/blob/master/LICENSE).
