chrome.browserAction.onClicked.addListener(function(callback) {
  return chrome.tabs.create({
    'url': chrome.extension.getURL('/dist/html/newTab.html')
  }, function(tab) {});
});

//# sourceMappingURL=newTab.js.map
