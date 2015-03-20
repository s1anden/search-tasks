underscore = angular.module('underscore', []);
underscore.factory('_', () ->
  return window._;
);

app = angular.module('tabApp', ['ui.router', 'ui.bootstrap', 'angular-underscore', 'underscore', 'ngDraggable', 'xeditable'])

app.run ($rootScope, $state, $stateParams) ->
  $rootScope.$state = $state
  $rootScope.$stateParams = $stateParams

app.config ($stateProvider, $urlRouterProvider) ->

  $stateProvider
    .state('searches', {
      url: '/'
      templateUrl: '/dist/templates/tabPage/searches.html'
      controller: ($scope, $state) ->
        $scope.promoteToTask = (query) ->
          SearchInfo.db({___id:query.___id}).update({task:query.name})
          updateFn()
        $scope.addToTask = (query, task) ->
          # SearchInfo.db({___id: query.___id}).update({task:query.task})
          # updateFn()
          console.log(task)
        $scope.todo = (tab) ->
          PageInfo.db({___id:tab.___id}).update({status:"todo"})
          updateFn()
        $scope.uncategorize = (tab) ->
          PageInfo.db({___id:tab.___id}).update({status:undefined})
          updateFn()
        $scope.archive = (tab) ->
          PageInfo.db({___id:tab.___id}).update({status:"archive"})
          updateFn()
        $scope.discard = (tab) ->
          PageInfo.db({___id:tab.___id}).update({status:"discard"})
          updateFn()
        $scope.changeTaskName = (curr, updated) ->
          SearchInfo.db({task:curr}).update({task:updated});
          updateFn()
        updateFn = () ->
          # SearchInfo.clearDB()
          # PageInfo.clearDB()

          page_info = PageInfo.db().get()
          search_info = SearchInfo.db().get()
          # groups pages into sets based on query
          grouped_pages = _.groupBy page_info, (record) ->
            record.query
          # 1. maps grouped pages into an array of format [query, [grouped URIs]]
          # 2. converts array to an object
          grouped_pages = _.map grouped_pages, (val,key) ->
            [(_.find search_info, (search) ->
              search.name == key
              ), (_.groupBy (_.groupBy val, (record) ->
                uri = new URI(record.url)
                hash = uri.hash()
                if (hash)
                  uri.hash("")
                  record.hash = hash
                return uri.toString()),
              (url_group) ->
                url_group[0].status
              )
            ]
          console.log(grouped_pages)

          grouped_searches = _.groupBy grouped_pages, (search) ->
            search[0].task

          $scope.searches = (_.filter grouped_pages, (search) ->
            typeof search[0].task == "undefined"
          ).reverse()
          $scope.tasks = _.pick grouped_searches, (val, key, obj) ->
            key != "undefined"
        updateFn()
        # SearchInfo.updateFunction(updateFn) #******
        # PageInfo.updateFunction(updateFn)
      })
    .state('tree', {
      url: '/tree'
      templateUrl: '/dist/templates/tabPage/tree.html'
      controller: ($scope, $state) ->
        #Get our list of queries
        queryUpdate = () ->
          $scope.$apply () ->
            $scope.queries = SearchInfo.db().get()
        $scope.queries = SearchInfo.db().get()
        $scope.query = $scope.queries[0]
        #Initialize everything for d3
        d3_tree.init_vis()
        toggleAll = (d) ->
          if d.children
            d.children.forEach(toggleAll)
            d3_tree.toggle(d)

        updateFn = () ->
          page_info = PageInfo.db({query: $scope.query.name}, {referrer: {isNull: false}}).get()
          #Root is the one without the referrer
          d3_tree.root = PageInfo.db({query: $scope.query.name}, {referrer: {isNull: true}}).first()
          d3_tree.root.children = [] 
          d3_tree.root.x0 = d3_tree.h/2
          d3_tree.root.y0 = 0
          d3_tree.root.name = d3_tree.root.query

          _.each page_info, (record) ->
            record.children = []

          _.each page_info, (record) ->
            #uri = new URI(record.url)
            record.name = record.url
            referrer = _.find page_info, (item) ->
              item.___id == record.referrer
            if referrer?
              referrer.children.push(record)
            else
              d3_tree.root.children.push(record)


          d3_tree.root.children.forEach(toggleAll)
          d3_tree.update d3_tree.root  

        updateFn()
        SearchInfo.updateFunction(queryUpdate)
        PageInfo.updateFunction(updateFn)
        $scope.$watch 'query', (newVal, oldVal) ->
          updateFn()
      })
    .state('settings', {
      url: '/settings'
      templateUrl: '/dist/templates/tabPage/settings.html'
      controller: ($scope, $state, $modal) ->

        $scope.openDeleteModal = () ->
          modalInstance = $modal.open {
            templateUrl: 'deleteContent.html',
            size: 'sm',
            controller: 'removeModal'
          }
        
      })

  $urlRouterProvider.otherwise('/')

app.controller 'MainCtrl', ($scope, $rootScope, $state) ->
  $scope.getDomain = (str) ->
    matches = str.match(/^https?\:\/\/([^\/:?#]+)(?:[\/:?#]|$)/i)
    return matches && matches[1]

  
app.controller 'removeModal', ($scope, $modalInstance) ->
  
  $scope.ok = () ->
    PageInfo.clearDB()
    SearchInfo.clearDB()
    $modalInstance.close('cleared')
    
  $scope.cancel = () ->
    $modalInstance.close('canceled')
  ###
    if $cookies.state?
    $scope.$evalAsync (scope) ->
      $state.go($cookies.state)
  ###

  
