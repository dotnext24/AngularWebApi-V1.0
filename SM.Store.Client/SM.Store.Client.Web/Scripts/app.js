'use strict'

//Declare app level module which depends on filters, and services
angular.module('smApp', ['ngRoute', 'smApp.controllers', 'smApp.AppServices', 'smApp.directives',  'ui.bootstrap', 'ngTable', 'ngExDialog', 'ajaxLoader', function () {
}])
//Configure the routes
.config(['$routeProvider', function ($routeProvider) {
    $routeProvider
    .when('/list', {
        templateUrl: '/Pages/productList.html',
        controller: 'productListController'
    })
    .when('/list_cont', {
        templateUrl: '/Pages/contactList.html',
        controller: 'contactListController'
        })
    .when('/about', {
        templateUrl: '/Pages/about.html',
        controller: 'aboutController'
    })
    ;

    $routeProvider.otherwise({ redirectTo: '/list' });
}])
//Dialog default settings.
.config(['exDialogProvider', function (exDialogProvider) {
    exDialogProvider.setDefaults({
        template: 'ngExDialog/commonDialog.html',
        width: '330px',
        //closeByXButton: true,
        //closeByClickOutside: true,
        //closeByEscKey: true,
        //appendToElement: '',
        //beforeCloseCallback: '',
        //grayBackground: true,
        //cacheTemplate: true,
        //draggable: true,
        //animation: true,
        //messageTitle: 'Information',
        //messageIcon: 'info',
        //messageCloseButtonLabel: 'OK',
        //confirmTitle: 'Confirmation',
        //confirmIcon: 'question',
        //confirmActionButtonLabel: 'Yes',
        //confirmCloseButtonLabel: 'No'
    });
}]);
;

