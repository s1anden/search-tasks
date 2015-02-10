# Search Track
Helps you track, manage, and learn from your web searches

Running
---------

To run the extension, just clone the repo, and add it to chrome using the 'Load unpacked extension...' button. 

Setup -- Development
-----------

This chrome extension is developed using [Bower](http://bower.io) and [Grunt](http://gruntjs.com) for asset management. All 
external packages are downloaded and placed in the vendor directory using bower. Any assets in the `assets` directory are
compiled (if they are less/coffee script) and synced to the dist directory along with the vendor files using Grunt. Please try
to continue to develop this extension using the files in the `assets` directory rather than the `dist` directory.

Pieces
-------------
The application is divided into two working parts. A background service that manages the searches, and a front-end companion
that provides some real-time information from the service. 

### Background Service
 First, running in the background, is the search-tracker service. This can be found in the `searchTrack.coffee` file. Additionally, 
 an API / Database service runs in series with this, in the `trackAPI.coffee` file. If you wish to access the information 
 recorded by the service, you just need to include TaffyDB and the `trackAPI.coffee` files in your app. This can be 
 seen in the companion app provided.
 
 The service exposes two global variables. The `SearchInfo` variable and the `PageInfo` variable. The `SearchInfo` variable 
 tracks the queries performed, while the `PageInfo` tracks the pages in relation to each other and the query. These two variables
 can be queries by using TaffyDB query commands against their db parameter. EX: `PageInfo.db({query: some_query})`
 
### Front-End Companion
  The front end provides some simple interaction with the information in the back-end. Its written in angular and linked to the
  back-end service through a couple of `update` functions that allow it to react in real time to the searches being performed.
  It has 3 views
  - a simple list that correlates web pages to the related searches
  - a tree view that allows you to view the web page path for a search.
  - and a settings page that allows you to clear the service's information

Dependencies
---------------

This application relies on a couple of dependencies. The core functionality only depends on [TaffyDB](http://www.taffydb.com) to
manage and save the searches monitored.

The front-end application uses [AngularJS](https://angularjs.org) to create a real-time application and 
[Underscore.js](http://underscorejs.org/) to perform some data processing on the results returned from the back-end service.
There are some additional dependencies that provide the tree graphic ([D3](http://d3js.org)), integration with Twitter Bootstrap ([Angular-Bootstrap](http://angular-ui.github.io/bootstrap/)),
URI processing ([URI.js](http://medialize.github.io/URI.js/)) and, of course, [jQuery](http://jquery.com). 
