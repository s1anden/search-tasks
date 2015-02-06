/*
 * This is the message receptor from the parseDocument.js content script. This gives notifications to
 * keep help the user keep track of where they are in the page saving process.
 */
chrome.runtime.onConnect.addListener( function(port) {
  console.assert(port.name == "parser");
  var page = null;
  port.onMessage.addListener(function(msg) {
    switch(msg.command) {
      //Have a person verify their their input after we have guessed the headers
      case 'verify':
        clearNotification();
        var notification = {
          type: "basic",
          title: "Verify Choices",
          message: "I tried to guess the rest of the headers based on your input. Do these look right?",
          iconUrl: "/img/structify_medium.png",
          priority: 2,
          buttons: [{"title": "Yes"}, {"title": "No"}]
        };
        createNotification("structify-verify-page",notification);
        break;
      //We couldn't automatically determine the other headers. This is where we ask for
      //more information
      case 'info':
        clearNotification();
        var notification = {
          type: "basic",
          title: "More Information",
          message: "In order to make a good guess, could you select another header?",
          iconUrl: "/img/structify_medium.png",
          priority: 2,
          buttons: [{"title": "Stop"}]
        };
        createNotification("structify-more-info",notification);
        break;
      //If they click no on what we tried to automatically select.
      case 'redo':
        clearNotification();
        var notification = {
          type: "basic",
          title: "Fix Selections",
          message: "Could you select the highlighted headers that dont belong?",
          iconUrl: "/img/structify_medium.png",
          priority: 2,
          buttons: [{"title": "Done"},{"title": "Stop"}]
        };
        createNotification("structify-fix-headers",notification);
        break;
      //Ask for subheaders to be seleced so we can form a more complete graph
      case 'subheaders':
        clearNotification();
        var notification = {
          type: "basic",
          title: "Additional Headers",
          message: "In order to make a good guess, could you select another header?",
          iconUrl: "/img/structify_medium.png",
          priority: 2,
          buttons: [{"title": "Done"},{"title": "Stop"}]
        };
        createNotification("structify-subheaders",notification);
        break;
      //When we are done selecting headers, store the information in our Geddy server!
      case 'store':
        //Ok, we have some page info to process here
        var data = msg.data;
        for(var i = 0; i < data.length; i++) {
          if (data[i].name == 'body'){
            var elem = data[i];
            chrome.storage.local.get(["tab", "query"], function(storage) {
              page = new Page(storage.tab.url,storage.tab.title,storage.query);
              for (var j = 0; j < elem.children.length; j++) {
                page.addHeader(new Header(elem.children[j].name,page,elem.children[j].content));
              }
              port.postMessage({command: 'doneStoring'});
            });
          } else {

            port.postMessage({command: 'doneStoring'});
          }
        }
        break;
    }
  });
  //This is the notification listener function for the buttons. It takes the responses and passes
  //them back to the content script
  chrome.notifications.onButtonClicked.addListener(
  function(notificationId, buttonIndex) {
    //Clear the notification when we select a button
    chrome.notifications.clear(notificationId,function() {});
    switch(notificationId)
    {
      case 'structify-save-page':
        stopScript();
        break;
      case 'structify-more-info':
        stopScript();
        break;
      case 'structify-verify-page':
        switch(buttonIndex) {
          case 0:
            port.postMessage({command: 'verify', response: 'yes'});
            break;
            //TODO guess the smaller headings
          case 1: //No
            port.postMessage({command: 'verify', response: 'no'});
            break;
            //TODO redo the larger headings
        }
        break;
      case 'structify-subheaders':
        break;
      case 'structify-fix-headers':
        switch(buttonIndex) {
          case 0:
            port.postMessage({command: 'fixing', response: 'done'});
            break;
          case 1: //No
            stopScript();
            break;
        }
        break;
    }
  });
});

/*
 * Spawn the actual notification -- just a helper function
 *
 * @id The ID/name of the notification
 * @notification The notification object/hash
 */
function createNotification(id,notification){
  chrome.notifications.create(id, notification, function (){
    chrome.storage.local.set({notification: id});
  });
}

/*
 * Stop the header collection content script and clear the variables
 */
function stopScript() {
  chrome.storage.local.get("tab", function (data) {
    chrome.tabs.sendMessage(data.tab.id, {command: 'stop'}, function(){});
  });
  chrome.storage.local.set({"tab": null});
  chrome.storage.local.set({"query": null});
}

/*
 * Clear the currently displayed notification
 */
function clearNotification() {
  chrome.storage.local.get("notification", function(data){
    chrome.notifications.clear(data.notification, function(){});
  });
}

function geddyCreate(url, obj, callback) {
  var req = new XMLHttpRequest();
  req.open("POST", url, true);
  req.setRequestHeader("Content-type", "application/json");
  req.onload = callback;
  req.send(JSON.stringify(obj));
}

function Page(url, title, query) {
  this.url = url;
  this.title = title;
  this.query = query;
  this.headers = [];
}

Page.prototype.addHeader = function(header) {
  this.headers.push(header);
}

Page.prototype.send = function() {
  geddyCreate("http://localhost:4000/searches.json",
              {query: this.query},
              function() {
    var json = JSON.parse(this.responseText);
    chrome.storage.local.get("queries", function (q) {
      q.queries = q.queries || [];
      q.queries[tabId]["queryId"] = json.id;
      chrome.storage.local.set({"queries": q.queries});
    });
    geddyCreate("http://localhost:4000/sites.json",
                {url: this.url, title: this.title},
                function() {
      var site = JSON.parse(this.responseText)
      geddyCreate("htt://localhost:4000/serachsite.json",
                  {searchId: json.id, siteId: site.id},
                  function() {});
      for(var i = 0; i < this.headers.length; i++) {
        this.headers[i].send(site.id);
      }
    });
  });
}

function Header(title, parent, content) {
  this.title = title;
  this.parent = parent;
  this.content = content;
  this.children = [];
  parent.addHeader(this);
}

Header.prototype.addHeader = function(header) {
  this.children.push(header);
}

Header.prototype.send = function(parent_id) {

}

