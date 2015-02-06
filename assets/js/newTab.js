
chrome.browserAction.onClicked.addListener(function (callback) {
  chrome.tabs.create({'url': chrome.extension.getURL('html/newTab.html')}, function(tab) {
    // Tab opened.
  });
});

document.addEventListener('DOMContentLoaded', function () {
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    var currentTab = tabs[0];
    //Get the state variables for our process
    chrome.storage.local.get(['queries','tab','query'], function (data) {
      var queries = data.queries;
      var prevTab = data.tab;

      //First, check if we are currently saving data for this tab
      switch (checkState(prevTab, currentTab)){
        case 'showSearches':
          showSearches(queries, currentTab);
          break;
        case 'showSave':
          showSave(currentTab);
          break;
      }
    });
  });
});