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
    }]);