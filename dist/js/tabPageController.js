var app, underscore;

underscore = angular.module('underscore', []);

underscore.factory('_', function() {
  return window._;
});

app = angular.module('tabApp', ['ui.router', 'ui.bootstrap', 'angular-underscore', 'underscore', 'ngDraggable', 'xeditable']);

app.run(function($rootScope, $state, $stateParams) {
  $rootScope.$state = $state;
  return $rootScope.$stateParams = $stateParams;
});

app.config(function($stateProvider, $urlRouterProvider) {
  $stateProvider.state('searches', {
    url: '/',
    templateUrl: '/dist/templates/tabPage/searches.html',
    controller: function($scope, $state) {
      var updateFn;
      $scope.promoteToTask = function(query) {
        SearchInfo.db({
          ___id: query.___id
        }).update({
          task: query.name
        });
        return updateFn();
      };
      $scope.addToTask = function(query, task) {
        return console.log(task);
      };
      $scope.todo = function(tab) {
        PageInfo.db({
          ___id: tab.___id
        }).update({
          status: "todo"
        });
        return updateFn();
      };
      $scope.uncategorize = function(tab) {
        PageInfo.db({
          ___id: tab.___id
        }).update({
          status: void 0
        });
        return updateFn();
      };
      $scope.archive = function(tab) {
        PageInfo.db({
          ___id: tab.___id
        }).update({
          status: "archive"
        });
        return updateFn();
      };
      $scope.discard = function(tab) {
        PageInfo.db({
          ___id: tab.___id
        }).update({
          status: "discard"
        });
        return updateFn();
      };
      $scope.changeTaskName = function(curr, updated) {
        SearchInfo.db({
          task: curr
        }).update({
          task: updated
        });
        return updateFn();
      };
      updateFn = function() {
        var grouped_pages, grouped_searches, page_info, search_info;
        page_info = PageInfo.db().get();
        search_info = SearchInfo.db().get();
        grouped_pages = _.groupBy(page_info, function(record) {
          return record.query;
        });
        grouped_pages = _.map(grouped_pages, function(val, key) {
          return [
            _.find(search_info, function(search) {
              return search.name === key;
            }), _.groupBy(_.groupBy(val, function(record) {
              var hash, uri;
              uri = new URI(record.url);
              hash = uri.hash();
              if (hash) {
                uri.hash("");
                record.hash = hash;
              }
              return uri.toString();
            }), function(url_group) {
              return url_group[0].status;
            })
          ];
        });
        console.log(grouped_pages);
        grouped_searches = _.groupBy(grouped_pages, function(search) {
          return search[0].task;
        });
        $scope.searches = (_.filter(grouped_pages, function(search) {
          return typeof search[0].task === "undefined";
        })).reverse();
        return $scope.tasks = _.pick(grouped_searches, function(val, key, obj) {
          return key !== "undefined";
        });
      };
      return updateFn();
    }
  }).state('tree', {
    url: '/tree',
    templateUrl: '/dist/templates/tabPage/tree.html',
    controller: function($scope, $state) {
      var queryUpdate, toggleAll, updateFn;
      queryUpdate = function() {
        return $scope.$apply(function() {
          return $scope.queries = SearchInfo.db().get();
        });
      };
      $scope.queries = SearchInfo.db().get();
      $scope.query = $scope.queries[0];
      d3_tree.init_vis();
      toggleAll = function(d) {
        if (d.children) {
          d.children.forEach(toggleAll);
          return d3_tree.toggle(d);
        }
      };
      updateFn = function() {
        var page_info;
        page_info = PageInfo.db({
          query: $scope.query.name
        }, {
          referrer: {
            isNull: false
          }
        }).get();
        d3_tree.root = PageInfo.db({
          query: $scope.query.name
        }, {
          referrer: {
            isNull: true
          }
        }).first();
        d3_tree.root.children = [];
        d3_tree.root.x0 = d3_tree.h / 2;
        d3_tree.root.y0 = 0;
        d3_tree.root.name = d3_tree.root.query;
        _.each(page_info, function(record) {
          return record.children = [];
        });
        _.each(page_info, function(record) {
          var referrer;
          record.name = record.url;
          referrer = _.find(page_info, function(item) {
            return item.___id === record.referrer;
          });
          if (referrer != null) {
            return referrer.children.push(record);
          } else {
            return d3_tree.root.children.push(record);
          }
        });
        d3_tree.root.children.forEach(toggleAll);
        return d3_tree.update(d3_tree.root);
      };
      updateFn();
      SearchInfo.updateFunction(queryUpdate);
      PageInfo.updateFunction(updateFn);
      return $scope.$watch('query', function(newVal, oldVal) {
        return updateFn();
      });
    }
  }).state('settings', {
    url: '/settings',
    templateUrl: '/dist/templates/tabPage/settings.html',
    controller: function($scope, $state, $modal) {
      return $scope.openDeleteModal = function() {
        var modalInstance;
        return modalInstance = $modal.open({
          templateUrl: 'deleteContent.html',
          size: 'sm',
          controller: 'removeModal'
        });
      };
    }
  });
  return $urlRouterProvider.otherwise('/');
});

app.controller('MainCtrl', function($scope, $rootScope, $state) {
  return $scope.getDomain = function(str) {
    var matches;
    matches = str.match(/^https?\:\/\/([^\/:?#]+)(?:[\/:?#]|$)/i);
    return matches && matches[1];
  };
});

app.controller('removeModal', function($scope, $modalInstance) {
  $scope.ok = function() {
    PageInfo.clearDB();
    SearchInfo.clearDB();
    return $modalInstance.close('cleared');
  };
  return $scope.cancel = function() {
    return $modalInstance.close('canceled');
  };

  /*
    if $cookies.state?
    $scope.$evalAsync (scope) ->
      $state.go($cookies.state)
   */
});

//# sourceMappingURL=tabPageController.js.map
