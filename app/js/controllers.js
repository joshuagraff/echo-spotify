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
    $scope.topArtists = null;
    $scope.profileID = null;
    $scope.playlistSongs = [];


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
                    $scope.artists = snapshot["_uris"];
                })
            })
        });

        require(['$api/toplists#Toplist'], function(Toplist) {
            var toplist = Toplist.forCurrentUser();
            toplist.artists.snapshot().done(function(userTopArtists){
                $scope.topArtists = userTopArtists;
            })
        });

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
    }

    function getData(){
        var artistJson = [];
        for(var i =0; i<$scope.artists.length; i++){
            var artistUID = $scope.artists[i].replace("spotify","spotify-WW");

            artistJson.push({item: {item_id:"artistID-"+artistUID, artist_id:artistUID}});
        }
        alert(JSON.stringify(artistJson));
        return {data: JSON.stringify(artistJson)};
    }

    $scope.getRandomPlaylist = function() {
        var suggestions = null;
        $http({
            method:'GET',
            url: 'http://developer.echonest.com/api/v4/playlist/static?api_key=VOW1HBCF5U0DHVUDM',
            params: { 'seed_catalog': $scope.profileID, 'format': 'json', 'results': 30, 'type':'catalog-radio'}
            //'data':  { 'format':'json', 'data_type': 'json', 'id': $scope.profileID, 'data': JSON.stringify([{"item":{"item_id":"royks","artist_name":"Royksopp"}},{"item":{"item_id":"inter","artist_name":"Interpol"}}])},
        })

            .success(function(data){
                suggestions = data;
            })
            .error(function(err){
                alert("fail "+err);
            })




        //http://developer.echonest.com/api/v4/playlist/static?api_key=VOW1HBCF5U0DHVUDM&seed_catalog=CADPRLD14281476904&format=json&results=30&type=catalog-radio
    }

    $scope.sendTastes = function() {
        if($scope.artists != null){ //Need artists
            //var stringData = $.param({data: JSON.stringify([{item:{item_id:"royks",artist_name:"Royksopp"}},{item:{item_id:"inter",artist_name:"Interpol"}}])})
            var url = 'http://developer.echonest.com/api/v4/catalog/update?api_key=VOW1HBCF5U0DHVUDM';
            //alert("string data " +stringData);


            var stringData = $.param(getData());
            //return;





            $http({
                method:'POST',
                url: 'http://developer.echonest.com/api/v4/catalog/update?api_key=VOW1HBCF5U0DHVUDM',
                params: { 'format':'json', 'data_type': 'json', 'id': $scope.profileID},
                headers: {'Content-Type': 'application/x-www-form-urlencoded'},
                data: stringData
                //'data':  { 'format':'json', 'data_type': 'json', 'id': $scope.profileID, 'data': JSON.stringify([{"item":{"item_id":"royks","artist_name":"Royksopp"}},{"item":{"item_id":"inter","artist_name":"Interpol"}}])},
            })

            /*$.ajax(
                {
                    type:'POST',
                    url: 'http://developer.echonest.com/api/v4/catalog/update?api_key=VOW1HBCF5U0DHVUDM&data_type=json&format=json&id=CADPRLD14281476904',
                    //contentType: 'application/json; charset=utf-8',
                    //params: { 'format':'json', 'data_type': 'json', 'id': $scope.profileID },
                    data: stringData
                    //'data':  { 'format':'json', 'data_type': 'json', 'id': $scope.profileID, 'data': JSON.stringify([{"item":{"item_id":"royks","artist_name":"Royksopp"}},{"item":{"item_id":"inter","artist_name":"Interpol"}}])},
                })*/

                .success(function(data){
                    alert("success post! "+JSON.stringify(data));
                })
                .error(function(err){
                    alert("fail "+err);
                })

            /*var form = document.createElement("form");
            form.setAttribute("method", "post");
            form.setAttribute("action", url);

            var hiddenField = document.createElement("input");
            hiddenField.setAttribute("type","hidden");
            hiddenField.setAttribute("name","format");
            hiddenField.setAttribute("value","json");

            form.appendChild(hiddenField);

            var hiddenField2 = document.createElement("input");
            hiddenField2.setAttribute("type","hidden");
            hiddenField2.setAttribute("name","data_type");
            hiddenField2.setAttribute("value","json");

            form.appendChild(hiddenField2);

            var hiddenField3 = document.createElement("input");
            hiddenField3.setAttribute("type","hidden");
            hiddenField3.setAttribute("name","id");
            hiddenField3.setAttribute("value",$scope.profileID);

            form.appendChild(hiddenField3);

            var hiddenField4 = document.createElement("input");
            hiddenField4.setAttribute("type","hidden");
            hiddenField4.setAttribute("name","data");
            hiddenField4.setAttribute("value",stringData);

            form.appendChild(hiddenField4);


            document.body.appendChild(form);
            form.submit();
            */

        }
    }
}