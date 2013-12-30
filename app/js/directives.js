'use strict';

/* Directives */


angular.module('myApp.directives', []).
  directive('appVersion', ['version', function(version) {
    return function(scope, elm, attrs) {
      elm.text(version);
    };
  }])
    .directive('artistImage', ['URIConverter', function(URIConverter){
        return {
            restrict:'E',
            scope:{
                artistUri: '='
            },
            link: function(scope,elem,attrs){
                URIConverter.getImage(attrs.urivalue).then(function(artistImage){
                    elem.append(artistImage.node);
                    artistImage.setStyle('inset');
                    artistImage.setSize(300,300);
                    artistImage.setOverlay(attrs.artistname);
                    artistImage.setPlayer(true);
                })
            }
        }
    }]);
