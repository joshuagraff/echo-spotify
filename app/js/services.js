'use strict';

/* Services */


// Demonstrate how to register services
// In this case it is a simple value service.
angular.module('myApp.services', [])
    .value('version', '1.0')
    .factory('App', [function() {
        var App = {

            storeLocalObject: function(key,val){
                localStorage.setItem(key,val);
            },

            getLocalObject: function (key, isJSON){
                if(isJSON){
                    return JSON.parse(localStorage.getItem(key));
                }
                return localStorage.getItem(key);
            },

            removeLocalObject: function(key){
                localStorage.removeItem(key);
            }

            //profileID: self.getLocalObject('profileID')

        };

        return App;
    }])
    .factory('PlaylistCreator', ['$q', function($q) {
        var PlaylistCreator = {
            fromArtist: function (artist){
                var deferred = $q.defer();
                var artistSongs = [];
                require(['$api/models'], function(models) {
                    models.Playlist.createTemporary(artist+"toplist").done(function(notLoadedPlaylist) {
                        notLoadedPlaylist.load("tracks").done(function(playlist) {
                            require(['$api/toplists#Toplist'], function(Toplist) {

                                var artistObj = models.Artist.fromURI(artist);
                                var artistToplist = Toplist.forArtist(artistObj);
                                artistToplist.tracks.snapshot().done(function(artistTracks){
                                    if(artistTracks["_uris"]){
                                        artistSongs = artistTracks["_uris"];
                                        if(artistSongs.length == 0){
                                            deferred.resolve(false);
                                        }
                                        var tracks = [];
                                        for (var i = 0; i < artistSongs.length; i++) {
                                            if(artistSongs[i]){
                                                tracks.push(models.Track.fromURI(artistSongs[i]));
                                            }
                                        }
                                        playlist.tracks.clear().done(function(){
                                            playlist.tracks.add(tracks);
                                            require(['$views/list#List'], function(List) {
                                                var list = List.forPlaylist(playlist, {header:'no', fields:['star','track','album','time','popularity'], 'height':'fixed'});
                                                deferred.resolve(list);
                                            });
                                        });

                                    }

                                })
                            });

                        });
                    });
                });
                return deferred.promise;
            }
        };

        return PlaylistCreator;
    }])
    .factory('URIConverter', ['$q', '$http', function($q, $http) {
        var URIConverter = {
            getImage: function (uri){
                var deferred = $q.defer();
                require(['$api/models','$api/models#Artist', '$views/image#Image'], function(models, Artist, Image) {
                    models.Artist.fromURI(uri).load('name').done(function(artistObj){
                        var artistImage = Image.forArtist(artistObj, {width:600, height:600});
                        deferred.resolve( artistImage );
                    })
                })

                return deferred.promise;
            },
            toURI: function(artistName){

            },
            toName: function(uri){
                var deferred = $q.defer();
                require(['$api/models','$api/models#Artist', '$views/image#Image'], function(models, Artist, Image) {
                    models.Artist.fromURI(uri).load('name').done(function(artistObj){
                        deferred.resolve({name:artistObj.name, uri:uri});
                    })
                })
                return deferred.promise;
            }
        };

        return URIConverter;
    }])
    .factory('EchoTasteProfile', ['App', '$http', function(App, $http) {
        var TasteProfile = {
            profileID: App.getLocalObject('profileID'),

            deleteProfile: function(){
                $http({
                    method:'POST',
                    url: 'http://developer.echonest.com/api/v4/tasteprofile/delete?api_key=VOW1HBCF5U0DHVUDM',
                    params: { 'id': this.profileID, 'format': 'json'},
                    data: {},
                    headers: {'Content-Type':'multipart/form-data'},
                    cache: false
                })
                    .success(function(){
                        alert("deleted your taste profile!");
                    })
            }
        };

        return TasteProfile;
    }])
;