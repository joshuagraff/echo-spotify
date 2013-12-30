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
            }

        };

        return App;
    }])
    .factory('URIConverter', ['$q', function($q) {
        var URIConverter = {
            getImage: function (uri){
                var deferred = $q.defer();
                require(['$api/models','$api/models#Artist', '$views/image#Image'], function(models, Artist, Image) {
                    models.Artist.fromURI(uri).load('name').done(function(artistObj){
                        var artistImage = Image.forArtist(artistObj);
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
    }]);