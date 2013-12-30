'use strict';

/* Controllers */

//+ Jonas Raoni Soares Silva
//@ http://jsfromhell.com/array/shuffle [v1.0]
function shuffle(o){ //v1.0
    for(var j, x, i = o.length; i; j = Math.floor(Math.random() * i), x = o[--i], o[i] = o[j], o[j] = x);
    return o;
};

angular.module('myApp.controllers', []).
  controller('MusicCtrl', ['$scope', '$http', 'App', 'URIConverter', '$sce', function($scope, $http, App, URIConverter, $sce) {
        $scope.trackCount = App.getLocalObject('trackCount');
        $scope.tracks = App.getLocalObject('tracks', true);
        $scope.topArtists = App.getLocalObject('topArtists', true);
        $scope.topArtistsURIs = App.getLocalObject('topArtistsURIs',true);
        $scope.profileID = App.getLocalObject('profileID');
        $scope.playlistSongs = [];
        $scope.playlistList = null;
        $scope.mainstreamness = App.getLocalObject('mainstreamness');
        $scope.freshness = App.getLocalObject('freshness');
        $scope.anonUserID = null;

        $scope.randomToplistSubset = [];
        $scope.suggestedArtists = null;



        require(['$api/models','$api/models#User','$api/models#Session'], function(models) {
            var user = models.User.fromURI('spotify:user:@');
            user.load('username', 'name').done(function(u) {
                $scope.anonUserID = u.identifier;
            });
        });

        $scope.recommendedArtists = function(){
            if($scope.topArtists.length != 0){
                var newArtists = shuffle($scope.topArtistsURIs);
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
                                var uri = ((entry.foreign_ids[0]).foreign_id.replace("spotify-WW","spotify"));
                                $scope.suggestedArtists.push({uri:uri, name:entry.name});
                            });
                        }
                    })

            }

        }


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
                        $scope.profileID = (data["response"])["id"];
                    }else if(data["response"] && (data["response"])["status"]){
                        var message = ((data["response"])["status"])["message"];
                        $scope.profileID = message.replace("A catalog with this name is already owned by this API Key: ","");
                    }
                    App.storeLocalObject('profileID', $scope.profileID);
                    //Get freshness and mainstreamness
                    $http({
                        'method':'GET',
                        'url': 'http://developer.echonest.com/api/v4/catalog/predict?api_key=VOW1HBCF5U0DHVUDM&category=mainstreamness&category=freshness',
                        'params': { 'format':'json', 'id': $scope.profileID},
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
                })

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
                    alert(JSON.stringify(userTopArtists));
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

        $scope.getRandomPlaylist = function() {
            var minVariety = .6;
            var varietyVal = Math.random() * (.2) + minVariety;
            $http({
                method:'GET',
                url: 'http://developer.echonest.com/api/v4/playlist/static?api_key=VOW1HBCF5U0DHVUDM&bucket=tracks',
                params: { 'seed_catalog': $scope.profileID, 'format': 'json', 'results': 50, 'type':'catalog-radio', 'bucket':'id:spotify-WW', 'adventurousness':1, 'distribution':'wandering', 'variety':varietyVal},
                headers:{ 'Cache-Control':'private, no-store, max-age=0'},
                cache: false
            })

                .success(function(data){
                    $scope.playlistSongs = [];
                    var songs = data["response"]["songs"];

                    require(['$api/models'], function(models) {
                        for(var i=0; i<songs.length; i++){
                            if(songs[i]["tracks"][0]){
                                //alert("Song: "+songs[i]["tracks"][0]["foreign_id"].replace("spotify-WW","spotify"))
                                $scope.playlistSongs.push(models.Track.fromURI(songs[i]["tracks"][0]["foreign_id"].replace("spotify-WW","spotify")));
                            }

                        }
                    });



                    if($scope.playlistSongs.length != 0){
                        require(['$api/models'], function(models) {
                            models.Playlist.createTemporary("Discover Playlist").done(function(notLoadedPlaylist) {
                                notLoadedPlaylist.load("tracks").done(function(playlist) {
                                    playlist.tracks.clear();
                                    var tracks = [];
                                    for (var i = 0; i < songs.length; i++) {
                                        if($scope.playlistSongs[i]){
                                            tracks.push(models.Track.fromURI($scope.playlistSongs[i]));
                                        }
                                    }
                                    playlist.tracks.add(tracks);
                                    require(['$views/list#List'], function(List) {
                                        //$scope.playlistList =
                                        var list = List.forPlaylist(playlist);
                                        document.body.appendChild(list.node);
                                        list.init();
                                        //$scope.playlistList.init();
                                    });
                                });
                            });
                        });
                    }
                })
                .error(function(err){
                    alert("fail "+err);
                })




            //http://developer.echonest.com/api/v4/playlist/static?api_key=VOW1HBCF5U0DHVUDM&seed_catalog=CADPRLD14281476904&format=json&results=30&type=catalog-radio
        }

        $scope.sendTastes = function() {
            if($scope.tracks != null){ //Need artists


                var stringData = $.param(getData());

                $http({
                    method:'POST',
                    url: 'http://developer.echonest.com/api/v4/catalog/update?api_key=VOW1HBCF5U0DHVUDM',
                    params: { 'format':'json', 'data_type': 'json', 'id': $scope.profileID},
                    headers: {'Content-Type': 'application/x-www-form-urlencoded'},
                    data: stringData
                })


            }
        }
  }]);
