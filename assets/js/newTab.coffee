
chrome.browserAction.onClicked.addListener (callback) ->
  chrome.tabs.create {'url': chrome.extension.getURL('/dist/html/newTab.html')}, (tab) ->
    # Tab opened.
