'use strict';

/* Directives */


angular.module('myApp.directives', []).
  directive('appVersion', ['version', function(version) {
    return function(scope, elm, attrs) {
      elm.text(version);
    };
  }])
    .directive('artistImage', ['URIConverter', 'PlaylistCreator', function(URIConverter, PlaylistCreator){
        return {
            restrict:'E',
            scope:{
                artistUri: '='
            },
            link: function(scope,elem,attrs){
                URIConverter.getImage(attrs.urivalue).then(function(artistImage){
                    var artistDiv = document.createElement('div');
                    var artistImageDiv = document.createElement('div');
                    var listDiv = document.createElement('div');


                    artistImageDiv.className = 'artistImage';
                    listDiv.className = 'artistList';
                    artistDiv.className = 'artistDiv';


                    artistImageDiv.appendChild(artistImage.node);
                    artistImage.setStyle('inset');
                    artistImage.setSize(600,600);

                    //artistImage.setPlayer(true);
                    PlaylistCreator.fromArtist(attrs.urivalue).then(function(playlist){
                        //elem.append(playlist.node);
                        if(playlist){
                            artistImage.setOverlay(attrs.artistname);
                            listDiv.appendChild(playlist.node);
                            playlist.init();
                        }
                    })
                    artistDiv.appendChild(artistImageDiv);
                    artistDiv.appendChild(listDiv);
                    elem.append(artistDiv);
                })

            }
        }
    }]);
