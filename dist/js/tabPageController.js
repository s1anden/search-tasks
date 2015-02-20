var app;

app = angular.module('tabApp', ['ui.router', 'ui.bootstrap', 'angular-underscore']);

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
        SearchInfo.db().remove({
          ___id: query.___id
        });
        query.searches = [query];
        query.___id = generateUUID();
        TaskInfo.db.insert(query);
        return updateFn(true);
      };
      $scope.addToTask = function(query) {
        var searches;
        searches = query.parent.children || [];
        searches.push(query);
        TaskInfo.db({
          ___id: query.parent.___id
        }).update({
          children: searches
        });
        console.log(TaskInfo.db().get({
          ___id: query.parent.___id
        }));
        SearchInfo.db().remove({
          ___id: query.___id
        });
        return updateFn(true);
      };
      updateFn = function(apply) {
        var search_info, task_info;
        search_info = SearchInfo.db().get();
        console.log(search_info);
        task_info = TaskInfo.db().get();
        console.log(task_info);
        if (!apply) {
          return $scope.$apply(function() {
            return $scope.searches = _.pick(search_info, function(val, key, obj) {
              return Object.keys(val).length > 2;
            });
          });
        } else {
          $scope.searches = search_info.reverse();
          return $scope.tasks = task_info.reverse();
        }
      };
      updateFn(true);
      return SearchInfo.updateFunction(updateFn);
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
