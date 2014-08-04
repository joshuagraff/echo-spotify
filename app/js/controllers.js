'use strict';

/* Controllers */

angular.module('myApp.controllers', []).
  controller('MusicCtrl', ['$scope', '$http', 'App', 'URIConverter', 'EchoTasteProfile', '$q', function($scope, $http, App, URIConverter, EchoTasteProfile, $q) {
        $scope.trackCount = App.getLocalObject('trackCount');
        $scope.tracks = App.getLocalObject('tracks', true);
        $scope.topArtists = App.getLocalObject('topArtists', true);
        $scope.topArtistsURIs = App.getLocalObject('topArtistsURIs',true);
        $scope.profileID = App.getLocalObject('profileID');
        $scope.playlistSongs = [];
        $scope.workoutPlaylistSongs = [];
        $scope.playlistList = null;
        $scope.mainstreamness = App.getLocalObject('mainstreamness');
        $scope.freshness = App.getLocalObject('freshness');
        $scope.bannedArtists = App.getLocalObject('bannedArtists',true) || [];
        $scope.anonUserID = null;

        $scope.userToSearch = '';
        $scope.playlistAdded = false;

        $scope.userArtists = App.getLocalObject('userArtists', true) || {};
        $scope.userArtistsCount = App.getLocalObject('userArtistsCount');

        $scope.randomToplistSubset = [];
        $scope.suggestedArtists = null;
        $scope.artistToBan = '';

        $scope.BPM_VAL = 150;

        $scope.banArtist = function(){
            if(_.indexOf($scope.bannedArtists, $scope.artistToBan) === -1){
                $scope.bannedArtists.push($scope.artistToBan);
                App.storeLocalObject('bannedArtists',JSON.stringify($scope.bannedArtists));
            }
        };

        $scope.removeCurrentPlayingArtist = function(){
            require(['$api/models'], function(models) {
                if(models.player.playing){
                    models.player.track.load('artists').done(function(track){
                        if(track.artists[0] && _.indexOf($scope.bannedArtists, track.artists[0].uri) === -1){
                            $scope.bannedArtists.push(track.artists[0].uri);
                            App.storeLocalObject('bannedArtists',JSON.stringify($scope.bannedArtists));
                            models.player.skipToNextTrack();
                        }
                    })
                }
            });
        };

        $scope.removeTasteProfile = function(){
            EchoTasteProfile.deleteProfile();
            App.removeLocalObject('profileID');
        };

        function addArtistsFromPlaylist(playlistWithTracks){
            var addDef = $q.defer();
            var track;
            for(var j = 0; j< playlistWithTracks.length; j++){
                track = playlistWithTracks.get(j);
                if($scope.userArtists[track.artists[0].uri]){
                    $scope.userArtists[track.artists[0].uri].songs.push(track.uri);
                }else{
                    $scope.userArtists[track.artists[0].uri] = {songs:[track.uri], relatedArtists:track.artists[0].related};
                }
            }
            addDef.resolve();
            return addDef.promise;
        }

        function findArtists(){
            var artistDef = $q.defer();

            require(['$api/library#Library', '$api/models'], function(Library, models) {

                $scope.userArtists = {};

                function collectionSnapshot(snapshot) {
                        var playlist;
                        var playlistCount = snapshot.length;
                        for (var i = 0; i < snapshot.length; i++) {
                            playlist = snapshot.get(i);
                            playlist._collections();
                            playlist.tracks.snapshot().done(function(playlistWithTracks){
                                addArtistsFromPlaylist(playlistWithTracks).then(function(){
                                    playlistCount--;
                                    if(playlistCount === 0){
                                        $scope.userArtistsCount = _.keys($scope.userArtists).length;
                                        alert($scope.userArtistsCount + ' Artists Found');
                                        artistDef.resolve();
                                    }
                                });
                            });
                        }
                }

                if($scope.userToSearch && $scope.userToSearch !== ''){
                    var playlist = models.Playlist.fromURI($scope.userToSearch);
                    playlist._collections();
                    playlist.tracks.snapshot().done(function(playlistWithTracks){
                        addArtistsFromPlaylist(playlistWithTracks).then(function() {
                            $scope.userArtistsCount = _.keys($scope.userArtists).length;
                            alert($scope.userArtistsCount + ' Artists Found');
                            artistDef.resolve();
                        })
                    });
                }else{
                    Library.forCurrentUser().load('playlists').done(function(collection){
                        collection.playlists.snapshot().done(collectionSnapshot);
                    });
                }
            });

            return artistDef.promise;
        }

        function randomArray(min,max,count){
            var randArray = [];
            for(var i = 0; i < count; i++){
                randArray.push(_.random(min,max));
            }
            return randArray;
        }

        function artistToplistTracks(toplist, defToResolve, models, Toplist){
            var toplistDef = $q.defer();
            toplist.tracks.snapshot().done(function(artistTracks){
                if(artistTracks["_uris"]){
                    var artistSongs = artistTracks["_uris"];
                    if(!(artistSongs.length == 0)){
                        var maxSongs = 2;
                        if(artistSongs.length < maxSongs){
                            maxSongs = artistSongs.length;
                        }
                        for (var j = 0; j < maxSongs; j++) {
                            if(artistSongs[j]){
                                $scope.playlistSongs.push(models.Track.fromURI(artistSongs[j]));
                                artistSongs.splice(0,1);
                                artistSongs = _.shuffle(artistSongs);
                            }
                        }
                    }
                    toplistDef.resolve(defToResolve);
                }
            });

            return toplistDef.promise;
        }

        function toplistForEachArtist(artistArray,models,Toplist){
            var promiseArray = [];
            var artistObj, artistDef;
            for(var i = 0; i < artistArray.length; i++){
                artistDef = $q.defer();
                artistObj = models.Artist.fromURI(artistArray[i]);
                var artistToplist = Toplist.forArtist(artistObj);
                artistToplistTracks(artistToplist,artistDef,models,Toplist).then(function(promiseDef){
                    promiseDef.resolve();
                });
                promiseArray.push(artistDef.promise);
            }
            return $q.all(promiseArray)
        }

        function getRandomArtists(){
            var artistsCount = 10;
            var artistKeys = _.keys($scope.userArtists);

            var randArray = randomArray(0,$scope.userArtistsCount,artistsCount);
            var artistArray = [];


            var artist, artistRelatedArtist, relatedArtistPosition;
            for(var i = 0; i < randArray.length; i++){
                artist = $scope.userArtists[(artistKeys[randArray[i]])];

                if(artist && artist.relatedArtists){
                    for(var j = 0; j < 4; j++){
                        relatedArtistPosition = _.random(0,artist.relatedArtists.length);
                        artistRelatedArtist = artist.relatedArtists[relatedArtistPosition];

                        //Remove from related artists, then add them to the artist array
                        artist.relatedArtists.splice(relatedArtistPosition,1);
                        if(artistRelatedArtist && !$scope.userArtists[artistRelatedArtist] && (_.indexOf(artistArray,artistRelatedArtist) === -1) && (_.indexOf($scope.bannedArtists, artistRelatedArtist) === -1)){
                            artistArray.push(artistRelatedArtist);
                        }
                    }
                }
            }

            alert(JSON.stringify(artistArray.length)+' related artists');

            if(artistArray.length){
                $scope.playlistSongs = [];

                require(['$api/models', '$api/toplists#Toplist'], function(models, Toplist) {
                    toplistForEachArtist(artistArray, models, Toplist).then(function(){
                        $scope.playlistSongs = _.first($scope.playlistSongs,30);
                        alert($scope.playlistSongs.length+' songs found!');
                        $scope.makeRandomPlaylist();
                    });
                });
            }

        }


        $scope.loadUserArtists = function(){

            findArtists().then(function(){
                $scope.findRelatedArtists();
            });



        };

        $scope.findRelatedArtists = function(){
            require(['$api/models'], function(models) {
                var keys = _.keys($scope.userArtists);
                for(var i = 0; i < keys.length; i++){
                    models.Artist.fromURI(keys[i]).load('uri','related').done(function(artist){
                        artist.related.snapshot(0,10,true).done(function(relatedSnapshot) {
                            var relatedArtists = [], relatedArtist;
                            for(var i = 0; i < relatedSnapshot.length; i++){
                                relatedArtist = relatedSnapshot.get(i);
                                if(relatedArtist && relatedArtist.uri && !$scope.userArtists[relatedArtist.uri]){
                                    relatedArtists.push(relatedArtist.uri);
                                }
                            }
                            $scope.userArtists[artist.uri].relatedArtists = relatedArtists;
                        });
                    });
                }

            });
        };

        $scope.loadRandomUserPlaylist = function(){
            App.storeLocalObject('userArtistsCount',$scope.userArtistsCount);
            App.storeLocalObject('userArtists',JSON.stringify($scope.userArtists));
            getRandomArtists();
        };

        $scope.loadRandomUserPlaylistForSongs = function(){
            getRandomSongs();
        };

        function getRandomSongs(){

        }

        require(['$api/models','$api/models#User','$api/models#Session'], function(models) {
            var user = models.User.fromURI('spotify:user:@');
            user.load('username', 'name').done(function(u) {
                $scope.anonUserID = u.identifier;
            });
        });

        $scope.recommendedArtists = function(){
            if($scope.topArtists.length != 0){
                var newArtists = _.shuffle($scope.topArtistsURIs);
                var topCount = 5;
                if(newArtists.length < 5){
                    topCount = newArtists.length;
                }



                var url = "http://developer.echonest.com/api/v4/artist/similar?api_key=VOW1HBCF5U0DHVUDM&bucket=id:spotify-WW"
                $scope.randomToplistSubset = [];
                var subsetArray = [];
                for(var i = 0; i<topCount; i++){
                    url+="&id="+newArtists[i].replace("spotify","spotify-WW");
                    subsetArray.push(newArtists[i]);
                    URIConverter.toName(newArtists[i])
                    .then(function(artist){
                        $scope.randomToplistSubset.push(artist);
                    });
                }


                $http({
                    'method':'GET',
                    'url': url
                })
                    .success(function(data){
                        if(data["response"]["artists"]){
                            $scope.suggestedArtists = [];
                            data["response"]["artists"].forEach(function(entry){
                                if(entry.foreign_ids){
                                    var uri = ((entry.foreign_ids[0]).foreign_id.replace("spotify-WW","spotify"));
                                    $scope.suggestedArtists.push({uri:uri, name:entry.name});
                                }
                            });
                        }
                    })
            }
        };

        $scope.getSongsByBPM = function(){
            $http({
                method:'GET',
                url: 'http://developer.echonest.com/api/v4/catalog/read?api_key=VOW1HBCF5U0DHVUDM&bucket=audio_summary',
                params: { 'id': EchoTasteProfile.profileID, 'format': 'json', 'results': 1000, 'bucket':'id:spotify-WW'},
                headers:{ 'Cache-Control':'private, no-store, max-age=0'},
                cache: false
            })

                .success(function(data){
                    $scope.workoutPlaylistSongs = [];
                    var songs = data["response"]["catalog"]["items"];

                    require(['$api/models'], function(models) {
                        for(var i=0; i<songs.length; i++){
                            if(songs[i]["audio_summary"] && songs[i]["audio_summary"]["tempo"] && songs[i]["audio_summary"]["tempo"] >= BPM_VAL){
                                $scope.workoutPlaylistSongs.push(models.Track.fromURI(songs[i]["request"]["track_id"].replace("spotify-WW","spotify")));
                            }
                        }
                    });

                    if($scope.workoutPlaylistSongs.length != 0){
                        require(['$api/models'], function(models) {
                            models.Playlist.createTemporary("Workout Playlist").done(function(notLoadedPlaylist) {
                                notLoadedPlaylist.load("tracks").done(function(playlist) {
                                    playlist.tracks.clear();
                                    playlist.tracks.add($scope.workoutPlaylistSongs);
                                    require(['$views/list#List'], function(List) {
                                        var list = List.forPlaylist(playlist);
                                        var playlistDiv = document.getElementById('discoverPlaylist');
                                        $scope.playlistAdded = true;
                                        playlistDiv.appendChild(list.node);
                                        list.init();
                                    });
                                });
                            });
                        });
                    }
                })
                .error(function(err){
                    alert("fail "+err);
                })
        };


        $scope.makePlaylist = function(){

            $http({
                'method':'POST',
                'url': 'http://developer.echonest.com/api/v4/catalog/create?api_key=VOW1HBCF5U0DHVUDM',
                'params': { 'format':'json', 'name': "echoSpotify_profile_"+$scope.anonUserID},
                'data': {},
                'headers': {"Content-Type":"multipart/form-data"},
                'cache':false
            })
                .success(function(data){
                    if(data["response"] && (data["response"])["id"]){
                        EchoTasteProfile.profileID = (data["response"])["id"];
                    }else if(data["response"] && (data["response"])["status"]){
                        var message = ((data["response"])["status"])["message"];
                        EchoTasteProfile.profileID = message.replace("A catalog with this name is already owned by this API Key: ","");
                    }
                    App.storeLocalObject('profileID', EchoTasteProfile.profileID);
                    //Get freshness and mainstreamness
                    $http({
                        'method':'GET',
                        'url': 'http://developer.echonest.com/api/v4/catalog/predict?api_key=VOW1HBCF5U0DHVUDM&category=mainstreamness&category=freshness',
                        'params': { 'format':'json', 'id': EchoTasteProfile.profileID},
                        'cache':false
                    })
                        .success(function(data){
                            if(data["response"]["catalog"]["predictions"]){
                                $scope.mainstreamness = data["response"]["catalog"]["predictions"]["mainstreamness"]*100;
                                $scope.freshness = data["response"]["catalog"]["predictions"]["freshness"]*100;
                                App.storeLocalObject('mainstreamness',$scope.mainstreamness);
                                App.storeLocalObject('freshness',$scope.freshness);
                            }
                        })
                        .error(function (err){
                            alert("failure in getting mainstreamness + freshness "+JSON.stringify(err));
                        })

                })
                .error(function(err){
                    alert("fail "+JSON.stringify(err));
                });

            require(['$api/library#Library'], function(Library) {
                Library.forCurrentUser().load("tracks").done(function(library) {
                    library.tracks.snapshot().done(function(snapshot) {
                        $scope.trackCount = snapshot.length;
                        $scope.tracks = snapshot["_uris"];
                        App.storeLocalObject('tracks',JSON.stringify($scope.tracks));
                        App.storeLocalObject('trackCount',$scope.trackCount);
                    })
                })
            });

            require(['$api/toplists#Toplist'], function(Toplist) {
                var toplist = Toplist.forCurrentUser();
                toplist.artists.snapshot().done(function(userTopArtists){
                    if(userTopArtists["_meta"] && userTopArtists["_uris"]){
                        $scope.topArtists = userTopArtists["_meta"];
                        App.storeLocalObject('topArtists',JSON.stringify($scope.topArtists));
                        $scope.topArtistsURIs = userTopArtists["_uris"];
                        App.storeLocalObject('topArtistsURIs',JSON.stringify($scope.topArtistsURIs));
                    }

                })
            });

        }

        function getData(){
            var trackJson = [];
            for(var i =0; i<$scope.tracks.length; i++){
                var trackUID = $scope.tracks[i].replace("spotify","spotify-WW");

                trackJson.push({item: {item_id:"trackID-"+i+"-"+trackUID, track_id:trackUID}});
            }
            return {data: JSON.stringify(trackJson)};
        }


        $scope.makeRandomPlaylist = function(){
            require(['$api/models'], function(models) {
                models.Playlist.createTemporary("Discover Playlist").done(function(notLoadedPlaylist) {
                    notLoadedPlaylist.load("tracks").done(function(playlist) {
                        playlist.tracks.clear();
                        var tracks = [];
                        for (var i = 0; i < $scope.playlistSongs.length; i++) {
                            if($scope.playlistSongs[i]){
                                tracks.push(models.Track.fromURI($scope.playlistSongs[i]));
                            }
                        }
                        playlist.tracks.add(tracks);
                        require(['$views/list#List'], function(List) {
                            var list = List.forPlaylist(playlist);
                            var playlistDiv = document.getElementById('discoverPlaylist');
                            $scope.playlistAdded = true;
                            $scope.$apply();
                            playlistDiv.appendChild(list.node);
                            list.init();
                        });
                    });
                });
            });
        };

        $scope.getRandomPlaylist = function() {
            var minVariety = .6;
            var varietyVal = Math.random() * (.2) + minVariety;
            $http({
                method:'GET',
                url: 'http://developer.echonest.com/api/v4/playlist/static?api_key=VOW1HBCF5U0DHVUDM&bucket=tracks',
                params: { 'seed_catalog': EchoTasteProfile.profileID, 'format': 'json', 'results': 50, 'type':'catalog-radio', 'bucket':'id:spotify-WW', 'adventurousness':1, 'distribution':'wandering', 'variety':varietyVal},
                headers:{ 'Cache-Control':'private, no-store, max-age=0'},
                cache: false
            })

                .success(function(data){
                    $scope.playlistSongs = [];
                    var songs = data["response"]["songs"];

                    require(['$api/models'], function(models) {
                        for(var i=0; i<songs.length; i++){
                            if(songs[i]["tracks"][0]){
                                $scope.playlistSongs.push(models.Track.fromURI(songs[i]["tracks"][0]["foreign_id"].replace("spotify-WW","spotify")));
                            }

                        }
                    });



                    if($scope.playlistSongs.length != 0){
                        $scope.makeRandomPlaylist();
                    }
                })
                .error(function(err){
                    alert("fail "+err);
                });
        };

        $scope.sendTastes = function() {
            if($scope.tracks != null){ //Need artists


                var stringData = $.param(getData());

                $http({
                    method:'POST',
                    url: 'http://developer.echonest.com/api/v4/catalog/update?api_key=VOW1HBCF5U0DHVUDM',
                    params: { 'format':'json', 'data_type': 'json', 'id': EchoTasteProfile.profileID},
                    headers: {'Content-Type': 'application/x-www-form-urlencoded'},
                    data: stringData
                })


            }
        }
  }]);
