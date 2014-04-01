'use strict';


// Declare app level module which depends on filters, and services
angular.module('myApp', [
  'ngRoute',
  'myApp.filters',
  'myApp.services',
  'myApp.directives',
  'myApp.controllers',
  'ui.bootstrap'
]).
config(['$routeProvider', function($routeProvider) {
  $routeProvider.when('/defaultView', {templateUrl: 'partials/default.html', controller: 'MusicCtrl'});
  $routeProvider.otherwise({redirectTo: '/defaultView'});
}]);
