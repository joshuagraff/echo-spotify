'use strict';

/* Controllers */

var myApp = angular.module('myApp', []);

angular.module('myApp.controllers', []).
  controller('MyCtrl1', [function() {

  }])
  .controller('MyCtrl2', [function() {

  }]);

/*myApp.controller("MusicCtrl", function($scope) {
    $scope.loadMoreMusic = function(){
        alert("Loading Music!");
    }
})  * */

function MusicCtrl($scope, $http) {
    $scope.result = 'No artists found';
    $scope.artists = null;
    $scope.profileID = null;


    $scope.makePlaylist = function(){

        $http({
            'method':'POST',
            'url': 'http://developer.echonest.com/api/v4/catalog/create?api_key=VOW1HBCF5U0DHVUDM',
            'params': { 'type': "artist", 'format':'json', 'name': "echoSpotify_test_artist_catalog"},
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

            })
            .error(function(err){
                alert("fail "+err);
            })

        require(['$api/library#Library'], function(Library) {
            Library.forCurrentUser().load("artists").done(function(library) {
                library.artists.snapshot().done(function(snapshot) {
                    $scope.result = snapshot.length;
                    $scope.artists = snapshot;
                })
            })

            /**
            models.player.load('track').done(function(player) {
                var track = player.track;
                if (track == null) {
                    alert("Start playing something and I'll make a playlist of good songs based on that song");
                } else {
                    track.load("artists").done(function(track) {
                        fetchPlaylist(track.artists[0], 25);
                    });
                }
            });   */
        })

    }
    $scope.sendTastes = function() {
        if($scope.artists != null){ //Need artists
            $http({
                'method':'POST',
                'url': 'http://developer.echonest.com/api/v4/catalog/update?api_key=VOW1HBCF5U0DHVUDM',
                'params': { 'format':'json', 'data_type': 'json', 'id': $scope.profileID},
                'data': JSON.stringify([{
                    "item":
                    {
                        "item_id": "royks",
                        "artist_name": "Royksopp"
                    }
                },
                    {
                        "item":
                        {
                            "item_id": "inter",
                            "artist_name": "Interpol"
                        }
                    }]),
                'cache':false
            })
                .success(function(data){
                    alert("success post!");
                })
                .error(function(err){
                    alert("fail "+err);
                })
        }
    }
}