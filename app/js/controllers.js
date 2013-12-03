'use strict';

/* Controllers */

angular.module('myApp.controllers', []).
  controller('MusicCtrl', ['$scope', '$http', 'App', function($scope, $http, App) {
        $scope.trackCount = App.getLocalObject('trackCount');
        $scope.tracks = App.getLocalObject('tracks', true);
        $scope.topArtists = App.getLocalObject('topArtists', true);;
        $scope.profileID = App.getLocalObject('profileID');
        $scope.playlistSongs = [];
        $scope.mainstreamness = App.getLocalObject('mainstreamness');
        $scope.freshness = App.getLocalObject('freshness');


        $scope.makePlaylist = function(){

            $http({
                'method':'POST',
                'url': 'http://developer.echonest.com/api/v4/catalog/create?api_key=VOW1HBCF5U0DHVUDM',
                'params': { 'format':'json', 'name': "echoSpotify_default"},
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
                    if(userTopArtists["_meta"]){
                        $scope.topArtists = userTopArtists["_meta"];
                        App.storeLocalObject('topArtists',JSON.stringify($scope.topArtists));
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
                    alert(JSON.stringify(data));
                    var songs = data["response"]["songs"];

                    for(var i=0; i<songs.length; i++){
                        if(songs[i]["tracks"][0]){
                            $scope.playlistSongs.push(songs[i]["tracks"][0]["foreign_id"].replace("spotify-WW","spotify"));
                        }

                    }
                    alert($scope.playlistSongs);
                    if($scope.playlistSongs.length != 0){
                        require(['$api/models'], function(models) {
                            models.Playlist.create("Discover Playlist").done(function(playlist) {
                                playlist.load("tracks").done(function(playlist) {
                                    var tracks = [];
                                    for (var i = 0; i < songs.length; i++) {
                                        if($scope.playlistSongs[i]){
                                            tracks.push(models.Track.fromURI($scope.playlistSongs[i]));
                                        }
                                    }
                                    playlist.tracks.add(tracks);
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
                //var stringData = $.param({data: JSON.stringify([{item:{item_id:"royks",artist_name:"Royksopp"}},{item:{item_id:"inter",artist_name:"Interpol"}}])})
                var url = 'http://developer.echonest.com/api/v4/catalog/update?api_key=VOW1HBCF5U0DHVUDM';
                //alert("string data " +stringData);


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
  }])
  .controller('MyCtrl2', [function() {

  }]);
