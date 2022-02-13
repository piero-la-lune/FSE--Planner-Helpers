# Map

## Tile generation

1. Download the latest `planet.osm.pbf` file from OpenStreetMap
2. Prune the file using the `osmium` tool
```
osmium tags-filter <filename> na/aeroway=aerodrome w/aeroway=runway a/admin_level=2,3,4,5,6 w/highway=motorway,trunk,primary,secondary place=country,state,region,province,city,town,village,continent,archipelago,island,sea,ocean w/railway=rail a/water=river,oxbow,canal,lake,reservoir,lagoon waterway=river,riverbank,canal landuse=forest,meadow natural=wood,grassland,glacier,water -o planer-filtered.osm.pbf
```
3. Follow the instruction of the [OpenMapTiles project](https://github.com/openmaptiles/openmaptiles) to generate the `.mbtiles` file (set `MAX_ZOOM` to 11 in `.env`, disable the poi and housenumber layers + all languages and set `maxzoom` to 11 in `openmaptiles.yaml`).
4. Use [MBUtil](https://github.com/mapbox/mbutil) to extract the tiles into individual `.pbf` files

### Increase performance of mbtiles generation

There is a bug ([#967](https://github.com/openmaptiles/openmaptiles/issues/967)) in OpenMapTiles that causes very bad performance on the `import-sql` step.

To fix this, update `Makefile` with this new command in `import-sql`:
```
import-sql: all start-db-nowait
       $(DOCKER_COMPOSE) run $(DC_OPTS) openmaptiles-tools psql.sh -v ON_ERROR_STOP=1 -P pager=off \
           -c "CREATE or REPLACE FUNCTION osml10n_geo_translit(name text, place geometry DEFAULT NULL) RETURNS TEXT AS ' BEGIN IF (place IS NULL) THEN return osml10n_cc_transscript(name,''aq''); ELSE return(osml10n_cc_transscript(name,NULL)); END IF; END; ' LANGUAGE plpgsql STABLE;"
       $(DOCKER_COMPOSE) run $(DC_OPTS) openmaptiles-tools sh -c 'pgwait && import-sql' | \
           awk -v s=": WARNING:" '1{print; fflush()} $$0~s{print "\n*** WARNING detected, aborting"; exit(1)}' | \
           awk '1{print; fflush()} $$0~".*ERROR" {txt=$$0} END{ if(txt){print "\n*** ERROR detected, aborting:"; print txt; exit(1)} }'
```


## Font generation

Use [this project](https://github.com/openmaptiles/fonts) to generate the necessary `.pbf` font files.

Please mind the license of the original fonts. (Roboto is licensed under the Apache License).


## License

FSE Planner and its helpers are open source software licensed as [MIT](https://github.com/piero-la-lune/FSE-Planner/blob/master/LICENSE).
